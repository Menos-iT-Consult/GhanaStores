/**
 * Stock correction for a single variant.
 *
 * A merchant owns their catalogue, but stock counts get wrong (a mis-scan, a
 * correction after a delivery) and only the platform can fix them. The reason is
 * mandatory because every correction is written to the audit log.
 */
import { useState } from 'react';
import { adminApi } from '../../api.js';
import { Button, Drawer, ErrorBanner, Field, inputClass } from '../../components/admin/ui.jsx';

export default function StockEditor({ variant, onClose, onSaved }) {
  const [stock, setStock] = useState(String(variant?.stock_quantity ?? 0));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setBusy(true);
    setError('');
    try {
      await adminApi.patch(`/api/admin/variants/${variant.id}/stock`, { stock: Number(stock), reason });
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const valid = reason.trim().length > 0
    && Number.isInteger(Number(stock))
    && Number(stock) >= 0;

  return (
    <Drawer
      open={Boolean(variant)}
      title="Correct stock"
      subtitle={variant ? `${variant.option_name}: ${variant.option_value}` : ''}
      onClose={onClose}
      footer={(
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button tone="primary" onClick={save} busy={busy} disabled={!valid}>Save</Button>
        </div>
      )}
    >
      <div className="space-y-4">
        {error ? <ErrorBanner error={error} /> : null}
        <p className="text-sm text-slate-500">
          Recorded quantity is <span className="font-bold text-charcoal">{variant?.stock_quantity}</span>,
          reorder level <span className="font-bold text-charcoal">{variant?.low_stock_threshold}</span>.
        </p>
        <Field label="New quantity">
          <input
            type="number"
            min="0"
            className={inputClass}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </Field>
        <Field label="Reason" hint="Recorded in the audit log. Required.">
          <input
            className={inputClass}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Physical stock count correction"
          />
        </Field>
      </div>
    </Drawer>
  );
}
