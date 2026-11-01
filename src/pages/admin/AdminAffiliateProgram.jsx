import { useCallback, useEffect, useState } from 'react';
import { BadgePercent, CheckCircle2, RefreshCw, Save, Users, Wallet, XCircle } from 'lucide-react';
import { adminApi, ghs } from '../../api.js';
import {
  Button, DataTable, ErrorBanner, Field, LoadingBlock, PageHeader, Panel, PanelHeader,
  StatCard, dateTimeOrDash, inputClass,
} from '../../components/admin/ui.jsx';

const INITIAL_SETTINGS = {
  commissionRatePercent: '',
  minimumPayoutGhs: '',
  attributionDays: '',
  payoutProcessingMinDays: '',
  payoutProcessingMaxDays: '',
};

export default function AdminAffiliateProgram() {
  const [settings, setSettings] = useState(null);
  const [affiliateData, setAffiliateData] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [draft, setDraft] = useState(INITIAL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');
  const [payoutError, setPayoutError] = useState('');
  const [reason, setReason] = useState('');
  const [transferRefs, setTransferRefs] = useState({});
  const [payoutNotes, setPayoutNotes] = useState({});
  const [busyPayoutId, setBusyPayoutId] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [result, affiliateOverview, payoutOverview] = await Promise.all([
        adminApi.get('/api/admin/affiliate-program'),
        adminApi.get('/api/admin/affiliates'),
        adminApi.get('/api/admin/affiliate-payouts'),
      ]);
      setSettings(result.settings);
      setAffiliateData(affiliateOverview);
      setPayouts(payoutOverview.payouts || []);
      setDraft(Object.fromEntries(
        Object.entries(result.settings).map(([key, value]) => [key, String(value)]),
      ));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setBusy(true);
    setSaveError('');
    setNotice('');
    try {
      await adminApi.patch('/api/admin/affiliate-program', {
        commissionRatePercent: Number(draft.commissionRatePercent),
        minimumPayoutGhs: Number(draft.minimumPayoutGhs),
        attributionDays: Number(draft.attributionDays),
        payoutProcessingMinDays: Number(draft.payoutProcessingMinDays),
        payoutProcessingMaxDays: Number(draft.payoutProcessingMaxDays),
        reason,
      });
      setReason('');
      setNotice('Affiliate program terms saved.');
      await load();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const processPayout = async (payout, status) => {
    setBusyPayoutId(payout.id);
    setPayoutError('');
    setNotice('');
    try {
      await adminApi.patch(`/api/admin/affiliate-payouts/${payout.id}`, {
        status,
        transferReference: transferRefs[payout.id] || '',
        note: payoutNotes[payout.id] || '',
      });
      setNotice(status === 'paid' ? 'Affiliate payout marked paid.' : 'Affiliate payout rejected.');
      await load();
    } catch (err) {
      setPayoutError(err.message || 'Affiliate payout could not be updated.');
    } finally {
      setBusyPayoutId('');
    }
  };

  if (loading) return <LoadingBlock label="Loading affiliate program settings..." />;
  if (error && !settings) return <ErrorBanner error={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      <PageHeader title="Affiliate program" subtitle="Configure the public program terms and operational thresholds" />
      {error && <ErrorBanner error={error} onRetry={load} />}
      {saveError && <ErrorBanner error={saveError} />}
      {payoutError && <ErrorBanner error={payoutError} />}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Affiliate accounts" value={Number(affiliateData?.summary?.total_affiliates || 0).toLocaleString()} icon={Users} detail={`${Number(affiliateData?.summary?.active_affiliates || 0).toLocaleString()} active`} />
        <StatCard title="Referred stores" value={Number(affiliateData?.summary?.total_referrals || 0).toLocaleString()} icon={BadgePercent} />
        <StatCard title="Commissions earned" value={ghs(affiliateData?.summary?.total_commissions || 0)} icon={Wallet} tone="emerald" />
      </div>

      <Panel>
        <PanelHeader
          title="Affiliate accounts"
          subtitle={`Latest ${affiliateData?.affiliates?.length || 0} accounts with referral and commission activity.`}
          actions={(
            <Button icon={RefreshCw} onClick={load}>Refresh</Button>
          )}
        />
        <DataTable
          columns={[
            {
              key: 'affiliate',
              label: 'Affiliate',
              render: (row) => (
                <div>
                  <p className="font-bold text-charcoal">{row.full_name}</p>
                  <p className="text-xs text-slate-500">{row.email}</p>
                </div>
              ),
            },
            { key: 'referral_code', label: 'Referral code', className: 'font-mono font-semibold' },
            { key: 'referral_count', label: 'Referred stores', align: 'right' },
            { key: 'commissions_earned', label: 'Commissions', align: 'right', render: (row) => ghs(row.commissions_earned) },
            { key: 'pending_payouts', label: 'Pending payouts', align: 'right', render: (row) => ghs(row.pending_payouts) },
            {
              key: 'is_active',
              label: 'Account',
              render: (row) => (
                <span className={row.is_active ? 'font-semibold text-emerald-700' : 'font-semibold text-slate-500'}>
                  {row.is_active ? 'Active' : 'Inactive'}
                </span>
              ),
            },
            { key: 'created_at', label: 'Joined', render: (row) => dateTimeOrDash(row.created_at) },
          ]}
          rows={affiliateData?.affiliates || []}
          empty={<p className="text-sm text-slate-500">No affiliate accounts have signed up yet.</p>}
        />
      </Panel>

      <Panel>
        <PanelHeader
          title="Affiliate payout requests"
          subtitle="Review the verified destination, complete the transfer, then record its reference or rejection reason."
          actions={<Button icon={RefreshCw} onClick={load}>Refresh</Button>}
        />
        <DataTable
          columns={[
            {
              key: 'affiliate',
              label: 'Affiliate',
              render: (row) => (
                <div>
                  <p className="font-bold text-charcoal">{row.full_name}</p>
                  <p className="text-xs text-slate-500">{row.email}</p>
                </div>
              ),
            },
            { key: 'amount_ghs', label: 'Amount', align: 'right', render: (row) => ghs(row.amount_ghs) },
            {
              key: 'destination',
              label: 'Verified destination',
              render: (row) => (
                <div>
                  <p className="font-semibold">{row.momo_verified_name || 'Name not verified'}</p>
                  <p className="text-xs text-slate-500">{row.momo_number} · {row.momo_network}</p>
                </div>
              ),
            },
            { key: 'requested_at', label: 'Requested', render: (row) => dateTimeOrDash(row.requested_at) },
            {
              key: 'status',
              label: 'Status',
              render: (row) => <span className="font-semibold capitalize">{row.status}</span>,
            },
            {
              key: 'review',
              label: 'Review',
              render: (row) => row.status === 'pending' ? (
                <div className="min-w-[220px] space-y-2">
                  <input
                    className={inputClass}
                    maxLength={120}
                    value={transferRefs[row.id] || ''}
                    onChange={(event) => setTransferRefs((current) => ({ ...current, [row.id]: event.target.value }))}
                    placeholder="Completed transfer reference"
                    aria-label={`Transfer reference for ${row.full_name}`}
                  />
                  <input
                    className={inputClass}
                    maxLength={500}
                    value={payoutNotes[row.id] || ''}
                    onChange={(event) => setPayoutNotes((current) => ({ ...current, [row.id]: event.target.value }))}
                    placeholder="Note (required to reject)"
                    aria-label={`Review note for ${row.full_name}`}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      tone="primary"
                      icon={CheckCircle2}
                      busy={busyPayoutId === row.id}
                      disabled={!transferRefs[row.id]?.trim()}
                      onClick={() => processPayout(row, 'paid')}
                    >Mark paid</Button>
                    <Button
                      tone="danger"
                      icon={XCircle}
                      busy={busyPayoutId === row.id}
                      disabled={!payoutNotes[row.id]?.trim()}
                      onClick={() => processPayout(row, 'rejected')}
                    >Reject</Button>
                  </div>
                </div>
              ) : <p className="max-w-xs whitespace-pre-wrap text-xs text-slate-500">{row.admin_note || '-'}</p>,
            },
          ]}
          rows={payouts}
          empty={<p className="text-sm text-slate-500">No affiliate payout requests have been submitted.</p>}
        />
      </Panel>

      <Panel>
        <PanelHeader
          title="Program figures"
          subtitle="Changes update the public affiliate page and related payout behavior. Every save is recorded in the audit log."
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Recurring commission rate (%)" hint="Applied to qualifying referred plan payments. Enter 0 to disable commissions.">
            <input type="number" min="0" max="100" step="0.01" className={inputClass} value={draft.commissionRatePercent} onChange={(e) => update('commissionRatePercent', e.target.value)} />
          </Field>
          <Field label="Minimum payout (GHS)" hint="Minimum balance required before an affiliate can request a payout.">
            <input type="number" min="0" max="1000000" step="0.01" className={inputClass} value={draft.minimumPayoutGhs} onChange={(e) => update('minimumPayoutGhs', e.target.value)} />
          </Field>
          <Field label="Referral attribution (days)" hint="How long a referral attribution remains valid.">
            <input type="number" min="1" max="3650" step="1" className={inputClass} value={draft.attributionDays} onChange={(e) => update('attributionDays', e.target.value)} />
          </Field>
          <Field label="Minimum payout processing time (business days)">
            <input type="number" min="0" max="365" step="1" className={inputClass} value={draft.payoutProcessingMinDays} onChange={(e) => update('payoutProcessingMinDays', e.target.value)} />
          </Field>
          <Field label="Maximum payout processing time (business days)" hint="Must be greater than or equal to the minimum.">
            <input type="number" min="0" max="365" step="1" className={inputClass} value={draft.payoutProcessingMaxDays} onChange={(e) => update('payoutProcessingMaxDays', e.target.value)} />
          </Field>
          <Field label="Reason for change">
            <input type="text" maxLength="500" className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are these terms changing?" />
          </Field>
        </div>
        <div className="flex justify-end border-t border-slate-100 px-5 py-4">
          <Button
            tone="primary"
            icon={Save}
            busy={busy}
            disabled={!settings || Object.keys(settings).every((key) => Number(draft[key]) === Number(settings[key])) || !reason.trim()}
            onClick={save}
          >
            Save program terms
          </Button>
        </div>
      </Panel>
    </div>
  );
}
