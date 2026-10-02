/**
 * PublicPages - standalone public web pages served OUTSIDE the dashboard
 * shell: About Us, Contact Us, Terms of Service and Privacy Policy.
 *
 * All four share PublicShell (compact nav + footer) so branding stays
 * consistent with the marketing index. Routes are wired in App.jsx:
 *   /about · /contact · /terms · /privacy
 *
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import { useState } from 'react';
import {
  ArrowRight, BarChart3, Check, Globe, Mail, MapPin, MessageCircle,
  Package, Phone, Scale, Send, ShieldCheck, Smartphone, Wallet, Zap,
} from 'lucide-react';
import { LogoLockup, IconSpinner } from '../components/icons.jsx';
import { api } from '../api.js';
import PlanGrid, { CycleToggle } from '../components/PlanGrid.jsx';
import { usePlans } from '../lib/plans.js';
import { getPlatformDomain } from '../config.js';
import { navigate } from '../router.js';

const UPDATED = 'August 2026';
/** Contact address, built at render time so the API's apex always wins. */
const contactEmail = () => `hello@${getPlatformDomain()}`;
const CONTACT_PHONE_RAW = String(import.meta.env.VITE_PLATFORM_PHONE || '+233 20 123 4567').trim();
const CONTACT_PHONE_E164 = CONTACT_PHONE_RAW.replace(/\s+/g, '');

/* ------------------------------ Shared shell ------------------------------- */
/** Primary marketing nav: every destination is a real page, not a scroll anchor. */
export const MARKETING_LINKS = [
  ['/features', 'Features'],
  ['/how-it-works', 'How it works'],
  ['/pricing', 'Pricing'],
  ['/about', 'About Us'],
  ['/contact', 'Contact'],
];

export function PublicShell({ authed, children, wide = false }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-charcoal">
      <header className="sticky top-0 z-40 border-b border-slate-900/5 bg-white/85 backdrop-blur">
        <div className={`mx-auto flex h-16 items-center justify-between gap-4 px-4 sm:px-6 ${wide ? 'max-w-6xl' : 'max-w-5xl'}`}>
          <button type="button" onClick={() => { navigate('/'); }} aria-label="Back to home">
            <LogoLockup onLight />
          </button>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-500 lg:flex" aria-label="Site sections">
            {MARKETING_LINKS.map(([path, label]) => (
              <a key={path} href={path} className="transition hover:text-charcoal">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {authed ? (
              <button
                type="button"
                onClick={() => { navigate('/dashboard'); }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
              >
                Open dashboard <ArrowRight size={15} aria-hidden="true" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { navigate('/login'); }}
                  className="hidden rounded-xl px-3.5 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:block"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => { navigate('/login'); }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
                >
                  Start free <ArrowRight size={15} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-900/5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-xs font-semibold text-slate-400 sm:flex-row sm:px-6">
          <LogoLockup onLight />
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2" aria-label="Site links">
            {[['/', 'Home'], ['/features', 'Features'], ['/pricing', 'Pricing'], ['/about', 'About Us'], ['/contact', 'Contact']].map(([href, label]) => (
              <a key={label} href={href} className="transition hover:text-charcoal">{label}</a>
            ))}
            <a href="/terms" className="transition hover:text-charcoal">Terms</a>
            <a href="/privacy" className="transition hover:text-charcoal">Privacy</a>
          </nav>
          <p>© {new Date().getFullYear()} DiDwa</p>
        </div>
      </footer>
    </div>
  );
}

/** Centered hero band shared by info pages. */
function PageHero({ eyebrow, title, sub }) {
  return (
    <section className="relative overflow-hidden border-b border-slate-900/5 bg-mist/60 py-16 sm:py-20">
      <div className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">{eyebrow}</span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        {sub ? <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-500">{sub}</p> : null}
      </div>
    </section>
  );
}

/* -------------------------------- About Us -------------------------------- */
export function AboutPage({ authed = false }) {
  const values = [
    { Icon: ShieldCheck, title: 'Merchant first', body: 'Every feature starts with a shop-owner problem - never with a trend.' },
    { Icon: Zap, title: 'Built for reality', body: 'Power cuts and patchy networks are normal here, so offline mode is the core, not an extra.' },
    { Icon: Scale, title: 'Honest by default', body: 'Clear pricing, plain-language policies and payouts that land when we say they will.' },
  ];
  return (
    <PublicShell authed={authed}>
      <PageHero
        eyebrow="Our story"
        title="Commerce tools made for Ghana."
        sub="DiDwa exists because running a shop here should not require five notebooks, two calculators and a leap of faith."
      />
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="space-y-5 text-[15px] leading-relaxed text-slate-600">
          <p>We started in Accra watching brilliant traders lose hours to manual receipts, missed MoMo confirmations and stock counts done from memory. The tools that existed were built elsewhere, priced in dollars and designed for shops that never lose internet.</p>
          <p>So we built the opposite: a seller companion that assumes patchy networks, speaks Mobile Money natively, reconciles rider cash without drama and turns every WhatsApp enquiry into a receipted order. One login runs the counter, the storefront and the books.</p>
          <p>Today merchants across all sixteen regions use DiDwa to sell in person and online - and we are just getting started.</p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {values.map(({ Icon, title, body }) => (
            <article key={title} className="rounded-2xl border border-slate-100 bg-mist/50 p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon size={19} aria-hidden="true" /></span>
              <h3 className="mt-4 text-base font-extrabold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{body}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#0B1120] p-7 text-white">
          <div>
            <h3 className="text-lg font-extrabold">Run your shop on DiDwa</h3>
            <p className="mt-1 text-sm text-slate-300">Free for 14 days. No card required.</p>
          </div>
          <button
            type="button"
            onClick={() => { navigate(authed ? '/dashboard' : '/login'); }}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-brand px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            {authed ? 'Open dashboard' : 'Start free trial'} <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      </section>
    </PublicShell>
  );
}

/* ------------------------------- Contact Us ------------------------------- */
export function ContactPage({ authed = false }) {
  const [sent, setSent] = useState(false);
  /* The form used to call preventDefault() and flip straight to "Message
     received", which DISCARDED every submission while telling the visitor it
     had arrived. It now posts to the API and only reports success once the
     message is genuinely stored. */
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', topic: 'Sales question', message: '' });
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submitContact(e) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setFormError('');
    try {
      await api.post('/api/contact', form);
      setSent(true);
      setForm({ name: '', email: '', topic: 'Sales question', message: '' });
    } catch (err) {
      // Stay on the form and keep what they typed, so a failed send costs them
      // nothing.
      setFormError(err.message || 'Could not send your message. Please try again.');
    } finally {
      setSending(false);
    }
  }
  const cards = [
    { Icon: Mail, label: 'Email us', value: contactEmail(), href: `mailto:${contactEmail()}` },
        { Icon: Phone, label: 'Call support', value: CONTACT_PHONE_RAW, href: `tel:${CONTACT_PHONE_E164}` },
    { Icon: MessageCircle, label: 'WhatsApp', value: 'Chat with the team', href: `https://wa.me/${CONTACT_PHONE_E164}` },
  ];
  const inputCls = 'w-full rounded-xl border border-slate-200 bg-mist/60 px-3.5 py-2.5 text-sm transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100';

  return (
    <PublicShell authed={authed}>
      <PageHero
        eyebrow="Contact us"
        title="Talk to a human."
        sub="Sales questions, payout issues or feature ideas - we reply within one business day."
      />
      <section className="mx-auto grid max-w-5xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          {cards.map(({ Icon, label, value, href }) => (
            <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon size={18} aria-hidden="true" /></span>
              <span className="min-w-0">
                <span className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{label}</span>
                <span className="block truncate text-sm font-bold">{value}</span>
              </span>
            </a>
          ))}
          <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-mist/60 p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><MapPin size={18} aria-hidden="true" /></span>
            <span>
              <span className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Visit us</span>
              <span className="block text-sm font-bold">12 Oxford Street, Osu - Accra, Ghana</span>
              <span className="mt-1 block text-xs text-slate-400">Mon - Fri, 8:00 - 17:00 GMT</span>
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-7">
          {sent ? (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center" role="status">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Send size={22} aria-hidden="true" /></span>
              <h2 className="mt-4 text-lg font-extrabold">Message received</h2>
              <p className="mt-1.5 max-w-xs text-sm text-slate-500">Thanks for reaching out - our team replies within one business day.</p>
              <button type="button" onClick={() => setSent(false)} className="mt-5 text-xs font-bold text-blue-600 underline">Send another</button>
            </div>
          ) : (
            <form onSubmit={submitContact} className="space-y-4">
              <h2 className="text-lg font-extrabold">Send a message</h2>
              {formError && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{formError}</p>
              )}
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Full name</span>
                <input required type="text" name="name" value={form.name} onChange={setField('name')} placeholder="Ama Mensah" className={inputCls} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</span>
                <input required type="email" name="email" value={form.email} onChange={setField('email')} placeholder="you@example.com" className={inputCls} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Topic</span>
                <select name="topic" value={form.topic} onChange={setField('topic')} className={inputCls}>
                  <option>Sales question</option><option>Payouts &amp; MoMo</option><option>Technical support</option><option>Partnership</option>
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Message</span>
                <textarea required rows={4} name="message" value={form.message} onChange={setField('message')} placeholder="Tell us what you need..." className={`${inputCls} resize-none`} />
              </label>
              <button type="submit" disabled={sending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-700 hover:to-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60">
                {sending ? <IconSpinner size={15} aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
                {sending ? 'Sending...' : 'Send message'}
              </button>
            </form>
          )}
        </div>
      </section>
    </PublicShell>
  );
}

/* Legal copy is authored with {platform} / {contact} placeholders and filled in
   at render time, because the apex is only known once the API has answered. */
const withPlatform = (text) => String(text)
  .replace(/\{platform\}/g, getPlatformDomain())
  .replace(/\{contact\}/g, contactEmail());

/* ------------------------------ Legal renderer ----------------------------- */
function LegalDoc({ authed, title, intro, sections }) {
  return (
    <PublicShell authed={authed}>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <a href="/" className="text-xs font-bold text-blue-600 hover:underline">Back to home</a>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">Last updated: {UPDATED}</p>

        <p className="mt-6 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">{withPlatform(intro)}</p>

        <div className="mt-10 space-y-9">
          {sections.map((s, i) => (
            <section key={s.h}>
              <h2 className="flex items-baseline gap-2.5 text-base font-extrabold">
                <span className="text-blue-600">{String(i + 1).padStart(2, '0')}</span>
                {withPlatform(s.h)}
              </h2>
              {(s.ps || []).map((p, j) => (
                <p key={j} className="mt-2.5 text-sm leading-relaxed text-slate-600">{withPlatform(p)}</p>
              ))}
              {s.list ? (
                <ul className="mt-3 space-y-2">
                  {s.list.map((x) => (
                    <li key={x} className="flex gap-2.5 text-sm leading-relaxed text-slate-600">
                      <Check size={14} className="mt-1 shrink-0 text-emerald-brand" aria-hidden="true" />
                      <span>{withPlatform(x)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-slate-100 bg-mist/60 p-6">
          <h2 className="text-sm font-extrabold">Questions about this document?</h2>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <a href={`mailto:${contactEmail()}`} className="inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700"><Mail size={13} aria-hidden="true" />{contactEmail()}</a>
            <a href="/contact" className="inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700"><Send size={13} aria-hidden="true" />Contact page</a>
          </p>
        </div>
      </div>
    </PublicShell>
  );
}

/* ---------------------------- Terms of Service ----------------------------- */
const TERMS_SECTIONS = [
  {
    h: 'Accepting these terms',
    ps: [
      `By creating an account or using DiDwa (the "Service") you agree to these Terms of Service and our Privacy Policy. If you register on behalf of a business, you confirm you are authorised to bind that business.`,
      'You must be at least 18 years old, or have the consent and supervision of a parent or guardian, to use the Service.',
    ],
  },
  {
    h: 'Accounts and free trial',
    ps: ['You are responsible for the accuracy of your registration details and for keeping your password confidential. Notify us immediately of any unauthorised access.'],
    list: [
      'New merchants receive a fourteen (14) day free trial - one trial per merchant.',
      'No payment card is required during the trial.',
      'We may suspend accounts with false details or abusive behaviour.',
    ],
  },
  {
    h: 'Your storefront address',
    ps: [
      `Each store receives a subdomain on {platform} (for example yourstore.{platform}). Subdomains are provisioned on a first-come basis, must not infringe third-party rights and may be reclaimed if left unused.`,
      'You may attach a custom domain; DNS propagation and SSL certificate issuance depend on your registrar and typically complete within 24-72 hours.',
    ],
  },
  {
    h: 'Selling rules',
    ps: ['You may only sell products you are legally entitled to sell under the laws of the Republic of Ghana. The Service may not be used for counterfeit goods, weapons, narcotics, gambling, or any restricted or prohibited trade.'],
  },
  {
    h: 'Payments, fees and payouts',
    ps: [
      'Mobile Money collections are processed by licensed payment processors (currently Hubtel). Settlement times are set by those processors; payouts are typically initiated within twenty-four hours of request.',
      'Chargebacks, reversals and processor penalties arising from your sales are your responsibility. Applicable subscription fees are displayed in the dashboard before checkout.',
    ],
  },
  {
    h: 'Delivery and fulfilment',
    ps: ['You set and honour your own delivery promises. Rider assignment and cash-reconciliation tools are provided to assist you but do not transfer delivery obligations away from your business.'],
  },
  {
    h: 'Service availability',
    ps: ['We target high availability but provide the Service "as is" without warranty of uninterrupted operation. Planned maintenance is announced in-app. Offline POS records sync when connectivity returns; always keep device backups enabled.'],
  },
  {
    h: 'Data protection',
    ps: ['Personal data is handled according to our Privacy Policy and the Data Protection Act, 2012 (Act 843). Where these Terms and the Privacy Policy conflict on data matters, the Privacy Policy prevails.'],
  },
  {
    h: 'Suspension and termination',
    ps: [
      'You may stop using the Service and close your account at any time from the dashboard.',
      'We may suspend or terminate accounts that breach these terms, create legal risk, or remain inactive beyond twelve months with prior notice where practicable. On closure you may request an export of your catalog and order data while the account was active.',
    ],
  },
  {
    h: 'Limitation of liability',
    ps: ['To the maximum extent permitted by law, our aggregate liability arising from the Service is limited to the subscription fees you paid us in the three months preceding the claim. We are not liable for indirect or consequential losses, including lost profits or goodwill.'],
  },
  {
    h: 'Changes and governing law',
    ps: [
      'We may update these terms; material changes will be announced in-app at least seven days before taking effect. Continued use after that date constitutes acceptance.',
      'These terms are governed by the laws of the Republic of Ghana, and disputes fall under the jurisdiction of Ghanaian courts.',
    ],
  },
];

export function TermsPage({ authed = false }) {
  return (
    <LegalDoc
      authed={authed}
      title="Terms of Service"
      intro={`These terms form the agreement between you and DiDwa ("we", "us") governing use of the seller platform, POS tools and storefronts hosted on ${getPlatformDomain()}. Please read them before creating an account.`}
      sections={TERMS_SECTIONS}
    />
  );
}

/* ------------------------------ Privacy Policy ----------------------------- */
const PRIVACY_SECTIONS = [
  {
    h: 'Who we are',
    ps: [
      `DiDwa is a multi-tenant commerce platform operated from Accra, Ghana, with seller storefronts served from {platform} and merchant-owned custom domains. This policy explains what personal data we collect, why, and the choices you have.`,
      'For any privacy question or request, write to {contact}.',
    ],
  },
  {
    h: 'Data we collect',
    list: [
      'Account data - shop name, owner name, email address, phone number and a securely hashed password.',
      'Commercial data - products you list, orders placed through your storefront or POS, payouts and settlement records.',
      'Support data - messages you send us through the contact form, email or WhatsApp.',
      'Technical data - device type, browser, IP address and basic usage events needed to keep the Service secure.',
    ],
  },
  {
    h: 'How we use your data',
    list: [
      'To operate the Service: accounts, storefronts, POS sync, receipts and order fulfilment.',
      'To process payments and payouts through licensed Mobile Money processors.',
      'To send transactional SMS and email - order alerts, low-stock reminders, payout confirmations.',
      'To provide support, detect fraud and protect the platform.',
      'To produce aggregated, de-identified analytics that never identify an individual shopper.',
    ],
  },
  {
    h: 'Mobile Money and payment data',
    ps: ['Card and Mobile Money credentials are entered directly into our licensed processor\'s secure channels (currently Hubtel) and never touch our servers in full. We store only transaction references, amounts and statuses needed for reconciliation and receipts. Your MoMo PIN is never requested by us.'],
  },
  {
    h: 'Sharing with third parties',
    ps: ['We do not sell personal data. We share it only with providers who help us run the Service - currently Hubtel (payments), Arkesel (transactional SMS) and our cloud hosting providers - each bound to process data on our instructions. We may also disclose data where required by law or valid order of a competent authority in Ghana.'],
  },
  {
    h: 'Storage, security and retention',
    ps: ['Data is transmitted over TLS encryption; passwords are hashed with bcrypt and never stored in plain text. Session tokens live in your browser localStorage and are revoked on logout. We retain account and commercial records while your account is active and for up to twenty-four months after closure to meet tax and audit obligations, after which they are deleted or anonymised.'],
  },
  {
    h: 'Cookies and local storage',
    ps: ['We use only essential storage: a session token to keep you signed in and local caches (like your theme preview) to make the dashboard faster. We do not run advertising or third-party tracking cookies.'],
  },
  {
    h: 'Your rights',
    ps: ['Under the Data Protection Act, 2012 (Act 843) you may request access to your data, correction of inaccurate data, deletion where no legal obligation requires retention, portability of your catalog and order history, and objection to specific processing. Email us and we will respond within thirty (30) days.'],
  },
  {
    h: 'Children',
    ps: ['The Service is not directed at anyone under eighteen. We do not knowingly collect data from children; if we learn we hold such data we delete it promptly.'],
  },
  {
    h: 'Changes to this policy',
    ps: ['Material changes will be announced in-app and on this page before they take effect. The "Last updated" date above always reflects the current version.'],
  },
];

export function PrivacyPage({ authed = false }) {
  return (
    <LegalDoc
      authed={authed}
      title="Privacy Policy"
      intro="Your shop data belongs to you. This policy explains exactly what we collect, why, how it is protected and the control you keep over it."
      sections={PRIVACY_SECTIONS}
    />
  );
}





/* ----------------------------- Marketing pages ---------------------------- */
/**
 * These three pages used to be sections of the welcome page reached by
 * scrolling. They are real routes now, so a visitor can link straight to the
 * one they care about and search engines can index it.
 */
export const FEATURE_CARDS = [
  { Icon: Smartphone, title: 'Offline-first POS', body: 'Ring up sales with no internet - transactions sync the moment you are back online.' },
  { Icon: Wallet, title: 'Instant MoMo payouts', body: 'Cash out to MTN, Telecel/Vodafone or AT Money the moment an order settles.' },
  { Icon: Package, title: 'Inventory that thinks', body: 'Multi-variant stock tracking with automatic low-stock SMS reminders.' },
  { Icon: MessageCircle, title: 'WhatsApp commerce', body: 'Customers order straight from chat; receipts and fulfilment in one tap.' },
  { Icon: Globe, title: 'Your own storefront', body: 'A shareable subdomain - or bring a custom domain - with live theme editing.' },
  { Icon: BarChart3, title: 'Insights that pay', body: 'Best sellers, cash flow and payout readiness without spreadsheets.' },
];

export const STEPS = [
  { n: '01', title: 'Create your store', body: 'Register with just a shop name, email and phone number. Your 14-day trial starts instantly - no card needed.' },
  { n: '02', title: 'Stock your catalog', body: 'Add products with prices, variants and stock counts. Share your storefront link or sell in person.' },
  { n: '03', title: 'Sell & get paid', body: 'Accept Mobile Money or cash, reconcile rider deliveries and withdraw earnings whenever you like.' },
];

export const STATS = [
  { v: '10k+', k: 'Active sellers' },
  { v: 'GHS 2.4M', k: 'Processed monthly' },
  { v: '<24h', k: 'Payout settlement' },
  { v: '16', k: 'Regions covered' },
];

/** The headline numbers, reused by the features page and the home page. */
export function StatsBand() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {STATS.map((stat) => (
        <div key={stat.k} className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
          <p className="text-2xl font-extrabold tracking-tight">{stat.v}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{stat.k}</p>
        </div>
      ))}
    </div>
  );
}

export function FeaturesPage({ authed = false }) {
  return (
    <PublicShell authed={authed}>
      <PageHero
        eyebrow="Features"
        title="Everything a Ghanaian shop needs, in one login."
        sub="Built for merchants who sell across the counter, over the phone and online at the same time."
      />
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_CARDS.map(({ Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <span className="inline-flex rounded-xl bg-blue-50 p-2.5 text-blue-600">
                <Icon size={22} aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-base font-extrabold tracking-tight">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-12">
          <StatsBand />
        </div>
      </section>
    </PublicShell>
  );
}

export function HowItWorksPage({ authed = false }) {
  return (
    <PublicShell authed={authed}>
      <PageHero
        eyebrow="How it works"
        title="Live in three steps."
        sub="No onboarding call, no paperwork. Most merchants are selling within an hour of registering."
      />
      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <ol className="space-y-5">
          {STEPS.map((step) => (
            <li key={step.n} className="flex gap-5 rounded-2xl border border-slate-200 bg-white p-6">
              <span className="text-2xl font-extrabold text-blue-600">{step.n}</span>
              <div>
                <h2 className="text-base font-extrabold tracking-tight">{step.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
          >
            Start free trial <ArrowRight size={16} aria-hidden="true" />
          </button>
          <p className="mt-3 text-xs font-semibold text-slate-400">14-day free trial &middot; No card required</p>
        </div>
      </section>
    </PublicShell>
  );
}

/* -------------------------------- Pricing --------------------------------- */
/**
 * The public pricing page. Prices are FETCHED from the plan catalogue, so an
 * admin price change appears here immediately - nothing on this page is
 * hard-coded, and nothing shown here is what gets charged (the server resolves
 * the amount again from the same catalogue when a seller subscribes).
 *
 * A signed-in seller is sent to the upgrade flow with their choice pre-selected;
 * a visitor is sent to registration, because that is what "choosing" a plan means
 * before a store exists.
 */
export function PricingPage({ authed = false }) {
  const [cycle, setCycle] = useState('yearly');
  const { plans, current, loading, error } = usePlans();

  const choose = (plan, { free }) => {
    // The free trial is not bought - it is granted at registration.
    navigate(free ? '/login' : authed ? `/settings/plan?plan=${plan.id}&cycle=${cycle}` : '/login');
  };

  return (
    <PublicShell authed={authed} wide>
      <section className="relative overflow-hidden border-b border-slate-900/5 bg-mist/60 py-16 sm:py-20">
        <div className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">Pricing</span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            One login. Every tool. Pay as you grow.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-500">
            Start free for 14 days with no card. When you are ready, pick a plan and pay by
            Mobile Money - monthly or yearly. Nothing renews automatically, so you are never
            surprised by a charge.
          </p>
          <div className="mt-8 flex justify-center">
            <CycleToggle cycle={cycle} onChange={setCycle} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <PlanGrid
          plans={plans}
          cycle={cycle}
          currentPlanId={current?.plan}
          loading={loading}
          error={error}
          renderAction={(plan, meta) => (
            <button
              type="button"
              onClick={() => choose(plan, meta)}
              disabled={meta.isCurrent}
              className={`w-full rounded-xl py-3 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                meta.isCurrent
                  ? 'cursor-default border border-slate-200 bg-mist text-slate-400'
                  : 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700'
              }`}
            >
              {meta.isCurrent ? 'Current plan' : meta.free ? 'Start free trial' : `Choose ${plan.name}`}
            </button>
          )}
        />

        <ul className="mx-auto mt-12 grid max-w-3xl gap-3 sm:grid-cols-2">
          {[
            'No automatic renewal - you choose when to pay again',
            'Pay by MTN, Telecel/Vodafone or AT Mobile Money',
            'Switch plan or billing period whenever you like',
            'Cancel any time by simply not renewing',
          ].map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm text-slate-600">
              <Check size={16} className="mt-0.5 shrink-0 text-emerald-brand" aria-hidden="true" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-slate-900/5 bg-mist/60 py-12">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-xl font-extrabold tracking-tight">Still deciding?</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Start on the free trial and use the full platform for 14 days. You can pick a plan
            later without losing anything you have set up.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
          >
            Start free trial <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </section>
    </PublicShell>
  );
}

