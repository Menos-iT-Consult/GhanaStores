import { useEffect, useState } from 'react';
import { Copy, LogOut, Users, Wallet } from 'lucide-react';
import { affiliateApi, clearAffiliateSession, getAffiliateToken } from '../../api.js';
import { navigate } from '../../router.js';

const platformOrigin = 'https://didwaghana.com';

export default function AffiliateDashboardPage() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!getAffiliateToken()) {
      navigate('/affiliate/login', { replace: true });
      return;
    }
    let active = true;
    Promise.all([
      affiliateApi.get('/api/affiliate/me'),
      affiliateApi.get('/api/affiliate/stats'),
    ]).then(([affiliate, earnings]) => {
      if (!active) return;
      setProfile(affiliate);
      setStats(earnings);
    }).catch((requestError) => {
      if (!active) return;
      clearAffiliateSession();
      setError(requestError.message || 'Your affiliate session could not be loaded. Please sign in again.');
    });
    return () => { active = false; };
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

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>
        <button type="button" onClick={() => navigate('/affiliate/login')} className="mt-4 font-bold text-blue-700">Return to sign in</button>
      </main>
    );
  }
  if (!profile || !stats) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading affiliate dashboard...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <a href="/" className="text-sm font-bold text-blue-700">DiDwa affiliate program</a>
            <h1 className="mt-2 text-3xl font-extrabold text-charcoal">Welcome, {profile.full_name}</h1>
          </div>
          <button type="button" onClick={() => { clearAffiliateSession(); navigate('/affiliate/login', { replace: true }); }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            <LogOut size={15} aria-hidden="true" /> Sign out
          </button>
        </header>

        <section className="mt-7 grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500"><Wallet size={17} aria-hidden="true" /> Total commissions</div>
            <p className="mt-3 text-3xl font-extrabold text-charcoal">GHS {Number(stats.total_earned || 0).toFixed(2)}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500"><Users size={17} aria-hidden="true" /> Referred merchants</div>
            <p className="mt-3 text-3xl font-extrabold text-charcoal">{Number(stats.referred_count || 0)}</p>
          </article>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-charcoal">Your referral link</h2>
          <p className="mt-1 text-sm text-slate-500">Share this link with businesses interested in DiDwa.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <input readOnly value={referralUrl} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700" />
            <button type="button" onClick={copyReferralLink} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
              <Copy size={15} aria-hidden="true" /> {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">Referral code: <span className="font-mono font-semibold">{profile.referral_code}</span></p>
        </section>
      </div>
    </main>
  );
}
