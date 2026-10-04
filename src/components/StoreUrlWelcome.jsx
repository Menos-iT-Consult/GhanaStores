/**
 * components/StoreUrlWelcome.jsx
 * The post-signup welcome: here is your store URL, and here is the guide that
 * explains what to do next.
 *
 * Shown after a successful REGISTRATION only. A returning seller logging in
 * already knows where their shop is, and interrupting them again would be
 * noise - so this is deliberately not shown on the login path.
 *
 * The URL is whatever `storefrontUrl()` resolves for the new store. At signup
 * that is always the allocated subdomain: a custom domain cannot exist yet, so
 * there is nothing else to show.
 *
 * "Don't show this again" is stored in localStorage, which means the choice
 * follows the BROWSER, not the account. Signing up on a different device shows
 * the popup again. That is a deliberate trade for not adding a per-account
 * column to the stores table for a cosmetic onboarding prompt.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, ExternalLink, Rocket, X } from 'lucide-react';
import CopyButton from './CopyButton.jsx';
import { storefrontUrl } from '../config.js';

const STORAGE_KEY = 'didwa:hide-welcome-popup';

/** Whether this browser has been told to stop showing the popup. */
export function welcomeSuppressed() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    // Private browsing / blocked storage: treat as "not suppressed" so the
    // seller still sees their URL. Failing closed would hide it forever.
    return false;
  }
}

/** Remember the opt-out. Storage failures are non-fatal by design. */
export function suppressWelcome() {
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* nothing to do - the popup simply returns next time */
  }
}

/**
 * @param {object} props
 * @param {object} props.store The newly created store row.
 * @param {Function} props.onClose Dismiss the popup.
 * @param {Function} props.onOpenGuide Navigate to the developer guide.
 */
export default function StoreUrlWelcome({ store, onClose, onOpenGuide }) {
  const [dontShow, setDontShow] = useState(false);
  const url = storefrontUrl(store);
  const dismissRef = useRef(null);

  const close = useCallback(() => {
    if (dontShow) suppressWelcome();
    onClose();
  }, [dontShow, onClose]);

  // Escape closes the dialog, as every modal is expected to.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close]);

  // Move focus into the dialog so keyboard and screen-reader users land here
  // rather than continuing from wherever the signup form left off.
  useEffect(() => { dismissRef.current?.focus(); }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gs-welcome-title"
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10"
      >
        <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-7 text-white">
          <button
            ref={dismissRef}
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-lg p-1.5 text-white/70 transition hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X size={18} />
          </button>
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <Rocket size={22} aria-hidden="true" />
          </span>
          <h2 id="gs-welcome-title" className="mt-4 text-xl font-extrabold tracking-tight">
            Your store is live
          </h2>
          <p className="mt-1 text-sm text-blue-100">
            Share this link with your customers. Your 14-day trial has started.
          </p>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-6">
          <div>
            <label
              htmlFor="gs-welcome-url"
              className="text-xs font-extrabold uppercase tracking-wider text-slate-400"
            >
              Your store URL
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
              {/* readonly + focus-selects: the last-resort manual copy. The
                  value is derived from the store, never an editable input. */}
              <input
                id="gs-welcome-url"
                readOnly
                value={url}
                onFocus={(e) => e.target.select()}
                className="min-w-0 flex-1 bg-transparent px-2 font-mono text-sm text-charcoal focus:outline-none"
                aria-label="Your store URL"
              />
              <CopyButton value={url} size="xs" />
            </div>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
              >
                Open my store
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenGuide}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
              <BookOpen size={17} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-charcoal">Get started guide</span>
              <span className="block text-xs text-slate-500">
                Add products, take payments, and go live.
              </span>
            </span>
            <ArrowRight size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
          </button>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <label className="flex cursor-pointer select-none items-center gap-2 text-xs font-semibold text-slate-500">
              <input
                type="checkbox"
                checked={dontShow}
                onChange={(e) => setDontShow(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
              Don&apos;t show this again
            </label>
            <button
              type="button"
              onClick={close}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {dontShow ? 'Got it, and hide this' : 'Start selling'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}