import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight, BadgePercent, CalendarDays, Copy, ExternalLink, LogOut,
  RefreshCw, Users, Wallet,
} from 'lucide-react';
import {
  affiliateApi, clearAffiliateSession, getAffiliateToken,
} from '../../api.js';
import { navigate } from '../../router.js';

const platformOrigin = 'https://didwaghana.com';
const money = (value) => `GHS ${Number(value || 0).toFixed(2)}`;
const date = (value) => value ? new Date(value).toLocaleDateString() : '—';

function StatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase();
  const styles = {
    pending: 'bg-amber-50 text-amber-700',
    pending_upgrade: 'bg-amber-50 text-amber-700',
    active_paid: 'bg-emerald-50 text-emerald-700',
    paid: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-rose-50 text-rose-700',
    reversed: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${styles[normalized] || 'bg-slate-100 text-slate-600'}`}>
      {normalized.replaceAll('_', ' ') || 'Unknown'}
    </span>
  );
}

export default function AffiliateDashboardPage() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [program, setProgram] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [copied, setCopied] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!getAffiliateToken()) {
      setNeedsAuth(true);
      setLoading(false);
      return;
    }
    setError('');
    try {
      const [affiliate, earnings, referredStores, payoutHistory, settings] = await Promise.all([
        affiliateApi.get('/api/affiliate/me'),
        affiliateApi.get('/api/affiliate/stats'),
        affiliateApi.get('/api/affiliate/referrals'),
        affiliateApi.get('/api/affiliate/payouts'),
        affiliateApi.get('/api/affiliate/program'),
      ]);
      setProfile(affiliate);
      setStats(earnings);
      setReferrals(Array.isArray(referredStores) ? referredStores : []);
      setPayouts(Array.isArray(payoutHistory) ? payoutHistory : []);
      setProgram(settings.settings);
      setNeedsAuth(false);
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) {
        clearAffiliateSession();
        setNeedsAuth(true);
      } else {
        setError(requestError.message || 'Your affiliate dashboard could not be loaded.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const handleLogout = () => {
      setProfile(null);
      setStats(null);
      setNeedsAuth(true);
    };
    window.addEventListener('gs:affiliate-logout', handleLogout);
    return () => window.removeEventListener('gs:affiliate-logout', handleLogout);
  }, []);

  const referralUrl = profile?.referral_code
    ? `${platformOrigin}/?ref=${encodeURIComponent(profile.referral_code)}`
    : '';

  async function copyReferralLink() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Could not copy the referral link. Copy it directly from the field.');
    }
  }

  async function requestPayout(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const result = await affiliateApi.post('/api/affiliate/payouts', {
        amountGHS: Number(payoutAmount),
      });
      setNotice(result.message || 'Payout request submitted.');
      setPayoutAmount('');
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message || 'Payout request could not be submitted.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading affiliate dashboard...</main>;
  }

  if (needsAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
          <BadgePercent className="mx-auto text-blue-600" size={34} aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-extrabold text-charcoal">DiDwa Affiliate Dashboard</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500">
            Sign in to view your referrals and earnings, or join the affiliate program to get started.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href="/affiliate/login" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
              Sign in
            </a>
            <a href="/affiliate/signup" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">
              Join the program <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <a href="/" className="text-sm font-bold text-blue-700">DiDwa affiliate program</a>
            <h1 className="mt-2 text-3xl font-extrabold text-charcoal">Welcome, {profile?.full_name}</h1>
            <p className="mt-1 text-sm text-slate-500">Track your referrals, commissions, and payout requests.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={loadDashboard} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              <RefreshCw size={15} aria-hidden="true" /> Refresh
            </button>
            <button type="button" onClick={() => { clearAffiliateSession(); setNeedsAuth(true); }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              <LogOut size={15} aria-hidden="true" /> Sign out
            </button>
          </div>
        </header>

        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500"><Wallet size={17} aria-hidden="true" /> Total commissions</div>
            <p className="mt-3 text-2xl font-extrabold text-charcoal">{money(stats?.total_earned)}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500"><Users size={17} aria-hidden="true" /> Referred stores</div>
            <p className="mt-3 text-2xl font-extrabold text-charcoal">{Number(stats?.referred_count || 0)}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500"><CalendarDays size={17} aria-hidden="true" /> Pending commissions</div>
            <p className="mt-3 text-2xl font-extrabold text-charcoal">{money(stats?.pending_commissions)}</p>
          </article>
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><Wallet size={17} aria-hidden="true" /> Available to request</div>
            <p className="mt-3 text-2xl font-extrabold text-emerald-900">{money(stats?.available_payout)}</p>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-charcoal">Your referral link</h2>
              <p className="mt-1 text-sm text-slate-500">Share this link. The store signup page will carry your referral code.</p>
            </div>
            <a href={referralUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">
              Preview <ExternalLink size={14} aria-hidden="true" />
            </a>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <input readOnly value={referralUrl} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700" />
            <button type="button" onClick={copyReferralLink} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
              <Copy size={15} aria-hidden="true" /> {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
            <span>Referral code: <strong className="font-mono text-slate-700">{profile?.referral_code}</strong></span>
            {program && <span>Commission rate: <strong className="text-slate-700">{program.commissionRatePercent}%</strong></span>}
            {program && <span>Attribution window: <strong className="text-slate-700">{program.attributionDays} days</strong></span>}
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-bold text-charcoal">Referred stores</h2>
              <p className="mt-1 text-xs text-slate-500">Stores registered using your referral code.</p>
            </div>
            {referrals.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Store</th>
                      <th className="px-5 py-3 font-semibold">Plan</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Referred</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {referrals.map((referral) => (
                      <tr key={referral.id}>
                        <td className="px-5 py-3">
                          <span className="block font-semibold text-charcoal">{referral.subdomain_slug || 'Store'}</span>
                          <span className="text-xs text-slate-500">{referral.merchant_email}</span>
                        </td>
                        <td className="px-5 py-3 capitalize text-slate-600">{referral.plan_name || '—'}</td>
                        <td className="px-5 py-3"><StatusBadge status={referral.status} /></td>
                        <td className="px-5 py-3 text-slate-500">{date(referral.referred_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="px-5 py-8 text-center text-sm text-slate-500">No referred stores yet. Share your link to get started.</p>}
          </section>

          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-charcoal">Request a payout</h2>
              <p className="mt-1 text-sm text-slate-500">
                {profile?.momo_network} · {profile?.momo_number}
              </p>
              {program && <p className="mt-2 text-xs text-slate-500">Minimum {money(program.minimumPayoutGhs)}. Processing: {program.payoutProcessingMinDays}–{program.payoutProcessingMaxDays} business days.</p>}
              <form onSubmit={requestPayout} className="mt-4 space-y-3">
                <label htmlFor="payout-amount" className="block text-xs font-bold uppercase tracking-wide text-slate-500">Amount (GHS)</label>
                <input id="payout-amount" type="number" min={program?.minimumPayoutGhs || 0.01} max={Number(stats?.available_payout || 0)} step="0.01"
                  value={payoutAmount} onChange={(event) => setPayoutAmount(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="0.00" required />
                <button type="submit" disabled={busy || Number(stats?.available_payout || 0) < Number(program?.minimumPayoutGhs || Infinity)}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {busy ? 'Submitting...' : 'Request Mobile Money payout'}
                </button>
              </form>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-lg font-bold text-charcoal">Payout history</h2>
              </div>
              {payouts.length ? (
                <ul className="divide-y divide-slate-100">
                  {payouts.map((payout) => (
                    <li key={payout.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div>
                        <p className="text-sm font-bold text-charcoal">{money(payout.amount_ghs)}</p>
                        <p className="text-xs text-slate-500">{date(payout.requested_at)}</p>
                      </div>
                      <StatusBadge status={payout.status} />
                    </li>
                  ))}
                </ul>
              ) : <p className="px-5 py-6 text-center text-sm text-slate-500">No payout requests yet.</p>}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
