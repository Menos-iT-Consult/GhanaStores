/**
 * The one place the whole site renders a failure.
 *
 * Before this, every page drew its own red box: eight slightly different
 * markup copies, no retry on most of them, and the message was whatever
 * JavaScript happened to produce. This component takes any error - an ApiError,
 * an Error, or a plain string - and renders the same thing everywhere:
 *
 *   a headline saying what happened, in plain English
 *   the reason, already translated by lib/errors.js
 *   "Try again" when retrying could actually help
 *   a "Details" disclosure for engineers (and the support reference)
 *
 * Accessibility: it is a live region, so a screen reader announces a failure
 * that appears after the user pressed a button, and it never relies on colour
 * alone to carry meaning.
 */
import { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, RefreshCw, ChevronDown } from 'lucide-react';
import { readableError, referenceCode, toApiError } from '../lib/errors.js';

const TONES = {
  error: { wrap: 'border-rose-200 bg-rose-50 text-rose-900', icon: AlertCircle, iconClass: 'text-rose-500', label: 'Error' },
  warning: { wrap: 'border-amber-200 bg-amber-50 text-amber-900', icon: AlertTriangle, iconClass: 'text-amber-500', label: 'Warning' },
  success: { wrap: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: CheckCircle2, iconClass: 'text-emerald-500', label: 'Success' },
  info: { wrap: 'border-blue-200 bg-blue-50 text-blue-900', icon: Info, iconClass: 'text-blue-500', label: 'Notice' },
};

const HEADLINES = {
  load: 'We could not load this',
  action: 'That did not work',
  offline: 'You are offline',
};

/**
 * @param {object} props
 * @param {*}       props.error     Anything thrown. Falsy renders nothing.
 * @param {Function} [props.onRetry] Called when the user asks to try again.
 * @param {string}  [props.headline] Override the default headline.
 * @param {'load'|'action'} [props.intent] `load` for a failed page load,
 *        `action` for a failed button press. Only affects the wording.
 * @param {boolean} [props.compact] Inline form for use inside a form or card.
 * @param {boolean} [props.showDetails] Force the technical detail open (debug).
 */
export default function ErrorNotice({
  error,
  onRetry,
  headline,
  intent = 'load',
  tone = 'error',
  compact = false,
  showDetails = false,
  className = '',
}) {
  const [open, setOpen] = useState(showDetails);
  if (!error) return null;

  const style = TONES[tone] || TONES.error;
  const Icon = style.icon;
  const normalised = toApiError(error);
  const message = readableError(error);
  const reference = referenceCode(normalised.requestId);
  const kind = normalised.kind;
  const canRetry = typeof onRetry === 'function'
    // A retry button on "your session expired" is a dead end: the session has
    // already been cleared, so the next click would just fail again. Same for a
    // permission error - nothing about retrying changes the answer.
    && ![401, 403].includes(normalised.status);
  // Only offer the raw text when there IS raw text, and never for a message we
  // already showed in full (otherwise "Details" would just repeat the message).
  const detail = normalised.detail && normalised.detail !== message
    ? `${normalised.detail}${reference ? `\nReference: ${reference}` : ''}`
    : (reference ? `Reference: ${reference}` : '');

  const title = headline
    || (kind === 'offline' || kind === 'network' ? HEADLINES.offline : HEADLINES[intent] || HEADLINES.load);

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${style.wrap} ${compact ? 'text-xs' : ''} ${className}`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <Icon size={compact ? 14 : 16} className={`mt-0.5 shrink-0 ${style.iconClass}`} aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          <p className="mt-0.5 break-words opacity-90">{message}</p>
          {detail ? (
            <div className="mt-1.5">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2 opacity-75 hover:opacity-100"
              >
                <ChevronDown size={12} className={open ? 'rotate-180 transition' : 'transition'} aria-hidden="true" />
                {open ? 'Hide details' : 'Details'}
              </button>
              {open ? (
                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/5 p-2 font-mono text-[11px] leading-relaxed">
                  {detail}
                </pre>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {canRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-bold transition hover:bg-white ${compact ? 'px-2 py-1' : ''}`}
        >
          <RefreshCw size={13} aria-hidden="true" />Try again
        </button>
      ) : null}
    </div>
  );
}
