// AffiliateDashboard.jsx
// DiDwa - Affiliate Portal Dashboard Component
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
// Import formatGHS from the lib/affiliate service (project-wide utilities)
import { formatGHS } from '../../lib/affiliate';

export function AffiliateDashboard() {
  const { ref } = useParams();
  const [navigate] = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref') || ref;

  const [affiliate, setAffiliate] = useState(null);
  const [referredMerchants, setReferredMerchants] = useState([]);
  const [stats, setStats] = useState({ totalEarned: 0, referredCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If referral code in URL, try to fetch affiliate profile
    if (referralCode) {
      // In a real app, this would be an API call
      // For now, we'll just store the referral code
      localStorage.setItem('didwa_ref', referralCode);
    }

    // Check for existing cookie
    const cookieCode = document.cookie.replace(/(?:(?:^|.*)\s*didwa_ref\s*=\s*([^;]*).*$)|^.*$/, '$1');
    if (cookieCode) {
      // Fetch affiliate data
      fetch(`/api/affiliate/me`, {
        credentials: 'include'
      })
        .then(res => res.json())
        .then(data => {
          setAffiliate(data);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [referralCode]);

  useEffect(() => {
    if (!affiliate) return;

    // Fetch referred merchants stats
    fetch(`/api/affiliate/referrals`, {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => setReferredMerchants(data))
      .catch(err => console.error('Error fetching referrals:', err));

    // Fetch earnings stats
    fetch(`/api/affiliate/stats`, {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Error fetching stats:', err));
  }, [affiliate]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <section className="affiliate-dashboard max-w-3xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          Affiliate Dashboard
        </h1>
        <p className="text-sm text-muted">
          Referral Code: <span className="font-mono font-bold text-primary">
            {affiliate?.referralCode}
          </span>
        </p>
      </header>

      <div className="grid gap-4">
        {/* Earnings Summary */}
        <div className="bg-card p-4 rounded-xl shadow-sm">
          <h3 className="font-semibold mb-3">Earnings Summary</h3>
          <div className="space-y-2">
            <div>
              <span className="text-muted">Total Referred</span>
              <span className="text-2xl font-bold">{stats.referredCount}</span>
            </div>
            <div>
              <span className="text-muted">Total Earned</span>
              <span className="text-2xl font-bold text-primary">
                {formatGHS(stats.totalEarned)}
              </span>
            </div>
            <div>
              <span className="text-muted">Pending Payouts</span>
              <span className="text-xl font-semibold text-warning">
                {formatGHS(stats.totalEarned * 0.3)} <!-- placeholder -->
              </span>
            </div>
          </div>
        </div>

        {/* Referred Merchants List */}
        <div>
          <h3 className="font-semibold mb-4">Referred Merchants</h3>
          {referredMerchants.length === 0 ? (
            <p className="text-muted">No merchants referred yet.</p>
          ) : (
            <ul className="space-y-3 max-h-40 overflow-y-auto">
              {referredMerchants.map((m, i) => (
                <li key={i} className="flex items-center gap-3 p-3 bg-muted rounded">
                  <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0">
                    {m.merchant_email?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{m.merchant_email}</p>
                    <p className="text-xs text-muted">Plan: {m.plan_name}</p>
                  </div>
                  <p className="text-xs text-primary">₵{m.price_ghs}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Referral Link Section */}
      <div className="mt-8 p-4 bg-muted rounded">
        <h3 className="font-semibold mb-3">Your Referral Link</h3>
        <p className="text-sm text-muted mb-3">
          Share this link to earn recurring commissions:
        </p>
        <div className="bg-white p-3 rounded">
          <input
            type="text"
            value={`${window.location.origin}/affiliate/signup?ref=${affiliate?.referralCode}`}
            readOnly
            className="w-full p-2 border rounded focus:outline-none"
            onClick={(e) => e.target.select()}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() =>
              navigator.clipboard.writeText(
                `${window.location.origin}/affiliate/signup?ref=${affiliate?.referralCode}`
              )
            }
            className="btn btn-sm btn-secondary"
          >
            Copy Link
          </button>
          <a
            href={`${window.location.origin}/affiliate/signup?ref=${affiliate?.referralCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-primary"
          >
            Open Referral Portal
          </a>
        </div>
      </div>
    </section>
  );
}