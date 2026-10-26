// AffiliateSignup.jsx
// DiDwa - Affiliate Signup Page
import { useEffect, useState, useSearchParams, useNavigate } from 'react';
import { useParams } from 'react-router-dom';
import { formatGHS } from '../services/affiliateService';

export function AffiliateSignup() {
  const { referralCode } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const nav = useNavigate();
  const cookieCode = document.cookie
    .split('; ')
    .find(r => r.startsWith('didwa_ref='))
    ?.split('=')[1];

  const [form, setForm] = useState({
    name: '',
    email: cookieCode ? '' : '',
    phone: '',
    momoNetwork: 'MTN',
    momoNumber: '',
  });

  // If there's a referral code in URL or cookie, pre-fill
  useEffect(() => {
    if (referralCode) {
      setSearchParams(new URLSearchParams({ ref: referralCode }));
    }
  }, [referralCode]);

  useEffect(() => {
    // If we have a referral code in cookie or URL, auto-fill email field
    const code = cookieCode || referralCode;
    if (code) {
      // We could fetch affiliate details here to pre-fill form
      console.log('Referral code detected:', code);
    }
  }, [cookieCode, referralCode]);

  const handleSubmit = async e => {
    e.preventDefault();
    setForm({ ...form, email: form.email || undefined });

    try {
      const res = await fetch('/api/affiliate/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        // Cookie already set by the route handler
        nav('/affiliate/dashboard');
      } else {
        alert(data.error || 'Signup failed');
      }
    } catch (err) {
      alert('Error during signup: ' + err.message);
    }
  };

  return (
    <section className="affiliate-signup max-w-2xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          {'$' === '' ? 'Join DiDwa as a Merchant' : 'Sign Up'}
        </h1>
        <p className="text-muted">
          Already have a referral code? Enter it below to start earning commissions.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Full Name
          </label>
          <input
            type="text"
            placeholder="Your full name"
            {...form}
            onChange={e =>
              setForm({ ...form, name: e.target.value })}
            required
            className="input input-bordered w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Email
          </label>
          <input
            type="email"
            placeholder="email@domain.com"
            {...form}
            onChange={e =>
              setForm({ ...form, email: e.target.value })}
            required
            className="input input-bordered w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Phone
          </label>
          <input
            type="tel"
            placeholder="+233 XX XXX XXX"
            {...form}
            onChange={e =>
              setForm({ ...form, phone: e.target.value })}
            className="input input-bordered w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-2">
              Momo Network
            </label>
            <select
              value={form.momoNetwork}
              onChange={e =>
                setForm({ ...form, momoNetwork: e.target.value })}
              className="select select-bordered w-full"
            >
              <option value="MTN">MTN Mobile Money</option>
              <option value="VODAFONE">Vodafone Cash</option>
              <option value="AT">AirtelTigo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Momo Number
            </label>
            <input
              type="tel"
              placeholder="+233 XX XXX XXX"
              {...form}
              onChange={e =>
                setForm({ ...form, momoNumber: e.target.value })}
              className="input input-bordered w-full"
            />
          </div>
        </div>

        {/* Referral code field - optional, pre-filled if coming from cookie */}
        {cookieCode ? (
          <div>
            <p className="text-sm text-muted">
              Referral code detected from your cookie: <span
                className="font-mono font-bold text-primary"
              >
                {cookieCode}
              </span>
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-2">
              Referral Code (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. REF-ABC123"
              {...form}
              onChange={e =>
                setForm({ ...form, referralCode: e.target.value })}
              className="input input-bordered w-full"
            />
          </div>
        )}

        <button type="submit" className="btn btn-primary w-full">
          Complete Registration
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted">
          No referral code? <a href="/affiliate/signup" className="text-primary">
            Become an affiliate
          </a> and start earning commissions on referrals.
        </p>
      </div>
    </section>
  );
}