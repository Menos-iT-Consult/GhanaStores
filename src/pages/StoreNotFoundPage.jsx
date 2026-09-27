/**
 * StoreNotFoundPage - "Store not found" for a host that looks like a storefront
 * but resolves to no active store: a mistyped seller address, a closed store, or
 * a SUSPENDED one (the Host resolver deliberately skips suspended stores).
 *
 * This renders ON the storefront host itself, so every link out has to be
 * absolute - navigate('/') would just land back on this same dead host.
 *
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import { ArrowRight, LifeBuoy } from 'lucide-react';
import { IconAlert, IconStore, LogoLockup } from '../components/icons.jsx';
import { getPlatformDomain } from '../config.js';

/**
 * Platform home for the host we are on: `slug.didwaghana.com` -> `didwaghana.com`.
 * The build-time apex can be wrong, so prefer the host actually being served.
 * Returns '' when no safe guess is possible.
 */
function platformHome(host) {
  const labels = String(host || '').split('.').filter(Boolean);
  if (labels.length >= 3) return `https://${labels.slice(1).join('.')}`;
  return getPlatformDomain() ? `https://${getPlatformDomain()}` : '';
}

const REASONS = [
  'The address was typed or shared incorrectly - seller addresses are a single word before the domain.',
  'The store was closed by its owner, so its address was released.',
  'The store is temporarily suspended, which hides the storefront until it is reactivated.',
];

export default function StoreNotFoundPage({ host = '' }) {
  const home = platformHome(host);
  const homeLabel = home.replace(/^https?:\/\//, '');
  const apexLabel = getPlatformDomain();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-900/5 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
          {home ? (
            <a href={home} aria-label={`Go to ${homeLabel}`}><LogoLockup onLight /></a>
          ) : (
            <LogoLockup onLight />
          )}
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Storefront</span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-14 sm:px-6">
        <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-widest text-amber-700">
            <IconAlert size={14} /> 404
          </span>
          <h1 className="mt-5 flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-charcoal sm:text-3xl">
            <IconStore size={26} className="text-blue-600" /> Store not found
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-500">
            No shop is registered at this address. Nothing was charged and no order was placed.
          </p>

          {host ? (
            <p className="mt-5 text-xs font-semibold text-slate-400">
              Requested store:{' '}
              <code className="rounded bg-mist px-1.5 py-0.5 font-mono text-slate-600">{host}</code>
            </p>
          ) : null}

          <ul className="mt-6 space-y-2.5">
            {REASONS.map((reason) => (
              <li key={reason} className="flex gap-2.5 text-sm leading-relaxed text-slate-600">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" aria-hidden="true" />
                {reason}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {home ? (
              <a
                href={home}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 sm:w-auto"
              >
                Go to {homeLabel} <ArrowRight size={15} aria-hidden="true" />
              </a>
            ) : null}
            {home ? (
              <a
                href={`${home}/contact`}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 sm:w-auto"
              >
                <LifeBuoy size={15} aria-hidden="true" /> Get help
              </a>
            ) : null}
          </div>

          {home ? (
            <p className="mt-8 border-t border-slate-100 pt-6 text-sm text-slate-500">
              Are you the shop owner?{' '}
              <a href={`${home}/login`} className="font-bold text-blue-600 hover:underline">Sign in to your dashboard</a>{' '}
              to check your address, or{' '}
              <a href={`${home}/contact`} className="font-bold text-blue-600 hover:underline">contact support</a>{' '}
              if you think this is a mistake.
            </p>
          ) : null}
        </div>
      </main>

      <footer className="border-t border-slate-900/5 bg-white py-6">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 px-4 text-xs font-semibold text-slate-400 sm:flex-row sm:px-6">
          <p>DiDwa - online shops for Ghanaian merchants</p>
          {apexLabel ? <a href={home || '/'} className="transition hover:text-charcoal">{apexLabel}</a> : null}
        </div>
      </footer>
    </div>
  );
}
