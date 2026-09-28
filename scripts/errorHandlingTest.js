/**
 * Error handling verification.
 *
 * Guards the four things that decide whether a failure helps or confuses a
 * merchant:
 *
 *  1. Nothing internal leaks. A 5xx must never carry a Postgres message, a
 *     file path or a stack trace, because that response is rendered on screen.
 *  2. Real faults become the right status. An expired JWT is 401, a unique
 *     violation is 409, a dropped socket is 503 - not a blanket 500.
 *  3. The client never shows browser wording. "Failed to fetch" and "Load
 *     failed" are replaced with a sentence that says what to do next.
 *  4. The right session dies. An admin 401 must not sign the merchant out of
 *     the seller dashboard, and vice versa.
 *
 * Usage: node scripts/errorHandlingTest.js   (no database needed)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeError, errorHandler, GENERIC_5XX, makeRequestId } from '../middleware/errorMiddleware.js';
import { ErrorKind, looksHuman, readableError, referenceCode, toApiError } from '../src/lib/errors.js';

let pass = 0;
let fail = 0;
function log(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ''}`); }
  else { fail += 1; console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`); }
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

/** Minimal Express-like response that records what the handler did. */
function fakeRes() {
  return {
    statusCode: 200,
    body: null,
    headersSent: false,
    destroyed: false,
    setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    destroy() { this.destroyed = true; },
  };
}

/** Run the middleware and return { res, logged }. */
function handle(err, req = {}) {
  const res = fakeRes();
  const original = { error: console.error, warn: console.warn };
  const logged = [];
  console.error = (...a) => logged.push(a.join(' '));
  console.warn = (...a) => logged.push(a.join(' '));
  try {
    errorHandler(err, { method: 'GET', originalUrl: '/api/orders', ...req }, res, () => {});
  } finally {
    console.error = original.error;
    console.warn = original.warn;
  }
  return { res, logged: logged.join('\n') };
}

console.log('\nDiDwa error handling -> server middleware + client error vocabulary\n');

/* ---------- 1. Nothing internal leaks to the client ---------- */
{
  const pgLeak = Object.assign(new Error('duplicate key value violates unique constraint "stores_slug_key"'), { code: '23505' });
  const { res } = handle(pgLeak);
  log('unique violation becomes 409', res.statusCode === 409, `got ${res.statusCode}`);
  log('unique violation hides the constraint name', !JSON.stringify(res.body).includes('stores_slug_key'), res.body.error);

  const raw = handle(new Error('connect ECONNREFUSED 127.0.0.1:5432 at Object.<anonymous> (/srv/app/db/index.js:12:9)'));
  log('unhandled fault is a 500', raw.res.statusCode === 500, `got ${raw.res.statusCode}`);
  log('unhandled fault message is generic', raw.res.body.error === GENERIC_5XX, raw.res.body.error);
  log('unhandled fault leaks no file path', !JSON.stringify(raw.res.body).includes('/srv/app'), JSON.stringify(raw.res.body));
  log('unhandled fault leaks no stack', !JSON.stringify(raw.res.body).includes('Object.<anonymous>'));
  log('unhandled fault still logs the real cause', raw.logged.includes('ECONNREFUSED'), 'log kept the detail');
  log('5xx response carries a support hint', typeof raw.res.body.hint === 'string' && raw.res.body.hint.length > 0);

  const sent = fakeRes();
  sent.headersSent = true;
  const saved = console.error; console.error = () => {};
  try { errorHandler(new Error('late failure'), { method: 'GET', originalUrl: '/x' }, sent, () => {}); }
  finally { console.error = saved; }
  log('a response already in flight is destroyed, not appended to', sent.destroyed === true);
}


/* ---------- 2. Real faults become the right status ---------- */
{
  const cases = [
    ['expired JWT is 401', Object.assign(new Error('jwt expired'), { name: 'TokenExpiredError' }), 401],
    ['malformed JWT is 401', Object.assign(new Error('jwt malformed'), { name: 'JsonWebTokenError' }), 401],
    ['missing NOT NULL is 400', Object.assign(new Error('null value in column'), { code: '23502' }), 400],
    ['bad uuid is 400', Object.assign(new Error('invalid input syntax'), { code: '22P02' }), 400],
    ['deadlock is 503', Object.assign(new Error('deadlock detected'), { code: '40P01' }), 503],
    ['too many connections is 503', Object.assign(new Error('sorry'), { code: '53300' }), 503],
    ['dropped socket is 503', Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }), 503],
    ['oversized body is 413', Object.assign(new Error('too large'), { type: 'entity.too.large' }), 413],
    ['malformed JSON is 400', Object.assign(new Error('Unexpected token }'), { type: 'entity.parse.failed' }), 400],
    ['oversized upload is 413', Object.assign(new Error('File too large'), { name: 'MulterError', code: 'LIMIT_FILE_SIZE' }), 413],
    ['unapplied schema is 503', new Error('relation "orders" does not exist'), 503],
  ];
  for (const [name, err, expected] of cases) {
    const { res } = handle(err);
    log(name, res.statusCode === expected, `got ${res.statusCode}`);
  }

  const { res } = handle(Object.assign(new Error('jwt expired'), { name: 'TokenExpiredError' }));
  log('expired token explains the fix', /sign in again/i.test(res.body.error), res.body.error);
  log('every response carries a request id', Boolean(res.body.requestId), res.body.requestId);
  log('every response carries a machine code', typeof res.body.code === 'string' && res.body.code.length > 0, res.body.code);
  log('request ids are unique', makeRequestId() !== makeRequestId());
  log('a 4xx gets no "we are broken" hint', handle(Object.assign(new Error('bad request'), { status: 400 })).res.body.hint === undefined);
  log('a deliberate 4xx message is passed through', handle(Object.assign(new Error('That email is already registered.'), { status: 409 })).res.body.error === 'That email is already registered.');
  log('describeError is pure and importable', describeError(new Error('x')).status === 500);
}


/* ---------- 3. The client never shows browser or driver wording ---------- */
{
  log('"Failed to fetch" is replaced', !/failed to fetch/i.test(readableError(new Error('Failed to fetch'))), readableError(new Error('Failed to fetch')));
  log('"Load failed" is replaced', !/load failed/i.test(readableError(new Error('Load failed'))), readableError(new Error('Load failed')));
  log('a stack frame is not shown', !/at Object/.test(readableError(new Error('boom\n    at Object.<anonymous> (/app/x.js:1:1)'))));
  log('a human 4xx message is preserved', readableError(new Error('That email is already registered.')) === 'That email is already registered.');
  log('an empty error falls back', readableError(null, 'Fallback.') === 'Fallback.');
  log('an empty string falls back', readableError('', 'Fallback.') === 'Fallback.');
  log('a non-Error value is tolerated', typeof readableError({ weird: true }) === 'string' && readableError({ weird: true }).length > 0);

  const looksHumanCases = [
    ['plain sentence', 'Your session has expired. Please sign in again.', true],
    ['empty string', '', false],
    ['fetch wording', 'Failed to fetch', false],
    ['pg text', 'relation "orders" does not exist', false],
    ['stack', 'TypeError\n    at load (app.js:1:1)', false],
    ['absurdly long text', 'x'.repeat(500), false],
  ];
  for (const [name, value, expected] of looksHumanCases) log(`looksHuman: ${name}`, looksHuman(value) === expected);

  const offline = toApiError(new Error('Failed to fetch'), { kind: ErrorKind.OFFLINE });
  log('an offline browser is named as such', /offline/i.test(readableError(offline)), readableError(offline));
  log('offline is retryable', offline.retryable === true);
  log('a 403 is not retryable', toApiError('You do not have permission to do that.', { status: 403 }).retryable === false, 'no point pressing Try again');
  log('a 500 is retryable', toApiError('Something went wrong on our side. Please try again.', { status: 500 }).retryable === true);
  log('a support reference is short and quotable', /^[A-Z0-9]{6}$/.test(referenceCode('a1b2c3d4e5f6a1b2')), referenceCode('a1b2c3d4e5f6a1b2'));
}


/* ---------- 4. The API client normalises and protects sessions ---------- */
{
  const api = read('src/api.js');
  log('the client imports the shared error vocabulary', /from '\.\/lib\/errors\.js'/.test(api));
  log('the client aborts a request that never answers', /AbortController/.test(api) && /REQUEST_TIMEOUT_MS/.test(api));
  log('the timeout is a sane number of milliseconds', /REQUEST_TIMEOUT_MS = \d{4,}/.test(api));
  log('fetch rejections become ApiError, not a raw TypeError', /toApiError\(cause/.test(api));
  log('an admin 401 clears the ADMIN session', /clearAdminSession\(\)/.test(api));
  // The 401 branches must be mutually exclusive: an admin expiry clearing the
  // seller session (or the reverse) would sign a person out of the wrong app.
  log('the admin and seller 401 branches are exclusive', /if \(isAdmin\) \{[\s\S]{0,200}clearAdminSession\(\);[\s\S]{0,80}\} else if \(!explicitToken\) \{[\s\S]{0,200}clearSession\(\);/.test(api));
  log('a seller 401 does not clear the admin session', /clearSession\(\)[\s\S]{0,200}clearAdminSession/.test(api) === false);
  log('the sign-in route is exempt from the 401 reset', /\/api\/billing\/login/.test(api));

  const server = read('server.js');
  log('the server uses the shared error handler', /app\.use\(errorHandler\)/.test(server));
  log('the server no longer replies with err.message', !/json\(\{ error: err\.message/.test(server));
  log('the server tags every request with an id', /app\.use\(requestContext\)/.test(server));
  log('the server guards process-level faults', /installProcessGuards\(\)/.test(server));
  log('the server no longer inlines its own error handler', !/app\.use\(\(err, _req, res, _next\)/.test(server));

  const main = read('src/main.jsx');
  log('the app is wrapped in the shared boundary', /<ErrorBoundary><App \/><\/ErrorBoundary>/.test(main));
  log('the old inline boundary is gone', !/class AppErrorBoundary/.test(main));
}


/* ---------- 5. One notice, used everywhere ---------- */
{
  const notice = read('src/components/ErrorNotice.jsx');
  log('the notice announces itself to screen readers', /role=\{tone === 'error' \? 'alert' : 'status'\}/.test(notice));
  log('the notice offers a retry when one is possible', /Try again/.test(notice));
  log('the notice never offers a retry for an auth failure', /\[401, 403\]\.includes/.test(notice));
  log('the notice hides raw detail behind a disclosure', /Hide details/.test(notice));

  // The point of the change: one component, not eight hand-rolled red boxes.
  const pages = ['src/pages/AuthScreen.jsx', 'src/pages/SellerOrders.jsx', 'src/pages/DomainManager.jsx', 'src/components/POSCart.jsx'];
  for (const page of pages) {
    const source = read(page);
    log(`${page} uses the shared notice`, /<ErrorNotice/.test(source));
    log(`${page} has no hand-rolled error box`, !/border-red-\d+ bg-red-\d+/.test(source));
  }
  const adminUi = read('src/components/admin/ui.jsx');
  log('the admin banner delegates to the shared notice', /<ErrorNotice error=\{error\}/.test(adminUi));
  log('the admin banner no longer renders the raw error', !/\{error\}<\/span>/.test(adminUi));
  log('the admin list hook normalises its errors', /readableError\(err/.test(read('src/components/admin/useAdminList.js')));
  log('the admin gate reacts to a mid-session expiry', /gs:admin-logout/.test(read('src/pages/admin/AdminGate.jsx')));
}

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
