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

export default function AffiliateReferralsPage({ referrals }) {
  return (
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
  );
}
