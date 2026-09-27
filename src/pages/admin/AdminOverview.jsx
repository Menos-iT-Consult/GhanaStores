/**
 * DiDwa - Super admin overview.
 *
 * Answers the four questions an operator opens the dashboard with: how big is
 * the platform, is it growing, what needs a human, and what did we change. The
 * old version of this screen was one giant /overview response rendering every
 * tenant, domain and transaction at once; this is deliberately bounded.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, CreditCard, Globe, Package, Receipt, Store, TrendingUp,
  TrendingDown, Users, Wallet,
} from 'lucide-react';
import { adminApi, ghs } from '../../api.js';
import { navigate } from '../../router.js';
import {
  DataTable, ErrorBanner, LoadingBlock, Money, PageHeader, Panel, PanelHeader,
  RefreshCw as Refresh, Stacked, StatCard, dateTimeOrDash, list,
} from '../../components/admin/ui.jsx';

const num = (value) => Number(value || 0).toLocaleString();

/** Minimal revenue sparkline - bars sized against the busiest day. */
function GrowthBars({ rows }) {
  const points = list(rows);
  if (points.length < 2) return <p className="px-5 py-6 text-sm text-slate-400">Not enough history yet.</p>;
  const max = Math.max(...points.map((point) => Number(point.revenue || 0)), 1);
  return (
    <div className="flex h-40 items-end gap-1 px-5 py-5">
      {points.map((point) => (
        <div key={point.day} className="group relative flex-1" title={`${point.day}: ${ghs(point.revenue)}`}>
          <div
            className="w-full rounded-t bg-blue-500/80 transition group-hover:bg-blue-600"
            style={{ height: `${Math.max(2, (Number(point.revenue || 0) / max) * 100)}%` }}
          />
        </div>
      ))}
    </div>
  );
}

const ATTENTION_DOT = {
  merchant_suspended: 'bg-rose-500',
  merchant_past_due: 'bg-amber-500',
  payout_review: 'bg-amber-500',
  domain_failed: 'bg-amber-500',
  payment_failed: 'bg-rose-500',
};

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await adminApi.get('/api/admin/overview'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingBlock label="Loading platform overview..." />;
  if (error) return <ErrorBanner error={error} onRetry={load} />;

  const metrics = data?.metrics || {};
  const attention = list(data?.attention);
  const change = metrics.revenueChangePct;
  const trendUp = change === null || change >= 0;

  return (
    <>
      <PageHeader
        title="Platform overview"
        subtitle="Everything happening across every merchant on DiDwa."
        actions={(
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <Refresh size={14} />Refresh
          </button>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Lifetime revenue"
          value={ghs(metrics.revenue)}
          icon={trendUp ? TrendingUp : TrendingDown}
          detail={change === null
            ? 'No prior 30-day period to compare'
            : `${change >= 0 ? '+' : ''}${change}% vs previous 30 days`}
          tone={trendUp ? 'emerald' : 'rose'}
        />
        <StatCard
          title="Merchants"
          value={num(metrics.merchants)}
          icon={Store}
          detail={`${num(metrics.merchants_active)} active - ${num(metrics.merchants_suspended)} suspended`}
        />
        <StatCard
          title="Orders"
          value={num(metrics.orders)}
          icon={Receipt}
          detail={`${num(metrics.orders_open)} awaiting fulfilment`}
        />
        <StatCard
          title="Needs attention"
          value={num(num(metrics.merchants_suspended) + num(metrics.domains_broken)
            + num(metrics.payments_failed) + num(metrics.payouts_to_review))}
          icon={AlertTriangle}
          detail={`${num(metrics.payouts_to_review)} payouts to approve - ${num(metrics.domains_broken)} domain issues`}
          tone="amber"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader title="Revenue, last 30 days" subtitle="Paid, fulfilled and delivered orders" />
          <GrowthBars rows={data?.growth} />
        </Panel>

        <Panel>
          <PanelHeader title="Platform health" />
          <dl className="divide-y divide-slate-100">
            {[
              { label: 'Customers', value: num(metrics.customers), icon: Users },
              { label: 'Products listed', value: num(metrics.products), icon: Package },
              { label: 'Theme templates', value: num(metrics.themes), icon: Globe },
              { label: 'Active domains', value: num(metrics.domains_active), icon: Globe },
              { label: 'Payments failed', value: num(metrics.payments_failed), icon: CreditCard },
              { label: 'Variants low on stock', value: num(metrics.variants_low_stock), icon: Package },
              { label: 'Merchant funds held', value: ghs(metrics.merchant_funds_held), icon: Wallet },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between gap-3 px-5 py-3">
                <dt className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Icon size={14} className="text-slate-400" />{label}
                </dt>
                <dd className="text-sm font-extrabold text-charcoal">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Needs attention"
            subtitle="Ranked newest first"
            actions={<span className="text-xs font-bold text-slate-400">{attention.length}</span>}
          />
          {attention.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">Nothing needs a human right now.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {attention.map((item, index) => (
                <li key={`${item.kind}-${item.ref}-${index}`} className="flex items-start gap-3 px-5 py-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ATTENTION_DOT[item.kind] || 'bg-slate-300'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-charcoal">{item.label}</p>
                    <p className="truncate text-xs text-slate-400">{item.note}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-400">{dateTimeOrDash(item.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Top merchants by revenue" />
          <DataTable
            rows={list(data?.topMerchants)}
            columns={[
              {
                key: 'name',
                label: 'Merchant',
                render: (row) => (
                  <button type="button" onClick={() => navigate(`/admin/merchants/${row.id}`)} className="text-left">
                    <Stacked primary={row.name} secondary={row.slug} />
                  </button>
                ),
              },
              { key: 'orders', label: 'Orders', align: 'right', render: (row) => num(row.orders) },
              { key: 'revenue', label: 'Revenue', align: 'right', render: (row) => <Money value={row.revenue} /> },
            ]}
          />
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Recent admin activity"
          subtitle="Every write on this platform is logged"
          actions={(
            <button
              type="button"
              onClick={() => navigate('/admin/audit')}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              View full log
            </button>
          )}
        />
        <DataTable
          rows={list(data?.recentAudit)}
          columns={[
            { key: 'actionLabel', label: 'Action', render: (row) => <span className="font-semibold text-charcoal">{row.actionLabel}</span> },
            { key: 'admin_name', label: 'By', render: (row) => row.admin_name || row.admin_email || 'system' },
            { key: 'target_type', label: 'Target', render: (row) => row.target_type || '-' },
            { key: 'created_at', label: 'When', align: 'right', render: (row) => dateTimeOrDash(row.created_at) },
          ]}
        />
      </Panel>
    </>
  );
}
