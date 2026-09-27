/**
 * DiDwa - Super admin merchant detail (360 degrees).
 *
 * The read side of a merchant: profile, wallet, catalogue, orders, domains,
 * subscriptions and this store's own audit history. The controls live in
 * <MerchantControls />, which is the only part here that writes.
 */
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, Globe, Receipt, Wallet } from 'lucide-react';
import { adminApi, ghs } from '../../api.js';
import { getPlatformDomain } from '../../config.js';
import { navigate, usePathname } from '../../router.js';
import MerchantControls from './MerchantControls.jsx';
import {
  Button, DataTable, ErrorBanner, LoadingBlock, Money, PageHeader, Panel, PanelHeader,
  RefreshCw, StatCard, StatusPill, Stacked, dateOrDash, dateTimeOrDash, list, storefrontHref,
} from '../../components/admin/ui.jsx';

export default function AdminMerchantDetail() {
  const route = usePathname();
  const id = route.split('/').filter(Boolean).pop();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      setData(await adminApi.get(`/api/admin/merchants/${id}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingBlock label="Loading merchant..." />;
  if (error) return <ErrorBanner error={error} onRetry={load} />;
  if (!data) return null;

  const merchant = data.merchant;
  const platformDomain = getPlatformDomain();
  const storefront = storefrontHref(merchant, platformDomain);

  return (
    <>
      <PageHeader
        title={merchant.name}
        subtitle={`${merchant.slug} - joined ${dateOrDash(merchant.createdAt)}`}
        actions={(
          <>
            <Button icon={ArrowLeft} onClick={() => navigate('/admin/merchants')}>All merchants</Button>
            {storefront ? (
              <a
                href={storefront}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <ExternalLink size={14} />Storefront
              </a>
            ) : null}
            <Button icon={RefreshCw} onClick={load}>Refresh</Button>
          </>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Status"
          value={<StatusPill status={merchant.status} />}
          detail={`Plan: ${merchant.plan}`}
          tone={merchant.status === 'SUSPENDED' ? 'rose' : 'blue'}
        />
        <StatCard
          title="Lifetime revenue"
          value={ghs(merchant.revenue)}
          icon={Receipt}
          detail={`${Number(merchant.ordersCount || 0).toLocaleString()} orders`}
          tone="emerald"
        />
        <StatCard
          title="Available balance"
          value={ghs(merchant.availableBalance)}
          icon={Wallet}
          detail={`${ghs(merchant.pendingBalance)} pending`}
        />
        <StatCard
          title="Products"
          value={Number(data.catalog?.total || 0).toLocaleString()}
          icon={Globe}
          detail={`${data.catalog?.low_stock || 0} variants low on stock`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <MerchantControls merchant={merchant} onDone={load} />

        <Panel className="lg:col-span-2">
          <PanelHeader title="Profile" />
          <dl className="grid gap-x-6 gap-y-3 p-5 sm:grid-cols-2">
            {[
              ['Owner', merchant.ownerName || '-'],
              ['Email', merchant.email],
              ['Phone', merchant.phone],
              ['WhatsApp', merchant.whatsappNumber || '-'],
              ['MoMo', merchant.momoNumber || '-'],
              ['Subdomain', merchant.slug],
              ['Custom domain', merchant.customDomain || '-'],
              ['Active theme', merchant.themeName || 'Default'],
              ['Trial ends', dateOrDash(merchant.trialEndsAt)],
              ['Grace ends', dateOrDash(merchant.graceEndsAt)],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</dt>
                <dd className="mt-0.5 truncate text-sm font-semibold text-charcoal">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Recent orders" subtitle="Newest first" />
          <DataTable
            rows={list(data.recentOrders)}
            columns={[
              { key: 'order_number', label: 'Order', render: (row) => <span className="font-mono text-xs">{row.order_number}</span> },
              { key: 'customer_name', label: 'Customer', render: (row) => <Stacked primary={row.customer_name || 'Walk-in'} secondary={row.channel} /> },
              { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
              { key: 'total', label: 'Total', align: 'right', render: (row) => <Money value={row.total} /> },
              { key: 'created_at', label: 'When', align: 'right', render: (row) => dateOrDash(row.created_at) },
            ]}
          />
        </Panel>

        <Panel>
          <PanelHeader title="Subscription payments" subtitle="Last 10 attempts" />
          <DataTable
            rows={list(data.payments)}
            columns={[
              { key: 'plan_id', label: 'Plan', render: (row) => <span className="font-semibold uppercase">{row.plan_id}</span> },
              { key: 'amount', label: 'Amount', align: 'right', render: (row) => <Money value={row.amount} /> },
              { key: 'provider', label: 'Gateway', render: (row) => row.provider },
              { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
              { key: 'initiated_at', label: 'When', align: 'right', render: (row) => dateOrDash(row.initiated_at) },
            ]}
          />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Domains" />
          <DataTable
            rows={list(data.domains)}
            columns={[
              { key: 'domain_name', label: 'Domain', render: (row) => <span className="font-semibold">{row.domain_name}</span> },
              { key: 'provider', label: 'Source' },
              { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
              { key: 'ssl_status', label: 'SSL' },
            ]}
          />
        </Panel>

        <Panel>
          <PanelHeader title="Changes to this merchant" subtitle="From the platform audit log" />
          <DataTable
            rows={list(data.audit)}
            columns={[
              { key: 'action', label: 'Action', render: (row) => <span className="font-semibold text-charcoal">{row.action}</span> },
              { key: 'admin_email', label: 'By', render: (row) => row.admin_email || 'system' },
              { key: 'created_at', label: 'When', align: 'right', render: (row) => dateTimeOrDash(row.created_at) },
            ]}
          />
        </Panel>
      </div>
    </>
  );
}
