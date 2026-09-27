/**
 * DiDwa - Super admin UI primitives.
 *
 * These were defined inline inside the old single-file AdminDashboard. Lifting
 * them here is what makes fourteen more pages possible: every admin table now
 * shares one table shell, one pagination control and one set of loading/empty/
 * error states, so a new page cannot quietly invent a fifth spinner.
 *
 * Visual language follows the seller dashboard: mist background, white cards
 * with a soft shadow, charcoal headings, and Lucide icons only (no emoji).
 */
import { useEffect } from 'react';
import {
  AlertCircle, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock,
  Loader2, RefreshCw, Search, X, XCircle,
} from 'lucide-react';
import { ghs } from '../../api.js';

export const cx = (...values) => values.filter(Boolean).join(' ');
export const list = (value) => (Array.isArray(value) ? value : []);

export const dateOrDash = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-GB') : '-';
};

export const dateTimeOrDash = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString('en-GB') : '-';
};

/** Public storefront URL for a merchant, whichever domain they own. */
export const storefrontHref = (store, platformDomain) => {
  if (store?.customDomain) return `https://${String(store.customDomain).replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
  if (store?.slug && platformDomain) return `https://${store.slug}.${platformDomain}`;
  return null;
};

/* ------------------------------- Status pill ------------------------------- */
const STATUS_TONES = {
  ACTIVE: ['bg-emerald-50 text-emerald-700', CheckCircle2],
  APPROVED: ['bg-emerald-50 text-emerald-700', CheckCircle2],
  PAID: ['bg-emerald-50 text-emerald-700', CheckCircle2],
  RECONCILED: ['bg-emerald-50 text-emerald-700', CheckCircle2],
  DELIVERED: ['bg-emerald-50 text-emerald-700', CheckCircle2],
  PENDING: ['bg-amber-50 text-amber-700', Clock],
  PENDING_DNS: ['bg-amber-50 text-amber-700', Clock],
  PENDING_REVIEW: ['bg-amber-50 text-amber-700', Clock],
  PROCESSING: ['bg-amber-50 text-amber-700', Clock],
  TRANSIT: ['bg-amber-50 text-amber-700', Clock],
  TRIAL: ['bg-blue-50 text-blue-700', Clock],
  PAST_DUE: ['bg-amber-50 text-amber-700', AlertCircle],
  FAILED: ['bg-rose-50 text-rose-700', XCircle],
  FAILED_NEEDS_MANUAL: ['bg-rose-50 text-rose-700', XCircle],
  SUSPENDED: ['bg-rose-50 text-rose-700', AlertTriangle],
  CANCELLED: ['bg-slate-100 text-slate-600', XCircle],
};

export function StatusPill({ status, label }) {
  const value = String(status || 'UNKNOWN').toUpperCase();
  const [tone, Icon] = STATUS_TONES[value] || ['bg-slate-100 text-slate-600', Clock];
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold', tone)}>
      <Icon size={13} />
      {label || value.replaceAll('_', ' ')}
    </span>
  );
}

/* -------------------------------- Stat card -------------------------------- */
const TONES = {
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-600',
};

export function StatCard({ title, value, icon: Icon, detail, tone = 'blue' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
          <p className="mt-3 truncate text-2xl font-extrabold tracking-tight text-charcoal">{value}</p>
          {detail ? (
            <p className={cx('mt-1 text-xs font-semibold', tone === 'amber' || tone === 'rose' ? 'text-amber-700' : 'text-slate-400')}>
              {detail}
            </p>
          ) : null}
        </div>
        {Icon ? <span className={cx('shrink-0 rounded-xl p-3', TONES[tone] || TONES.blue)}><Icon size={21} /></span> : null}
      </div>
    </div>
  );
}

export function Panel({ children, className = '' }) {
  return <section className={cx('rounded-2xl border border-slate-200 bg-white shadow-card', className)}>{children}</section>;
}

export function PanelHeader({ title, subtitle, actions }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-extrabold tracking-tight text-charcoal">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export { RefreshCw, Loader2, AlertCircle, Search };

/* ------------------------------ Buttons / fields --------------------------- */
const BUTTON_TONES = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300',
  ghost: 'border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:text-slate-300',
  quiet: 'text-slate-500 hover:bg-slate-100 disabled:text-slate-300',
};

export function Button({ tone = 'ghost', icon: Icon, busy, children, className = '', ...rest }) {
  return (
    <button
      type="button"
      disabled={busy || rest.disabled}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed',
        BUTTON_TONES[tone], className,
      )}
      {...rest}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : Icon ? <Icon size={14} /> : null}
      {children}
    </button>
  );
}

export const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-blue-500';

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}
    </label>
  );
}

/* --------------------------------- States --------------------------------- */
export function LoadingBlock({ label = 'Loading...' }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-500">
      <Loader2 className="mr-2 animate-spin" size={18} />{label}
    </div>
  );
}

export function ErrorBanner({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <span className="flex items-center gap-2"><AlertCircle size={16} />{error}</span>
      {onRetry ? <Button tone="ghost" icon={RefreshCw} onClick={onRetry}>Retry</Button> : null}
    </div>
  );
}

export function EmptyState({ title, hint, action }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
      <p className="text-sm font-bold text-slate-600">{title}</p>
      {hint ? <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">{hint}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

/* -------------------------------- Toolbar ---------------------------------- */
export function Toolbar({ term, onTerm, placeholder = 'Search...', children }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
      <span className="relative min-w-[200px] flex-1">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={term}
          onChange={(e) => onTerm(e.target.value)}
          placeholder={placeholder}
          className={cx(inputClass, 'pl-9')}
        />
      </span>
      {children}
    </div>
  );
}

export function Select({ value, onChange, options, label }) {
  return (
    <label className="relative">
      {label ? <span className="sr-only">{label}</span> : null}
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={cx(inputClass, 'appearance-none pr-8', value ? 'font-semibold text-charcoal' : 'text-slate-500')}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <ChevronRight size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400" />
    </label>
  );
}

/* -------------------------------- Data table -------------------------------- */
/**
 * @param {{columns: {key:string,label:string,align?:string,className?:string,render?:Function}[],
 *          rows: object[], rowKey?: string, onRowClick?: Function, empty?: React.ReactNode}} props
 */
export function DataTable({ columns, rows, rowKey = 'id', onRowClick, empty }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cx(
                  'px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400',
                  column.align === 'right' ? 'text-right' : '',
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr
              key={row[rowKey] || index}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className="hover:bg-slate-50"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cx('px-5 py-3.5', column.align === 'right' ? 'text-right' : '', column.className)}
                >
                  {column.render ? column.render(row) : row[column.key] ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? <div className="px-5 py-6">{empty || <EmptyState title="Nothing to show yet." />}</div> : null}
    </div>
  );
}

/* ------------------------------- Pagination -------------------------------- */
export function Pagination({ page, pages, total, onPage }) {
  if (!pages || pages <= 1) return null;
  const from = (page - 1) * 25 + 1;
  const to = Math.min(page * 25, total);
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
      <p className="text-xs text-slate-500">
        Showing <span className="font-bold text-charcoal">{from}-{to}</span> of{' '}
        <span className="font-bold text-charcoal">{Number(total).toLocaleString()}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button tone="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft size={14} />Previous
        </Button>
        <span className="text-xs font-bold text-slate-600">Page {page} of {pages}</span>
        <Button tone="ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next<ChevronRight size={14} />
        </Button>
      </div>
    </nav>
  );
}

/* --------------------------------- Drawer ---------------------------------- */
export function Drawer({ open, title, subtitle, onClose, children, footer, wide }) {
  // Escape closes the drawer, and the page behind it must not scroll.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close panel" onClick={onClose} className="absolute inset-0 bg-slate-950/40" />
      <section className={cx('relative flex h-full w-full flex-col bg-white shadow-2xl', wide ? 'max-w-3xl' : 'max-w-lg')}>
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-extrabold tracking-tight text-charcoal">{title}</h2>
            {subtitle ? <p className="mt-0.5 truncate text-xs text-slate-400">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? <footer className="border-t border-slate-200 px-6 py-4">{footer}</footer> : null}
      </section>
    </div>
  );
}

/* ------------------------------ Confirm dialog ----------------------------- */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', tone = 'danger', busy, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Cancel" onClick={onCancel} className="absolute inset-0 bg-slate-950/50" />
      <section className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-base font-extrabold tracking-tight text-charcoal">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button tone="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button tone={tone} onClick={onConfirm} busy={busy}>{confirmLabel}</Button>
        </div>
      </section>
    </div>
  );
}

/* -------------------------------- Page head -------------------------------- */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-charcoal">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/* --------------------------- Shared cell fragments ------------------------- */
export function Money({ value }) {
  return <span className="whitespace-nowrap font-bold text-charcoal">{ghs(value)}</span>;
}

export function Muted({ children }) {
  return <span className="text-xs text-slate-500">{children}</span>;
}

export function Strong({ children }) {
  return <span className="font-semibold text-charcoal">{children}</span>;
}

/** Two-line cell: a bold primary line with a quieter supporting line. */
export function Stacked({ primary, secondary }) {
  return (
    <span className="block min-w-0">
      <span className="block truncate font-semibold text-charcoal">{primary}</span>
      {secondary ? <span className="mt-0.5 block truncate text-xs text-slate-400">{secondary}</span> : null}
    </span>
  );
}
