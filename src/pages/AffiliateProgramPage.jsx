import { useEffect, useState } from 'react';
import {
  ArrowRight, BadgePercent, CalendarDays, Clock3, Link2, ShieldCheck, Users, Wallet,
} from 'lucide-react';
import { api } from '../api.js';
import { PublicShell } from './PublicPages.jsx';
import MetaTags from '../components/seo/MetaTags.jsx';
import { siteUrl } from '../lib/seo.js';

const configuredAffiliateUrl = String(
  import.meta.env.VITE_AFFILIATE_PLATFORM_URL || 'affiliate.didwaghana.com',
).trim();
const AFFILIATE_PLATFORM_URL = new URL(
  /^[a-z][a-z\d+.-]*:\/\//i.test(configuredAffiliateUrl)
    ? configuredAffiliateUrl
    : `https://${configuredAffiliateUrl}`,
).origin;
const AFFILIATE_SIGNUP_URL = `${AFFILIATE_PLATFORM_URL}/affiliate/signup`;
const AFFILIATE_LOGIN_URL = `${AFFILIATE_PLATFORM_URL}/affiliate/login`;

export default function AffiliateProgramPage({ authed = false, onStart, onDashboard }) {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    setError('');
    try {
      const result = await api.get('/api/affiliate/program');
      setSettings(result.settings);
    } catch (err) {
      setError(err.message || 'Affiliate program details could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSettings(); }, []);

  const terms = settings ? [
    { Icon: BadgePercent, label: 'Recurring commission', value: `${settings.commissionRatePercent}%` },
    { Icon: Wallet, label: 'Minimum payout', value: `GHS ${Number(settings.minimumPayoutGhs).toFixed(2)}` },
    { Icon: CalendarDays, label: 'Referral attribution', value: `${settings.attributionDays} days` },
    {
      Icon: Clock3,
      label: 'Payout processing',
      value: `${settings.payoutProcessingMinDays}-${settings.payoutProcessingMaxDays} business days`,
    },
  ] : [];

  return (
    <PublicShell authed={authed} onStart={onStart} onDashboard={onDashboard} wide>
      <MetaTags
        title="Affiliate program | DiDwa"
        description="Refer businesses to DiDwa and earn recurring commissions. View the current affiliate program terms and join the affiliate platform."
        canonical={siteUrl('/affiliate-program')}
      />
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:py-24">
        <section className="rounded-3xl bg-gradient-to-br from-blue-50 via-white to-emerald-50 px-6 py-12 text-center sm:px-12">
          <p className="text-sm font-extrabold uppercase tracking-widest text-blue-700">DiDwa partners</p>
          <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-charcoal sm:text-5xl">
            Grow with DiDwa. Earn for every referral.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Introduce Ghanaian businesses to tools that help them sell in-store and online.
            Track referrals and manage your earnings through the affiliate platform.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href={AFFILIATE_SIGNUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
            >
              Join the affiliate program <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a
              href={AFFILIATE_LOGIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-charcoal"
            >
              Affiliate sign in
            </a>
          </div>
        </section>

        <section className="mt-14" aria-labelledby="affiliate-terms-heading">
          <div className="text-center">
            <h2 id="affiliate-terms-heading" className="text-2xl font-extrabold tracking-tight text-charcoal">
              Current program terms
            </h2>
            <p className="mt-2 text-sm text-slate-500">These terms are set by the DiDwa platform team.</p>
          </div>
          {loading && <p className="mt-8 text-center text-sm text-slate-500">Loading program terms...</p>}
          {error && (
            <div role="alert" className="mx-auto mt-8 max-w-xl rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-800">
              <p>{error}</p>
              <button type="button" onClick={loadSettings} className="mt-2 font-bold underline">Try again</button>
            </div>
          )}
          {settings && (
            <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {terms.map(({ Icon, label, value }) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                  <Icon className="mx-auto text-blue-600" size={22} aria-hidden="true" />
                  <dt className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</dt>
                  <dd className="mt-2 text-xl font-extrabold text-charcoal">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <section className="mt-16" aria-labelledby="affiliate-how-heading">
          <div className="text-center">
            <h2 id="affiliate-how-heading" className="text-2xl font-extrabold tracking-tight text-charcoal">
              How the affiliate program works
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Refer businesses that could benefit from DiDwa, then follow referrals and eligible commissions from your affiliate dashboard.
            </p>
          </div>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                Icon: Users,
                title: 'Create your affiliate account',
                body: 'Sign up for the affiliate portal to get your own referral link and code.',
              },
              {
                Icon: Link2,
                title: 'Share your referral link',
                body: 'Introduce merchants to DiDwa. Referrals are attributed using your link and the current attribution window shown above.',
              },
              {
                Icon: BadgePercent,
                title: 'Track referrals and commissions',
                body: 'Use your dashboard to review referred stores, recorded commissions, balances and payout requests.',
              },
            ].map(({ Icon, title, body }, index) => (
              <li key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <p className="mt-4 text-xs font-extrabold uppercase tracking-wide text-blue-700">Step {index + 1}</p>
                <h3 className="mt-1 text-base font-extrabold text-charcoal">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12 grid gap-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
          <ShieldCheck className="text-emerald-700" size={24} aria-hidden="true" />
          <div>
            <h2 className="text-lg font-extrabold text-charcoal">Requesting your commission payout</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Payout requests use commissions marked paid, must meet the current minimum and require a Mobile Money account verified in your dashboard. The processing window shown in the program terms applies after you submit a request. You can check request status and history in the portal.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Commissions and referrals are subject to the current program terms. Earnings depend on eligible referrals and are not guaranteed.
            </p>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a
            href={AFFILIATE_SIGNUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            Join the affiliate program <ArrowRight size={16} aria-hidden="true" />
          </a>
          <a
            href={AFFILIATE_LOGIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-charcoal"
          >
            Affiliate sign in
          </a>
        </div>
      </main>
    </PublicShell>
  );
}
