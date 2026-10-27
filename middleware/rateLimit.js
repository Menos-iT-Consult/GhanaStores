/**
 * DiDwa rate limiter. Uses Upstash Redis when configured, with a bounded
 * process-local fallback for development and single-instance deployments.
 *
 * Use Express's resolved `req.ip`, not the caller-controlled
 * X-Forwarded-For header. The app configures its trusted proxy hop centrally.
 */
import { createHash } from 'node:crypto';

const MAX_BUCKETS = 10_000;
const SWEEP_INTERVAL = 256;
const INCREMENT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return { count, redis.call('PTTL', KEYS[1]) }
`;
let warnedAboutLocalStore = false;

function clientIp(req) {
  return String(req.ip || req.socket?.remoteAddress || 'unknown').trim() || 'unknown';
}

function positiveInteger(value, fallback, name) {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
  return parsed;
}

function pruneBuckets(store, now) {
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
  while (store.size >= MAX_BUCKETS) {
    const oldestKey = store.keys().next().value;
    if (oldestKey === undefined) break;
    store.delete(oldestKey);
  }
}

function createUpstashCounter(namespace) {
  const rawUrl = String(process.env.UPSTASH_REDIS_REST_URL || '').trim();
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  if (!rawUrl && !token) return null;
  if (!rawUrl || !token) {
    throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must both be configured.');
  }

  const endpoint = new URL(rawUrl);
  if (endpoint.protocol !== 'https:') {
    throw new Error('UPSTASH_REDIS_REST_URL must use HTTPS.');
  }

  return async (clientKey, windowMs) => {
    const hashedKey = createHash('sha256').update(clientKey).digest('hex');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        'EVAL',
        INCREMENT_SCRIPT,
        '1',
        `didwa:rate-limit:${namespace}:${hashedKey}`,
        String(windowMs),
      ]),
      signal: AbortSignal.timeout(2500),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.error || !Array.isArray(payload?.result)) {
      throw new Error('The shared rate-limit store returned an invalid response.');
    }

    const count = Number(payload.result[0]);
    const ttl = Number(payload.result[1]);
    if (!Number.isSafeInteger(count) || count < 1 || !Number.isFinite(ttl) || ttl < 0) {
      throw new Error('The shared rate-limit store returned invalid counter values.');
    }
    return { count, resetAt: Date.now() + ttl };
  };
}

export function createRateLimiter(options = {}) {
  const windowMs = positiveInteger(options.windowMs, 60_000, 'windowMs');
  const max = positiveInteger(options.max, 120, 'max');
  const message = options.message || 'Too many requests. Try again shortly.';
  const code = options.code || 'rate_limited';
  const namespace = String(options.name || 'default').replace(/[^a-zA-Z0-9:_-]/g, '_');
  const keyGenerator = typeof options.keyGenerator === 'function' ? options.keyGenerator : (req) => clientIp(req);
  const skip = typeof options.skip === 'function' ? options.skip : null;

  const store = new Map();
  const sharedCounter = typeof options.counter === 'function'
    ? options.counter
    : createUpstashCounter(namespace);
  if (!sharedCounter && process.env.VERCEL && !warnedAboutLocalStore) {
    warnedAboutLocalStore = true;
    console.warn('[rate-limit] Upstash is not configured; limits are local to each serverless instance.');
  }
  let requestsSinceSweep = 0;
  async function applyLimit(req, res, next) {
    if (skip && skip(req)) return next();

    const key = String(keyGenerator(req) || 'unknown');
    const now = Date.now();
    try {
      let bucket;
      if (sharedCounter) {
        bucket = await sharedCounter(key, windowMs);
      } else {
        requestsSinceSweep += 1;
        if (requestsSinceSweep >= SWEEP_INTERVAL || store.size >= MAX_BUCKETS) {
          pruneBuckets(store, now);
          requestsSinceSweep = 0;
        }

        bucket = store.get(key);
        if (!bucket || bucket.resetAt <= now) {
          bucket = { resetAt: now + windowMs, count: 0 };
        }
        bucket.count += 1;
        store.delete(key);
        store.set(key, bucket);
      }

      const remaining = Math.max(0, max - bucket.count);
      const resetSeconds = Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000));

      res.setHeader('RateLimit-Limit', String(max));
      res.setHeader('RateLimit-Remaining', String(remaining));
      res.setHeader('RateLimit-Reset', String(resetSeconds));
      res.setHeader('RateLimit-Policy', `${max};w=${Math.ceil(windowMs / 1000)}`);

      if (bucket.count > max) {
        res.setHeader('Retry-After', String(resetSeconds));
        return res.status(429).json({
          error: message,
          code,
          requestId: req.id,
          retryAfter: resetSeconds,
        });
      }
      return next();
    } catch (error) {
      if (!sharedCounter) throw error;
      console.error(`[rate-limit] shared counter "${namespace}" failed:`, error?.message || error);
      return res.status(503).json({
        error: 'Request protection is temporarily unavailable. Please try again shortly.',
        code: 'rate_limit_unavailable',
        requestId: req.id,
      });
    }
  }

  function middleware(req, res, next) {
    return applyLimit(req, res, next).catch(next);
  }

  middleware.store = store;
  middleware.options = { windowMs, max, message, name: namespace, shared: Boolean(sharedCounter) };
  return middleware;
}

export const rateLimit = createRateLimiter;
export const rateLimiter = createRateLimiter;
export default createRateLimiter;