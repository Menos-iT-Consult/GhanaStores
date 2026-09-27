/**
 * DiDwa - Super admin merchant controls (the only writes on the detail page).
 *
 * Suspend, change plan, adjust wallet. All three require a typed reason, because
 * all three are audited and the reason is the only thing that makes the trail
 * readable later. Kept in its own file so the read-only 360 view stays
 * obviously read-only.
 */
import { useState } from 'react';
import { ShieldAlert, Wallet } from 'lucide-react';
import { adminApi, ghs } from '../../api.js';
import {
  Button, Drawer, Field, Panel, PanelHeader, StatusPill, inputClass,
} from '../../components/admin/ui.jsx';

const PLANS = ['starter', 'growth', 'pro', 'enterprise'];

export default function MerchantControls({ merchant, onDone }) {
  const [action, setAction] = useState(null);      // 'status' | 'plan' | 'balance'
  const [reason, setReason] = useState('');
  const [nextStatus, setNextStatus] = useState('SUSPENDED');
  const [nextPlan, setNextPlan] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const suspended = merchant.status === 'SUSPENDED';

  function open(name) {
    setAction(name);
    setReason('');
    setError('');
    setNotice('');
    setAmount('');
    setNextPlan(merchant.plan || '');
    setNextStatus(suspended ? 'ACTIVE' : 'SUSPENDED');
  }

  async function submit() {
    setBusy(true);
    setError('');
    try {
      let message = '';
      if (action === 'status') {
        const result = await adminApi.patch(`/api/admin/merchants/${merchant.id}/status`, { status: nextStatus, reason });
        message = `Merchant is now ${result.merchant.status}.`;
      } else if (action === 'plan') {
        const result = await adminApi.patch(`/api/admin/merchants/${merchant.id}/plan`, { plan: nextPlan, reason });
        message = `Plan changed to ${result.merchant.plan}.`;
      } else {
        const result = await adminApi.patch(`/api/admin/merchants/${merchant.id}/balance`, {
          amount: Number(amount), reason,
        });
        // The server reports what it could actually apply, which is less than
        // requested when the wallet floored at zero.
        message = result.note || `Balance adjusted by ${result.applied}.`;
      }
      setNotice(message);
      setAction(null);
      if (onDone) onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const amountValue = Number(amount);
  const valid = reason.trim().length > 0
    && (action !== 'balance' || (String(amount).trim() !== '' && Number.isFinite(amountValue) && amountValue !== 0));

  const titles = { status: suspended ? 'Reactivate merchant' : 'Suspend merchant', plan: 'Change plan', balance: 'Adjust balance' };

  return (
    <Panel>
      <PanelHeader title="Operational controls" subtitle="Every change is audited" />
      <div className="space-y-3 p-5">
        {notice ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{notice}</p>
        ) : null}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          Current status: <StatusPill status={merchant.status} />
        </div>
        <Button
          tone={suspended ? 'primary' : 'danger'}
          icon={ShieldAlert}
          onClick={() => open('status')}
          className="w-full"
        >
          {suspended ? 'Reactivate merchant' : 'Suspend merchant'}
        </Button>
        <Button className="w-full" onClick={() => open('plan')}>Change plan</Button>
        <Button icon={Wallet} className="w-full" onClick={() => open('balance')}>Adjust balance</Button>
        <p className="pt-2 text-[11px] leading-relaxed text-slate-400">
          Suspending hides the storefront immediately and blocks checkout. A balance
          adjustment is a manual ledger correction and cannot take the wallet below zero.
        </p>
      </div>

      <Drawer
        open={Boolean(action)}
        title={titles[action] || ''}
        subtitle={merchant.name}
        onClose={() => setAction(null)}
        footer={(
          <div className="flex items-center justify-end gap-2">
            <Button onClick={() => setAction(null)} disabled={busy}>Cancel</Button>
            <Button
              tone={action === 'status' && !suspended ? 'danger' : 'primary'}
              onClick={submit}
              busy={busy}
              disabled={!valid}
            >
              Confirm
            </Button>
          </div>
        )}
      >
        <div className="space-y-4">
          {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

          {action === 'status' ? (
            <Field label="New status">
              <select className={inputClass} value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
                <option value="ACTIVE">ACTIVE - trading normally</option>
                <option value="PAST_DUE">PAST_DUE - payment overdue, still trading</option>
                <option value="TRIAL">TRIAL - back in trial</option>
                <option value="SUSPENDED">SUSPENDED - storefront blocked</option>
              </select>
            </Field>
          ) : null}

          {action === 'plan' ? (
            <Field label="Plan">
              <input
                className={inputClass}
                list="admin-plans"
                value={nextPlan}
                onChange={(e) => setNextPlan(e.target.value.trim().toLowerCase())}
              />
              <datalist id="admin-plans">
                {PLANS.map((plan) => <option key={plan} value={plan} />)}
              </datalist>
            </Field>
          ) : null}

          {action === 'balance' ? (
            <>
              <Field
                label="Amount (GHS)"
                hint="Positive credits the wallet, negative debits it. The wallet cannot go below zero."
              >
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="-50.00"
                />
              </Field>
              <p className="text-xs text-slate-500">
                Current available balance:{' '}
                <span className="font-bold text-charcoal">{ghs(merchant.availableBalance)}</span>
              </p>
            </>
          ) : null}

          <Field label="Reason" hint="Recorded in the audit log. Required.">
            <textarea
              rows={3}
              className={inputClass}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this change being made?"
            />
          </Field>
        </div>
      </Drawer>
    </Panel>
  );
}
