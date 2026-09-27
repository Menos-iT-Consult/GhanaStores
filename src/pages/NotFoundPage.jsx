/**
 * NotFoundPage - the 404 surface for the SPA.
 *
 * Rendered whenever the current path matches no route in the table kept in
 * App.jsx. Two shapes:
 *   standalone (default) - wrapped in the public shell (marketing nav + footer)
 *                          for visitors, with no dashboard chrome.
 *   embedded             - bare card, for use inside the dashboard shell when a
 *                          signed-in seller hits an unknown PWA path.
 *
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import { ArrowRight, Compass, Home } from 'lucide-react';
import { PublicShell } from './PublicPages.jsx';
import { getPlatformDomain } from '../config.js';
import { navigate } from '../router.js';

export default function NotFoundPage({ authed = false, embedded = false, path = '' }) {
  /* Read at render time: the apex reported by the API replaces whatever value
     was compiled into this bundle. */
  const apex = getPlatformDomain();
  const card = (
    <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24">
      <div className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-widest text-blue-600">
          <Compass size={14} aria-hidden="true" /> 404
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-charcoal sm:text-4xl">Page not found</h1>
        <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-slate-500">
          This address does not exist on the platform. The link may be incomplete, or the page may have been moved or renamed.
        </p>
        {path ? (
          <p className="mt-4 text-xs font-semibold text-slate-400">
            Requested path:{' '}
            <code className="rounded bg-mist px-1.5 py-0.5 font-mono text-slate-600">{path}</code>
          </p>
        ) : null}

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => { navigate('/'); }}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 sm:w-auto"
          >
            <Home size={16} aria-hidden="true" /> Back to home
          </button>
          <button
            type="button"
            onClick={() => { navigate(authed ? '/dashboard' : '/login'); }}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 sm:w-auto"
          >
            {authed ? 'Open dashboard' : 'Start free'} <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>

        <p className="mt-8 text-sm text-slate-500">
          Still stuck?{' '}
          <button
            type="button"
            onClick={() => { navigate('/contact'); }}
            className="font-bold text-blue-600 hover:underline"
          >
            Contact support
          </button>
          {apex ? (
            <>
              {' '}or email{' '}
              <a href={`mailto:hello@${apex}`} className="font-bold text-blue-600 hover:underline">
                hello@{apex}
              </a>
            </>
          ) : null}
          .
        </p>
      </div>
    </section>
  );

  if (embedded) return card;
  return <PublicShell authed={authed}>{card}</PublicShell>;
}
