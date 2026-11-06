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
  ArrowRight, BellRing, Bot, Check, ChevronRight, Globe,
  MessageCircle, Package, ShieldCheck, Smartphone,
  Wallet, Zap,
} from 'lucide-react';
import { PublicShell, FEATURE_CARDS, STEPS } from './PublicPages.jsx';
import MetaTags from '../components/seo/MetaTags.jsx';
import OrganizationSchema from '../components/seo/OrganizationSchema.jsx';
import SoftwareApplicationSchema from '../components/seo/SoftwareApplicationSchema.jsx';
import FAQSchema from '../components/seo/FAQSchema.jsx';
import { META_CONTENT, siteUrl } from '../lib/seo.js';
import { usePublicPageContent } from '../lib/publicPageContent.js';

const AFFILIATE_DASHBOARD_URL = 'https://affiliate.didwaghana.com';

const HOME_HIGHLIGHTS = [
  { Icon: Zap, title: 'Sell in person, even offline', body: 'Record POS cash sales without a connection and sync queued sales when you are back online.' },
  { Icon: Globe, title: 'Make your storefront yours', body: 'Choose from 25 curated themes and preview your customizations before publishing.' },
  { Icon: Bot, title: 'Get guided seller AI', body: 'Use system-generated actions for product copy and insights grounded in your store data.' },
];

export default function WelcomePage({ authed = false, onStart, onDashboard }) {
  const start = onStart || (() => {});
  const dashboard = onDashboard || (() => {});
  const { content } = usePublicPageContent('/');

  const { homepage } = META_CONTENT;

  return (
    <>
      <MetaTags
        title={content.seoTitle || homepage.title}
        description={content.seoDescription || homepage.description}
        canonical={siteUrl('/')}
        ogImage={content.ogImage?.startsWith('http') ? content.ogImage : siteUrl(content.ogImage || '/didwa-logo.jpg')}
        keywords={['online store builder Ghana', 'e-commerce platform Ghana', 'digital POS Ghana', 'storefront themes Ghana', 'DiDwa AI for sellers']}
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
            {content.eyebrow && (
              <p className="animate-fade-up text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600 motion-reduce:animate-none">
                {content.eyebrow}
              </p>
            )}
            <h1 className="mt-5 animate-fade-up text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl motion-reduce:animate-none">
              {content.title}
              {content.titleAccent && <span className="mt-1 block bg-gradient-to-r from-blue-600 to-emerald-brand bg-clip-text text-transparent">{content.titleAccent}</span>}
            </h1>
            <p className="mt-5 max-w-lg animate-fade-up text-base leading-relaxed text-slate-500 sm:text-lg motion-reduce:animate-none" style={{ animationDelay: '90ms' }}>
              {content.description}
            </p>

            <div className="mt-8 flex animate-fade-up flex-wrap items-center gap-3 motion-reduce:animate-none" style={{ animationDelay: '180ms' }}>
              {authed ? (
                <button type="button" onClick={dashboard} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                  Open your dashboard <ArrowRight size={16} aria-hidden="true" />
                </button>
              ) : (
                <button type="button" onClick={() => start('register')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                  {content.primaryLabel || 'Start your free trial'} <ArrowRight size={16} aria-hidden="true" />
                </button>
              )}
              <a href={content.secondaryHref || '/how-it-works'} className="rounded-xl border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                {content.secondaryLabel || 'See how it works'}
              </a>
            </div>

            <ul className="mt-8 flex animate-fade-up flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-slate-400 motion-reduce:animate-none" style={{ animationDelay: '260ms' }}>
              {['No card required', 'Free 14-day trial', 'Cancel anytime'].map((x) => (
                <li key={x} className="flex items-center gap-1.5"><Check size={13} className="text-emerald-brand" aria-hidden="true" /> {x}</li>
              ))}
            </ul>
          </div>

          {/* Admin-managed visual */}
          <div className="relative hidden h-[460px] select-none sm:block">
            <div className="absolute inset-x-2 top-2 bottom-12 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10">
              {content.mediaType === 'video' && content.mediaUrl ? (
                <video className="h-full w-full object-cover" src={content.mediaUrl} poster={content.posterUrl || undefined} muted autoPlay loop playsInline aria-label={content.mediaAlt} />
              ) : (
                <img src={content.mediaUrl || '/iphone-shot.png'} alt={content.mediaAlt || 'DiDwa seller tools'} className="h-full w-full object-contain object-center" loading="eager" decoding="async" />
              )}
            </div>
            {content.mediaCaption && (
              <p className="absolute bottom-0 left-1/2 max-w-[70%] -translate-x-1/2 truncate rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                {content.mediaCaption}
              </p>
            )}

            <div className="absolute left-0 top-12 w-56 rounded-2xl border border-slate-100 bg-white/95 p-4 shadow-card backdrop-blur animate-fade-up motion-reduce:animate-none">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Live activity</p>
              <ul className="mt-3 space-y-3">
                {[
                  { Icon: Wallet, tone: 'bg-emerald-100 text-emerald-700', text: 'Managed payout request', meta: 'Manual review' },
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

            <div className="absolute bottom-10 right-0 w-52 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-card">
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

            <span className="absolute right-4 top-0 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[11px] font-bold text-slate-700 shadow-lg">
              <Zap size={12} className="text-emerald-600" /> 14-day free trial
            </span>
          </div>
        </div>
      </section>

      {/* Capability strip */}
      <section aria-label="Built for Ghanaian sellers" className="border-y border-slate-100 bg-white">
        <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-7 gap-y-3 px-4 py-5 sm:px-6">
          {[
            { Icon: Zap, text: 'Offline-capable POS' },
            { Icon: Wallet, text: 'Mobile Money & card checkout' },
            { Icon: MessageCircle, text: 'WhatsApp order tools' },
            { Icon: Smartphone, text: 'Mobile-friendly dashboard' },
            { Icon: BellRing, text: 'Stock and order alerts' },
            { Icon: ShieldCheck, text: 'Managed payout requests' },
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
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">{content.sectionEyebrow || 'Everything included'}</span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{content.sectionTitle || 'One login. Every tool your shop needs.'}</h2>
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

      {/* Practical benefits */}
      <section id="benefits" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
        <div className="relative overflow-hidden rounded-3xl bg-[#0B1120] px-8 py-12 text-white sm:px-12">
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden="true" style={{ backgroundImage: 'repeating-linear-gradient(135deg, #ffffff 0 2px, transparent 2px 14px)' }} />
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">Built for your day-to-day</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">Tools that work together around your store</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">Manage sales, your storefront and stock from one seller account, with guided AI tools that use your store's own information.</p>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
            {HOME_HIGHLIGHTS.map(({ Icon, title, body }) => (
              <article key={title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <Icon size={20} className="text-emerald-400" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-extrabold">{title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{body}</p>
              </article>
            ))}
          </div>
          <p className="mx-auto mt-10 flex max-w-md items-center justify-center gap-2 text-center text-xs font-semibold text-slate-400">
            <ShieldCheck size={14} className="shrink-0 text-emerald-400" aria-hidden="true" />
            Payout availability depends on your payment settings, verified wallet and eligible managed balance.
          </p>
        </div>
      </section>

      {/* Mobile seller tools */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12 lg:grid-cols-2">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">Mobile seller tools</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Manage your shop on mobile.</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-500 sm:text-base">
              Use the mobile-friendly seller dashboard to manage products, stock, sales and orders. Dedicated iOS and
              Android store downloads are not available yet; you can access your seller account from a mobile browser.
            </p>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {[
                'View and manage orders',
                'Edit products and stock',
                'Record POS cash sales offline',
                'Review managed payout requests',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Check size={16} className="shrink-0 text-emerald-500" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={authed ? dashboard : () => start('login')}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-charcoal px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Open seller dashboard <ArrowRight size={15} aria-hidden="true" />
            </button>
            <p className="mt-4 text-xs font-semibold text-slate-400">
              App Store and Google Play listings are coming soon.
            </p>
          </div>
          <div className="flex items-center justify-center">
            <img
              src="/iphone-shot.png"
              alt="DiDwa seller tools displayed on an iPhone, showing sales, pending orders, and store management tools"
              className="h-auto w-full max-w-[min(100%,28rem)] object-contain drop-shadow-2xl"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-emerald-600 px-8 py-14 text-center text-white sm:px-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to sell smarter?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-blue-100 sm:text-base">Bring in-person sales, your online store and stock tools into one seller workspace. Start with a 14-day free trial.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {authed ? (
              <>
                <button type="button" onClick={dashboard} className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-blue-700 shadow-xl transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  Open your dashboard <ArrowRight size={16} aria-hidden="true" />
                </button>
                <a href={AFFILIATE_DASHBOARD_URL} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-7 py-3.5 text-sm font-bold text-white shadow-xl transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ml-3">
                  Affiliate program <Smartphone size={16} aria-hidden="true" />
                </a>
              </>
            ) : (
              <>
                <button type="button" onClick={() => start('register')} className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-blue-700 shadow-xl transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  Start free trial <ArrowRight size={16} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => start('login')} className="rounded-xl border border-white/40 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  I already have a store
                </button>
                <a href={AFFILIATE_DASHBOARD_URL} className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  Affiliate program <Smartphone size={16} aria-hidden="true" />
                </a>
              </>
            )}
          </div>
        </div>
      </section>

    </PublicShell>
    </>
  );
}