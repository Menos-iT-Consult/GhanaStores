import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Percent, Save, Users } from 'lucide-react';
import { adminApi, ghs } from '../../api.js';
import {
  Button, Drawer, EmptyState, ErrorBanner, Field, LoadingBlock, PageHeader,
  Panel, PanelHeader, StatCard, StatusPill, inputClass,
} from '../../components/admin/ui.jsx';

const emptyDraft = {
  name: '', tagline: '', monthlyPriceGhs: '', yearlyPriceGhs: '',
  maxProducts: '', features: '', isEnabled: true, sortOrder: '', smsMonthlySegments: '',
};

export default function AdminPlans() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await adminApi.get('/api/admin/plans'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openPlan = (plan) => {
    setEditing(plan);
    setSaveError('');
    setNotice('');
    setReason('');
    setDraft({
      name: plan.name,
      tagline: plan.tagline || '',
      // Prices are edited as raw numbers; ghs() is for display only.
      monthlyPriceGhs: String(plan.monthlyPriceGhs),
      yearlyPriceGhs: String(plan.yearlyPriceGhs),
      maxProducts: String(plan.maxProducts),
      smsMonthlySegments: String(plan.smsMonthlySegments ?? 0),
      features: (plan.features || []).join('\n'),
      isEnabled: plan.isEnabled,
      sortOrder: String(plan.sortOrder),
    });
  };

  const closeDrawer = () => {
    setEditing(null);
    setSaveError('');
    setReason('');
  };

  const save = async () => {
    setBusy(true);
    setSaveError('');
    try {
      await adminApi.patch(`/api/admin/plans/${editing.id}`, {
        name: draft.name,
        tagline: draft.tagline,
        monthlyPriceGhs: draft.monthlyPriceGhs === '' ? undefined : Number(draft.monthlyPriceGhs),
        yearlyPriceGhs: draft.yearlyPriceGhs === '' ? undefined : Number(draft.yearlyPriceGhs),
        maxProducts: draft.maxProducts === '' ? undefined : Number(draft.maxProducts),
        smsMonthlySegments: draft.smsMonthlySegments === '' ? undefined : Number(draft.smsMonthlySegments),
        features: draft.features.split('\n').map((line) => line.trim()).filter(Boolean),
        isEnabled: draft.isEnabled,
        sortOrder: draft.sortOrder === '' ? undefined : Number(draft.sortOrder),
        reason,
      });
      setNotice(`${draft.name} saved. The new prices are live on the pricing page immediately.`);
      closeDrawer();
      await load();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const plans = data?.plans || [];

  /* Mirror of the server's own guard, so the operator sees the problem while
     typing rather than only after the save is rejected. */
  const monthly = Number(draft.monthlyPriceGhs);
  const yearly = Number(draft.yearlyPriceGhs);
  const overCharge = draft.yearlyPriceGhs !== '' && draft.monthlyPriceGhs !== ''
    && Number.isFinite(monthly) && Number.isFinite(yearly) && monthly > 0 && yearly > monthly * 12;
  const yearlyPerMonth = draft.yearlyPriceGhs !== '' && Number.isFinite(yearly) && monthly > 0
    ? yearly / 12
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription plans"
        subtitle="What each plan costs and includes. These prices are what the public pricing page advertises and what a seller is charged on upgrade."
        actions={<Button icon={CreditCard} onClick={load}>Refresh</Button>}
      />

      {notice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Plans" value={data?.summary?.total ?? '-'} icon={CreditCard} />
        <StatCard title="On sale" value={data?.summary?.enabled ?? '-'} icon={Percent} tone="green" />
        <StatCard
          title="Tenants subscribed"
          value={plans.reduce((sum, p) => sum + Number(p.storesOnPlan || 0), 0)}
          icon={Users}
        />
      </div>


      <Panel>
        <PanelHeader
          title="Plan catalogue"
          subtitle="Disable a plan to take it off sale. Existing tenants keep the plan they are on."
        />

        {loading ? <LoadingBlock label="Loading plans..." />
          : error ? <ErrorBanner error={error} onRetry={load} />
            : !plans.length ? <EmptyState title="No plans yet" hint="Run the schema to seed the starter catalogue." />
              : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-3 font-bold">Plan</th>
                        <th className="px-4 py-3 font-bold">Monthly</th>
                        <th className="px-4 py-3 font-bold">Yearly</th>
                        <th className="px-4 py-3 font-bold">Product limit</th>
                        <th className="px-4 py-3 font-bold">Tenants</th>
                        <th className="px-4 py-3 font-bold">Status</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {plans.map((plan) => (
                        <tr key={plan.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-3">
                            <p className="font-bold text-charcoal">{plan.name}</p>
                            <p className="text-xs text-slate-500">{plan.tagline || plan.id}</p>
                          </td>
                          <td className="px-4 py-3 font-semibold">{ghs(plan.monthlyPriceGhs)}</td>
                          <td className="px-4 py-3 font-semibold">
                            {ghs(plan.yearlyPriceGhs)}
                            {plan.monthlyPriceGhs > 0 ? (
                              <span className="block text-xs font-normal text-slate-400">
                                {ghs(plan.yearlyPriceGhs / 12)} / mo
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            {plan.maxProducts >= 100000 ? 'Unlimited' : plan.maxProducts}
                          </td>
                          <td className="px-4 py-3">{plan.storesOnPlan}</td>
                          <td className="px-4 py-3">
                            <StatusPill
                              status={plan.isEnabled ? 'ACTIVE' : 'SUSPENDED'}
                              label={plan.isEnabled ? 'On sale' : 'Hidden'}
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button icon={Save} onClick={() => openPlan(plan)}>Edit</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
      </Panel>

      <Drawer
        open={Boolean(editing)}
        title={editing ? `Edit ${editing.name}` : ''}
        subtitle={editing ? `Plan id: ${editing.id}` : ''}
        onClose={closeDrawer}
        footer={(
          <div className="flex items-center justify-end gap-2">
            <Button onClick={closeDrawer}>Cancel</Button>
            <Button
              tone="primary"
              icon={Save}
              busy={busy}
              disabled={!reason.trim() || overCharge}
              onClick={save}
            >
              Save changes
            </Button>
          </div>
        )}
      >
        <div className="space-y-4">
          {saveError ? <ErrorBanner error={saveError} /> : null}

          <Field label="Plan name">
            <input
              className={inputClass}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </Field>

          <Field label="Tagline" hint="One short line shown under the name.">
            <input
              className={inputClass}
              value={draft.tagline}
              onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Monthly price (GHS)">
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={draft.monthlyPriceGhs}
                onChange={(e) => setDraft({ ...draft, monthlyPriceGhs: e.target.value })}
              />
            </Field>
            <Field
              label="Yearly price (GHS)"
              hint={yearlyPerMonth !== null ? `${ghs(yearlyPerMonth)} per month` : 'Set 0 to disable yearly billing.'}
            >
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={draft.yearlyPriceGhs}
                onChange={(e) => setDraft({ ...draft, yearlyPriceGhs: e.target.value })}
              />
            </Field>
          </div>

          {overCharge ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
              The yearly price cannot be more than twelve monthly payments.
            </p>
          ) : null}

          <Field label="Product limit" hint="Maximum products a store on this plan can list. 100000 or more is treated as unlimited.">
            <input
              type="number"
              min="0"
              className={inputClass}
              value={draft.maxProducts}
              onChange={(e) => setDraft({ ...draft, maxProducts: e.target.value })}
            />
          </Field>

          <Field
            label="Free SMS segments per period"
            hint="Platform order SMS included each billing period, counted in 140-character segments (a typical receipt costs 3-4). 0 means no free allowance - the plan can still buy prepaid segments, it just gets nothing included."
          >
            <input
              type="number"
              min="0"
              className={inputClass}
              value={draft.smsMonthlySegments}
              onChange={(e) => setDraft({ ...draft, smsMonthlySegments: e.target.value })}
            />
          </Field>

          <Field label="Features" hint="One per line. Shown as the checklist on the pricing page.">
            <textarea
              rows={6}
              className={`${inputClass} font-mono text-xs`}
              value={draft.features}
              onChange={(e) => setDraft({ ...draft, features: e.target.value })}
            />
          </Field>

          <Field label="Sort order" hint="Lower numbers appear first on the pricing page.">
            <input
              type="number"
              min="0"
              className={inputClass}
              value={draft.sortOrder}
              onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })}
            />
          </Field>

          <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5">
            <input
              type="checkbox"
              checked={draft.isEnabled}
              onChange={(e) => setDraft({ ...draft, isEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-bold text-charcoal">On sale</span>
            <span className="text-xs text-slate-500">
              {draft.isEnabled ? 'Visible on the pricing page and buyable.' : 'Hidden from buyers. Existing tenants keep it.'}
            </span>
          </label>

          <Field label="Reason for this change" hint="Required. Stored in the audit log with the before and after values.">
            <input
              className={inputClass}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Annual price promotion agreed with marketing"
            />
          </Field>
        </div>
      </Drawer>
    </div>
  );
}

