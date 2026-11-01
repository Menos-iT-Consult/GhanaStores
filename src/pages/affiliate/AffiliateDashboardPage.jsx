import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, BadgePercent, LogOut, RefreshCw } from 'lucide-react';
import {
  affiliateApi, clearAffiliateSession, getAffiliateToken,
} from '../../api.js';
import { navigate, usePathname } from '../../router.js';
import { usePlatformPublicSettings } from '../../lib/platformPublicSettings.js';
import AffiliateOverviewPage from './AffiliateOverviewPage.jsx';
import AffiliateReferralsPage from './AffiliateReferralsPage.jsx';
import AffiliatePayoutsPage from './AffiliatePayoutsPage.jsx';

const platformOrigin = 'https://didwaghana.com';
const PAGE_PATHS = {
  overview: '/affiliate/dashboard',
  referrals: '/affiliate/dashboard/referrals',
  payouts: '/affiliate/dashboard/payouts',
};

const PAGE_META = {
  [PAGE_PATHS.overview]: ['Affiliate overview', 'Track your referrals and earnings at a glance.'],
  [PAGE_PATHS.referrals]: ['Referred stores', 'See the merchants who joined through your referral link.'],
  [PAGE_PATHS.payouts]: ['Payouts', 'Manage your payout account and review payout requests.'],
};

const NAV_ITEMS = [
  ['Overview', PAGE_PATHS.overview],
  ['Referrals', PAGE_PATHS.referrals],
  ['Payouts', PAGE_PATHS.payouts],
];

export default function AffiliateDashboardPage() {
  const route = usePathname();
  const { settings: platformSettings, error: settingsError, reload: reloadSettings } = usePlatformPublicSettings();
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
  const [momoNetwork, setMomoNetwork] = useState('MTN');
  const [momoNumber, setMomoNumber] = useState('');
  const [savingPayoutAccount, setSavingPayoutAccount] = useState(false);
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
      setMomoNetwork(affiliate.momo_network || 'MTN');
      setMomoNumber(affiliate.momo_number || '');
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
    ? `${platformOrigin}/login?ref=${encodeURIComponent(profile.referral_code)}`
    : '';
  const activePath = PAGE_META[route] ? route : PAGE_PATHS.overview;
  const [title, subtitle] = PAGE_META[activePath];

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

  async function verifyPayoutAccount(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSavingPayoutAccount(true);
    try {
      const result = await affiliateApi.post('/api/affiliate/payout-account/verify', {
        momoNetwork,
        momoNumber: momoNumber.trim(),
      });
      setProfile(result.affiliate);
      setMomoNetwork(result.affiliate.momo_network);
      setMomoNumber(result.affiliate.momo_number);
      setNotice(result.message || 'Payout account verified and saved.');
    } catch (requestError) {
      setError(requestError.message || 'Paystack could not verify this payout account.');
    } finally {
      setSavingPayoutAccount(false);
    }
  }

  let page;
  if (activePath === PAGE_PATHS.referrals) {
    page = <AffiliateReferralsPage referrals={referrals} />;
  } else if (activePath === PAGE_PATHS.payouts) {
    page = (
      <AffiliatePayoutsPage
        profile={profile}
        stats={stats}
        program={program}
        payouts={payouts}
        payoutAmount={payoutAmount}
        onPayoutAmountChange={setPayoutAmount}
        onRequestPayout={requestPayout}
        busy={busy}
        momoNetwork={momoNetwork}
        onMomoNetworkChange={setMomoNetwork}
        momoNumber={momoNumber}
        onMomoNumberChange={setMomoNumber}
        onVerifyPayoutAccount={verifyPayoutAccount}
        savingPayoutAccount={savingPayoutAccount}
      />
    );
  } else {
    page = (
      <AffiliateOverviewPage
        profile={profile}
        stats={stats}
        program={program}
        referralUrl={referralUrl}
        copied={copied}
        onCopy={copyReferralLink}
        platformSettings={platformSettings}
        settingsError={settingsError}
        reloadSettings={reloadSettings}
      />
    );
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
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <a href="/" className="text-sm font-bold text-blue-700">DiDwa affiliate program</a>
            <h1 className="mt-2 text-3xl font-extrabold text-charcoal">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle} {profile?.full_name ? `Welcome, ${profile.full_name}.` : ''}</p>
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

        <nav aria-label="Affiliate dashboard" className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {NAV_ITEMS.map(([label, path]) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              aria-current={activePath === path ? 'page' : undefined}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                activePath === path
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-charcoal'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}
        {page}
      </div>
    </main>
  );
}
