import { CalendarDays, Copy, ExternalLink, Users, Wallet } from 'lucide-react';

const money = (value) => `GHS ${Number(value || 0).toFixed(2)}`;

export default function AffiliateOverviewPage({
  profile,
  stats,
  program,
  referralUrl,
  copied,
  onCopy,
}) {
  return (
    <div className="space-y-5">
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
          {referralUrl && (
            <a href={referralUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">
              Preview <ExternalLink size={14} aria-hidden="true" />
            </a>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <input readOnly value={referralUrl} aria-label="Your referral link" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700" />
          <button type="button" onClick={onCopy} disabled={!referralUrl} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            <Copy size={15} aria-hidden="true" /> {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
          <span>Referral code: <strong className="font-mono text-slate-700">{profile?.referral_code}</strong></span>
          {program && <span>Commission rate: <strong className="text-slate-700">{program.commissionRatePercent}%</strong></span>}
          {program && <span>Attribution window: <strong className="text-slate-700">{program.attributionDays} days</strong></span>}
        </div>
      </section>
    </div>
  );
}
