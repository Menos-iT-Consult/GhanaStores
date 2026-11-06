import { ArrowUpRight, Copy } from 'lucide-react';

export default function PartnerReferralsPage({ stats, referralLinks, onError, onNotice }) {
  const copyLink = async (link) => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      onNotice('Referral link copied.');
      onError('');
    } catch {
      onError('Could not copy the link. Select and copy it manually.');
      onNotice('');
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Active merchants</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{Number(stats.active_merchants || 0).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Active affiliates</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{Number(stats.active_affiliates || 0).toLocaleString()}</p>
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        {[
          { title: 'Merchant onboarding link', description: 'Share this link with businesses. The referral code is prefilled when they start a store.', link: referralLinks.merchant },
          { title: 'Affiliate recruitment link', description: 'Invite affiliates to join your partner network and earn tier-2 overrides.', link: referralLinks.affiliate },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-extrabold text-slate-900">{item.title}</h2>
              <ArrowUpRight size={17} className="text-blue-600" aria-hidden="true" />
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input className="w-full min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none" readOnly value={item.link || ''} aria-label={item.title} />
              <button type="button" disabled={!item.link} onClick={() => copyLink(item.link)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                <Copy size={15} aria-hidden="true" />Copy link
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
