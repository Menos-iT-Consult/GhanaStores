/**
 * WelcomePage - public marketing index for DiDwa.
 * Tells visitors what the platform does and funnels them into the seller
 * PWA (register / login). Rendered at the site root with NO
 * dashboard chrome, open to everyone.
 *
 * Props:
 *   authed       - hides "sign in", offers "Open dashboard" instead.
 *   onStart(m)   - open auth screen preselected to 'register'|'login'.
 *   onDashboard()- send an authenticated seller into the PWA.
 *
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import {
  ArrowRight, BarChart3, BellRing, Check, ChevronRight, Globe,
  MessageCircle, Package, ShieldCheck, Smartphone, Sparkles,
  Wallet, Zap,
} from 'lucide-react';
import { PublicShell, FEATURE_CARDS, STEPS, STATS } from './PublicPages.jsx';
import MetaTags from '../components/seo/MetaTags.jsx';
import OrganizationSchema from '../components/seo/OrganizationSchema.jsx';
import SoftwareApplicationSchema from '../components/seo/SoftwareApplicationSchema.jsx';
import FAQSchema from '../components/seo/FAQSchema.jsx';
import { META_CONTENT } from '../lib/seo.js';


export default function WelcomePage({ authed = false, onStart, onDashboard }) {
  const start = onStart || (() => {});
  const dashboard = onDashboard || (() => {});

  const { homepage } = META_CONTENT;

  return (
    <>
      <MetaTags
        title={homepage.title}
        description={homepage.description}
        canonical="https://didwaghana.com"
        ogImage="https://didwaghana.com/og-homepage.jpg"
        keywords={['online store builder Ghana', 'e-commerce platform Ghana', 'digital POS Ghana']}
      />
      <OrganizationSchema />
      <SoftwareApplicationSchema />
      <FAQSchema />

      <PublicShell authed={authed} onStart={onStart} onDashboard={onDashboard} wide>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute right-0 top-40 h-96 w-96 rounded-full bg-emerald-brand/10 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:pt-24">
          <div>
            <h1 className="mt-5 animate-fade-up text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl motion-reduce:animate-none">
              Sell in-store &amp; online.
              <span className="mt-1 block bg-gradient-to-r from-blue-600 to-emerald-brand bg-clip-text text-transparent">Get paid instantly.</span>
            </h1>
            <p className="mt-5 max-w-lg animate-fade-up text-base leading-relaxed text-slate-500 sm:text-lg motion-reduce:animate-none" style={{ animationDelay: '90ms' }}>
              DiDwa is the all-in-one companion for Ghanaian merchants: a POS that works offline, Mobile Money payouts,
              inventory with smart alerts, WhatsApp ordering, a storefront you can theme and a seller app with push
              alerts - all from one login.
            </p>

            <div className="mt-8 flex animate-fade-up flex-wrap items-center gap-3 motion-reduce:animate-none" style={{ animationDelay: '180ms' }}>
              {authed ? (
                <button type="button" onClick={dashboard} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                  Open your dashboard <ArrowRight size={16} aria-hidden="true" />
                </button>
              ) : (
                <button type="button" onClick={() => start('register')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                  Start your free trial <ArrowRight size={16} aria-hidden="true" />
                </button>
              )}
              <a href="/how-it-works" className="rounded-xl border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                See how it works
              </a>
            </div>

            <ul className="mt-8 flex animate-fade-up flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-slate-400 motion-reduce:animate-none" style={{ animationDelay: '260ms' }}>
              {['No card required', 'Free 14-day trial', 'Cancel anytime'].map((x) => (
                <li key={x} className="flex items-center gap-1.5"><Check size={13} className="text-emerald-brand" aria-hidden="true" /> {x}</li>
              ))}
            </ul>
          </div>

          {/* App-preview collage (pure CSS) */}
          <div className="relative hidden h-[380px] select-none sm:block" aria-hidden="true">
            <div className="absolute right-0 top-6 w-72 rotate-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition-transform duration-300 hover:rotate-1">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">This week</p>
              <div className="mt-4 flex h-28 items-end gap-2">
                {[42, 68, 55, 82, 60, 95, 74, 100].map((h, i) => (
                  <span key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-blue-600/80 to-blue-400" style={{ height: `${h}%` }} />
                ))}
              </div>
              <p className="mt-3 text-xs font-bold text-slate-500">Sales trending up 18%</p>
            </div>

            <div className="absolute left-2 top-36 w-80 -rotate-2 rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition-transform duration-300 hover:-rotate-1">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Live activity</p>
              <ul className="mt-3 space-y-3">
                {[
                  { Icon: Wallet, tone: 'bg-emerald-100 text-emerald-700', text: 'MoMo payout sent', meta: '+ GHS 480.00' },
                  { Icon: MessageCircle, tone: 'bg-blue-100 text-blue-700', text: 'New WhatsApp order', meta: 'Kente scarf x2' },
                  { Icon: BellRing, tone: 'bg-amber-100 text-amber-700', text: 'Low stock alert', meta: 'Shea butter - 3 left' },
                ].map(({ Icon, tone, text, meta }) => (
                  <li key={text} className="flex items-center gap-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone}`}><Icon size={15} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold">{text}</span>
                      <span className="block truncate text-[11px] text-slate-400">{meta}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mini POS mock */}
            <div className="absolute bottom-0 right-2 w-60 -rotate-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-card transition-transform duration-300 hover:rotate-0">
              <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                <Package size={12} className="text-blue-500" aria-hidden="true" /> Point of sale
              </p>
              <ul className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { name: 'Kente hat', price: 'GHS 45.00' },
                  { name: 'Shea butter', price: 'GHS 30.00' },
                  { name: 'Beads set', price: 'GHS 60.00' },
                  { name: 'Kaftan', price: 'GHS 120.00' },
                ].map(({ name, price }) => (
                  <li key={name} className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5">
                    <span className="block truncate text-[10px] font-bold text-slate-600">{name}</span>
                    <span className="block text-[10px] font-extrabold text-blue-600">{price}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-[#0B1120] px-3 py-2">
                <span className="text-[11px] font-bold text-slate-300">Total &middot; 4 items</span>
                <span className="text-xs font-extrabold text-white">GHS 255.00</span>
              </div>
              <span className="mt-2 block rounded-lg bg-blue-600 py-2 text-center text-[11px] font-extrabold text-white shadow-md shadow-blue-600/30">
                Charge GHS 255.00
              </span>
            </div>

            <span className="absolute right-10 top-0 inline-flex items-center gap-1.5 rounded-full bg-[#0B1120] px-3.5 py-1.5 text-[11px] font-bold text-white shadow-lg">
              <Zap size={12} className="text-emerald-400" /> 14-day free trial
            </span>
          </div>
        </div>
      </section>

      {/* Capability strip */}
      <section aria-label="Built for Ghanaian sellers" className="border-y border-slate-100 bg-white">
        <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-7 gap-y-3 px-4 py-5 sm:px-6">
          {[
            { Icon: Zap, text: 'Offline-first POS' },
            { Icon: Wallet, text: 'MoMo & card payouts' },
            { Icon: MessageCircle, text: 'WhatsApp orders' },
            { Icon: Smartphone, text: 'Seller app + push' },
            { Icon: BellRing, text: 'Instant alerts' },
            { Icon: ShieldCheck, text: 'Two-factor login' },
          ].map(({ Icon, text }) => (
            <li key={text} className="flex items-center gap-2 text-xs font-bold text-slate-500 sm:text-sm">
              <Icon size={15} className="shrink-0 text-blue-600" aria-hidden="true" /> {text}
            </li>
          ))}
        </ul>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">Everything included</span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">One login. Every tool your shop needs.</h2>
          <p className="mt-4 text-base text-slate-500">Stop stitching together notebooks, calculators and chat threads - DiDwa runs the whole sale, end to end.</p>
          <p className="mt-3 text-sm font-semibold text-slate-600">
            Every plan starts with a 14-day free trial.{' '}
            <a href="/pricing" className="text-blue-600 underline-offset-2 transition hover:text-blue-700 hover:underline">
              See pricing
            </a>
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_CARDS.map(({ Icon, title, body }) => (
            <article key={title} className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-card ring-1 ring-slate-900/5 transition duration-300 hover:-translate-y-1 hover:shadow-lg">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                <Icon size={19} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-extrabold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{body}</p>
            </article>
          ))}
        </div>

        <p className="mt-10 text-center">
          <a href="/features" className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 transition hover:text-blue-700">
            See every feature <ChevronRight size={15} aria-hidden="true" />
          </a>
        </p>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 bg-mist/70 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">Up and running in minutes</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Three steps to your first sale</h2>
          </div>

          <div className="relative">
            <span className="pointer-events-none absolute left-[16%] right-[16%] top-[44px] hidden border-t-2 border-dashed border-blue-200 md:block" aria-hidden="true" />
            <ol className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map(({ n, title, body }) => (
                <li key={n} className="relative rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
                  <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-[#0B1120] text-sm font-extrabold text-emerald-400">{n}</span>
                  <h3 className="mt-4 text-base font-extrabold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{body}</p>
                </li>
              ))}
            </ol>
          </div>

          <p className="mt-10 text-center">
            <a href="/how-it-works" className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 transition hover:text-blue-700">
              Read the full walkthrough <ChevronRight size={15} aria-hidden="true" />
            </a>
          </p>
        </div>
      </section>

      {/* Stats / why us */}
      <section id="stats" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
        <div className="relative overflow-hidden rounded-3xl bg-[#0B1120] px-8 py-12 text-white sm:px-12">
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden="true" style={{ backgroundImage: 'repeating-linear-gradient(135deg, #ffffff 0 2px, transparent 2px 14px)' }} />
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">Why merchants switch</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">The back office that runs itself</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">From kiosks at Makola to growing boutiques in Kumasi - sellers use DiDwa to keep books clean and cash moving.</p>
          </div>
          <dl className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-6 text-center md:grid-cols-4">
            {STATS.map(({ v, k }) => (
              <div key={k}>
                <dt className="order-last mt-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">{k}</dt>
                <dd className="text-2xl font-extrabold text-emerald-400 sm:text-3xl">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mx-auto mt-10 flex max-w-md items-center justify-center gap-2 text-center text-xs font-semibold text-slate-400">
            <ShieldCheck size={14} className="shrink-0 text-emerald-400" aria-hidden="true" />
            Your data is encrypted, two-factor login is built in, and your storefront runs on its own secure web address.
          </p>
        </div>
      </section>

      {/* Seller app */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12 lg:grid-cols-2">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">Seller app</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Your store, in your pocket.</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-500 sm:text-base">
              Run the whole shop from your phone: an offline-first POS that keeps selling when the
              network drops, live order alerts with push notifications, catalog and stock edits,
              customer loyalty and Mobile Money payouts - all synced to the same account.
            </p>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {[
                'Offline POS with outbox sync',
                'Push alerts for new orders',
                'Catalog & stock on the go',
                'Mobile Money payouts',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Check size={16} className="shrink-0 text-emerald-500" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#"
                aria-disabled="true"
                className="inline-flex items-center gap-3 rounded-xl bg-charcoal px-5 py-3 text-white shadow-lg transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true">
                  <path d="M17.05 12.04c-.03-3.14 2.57-4.64 2.69-4.72-1.46-2.14-3.74-2.43-4.55-2.46-1.94-.2-3.78 1.14-4.77 1.14-1 0-2.5-1.11-4.11-1.08-2.11.03-4.06 1.23-5.15 3.12-2.19 3.8-.56 9.42 1.58 12.5 1.04 1.51 2.28 3.2 3.91 3.14 1.57-.06 2.17-1.01 4.06-1.01 1.89 0 2.43 1.01 4.11.98 1.69-.03 2.76-1.53 3.79-3.05 1.2-1.75 1.69-3.45 1.72-3.54-.04-.02-3.29-1.26-3.32-5.02zM14.1 3.13c.86-1.04 1.44-2.5 1.28-3.94-1.24.05-2.74.83-3.63 1.87-.8.93-1.5 2.41-1.31 3.82 1.38.11 2.79-.71 3.66-1.75z" />
                </svg>
                <span className="flex flex-col leading-tight">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">Download on the</span>
                  <span className="text-base font-extrabold">App Store</span>
                </span>
              </a>
              <a
                href="#"
                aria-disabled="true"
                className="inline-flex items-center gap-3 rounded-xl bg-charcoal px-5 py-3 text-white shadow-lg transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true">
                  <path d="M3.6 1.8c-.4.3-.6.8-.6 1.5v17.4c0 .7.2 1.2.6 1.5l.1.1 9.8-9.8v-.2L3.7 1.7l-.1.1z" />
                  <path d="M16.6 15.5l-3.3-3.3v-.2l3.3-3.3.1.1 4 2.3c1.1.6 1.1 1.7 0 2.3l-4 2.1-.1 0z" fill="#FFC107" />
                  <path d="M16.7 15.4L13.3 12 3.6 21.7c.4.4 1 .4 1.7 0l11.4-6.3z" fill="#4CAF50" />
                  <path d="M16.7 8.6L5.3 2.3c-.7-.4-1.3-.4-1.7 0L13.3 12l3.4-3.4z" fill="#03A9F4" />
                </svg>
                <span className="flex flex-col leading-tight">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">Get it on</span>
                  <span className="text-base font-extrabold">Google Play</span>
                </span>
              </a>
            </div>
            <p className="mt-4 text-xs font-semibold text-slate-400">
              App Store &amp; Google Play listings coming soon - links will be activated at launch.
            </p>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative h-72 w-36 rounded-[2.5rem] border-4 border-slate-900 bg-slate-900 shadow-2xl">
              <div className="absolute inset-2 overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 to-emerald-500">
                <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center text-white">
                  <Smartphone size={40} aria-hidden="true" />
                  <span className="text-xs font-extrabold">DiDwa Seller</span>
                  <span className="text-[10px] font-semibold opacity-80">POS &middot; Orders &middot; Stock</span>
                </div>
              </div>
              <div className="absolute left-1/2 top-2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-slate-700" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-emerald-600 px-8 py-14 text-center text-white sm:px-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to sell smarter?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-blue-100 sm:text-base">Join thousands of Ghanaian merchants running their entire shop from one app. Free for 14 days.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {authed ? (
              <>
                <button type="button" onClick={dashboard} className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-blue-700 shadow-xl transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  Open your dashboard <ArrowRight size={16} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => window.location.href='/affiliate/signup'} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-7 py-3.5 text-sm font-bold text-white shadow-xl transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ml-3">
                  Affiliate program <Smartphone size={16} aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => start('register')} className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-blue-700 shadow-xl transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  Start free trial <ArrowRight size={16} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => start('login')} className="rounded-xl border border-white/40 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  I already have a store
                </button>
              </>
            )}
          </div>
        </div>
      </section>

    </PublicShell>
    </>
  );
}