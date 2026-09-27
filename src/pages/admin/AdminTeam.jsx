/**
 * DiDwa - Super admin team.
 *
 * Every admin here is all-powerful, so this page is deliberately careful: the
 * last administrator cannot be revoked (that would lock the platform out of its
 * own dashboard), an operator cannot revoke themselves mid-session, and every
 * addition, reset and removal is audited.
 */
import { useState } from 'react';
import { KeyRound, Trash2, UserPlus } from 'lucide-react';
import { adminApi } from '../../api.js';
import {
  Button, ConfirmDialog, DataTable, Drawer, EmptyState, ErrorBanner, Field, LoadingBlock,
  PageHeader, Pagination, Panel, PanelHeader, RefreshCw, Stacked, Toolbar, dateTimeOrDash, inputClass,
} from '../../components/admin/ui.jsx';
import { useAdminList } from '../../components/admin/useAdminList.js';

export default function AdminTeam() {
  const team = useAdminList('/api/admin/team', { params: { rowsKey: 'admins' } });
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(null);
  const [revoking, setRevoking] = useState(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const openCreate = () => {
    setCreating(true); setResetting(null);
    setEmail(''); setName(''); setPassword(''); setError('');
  };
  const openReset = (admin) => {
    setResetting(admin); setCreating(false);
    setEmail(admin.email); setName(admin.name || ''); setPassword(''); setError('');
  };

  async function saveAdmin() {
    setBusy(true);
    setError('');
    try {
      await adminApi.post('/api/admin/team', { email, name, password });
      setCreating(false);
      setResetting(null);
      setNotice(`${email} can now sign in to the admin dashboard.`);
      team.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    setBusy(true);
    setError('');
    try {
      await adminApi.del(`/api/admin/team/${revoking.id}`);
      setNotice(`${revoking.email} no longer has access.`);
      setRevoking(null);
      team.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const longEnough = password.length >= 10;
  const isReset = Boolean(resetting);

  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Who can sign in to this dashboard."
        actions={(
          <>
            <Button icon={RefreshCw} onClick={team.reload}>Refresh</Button>
            <Button tone="primary" icon={UserPlus} onClick={openCreate}>Add administrator</Button>
          </>
        )}
      />

      {notice ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>
      ) : null}

      <Panel>
        <PanelHeader title="Administrators" subtitle="All accounts are fully privileged" />
        <Toolbar term={team.term} onTerm={team.setTerm} placeholder="Search name or email..." />
        {team.error ? <div className="p-5"><ErrorBanner error={team.error} onRetry={team.reload} /></div> : null}
        {team.loading ? <LoadingBlock label="Loading team..." /> : (
          <DataTable
            rows={team.rows}
            empty={<EmptyState title="No administrators found." />}
            columns={[
              { key: 'name', label: 'Administrator', render: (row) => <Stacked primary={row.name || row.email} secondary={row.email} /> },
              { key: 'createdAt', label: 'Added', align: 'right', render: (row) => dateTimeOrDash(row.createdAt) },
              {
                key: 'lastLoginAt',
                label: 'Last seen',
                align: 'right',
                render: (row) => (row.lastLoginAt
                  ? <Stacked primary={dateTimeOrDash(row.lastLoginAt)} secondary={row.lastLoginIp || ''} />
                  : <span className="text-xs text-slate-300">Never signed in</span>),
              },
              {
                key: 'actions',
                label: '',
                align: 'right',
                render: (row) => (
                  <span className="flex justify-end gap-2">
                    <Button icon={KeyRound} onClick={() => openReset(row)}>Reset password</Button>
                    <Button tone="danger" icon={Trash2} onClick={() => { setRevoking(row); setError(''); }}>Revoke</Button>
                  </span>
                ),
              },
            ]}
          />
        )}
        {!team.loading && !team.error ? (
          <Pagination page={team.page} pages={team.pages} total={team.total} onPage={team.setPage} />
        ) : null}
      </Panel>

      <Drawer
        open={creating || isReset}
        title={isReset ? 'Reset password' : 'Add administrator'}
        subtitle={isReset ? resetting?.email : 'They will be able to do everything on this dashboard'}
        onClose={() => { setCreating(false); setResetting(null); }}
        footer={(
          <div className="flex justify-end gap-2">
            <Button onClick={() => { setCreating(false); setResetting(null); }} disabled={busy}>Cancel</Button>
            <Button
              tone="primary"
              onClick={saveAdmin}
              busy={busy}
              disabled={!longEnough || (!isReset && !email.includes('@'))}
            >
              {isReset ? 'Reset password' : 'Create account'}
            </Button>
          </div>
        )}
      >
        <div className="space-y-4">
          {error ? <ErrorBanner error={error} /> : null}
          {isReset ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Setting a new password signs this administrator out everywhere and is recorded in the audit log.
            </p>
          ) : null}
          <Field label="Email">
            <input
              type="email"
              className={inputClass}
              value={email}
              disabled={isReset}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ops@didwaghana.com"
            />
          </Field>
          <Field label="Name" hint="Optional - shown in the audit log.">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Password" hint="At least 10 characters.">
            <input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
        </div>
      </Drawer>

      <ConfirmDialog
        open={Boolean(revoking)}
        busy={busy}
        title="Revoke this administrator?"
        message={(
          <span className="block space-y-2">
            <span className="block">
              {revoking?.email} loses access immediately, and any session they are holding stops working.
            </span>
            {error ? (
              <span className="block rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</span>
            ) : null}
          </span>
        )}
        confirmLabel="Revoke access"
        onCancel={() => setRevoking(null)}
        onConfirm={revoke}
      />
    </>
  );
}
