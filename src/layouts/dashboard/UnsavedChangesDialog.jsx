/**
 * layouts/dashboard/UnsavedChangesDialog.jsx
 * The in-app "you have unsaved theme changes" prompt.
 *
 * Shown for in-app navigation only. Refreshing or closing the tab is handled by
 * the browser's own beforeunload dialog, whose wording we cannot control.
 *
 * STRICT RULE: pure SVG / Lucide icons only, ZERO emojis.
 */
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function UnsavedChangesDialog({
  open,
  leaving,
  hasSave = true,
  hasDiscard = true,
  onSave,
  onDiscard,
  onStay,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gs-unsaved-title"
      aria-describedby="gs-unsaved-body"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle size={20} className="text-amber-700" />
          </span>
          <div>
            <h2 id="gs-unsaved-title" className="text-base font-extrabold text-charcoal">
              You have unsaved theme changes
            </h2>
            <p id="gs-unsaved-body" className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Your customisations are only applied to your live storefront once you publish them.
              Leaving this page now will discard the changes you have made.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onStay}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-charcoal transition hover:bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Keep editing
          </button>
          {hasDiscard && (
            <button
              type="button"
              onClick={onDiscard}
              disabled={leaving}
              className="rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              Discard changes
            </button>
          )}
          {hasSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={leaving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {leaving && <Loader2 size={15} className="animate-spin" />}
              {leaving ? 'Publishing...' : 'Publish and leave'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
