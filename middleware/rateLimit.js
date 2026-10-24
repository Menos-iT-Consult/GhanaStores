/**
 * DiDwa - reusable in-process rate limiter.
 */
function clientIp(req) {
  const forwarded = req.headers && req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return String(req.ip || (req.socket && req.socket.remoteAddress) || 'unknown');
}
function sweepIfNeeded(store, now, windowMs) {
  if (store.size <= 10000) return;
  for (const [key, bucket] of store) {
    if (now - bucket.started >= windowMs) store.delete(key);
  }
  if (store.size > 10000) store.clear();
}
export function createRateLimiter(options = {}) {
  const windowMs = Number(options.windowMs || 60_000);
  const max = Number(options.max || 120);
  const message = options.message || 'Too many requests. Try again shortly.';
  const code = options.code || 'rate_limited';
  const keyGenerator = typeof options.keyGenerator === 'function' ? options.keyGenerator : (req) => clientIp(req);
  const skip = typeof options.skip === 'function' ? options.skip : null;

  const store = new Map();
  function middleware(req, res, next) {
    if (skip && skip(req)) return next();

    const key = String(keyGenerator(req) || 'unknown');
    const now = Date.now();
    sweepIfNeeded(store, now, windowMs);

    let bucket = store.get(key);
    if (!bucket || now - bucket.started >= windowMs) {
      bucket = { started: now, count: 0 };
    }
    bucket.count += 1;
    store.set(key, bucket);

    const remaining = Math.max(0, max - bucket.count);
    const resetSeconds = Math.max(1, Math.ceil((bucket.started + windowMs - now) / 1000));

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(resetSeconds));

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(resetSeconds));
      return res.status(429).json({
        error: message,
        code,
        retryAfter: resetSeconds,
      });
    }
    next();
  }

  middleware.store = store;
  middleware.options = { windowMs, max, message };
  return middleware;
}

export const rateLimit = createRateLimiter;
export const rateLimiter = createRateLimiter;
export default createRateLimiter;