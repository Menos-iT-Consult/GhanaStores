/**
 * DiDwa - one error vocabulary for the whole site.
 *
 * Every page used to render `error.message` straight from a rejected fetch, so a
 * merchant could be shown "Failed to fetch", a Postgres "relation does not
 * exist", or a 500's internal message. None of those tell a human what to do.
 *
 * This module is the single place that decides what a failure IS (kind) and what
 * it should SAY (message). It is pure and dependency-free so the API client, the
 * shared notice, the error boundary and the tests all agree.
 *
 * Rule of thumb: 4xx messages come from our own routes and were written for
 * humans, so they are trusted. Anything else (5xx, network, timeout, unknown)
 * gets a friendly sentence, because those texts are written for engineers.
 */

/** How the failure happened, independent of what the server said. */
export const ErrorKind = {
  NETWORK: 'network',   // request never reached the server
  TIMEOUT: 'timeout',   // server accepted it but did not answer in time
  OFFLINE: 'offline',   // the browser knows there is no connection
  HTTP: 'http',         // server answered with a status code
  CLIENT: 'client',     // a validation / network-layer fault we raised
  UNKNOWN: 'unknown',   // anything that did not come from fetch
};

/** Server failures worth offering a "Try again" for. */
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/** Plain-English fallback per status, used when the server sent nothing useful. */
const STATUS_MESSAGE = {
  400: 'That request was not valid. Check the details and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to do that.',
  404: 'We could not find what you were looking for.',
  405: 'That action is not available here.',
  409: 'That conflicts with something that already exists.',
  413: 'That file is too large to upload.',
  422: 'Some of the details were not valid. Please review and try again.',
  429: 'Too many attempts. Wait a moment and try again.',
  500: 'Something went wrong on our side. Please try again.',
  502: 'We could not reach the service. Please try again.',
  503: 'The service is temporarily unavailable. Please try again shortly.',
  504: 'That took too long to process. Please try again.',
};

export const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

/** Text that is useful to an engineer and confusing to a merchant. */
const TECHNICAL_NOISE = [
  /^failed to fetch/i,
  /^network ?error/i,
  /^load failed/i,
  /^fetch$/i,
  /^the operation was aborted/i,
  /^timeout/i,
  /^aborted/i,
  /ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/,
  /^jwt (expired|invalid|malformed)/i,
  /^invalid (token|jwt)/i,
  /\b(relation|column|constraint|table) ["']?\w+["']? (does not exist|not found)\b/i,
  /SQLSTATE|node:internal/i,
  /^\s*at\s+\w+\s+\(/m,          // a stack frame
];

const MAX_HUMAN_LENGTH = 240;

/**
 * True when a message is safe and sensible to show a merchant: plain prose that
 * was clearly written for people, not a stack trace or a driver message.
 */
export function looksHuman(message) {
  if (typeof message !== 'string') return false;
  const text = message.trim();
  if (!text || text.length > MAX_HUMAN_LENGTH) return false;
  if (TECHNICAL_NOISE.some((pattern) => pattern.test(text))) return false;
  if (/[{}]|<[a-z/][^>]*>|SELECT\s|INSERT\s|UPDATE\s+.*SET/i.test(text)) return false;
  return true;
}

/** A failure the UI can reason about. */
export class ApiError extends Error {
  constructor(message, { status = 0, kind = ErrorKind.UNKNOWN, detail = '', requestId = '' } = {}) {
    super(message || GENERIC_MESSAGE);
    this.name = 'ApiError';
    this.status = status;
    this.kind = kind;
    this.detail = detail;      // raw text, for the "Details" disclosure only
    this.requestId = requestId; // server-side reference, when one was sent
  }

  /** Worth a "Try again" button rather than a dead end. */
  get retryable() {
    if ([ErrorKind.NETWORK, ErrorKind.TIMEOUT, ErrorKind.OFFLINE].includes(this.kind)) return true;
    return RETRYABLE_STATUS.has(this.status);
  }
}

/** Best-effort offline detection that also works in tests and SSR. */
export function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/** Wrap anything thrown into an ApiError without losing the original message. */
export function toApiError(value, { kind = ErrorKind.UNKNOWN, status = 0 } = {}) {
  if (value instanceof ApiError) return value;

  const message = typeof value === 'string' ? value : value?.message || '';
  let resolvedKind = kind;
  let resolvedStatus = status || (Number.isFinite(value?.status) ? value.status : 0);

  // AbortError is how a fetch timeout announces itself.
  if (value?.name === 'AbortError' || value?.name === 'TimeoutError') resolvedKind = ErrorKind.TIMEOUT;

  // Connection-level failures: never show the browser's own wording.
  if ([ErrorKind.NETWORK, ErrorKind.TIMEOUT, ErrorKind.OFFLINE].includes(resolvedKind)) {
    return new ApiError(friendlyMessage({ kind: resolvedKind, offline: isOffline() }), {
      status: resolvedStatus, kind: resolvedKind, detail: message,
    });
  }

  // Server text: trust it only if it was written for humans.
  if (looksHuman(message)) {
    return new ApiError(message, { status: resolvedStatus, kind: resolvedKind });
  }
  return new ApiError(friendlyMessage({ status: resolvedStatus, kind: resolvedKind }), {
    status: resolvedStatus, kind: resolvedKind, detail: message,
  });
}

/** The plain-English sentence for a failure, given whatever we know about it. */
export function friendlyMessage({ status = 0, kind = ErrorKind.UNKNOWN, offline = false } = {}) {
  if (offline || kind === ErrorKind.OFFLINE) {
    return 'You appear to be offline. Check your connection and try again.';
  }
  if (kind === ErrorKind.TIMEOUT) {
    return 'The server took too long to respond. Please try again.';
  }
  if (kind === ErrorKind.NETWORK) {
    return 'We could not reach the server. Check your connection and try again.';
  }
  if (status >= 500) return STATUS_MESSAGE[status] || 'Something went wrong on our side. Please try again.';
  if (status > 0) return STATUS_MESSAGE[status] || GENERIC_MESSAGE;
  return GENERIC_MESSAGE;
}

/**
 * The one call every page should use: setError(readableError(err)).
 * Never throws, never returns an empty string, never returns a stack trace.
 */
export function readableError(value, fallback = GENERIC_MESSAGE) {
  if (value === null || value === undefined || value === '') return fallback;
  const error = toApiError(value);
  return error.message || fallback;
}

/** Short reference a merchant can quote to support, e.g. "R7K2QD". */
export function referenceCode(requestId) {
  if (!requestId) return '';
  return String(requestId).replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase();
}

