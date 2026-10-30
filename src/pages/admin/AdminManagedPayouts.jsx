import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { adminApi, ghs } from '../../api.js';
import {
  Button, DataTable, EmptyState, ErrorBanner, LoadingBlock, PageHeader, Panel,
  PanelHeader, StatusPill, dateTimeOrDash, inputClass,
} from '../../components/admin/ui.jsx';

const FILTERS = [
  ['PENDING', 'Pending review'],
  ['PAID', 'Paid'],
  ['REJECTED', 'Rejected'],
  ['', 'All requests'],
];

export default function AdminManagedPayouts() {
  const [status, setStatus] = useState('PENDING');
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [transferRefs, setTransferRefs] = useState({});
  const [notes, setNotes] = useState({});

  const load = useCallback(async () => {
    setError('');
    try {
      const query = new URLSearchParams({ status, limit: '100' });
      const result = await adminApi.get(`/api/admin/managed-payouts?${query}`);
      setRequests(result.requests || []);
      setSummary(result.summary || {});
    } catch (requestError) {
      setError(requestError.message || 'Managed payout requests could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  async function processRequest(request, nextStatus) {
    setBusyId(request.id);
    setError('');
    setNotice('');
    try {
      await adminApi.patch(`/api/admin/managed-payouts/${request.id}`, {
        status: nextStatus,
        transferReference: transferRefs[request.id] || '',
        note: notes[request.id] || '',
      });
      setNotice(nextStatus === 'paid'
        ? `Payout marked paid. Transfer the funds before recording this status.`
        : 'Payout request rejected.');
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Payout request could not be updated.');
    } finally {
      setBusyId('');
    }
  }

  const columns = [
    { key: 'store_name', label: 'Merchant', render: (row) => <div><p className="font-bold text-charcoal">{row.store_name}</p><p className="text-xs text-slate-400">{row.store_email}</p></div> },
    { key: 'amount_ghs', label: 'Amount', align: 'right', render: (row) => <strong>{ghs(row.amount_ghs)}</strong> },
    { key: 'momo_number', label: 'Verified destination', render: (row) => <div><p className="font-semibold">{row.momo_account_name || 'Name not verified'}</p><p className="text-xs text-slate-500">{row.momo_number} · {row.momo_network}</p></div> },
    { key: 'requested_at', label: 'Requested', render: (row) => dateTimeOrDash(row.requested_at) },
    { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
    {
      key: 'actions',
      label: 'Review',
      render: (row) => row.status === 'pending' ? (
        <div className="min-w-[220px] space-y-2">
          <input
            className={inputClass}
            maxLength={120}
            value={transferRefs[row.id] || ''}
            onChange={(event) => setTransferRefs((current) => ({ ...current, [row.id]: event.target.value }))}
            placeholder="Completed transfer reference"
            aria-label={`Transfer reference for ${row.store_name}`}
          />
          <input
            className={inputClass}
            maxLength={500}
            value={notes[row.id] || ''}
            onChange={(event) => setNotes((current) => ({ ...current, [row.id]: event.target.value }))}
            placeholder="Review note (required to reject)"
            aria-label={`Review note for ${row.store_name}`}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              tone="primary"
              icon={CheckCircle2}
              busy={busyId === row.id}
              disabled={!transferRefs[row.id]?.trim()}
              onClick={() => processRequest(row, 'paid')}
            >Mark paid</Button>
            <Button
              tone="danger"
              icon={XCircle}
              busy={busyId === row.id}
              disabled={!notes[row.id]?.trim()}
              onClick={() => processRequest(row, 'rejected')}
            >Reject</Button>
          </div>
        </div>
      ) : (
        <div className="text-xs text-slate-500">
          {row.transfer_reference ? `Transfer: ${row.transfer_reference}` : row.admin_note || '-'}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Managed payouts"
        subtitle="Review vendor requests, make the Mobile Money transfer manually, then record its reference here."
        actions={<Button icon={RefreshCw} onClick={() => { void load(); }}>Refresh</Button>}
      />
      {error && <ErrorBanner error={error} onRetry={() => { void load(); }} />}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}

      <Panel>
        <PanelHeader title="Payout requests" subtitle={`${Number(summary.pending?.count || 0)} pending · ${ghs(summary.pending?.amountGhs || 0)} pending total`} />
        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
          {FILTERS.map(([value, label]) => (
            <button
              key={value || 'all'}
              type="button"
              onClick={() => { setLoading(true); setStatus(value); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${status === value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >{label}</button>
          ))}
        </div>
        {loading ? <LoadingBlock label="Loading payout requests..." /> : (
          <DataTable
            rows={requests}
            empty={<EmptyState title="No payout requests in this view." />}
            columns={columns}
          />
        )}
      </Panel>
    </div>
  );
}
