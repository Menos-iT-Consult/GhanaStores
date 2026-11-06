import { BadgePercent, Building2, Users, Wallet } from 'lucide-react';
import { ghs } from '../../api.js';
import { navigate } from '../../router.js';

function Stat({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-3 text-2xl font-extrabold text-slate-900">{value}</p>
          {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
        </div>
        <span className="rounded-xl bg-blue-50 p-3 text-blue-700"><Icon size={20} /></span>
      </div>
    </div>
  );
}

export default function PartnerOverviewPage({ dashboard, stats }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Building2} label="Active merchants" value={Number(stats.active_merchants || 0).toLocaleString()} />
        <Stat icon={Users} label="Active affiliates" value={Number(stats.active_affiliates || 0).toLocaleString()} />
        <Stat icon={BadgePercent} label="Monthly network volume" value={ghs(stats.monthly_volume_ghs || 0)} detail="Paid order GMV this month" />
        <Stat icon={Wallet} label="Withdrawable balance" value={ghs(stats.available_balance_ghs || 0)} detail={`Minimum payout ${ghs(dashboard?.payoutMinimumGhs || 50)}`} />
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-blue-700">Merchant network</p>
          <h2 className="mt-2 text-lg font-extrabold text-slate-900">Bring new businesses online</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Share your merchant onboarding link. New merchants who register through it are attributed to your partner network.</p>
          <button type="button" onClick={() => navigate('/dashboard/referrals')} className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">View referral links</button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-emerald-700">Partner earnings</p>
          <h2 className="mt-2 text-lg font-extrabold text-slate-900">Available to withdraw</h2>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{ghs(stats.available_balance_ghs || 0)}</p>
          <p className="mt-2 text-sm text-slate-500">Payouts are sent to your verified Mobile Money account after review.</p>
          <button type="button" onClick={() => navigate('/dashboard/payouts')} className="mt-5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Manage payouts</button>
        </div>
      </section>
    </div>
  );
}
