import assert from 'node:assert/strict';
import { createRateLimiter } from '../middleware/rateLimit.js';
import fs from 'node:fs';

async function invoke(limiter, { ip = '192.0.2.10', forwarded, method = 'GET', id = 'request-1' } = {}) {
  const headers = {};
  const response = {
    statusCode: 200,
    body: null,
    setHeader(name, value) { headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  let nextCalled = false;
  const request = {
    ip,
    method,
    id,
    headers: forwarded ? { 'x-forwarded-for': forwarded } : {},
    socket: { remoteAddress: '127.0.0.1' },
  };
  await limiter(request, response, () => { nextCalled = true; });
  return { response, headers, nextCalled };
}

const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
assert.equal((await invoke(limiter)).nextCalled, true);
assert.equal((await invoke(limiter)).nextCalled, true);
const limited = await invoke(limiter);
assert.equal(limited.nextCalled, false);
assert.equal(limited.response.statusCode, 429);
assert.equal(limited.response.body.code, 'rate_limited');
assert.equal(limited.response.body.requestId, 'request-1');
assert.equal(limited.headers['Retry-After'], limited.headers['RateLimit-Reset']);
assert.equal(limited.headers['RateLimit-Limit'], '2');
assert.equal(limited.headers['RateLimit-Remaining'], '0');
assert.equal(limited.headers['RateLimit-Policy'], '2;w=60');

const separateClient = await invoke(limiter, { ip: '192.0.2.11' });
assert.equal(separateClient.nextCalled, true);

const spoofedForwarded = createRateLimiter({ windowMs: 60_000, max: 1 });
assert.equal((await invoke(spoofedForwarded, { forwarded: '198.51.100.55' })).nextCalled, true);
assert.equal((await invoke(spoofedForwarded, { forwarded: '198.51.100.56' })).response.statusCode, 429);
assert.equal(spoofedForwarded.store.size, 1, 'forwarded header must not split one client into spoofed buckets');

const skipped = createRateLimiter({
  windowMs: 60_000,
  max: 1,
  skip: (req) => req.method !== 'POST',
});
assert.equal((await invoke(skipped, { method: 'GET' })).nextCalled, true);
assert.equal((await invoke(skipped, { method: 'GET' })).nextCalled, true);
assert.equal(skipped.store.size, 0);

assert.throws(() => createRateLimiter({ windowMs: 0 }), RangeError);
assert.throws(() => createRateLimiter({ max: -1 }), RangeError);

let sharedCount = 0;
const distributed = createRateLimiter({
  name: 'test',
  windowMs: 60_000,
  max: 1,
  counter: async () => ({ count: ++sharedCount, resetAt: Date.now() + 60_000 }),
});
assert.equal((await invoke(distributed)).nextCalled, true);
assert.equal((await invoke(distributed)).response.statusCode, 429);
assert.equal(distributed.options.shared, true);

const unavailable = createRateLimiter({
  name: 'unavailable',
  windowMs: 60_000,
  max: 1,
  counter: async () => { throw new Error('test failure'); },
});
const originalConsoleError = console.error;
console.error = () => {};
try {
  const failedClosed = await invoke(unavailable);
  assert.equal(failedClosed.nextCalled, false);
  assert.equal(failedClosed.response.statusCode, 503);
  assert.equal(failedClosed.response.body.code, 'rate_limit_unavailable');
} finally {
  console.error = originalConsoleError;
}

const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const originalFetch = globalThis.fetch;
let capturedCommand;
process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
globalThis.fetch = async (_url, options) => {
  capturedCommand = JSON.parse(options.body);
  return {
    ok: true,
    json: async () => ({ result: [1, 60_000] }),
  };
};
try {
  const upstash = createRateLimiter({ name: 'shared-test', windowMs: 60_000, max: 1 });
  assert.equal(upstash.options.shared, true);
  assert.equal((await invoke(upstash)).nextCalled, true);
  assert.equal(capturedCommand[0], 'EVAL');
  assert.equal(capturedCommand[2], '1');
  assert.match(capturedCommand[3], /^didwa:rate-limit:shared-test:[a-f0-9]{64}$/);

  process.env.UPSTASH_REDIS_REST_URL = 'http://redis.example.com';
  assert.throws(() => createRateLimiter({ name: 'insecure' }), /must use HTTPS/);
} finally {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = originalUrl;
  if (originalToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
}

const server = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8');
for (const route of [
  '/api/billing/verify-otp',
  '/api/affiliate/signup',
  '/api/affiliate/login',
  '/api/admin/login',
]) {
  assert.ok(server.includes(`app.use('${route}', authLimiter)`), `${route} should be rate limited`);
}
assert.match(server, /app\.use\('\/api\/billing\/login', authLimiter\)/, 'the nested 2FA path inherits the login limiter');
assert.match(server, /app\.use\('\/api\/mobile\/auth\/login', authLimiter\)/, 'mobile 2FA inherits the mobile login limiter');
assert.match(server, /app\.use\('\/api\/public\/orders', publicOrderLimiter\)/);
assert.match(server, /app\.use\('\/api\/contact', publicContactLimiter\)/);
assert.match(server, /app\.use\('\/api\/domains\/search', domainSearchLimiter\)/);
assert.match(server, /app\.use\('\/api\/affiliate\/payouts', affiliatePayoutLimiter\)/);
assert.ok(server.includes("skip: (req) => !req.path.startsWith('/api/') && req.path !== '/health'"));

console.log('All rate-limit checks passed.');
