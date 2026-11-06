import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Network, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import { adminApi, ghs } from '../../api.js';
import {
  Button, DataTable, ErrorBanner, LoadingBlock, PageHeader, Panel, PanelHeader, StatCard, StatusPill, dateTimeOrDash,
} from '../../components/admin/ui.jsx';

function RateSlider({ label, value, onChange }) {
  return (
    <label className="block min-w-40 space-y-1">
      <span className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-500">
        <span>{label}</span><span className="font-bold text-slate-700">{Number(value || 0).toFixed(2)}%</span>
      </span>
      <input type="range" min="0" max="100" step="0.1" value={value ?? 0} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-blue-600" />
    </label>
  );
}

export default function AdminPartners() {
  const [data, setData] = useState(null);
  const [rates, setRates] = useState({});
  const [notes, setNotes] = useState({});
  const [transferRefs, setTransferRefs] = useState({});
  const [networks, setNetworks] = useState({});
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const result = await adminApi.get('/api/admin/partners');
      setData(result);
      setRates(Object.fromEntries((result.partners || []).map((partner) => [
        partner.id,
        {
          merchant: Number(partner.merchant_override_rate_percent),
          affiliate: Number(partner.affiliate_override_rate_percent),
        },
      ])));
    } catch (err) {
      setError(err.message || 'Partner operations could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updatePartner = async (partner, status) => {
    const reason = String(notes[partner.id] || '').trim();
    if (!reason) {
      setError('Enter an approval, rejection, or suspension reason before saving.');
      return;
    }
    setBusy(partner.id);
    setError('');
    setNotice('');
    try {
      const value = rates[partner.id] || {};
      await adminApi.patch(`/api/admin/partners/${partner.id}`, {
        status,
        merchantOverrideRatePercent: Number(value.merchant),
        affiliateOverrideRatePercent: Number(value.affiliate),
        note: reason,
        reason,
      });
      setNotice(`Partner ${status}. Changes recorded in the admin audit log.`);
      await load();
    } catch (err) {
      setError(err.message || 'Partner settings could not be saved.');
    } finally {
      setBusy('');
    }
  };

  const toggleNetwork = async (partner) => {
    if (networks[partner.id]) {
      setNetworks((current) => ({ ...current, [partner.id]: null }));
      return;
    }
    setBusy(`network-${partner.id}`);
    setError('');
    try {
      const result = await adminApi.get(`/api/admin/partners/${partner.id}/network`);
      setNetworks((current) => ({ ...current, [partner.id]: result }));
    } catch (err) {
      setError(err.message || 'Partner network could not be loaded.');
    } finally {
      setBusy('');
    }
  };

  const processPayout = async (payout, status) => {
    const note = String(notes[`payout-${payout.id}`] || '').trim();
    const transferReference = String(transferRefs[payout.id] || '').trim();
    if (status === 'rejected' && !note) {
      setError('A reason is required when rejecting a partner payout.');
      return;
    }
    if (status === 'paid' && !transferReference) {
      setError('Enter the Mobile Money transfer reference before releasing the payout.');
      return;
    }
    setBusy(`payout-${payout.id}`);
    setError('');
    setNotice('');
    try {
      await adminApi.patch(`/api/admin/partner-payouts/${payout.id}`, {
        status, note, transferReference,
      });
      setNotice(status === 'paid' ? 'Partner payout marked paid.' : 'Partner payout rejected.');
      await load();
    } catch (err) {
      setError(err.message || 'Partner payout could not be updated.');
    } finally {
      setBusy('');
    }
  };

  if (loading) return <LoadingBlock label="Loading strategic partner program..." />;

  const partners = data?.partners || [];
  const payouts = data?.payouts || [];
  return (
    <div className="space-y-5">
      <PageHeader title="Strategic partners" subtitle="Review ambassador applications, configure override rates, inspect networks, and release Mobile Money payouts" />
      {error && <ErrorBanner error={error} onRetry={load} />}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Partner applications" value={Number(data?.summary?.total_partners || 0).toLocaleString()} icon={Network} detail={`${Number(data?.summary?.pending_applications || 0).toLocaleString()} awaiting review`} />
        <StatCard title="Approved partners" value={Number(data?.summary?.approved_partners || 0).toLocaleString()} icon={CheckCircle2} tone="emerald" />
        <StatCard title="Network earnings" value={ghs(data?.summary?.total_earned_ghs || 0)} icon={Wallet} tone="violet" />
        <StatCard title="Pending MoMo payouts" value={payouts.filter((payout) => payout.status === 'pending').length.toLocaleString()} icon={ShieldCheck} tone="amber" />
      </div>

      <Panel>
        <PanelHeader
          title="Applications and partner settings"
          subtitle="Tier 1 uses paid order GMV; tier 2 uses affiliate commissions earned. Rates are snapshotted for each ledger entry."
          actions={<Button icon={RefreshCw} onClick={load}>Refresh</Button>}
        />
        <DataTable
          columns={[
            {
              key: 'partner',
              label: 'Applicant',
              render: (row) => <div><p className="font-bold text-charcoal">{row.full_name}</p><p className="text-xs text-slate-500">{row.organization_name} · {row.email}</p><p className="mt-1 font-mono text-[11px] text-slate-400">{row.partner_code} / {row.partner_slug}</p></div>,
            },
            { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
            {
              key: 'rates',
              label: 'Override rates',
              render: (row) => {
                const value = rates[row.id] || {};
                return (
                  <div className="min-w-52 space-y-2">
                    <RateSlider label="Merchant GMV" value={value.merchant} onChange={(merchant) => setRates((current) => ({ ...current, [row.id]: { ...current[row.id], merchant } }))} />
                    <RateSlider label="Affiliate commission" value={value.affiliate} onChange={(affiliate) => setRates((current) => ({ ...current, [row.id]: { ...current[row.id], affiliate } }))} />
                  </div>
                );
              },
            },
            { key: 'network', label: 'Network', align: 'right', render: (row) => <span>{row.merchant_count} merchants · {row.affiliate_count} affiliates</span> },
            { key: 'earned_ghs', label: 'Earned', align: 'right', render: (row) => ghs(row.earned_ghs) },
            { key: 'created_at', label: 'Applied', render: (row) => dateTimeOrDash(row.created_at) },
            {
              key: 'review',
              label: 'Review',
              render: (row) => (
                <div className="min-w-48 space-y-2">
                  <input
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
                    placeholder="Required decision reason"
                    value={notes[row.id] ?? row.admin_note ?? ''}
                    onChange={(event) => setNotes((current) => ({ ...current, [row.id]: event.target.value }))}
                    aria-label={`Review reason for ${row.full_name}`}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    <Button tone="primary" busy={busy === row.id} onClick={() => updatePartner(row, 'approved')}>Approve / save</Button>
                    <Button tone="danger" busy={busy === row.id} onClick={() => updatePartner(row, row.status === 'approved' ? 'suspended' : 'rejected')}>
                      {row.status === 'approved' ? 'Suspend' : 'Reject'}
                    </Button>
                    <Button icon={Network} busy={busy === `network-${row.id}`} onClick={() => toggleNetwork(row)}>Network</Button>
                  </div>
                  {networks[row.id] && (
                    <div className="mt-2 max-h-72 min-w-72 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                      <p className="font-bold text-slate-800">Direct merchants</p>
                      {networks[row.id].merchants.length ? networks[row.id].merchants.map((merchant) => (
                        <p key={merchant.id} className="mt-1 text-slate-600">{merchant.name} · {merchant.status} · {ghs(merchant.paid_volume_ghs)}</p>
                      )) : <p className="mt-1 text-slate-400">No direct merchants</p>}
                      <p className="mt-3 font-bold text-slate-800">Recruited affiliates</p>
                      {networks[row.id].affiliates.length ? networks[row.id].affiliates.map((affiliate) => (
                        <div key={affiliate.id} className="mt-2 text-slate-600">
                          <p className="font-semibold">{affiliate.full_name} · {affiliate.referred_merchants} referred merchants · {ghs(affiliate.commission_ghs)}</p>
                          {affiliate.merchants?.length > 0 && (
                            <ul className="ml-3 mt-1 list-disc">
                              {affiliate.merchants.map((merchant) => <li key={merchant.id}>{merchant.name} · {merchant.status}</li>)}
                            </ul>
                          )}
                        </div>
                      )) : <p className="mt-1 text-slate-400">No recruited affiliates</p>}
                    </div>
                  )}
                </div>
              ),
            },
          ]}
          rows={partners}
          empty={<p className="text-sm text-slate-500">No partner applications have been received.</p>}
        />
      </Panel>

      <Panel>
        <PanelHeader
          title="Partner Mobile Money payout requests"
          subtitle="Verify the saved MoMo destination, complete the transfer outside DiDwa, and record its reference—or give a rejection reason."
          actions={<Button icon={RefreshCw} onClick={load}>Refresh</Button>}
        />
        <DataTable
          columns={[
            { key: 'partner', label: 'Partner', render: (row) => <div><p className="font-bold">{row.full_name}</p><p className="text-xs text-slate-500">{row.organization_name}</p></div> },
            { key: 'amount_ghs', label: 'Amount', align: 'right', render: (row) => ghs(row.amount_ghs) },
            { key: 'destination', label: 'Verified destination', render: (row) => <div><p className="font-semibold">{row.momo_account_name || 'Name not verified'}</p><p className="text-xs text-slate-500">{row.momo_number} · {row.momo_network}</p></div> },
            { key: 'requested_at', label: 'Requested', render: (row) => dateTimeOrDash(row.requested_at) },
            { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
            {
              key: 'review',
              label: 'Release / reject',
              render: (row) => row.status !== 'pending' ? (
                <span className="text-xs text-slate-500">{row.transfer_reference || row.admin_note || 'Processed'}</span>
              ) : (
                <div className="min-w-52 space-y-2">
                  <input className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs" placeholder="Transfer reference (for paid)" value={transferRefs[row.id] || ''} onChange={(event) => setTransferRefs((current) => ({ ...current, [row.id]: event.target.value }))} />
                  <input className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs" placeholder="Note / rejection reason" value={notes[`payout-${row.id}`] || ''} onChange={(event) => setNotes((current) => ({ ...current, [`payout-${row.id}`]: event.target.value }))} />
                  <div className="flex gap-2">
                    <Button tone="primary" busy={busy === `payout-${row.id}`} onClick={() => processPayout(row, 'paid')}>Mark paid</Button>
                    <Button tone="danger" busy={busy === `payout-${row.id}`} onClick={() => processPayout(row, 'rejected')}>Reject</Button>
                  </div>
                </div>
              ),
            },
          ]}
          rows={payouts}
          empty={<p className="text-sm text-slate-500">No partner payouts have been requested.</p>}
        />
      </Panel>
    </div>
  );
}
