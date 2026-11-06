import { useCallback, useEffect, useState } from 'react';
import { Handshake, LogOut, RefreshCw } from 'lucide-react';
import {
  clearPartnerSession, getPartnerToken, partnerApi,
} from '../../api.js';
import { navigate, usePathname } from '../../router.js';
import PartnerAccessPage from './PartnerAccessPage.jsx';
import PartnerOverviewPage from './PartnerOverviewPage.jsx';
import PartnerReferralsPage from './PartnerReferralsPage.jsx';
import PartnerPayoutsPage from './PartnerPayoutsPage.jsx';
import PartnerProgramPage from './PartnerProgramPage.jsx';

const PAGE_PATHS = {
  overview: '/dashboard',
  referrals: '/dashboard/referrals',
  payouts: '/dashboard/payouts',
};

const PAGE_META = {
  [PAGE_PATHS.overview]: ['Overview', 'Your partner network and earnings at a glance.'],
  [PAGE_PATHS.referrals]: ['Referrals', 'Share your links and grow your merchant and affiliate network.'],
  [PAGE_PATHS.payouts]: ['Payouts', 'Manage your Mobile Money details and payout requests.'],
};

const NAV_ITEMS = [
  ['Overview', PAGE_PATHS.overview],
  ['Referrals', PAGE_PATHS.referrals],
  ['Payouts', PAGE_PATHS.payouts],
];

export default function PartnerPortalPage() {
  const route = usePathname();
  const [partner, setPartner] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [checking, setChecking] = useState(Boolean(getPartnerToken()));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [profile, overview, payoutList] = await Promise.all([
        partnerApi.get('/api/partners/me'),
        partnerApi.get('/api/partners/dashboard'),
        partnerApi.get('/api/partners/payouts'),
      ]);
      setPartner(profile.partner);
      setDashboard(overview);
      setPayouts(payoutList.payouts || []);
    } catch (err) {
      setError(err.message || 'Partner dashboard could not be loaded.');
      setPartner(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (getPartnerToken()) load();
    else setChecking(false);
  }, [load]);

  useEffect(() => {
    const onLogout = () => {
      setPartner(null);
      setDashboard(null);
      setPayouts([]);
    };
    window.addEventListener('gs:partner-logout', onLogout);
    return () => window.removeEventListener('gs:partner-logout', onLogout);
  }, []);

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm font-semibold text-slate-300">Loading partner portal...</div>;
  }
  if (!partner) {
    if (route === '/') return <PartnerProgramPage />;
    const mode = route === '/apply' ? 'apply' : 'login';
    return <PartnerAccessPage initialMode={mode} initialError={error} onLogin={(profile) => { setPartner(profile); load(); }} />;
  }

  const activePath = PAGE_META[route] ? route : PAGE_PATHS.overview;
  const [title, subtitle] = PAGE_META[activePath];
  const stats = dashboard?.stats || {};
  const pageProps = {
    dashboard,
    payouts,
    partner,
    stats,
    referralLinks: dashboard?.links || {},
    onError: setError,
    onNotice: setNotice,
    onRefresh: load,
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-blue-600 p-2"><Handshake size={19} /></span>
            <div>
              <p className="text-sm font-extrabold">DiDwa Partner Network</p>
              <p className="text-xs text-slate-400">{partner.organization_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={load} className="rounded-lg border border-white/15 p-2 text-slate-300 hover:bg-white/10" aria-label="Refresh dashboard"><RefreshCw size={16} /></button>
            <button type="button" onClick={() => { clearPartnerSession(); setPartner(null); navigate('/', { replace: true }); }} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10">
              <LogOut size={14} />Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <nav className="mb-6 flex gap-2 overflow-x-auto border-b border-slate-200" aria-label="Partner dashboard">
          {NAV_ITEMS.map(([label, path]) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              aria-current={activePath === path ? 'page' : undefined}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-bold transition ${activePath === path ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="mb-6">
          <p className="text-sm font-semibold text-blue-700">Ambassador dashboard</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        {activePath === PAGE_PATHS.referrals ? (
          <PartnerReferralsPage {...pageProps} />
        ) : activePath === PAGE_PATHS.payouts ? (
          <PartnerPayoutsPage {...pageProps} />
        ) : (
          <PartnerOverviewPage {...pageProps} />
        )}
      </div>
    </main>
  );
}
