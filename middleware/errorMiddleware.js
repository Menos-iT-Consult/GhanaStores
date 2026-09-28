/**
 * DiDwa - centralised error handling for the API.
 *
 * Two jobs, and they pull in opposite directions:
 *
 *   1. Log everything. The full error, with stack, for whoever is on call.
 *   2. Return almost nothing. A merchant should never see a Postgres error,
 *      a file path, a provider secret or a stack trace.
 *
 * The old inline handler in server.js did `res.status(err.status || 500)
 * .json({ error: err.message })`, which sent raw driver text to the browser on
 * any failure that did not set a status - and a thrown Error has no status, so
 * "500 + raw message" was the common case.
 *
 * Everything below decides ONE thing: for a given error, what status code and
 * what sentence go over the wire. The log always keeps the original.
 */
import { randomUUID } from 'node:crypto';

/** Sent to the client for any 5xx. Deliberately says nothing about the cause. */
export const GENERIC_5XX = 'Something went wrong on our side. Please try again.';

/**
 * PostgreSQL SQLSTATEs we can translate into a sensible status + sentence.
 * Anything not listed here is treated as an unknown fault (500, generic).
 */
const PG_ERRORS = {
  '23505': { status: 409, message: 'That already exists. Please use a different value.' }, // unique_violation
  '23503': { status: 400, message: 'That references something that no longer exists.' },     // foreign_key_violation
  '23502': { status: 400, message: 'A required detail is missing.' },                        // not_null_violation
  '23514': { status: 400, message: 'That value is not allowed.' },                          // check_violation
  '22P02': { status: 400, message: 'That value is not valid.' },                            // invalid_text_representation
  '22007': { status: 400, message: 'That date or time is not valid.' },                      // invalid_datetime_format
  '22003': { status: 400, message: 'That number is out of range.' },                         // numeric_value_out_of_range
  '22001': { status: 413, message: 'That text is too long.' },                              // string_data_right_truncation
  '40001': { status: 503, message: 'We are busy right now. Please try again.' },             // serialization_failure
  '40P01': { status: 503, message: 'We are busy right now. Please try again.' },             // deadlock_detected
  '53300': { status: 503, message: 'We are busy right now. Please try again.' },             // too_many_connections
  '57P01': { status: 503, message: 'We are restarting. Please try again.' },                 // admin_shutdown
  '08006': { status: 503, message: 'We could not reach the database. Please try again.' },   // connection_failure
  '08003': { status: 503, message: 'We could not reach the database. Please try again.' },   // connection_does_not_exist
  '57P03': { status: 500, message: GENERIC_5XX },                                           // cannot_connect_now
};

/** The schema was never applied: a deployment problem, not a code problem. */
const MISSING_SCHEMA = /relation "[a-z_]+" does not exist|column [a-z_."]+ does not exist/i;

/** Body parser / upload faults, which arrive with a `type` and no status. */
const BODY_ERRORS = {
  'entity.parse.failed': { status: 400, message: 'That request was not valid.' },
  'entity.too.large': { status: 413, message: 'That request was too large.' },
  'encoding.unsupported': { status: 415, message: 'That content type is not supported.' },
  'request.aborted': { status: 400, message: 'The request was cancelled.' },
  'LIMIT_FILE_SIZE': { status: 413, message: 'That file is too large to upload.' },
  'LIMIT_UNEXPECTED_FILE': { status: 400, message: 'That upload contained an unexpected file.' },
};

/** Node/undici socket faults. */
const NETWORK_ERRORS = new Set([
  'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE', 'EHOSTUNREACH', 'ENETUNREACH', 'EAI_AGAIN', 'ENOTFOUND',
]);

/** A short, quotable id so a merchant can report "it said ref ABC123". */

/**
 * Work out the status, the client-safe message and a stable machine code.
 * Pure, so it can be unit tested without a server or a database.
 */
export function describeError(err) {
  const message = (err && err.message) || 'Unknown error';
  const name = err?.name || '';
  const code = err?.code && typeof err.code === 'string' ? err.code : '';

  if (MISSING_SCHEMA.test(message)) {
    return {
      status: 503,
      code: 'schema_missing',
      message: 'The service is not fully set up yet. Please try again shortly.',
      logMessage: `[schema-missing] ${message}`,
    };
  }

  if (code && PG_ERRORS[code]) {
    const mapped = PG_ERRORS[code];
    return { status: mapped.status, code, message: mapped.message, logMessage: `[pg:${code}] ${message}` };
  }

  if (err?.type && BODY_ERRORS[err.type]) {
    const mapped = BODY_ERRORS[err.type];
    return { status: mapped.status, code: err.type, message: mapped.message, logMessage: `[body:${err.type}] ${message}` };
  }

  // Multer reports its own limit breaches through `code` (LIMIT_FILE_SIZE) and
  // `name: 'MulterError'`, with no `type`, so without this an oversized upload
  // fell through to an unhandled 500 instead of the 413 it actually is.
  if (name === 'MulterError' && code && BODY_ERRORS[code]) {
    const mapped = BODY_ERRORS[code];
    return { status: mapped.status, code, message: mapped.message, logMessage: `[upload:${code}] ${message}` };
  }

  if (code && NETWORK_ERRORS.has(code)) {
    return { status: 503, code, message: 'We could not reach a service we depend on. Please try again.', logMessage: `[net:${code}] ${message}` };
  }

  // jsonwebtoken: an expired token is an expired session, not a server fault.
  if (name === 'TokenExpiredError') {
    return { status: 401, code: 'token_expired', message: 'Your session has expired. Please sign in again.', logMessage: '[auth] token expired' };
  }
  if (name === 'JsonWebTokenError') {
    return { status: 401, code: 'token_invalid', message: 'Your session is not valid. Please sign in again.', logMessage: '[auth] invalid token' };
  }

  // An http-errors style error (or a route that set status + a human message)
  // is a deliberate API response, so it is safe to pass through verbatim.
  const declared = Number(err?.status || err?.statusCode);
  if (Number.isInteger(declared) && declared >= 400 && declared < 500) {
    return {
      status: declared,
      code: code || 'client_error',
      message: message || 'That request could not be completed.',
      logMessage: `[client:${declared}] ${message}`,
    };
  }

  const status = Number.isInteger(declared) && declared >= 500 ? declared : 500;
  return { status, code: code || 'internal_error', message: GENERIC_5XX, logMessage: `[unhandled] ${message}` };
}

/** Tags each request with an id and echoes it back, so a log line can be found. */
export function requestContext(req, res, next) {
  req.id = makeRequestId();
  res.setHeader('X-Request-Id', req.id);
  next();
}

/**
 * The terminal error middleware. Mount LAST, after every route.
 * Logs the full detail, replies with the safe subset.
 */
export function errorHandler(err, req, res, _next) {
  const described = describeError(err);
  const requestId = req.id || makeRequestId();

  // The log keeps everything; the response keeps almost nothing. A stack is
  // useful at 400 too (it points at the bad call site), so it always goes out.
  const detail = {
    requestId,
    method: req.method,
    path: req.originalUrl || req.url,
    status: described.status,
    code: described.code,
    storeId: req.store?.id ?? null,
    userId: req.user?.id ?? null,
    adminId: req.admin?.id ?? null,
  };
  if (described.status >= 500) {
    console.error('[api]', described.logMessage, detail, err?.stack || '');
  } else {
    console.warn('[api]', described.logMessage, detail);
  }

  // Headers already flushed (a streamed file or a chunked response): the only
  // correct move is to break the connection rather than append JSON to a body.
  if (res.headersSent) return res.destroy();

  const body = { error: described.message, code: described.code, requestId };
  if (described.status >= 500) {
    // Tell an operator that the real cause is in the logs, not in this body.
    body.hint = 'The issue has been logged. Quote the reference if you contact support.';
  }
  return res.status(described.status).json(body);
}

/** 404 for unmatched /api paths, in the same shape as every other error. */
export function apiNotFound(_req, res) {
  res.status(404).json({
    error: 'That endpoint does not exist.',
    code: 'not_found',
    requestId: makeRequestId(),
  });
}

/**
 * Wraps an async route handler so a rejected promise reaches the error
 * middleware. Express 4 does not do this on its own: without the wrapper a
 * failed `await` in a handler hangs the request until it times out.
 */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * Last line of defence for faults that happen outside a request (a cron job, a
 * payment callback). Log loudly, keep serving: on a serverless platform an
 * unhandled rejection must not take the instance down mid-checkout.
 */
export function installProcessGuards(logger = console) {
  process.on('unhandledRejection', (reason) => {
    const described = describeError(reason instanceof Error ? reason : new Error(String(reason)));
    logger.error(`[process] unhandledRejection ${described.logMessage}`, reason);
  });
  process.on('uncaughtException', (err) => {
    const described = describeError(err);
    logger.error(`[process] uncaughtException ${described.logMessage}`, err?.stack || '');
  });
}

export function makeRequestId() {
  return randomUUID().replace(/-/g, '').slice(0, 12);
}
