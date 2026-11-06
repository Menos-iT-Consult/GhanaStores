import { ArrowRight, BadgePercent, Building2, Handshake, Users } from 'lucide-react';
import { navigate } from '../../router.js';
import { LogoLockup } from '../../components/icons.jsx';

const BENEFITS = [
  {
    icon: Building2,
    title: 'Grow a merchant network',
    description: 'Introduce local businesses to DiDwa through your partner referral link or public partner page.',
  },
  {
    icon: Users,
    title: 'Recruit affiliates',
    description: 'Invite affiliates into your network and help them connect more merchants to the platform.',
  },
  {
    icon: BadgePercent,
    title: 'Earn partner overrides',
    description: 'Approved partners can receive configured overrides on eligible merchant activity and affiliate commissions.',
  },
];

export default function PartnerProgramPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <a href="/" aria-label="DiDwa strategic partner program home">
            <LogoLockup subtitle="Strategic partner program" />
          </a>
          <button type="button" onClick={() => navigate('/login')} className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">
            Partner sign in
          </button>
        </header>

        <section className="grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-blue-200">
              <Handshake size={14} aria-hidden="true" /> DiDwa Ambassador & Strategic Partner Program
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              Help local businesses grow online.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Partner with DiDwa to connect merchants and community affiliates to practical tools for selling, payments, and business management.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => navigate('/apply')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3.5 text-sm font-extrabold text-white transition hover:bg-blue-400">
                Apply to become a partner <ArrowRight size={16} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => navigate('/login')} className="rounded-xl border border-white/20 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">
                Sign in to your portal
              </button>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-400">
              Applications are reviewed by DiDwa. Participation and any commission rates are subject to approval and program terms.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur sm:p-8">
            <p className="text-sm font-bold uppercase tracking-wider text-blue-200">A two-sided partner network</p>
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                <p className="text-sm font-extrabold">Merchant partners</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Refer merchants directly and support their onboarding to DiDwa.</p>
              </div>
              <div className="flex justify-center text-blue-300" aria-hidden="true"><ArrowRight className="rotate-90" size={20} /></div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                <p className="text-sm font-extrabold">Affiliate partners</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Recruit affiliates who can build their own merchant referral networks.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 border-t border-white/10 py-10 md:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, description }) => (
            <article key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <span className="inline-flex rounded-xl bg-blue-500/15 p-3 text-blue-200">
                <Icon size={20} aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-extrabold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
            </article>
          ))}
        </section>
        <footer className="flex flex-col items-center justify-between gap-3 border-t border-white/10 py-6 text-xs text-slate-500 sm:flex-row">
          <span>DiDwa Strategic Partner Program</span>
          <span>Partner participation is subject to review and approval.</span>
        </footer>
      </div>
    </main>
  );
}
