/**
 * layouts/dashboard/customizer/ui.jsx
 * Shared control primitives for the theme customizer rail.
 *
 * Every field in every section is built from one of these, so the rail's form
 * controls look and behave identically no matter which section they sit in.
 * These are presentational: each takes a value and an onChange callback, and
 * knows nothing about tokens or the theme config.
 */
import { useState } from 'react';
import { ChevronLeft, Plus, ChevronUp, ChevronDown, X } from 'lucide-react';

/* ----------------------------- Accordion item --------------------------- */
/** Collapsible section wrapper. Owns only its own open/closed state. */
export function Accordion({ id, icon: Icon, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `accordion-panel-${id}`;
  return (
    <div className="border-b border-slate-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        id={`accordion-toggle-${id}`}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        <span className="flex min-w-0 items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-charcoal">
          {Icon && <Icon size={15} className="shrink-0 text-slate-500" />}
          <span className="truncate">{title}</span>
        </span>
        <ChevronLeft
          size={14}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-90'}`}
          aria-hidden="true"
        />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={`accordion-toggle-${id}`}
        className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-96' : 'max-h-0'}`}
      >
        <div className="px-3 pt-1 pb-2">{children}</div>
      </div>
    </div>
  );
}

/* --------------------------- Labelled field ----------------------------- */
/**
 * The single-label-with-control wrapper used by nearly every field, so labels
 * and spacing stay consistent instead of being restated per input.
 */
export function Field({ label, children, hint }) {
  return (
    <label className="block space-y-1">
      {label ? <span className="text-xs font-medium text-slate-600">{label}</span> : null}
      {children}
      {hint ? <span className="block text-[10px] leading-relaxed text-slate-400">{hint}</span> : null}
    </label>
  );
}

/** Small uppercase sub-heading used to split a long section into groups. */
export function SubHeading({ children }) {
  return (
    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
      {children}
    </p>
  );
}

/** Muted explanatory paragraph for a section or conditional group. */
export function Note({ children }) {
  return <p className="text-[10px] leading-relaxed text-slate-400">{children}</p>;
}

/** Standard full-width text input styling, shared by every text control. */
export const INPUT_CLS =
  'w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm';

/** Indented container for a group of fields that only applies when a toggle is on. */
export function ConditionalGroup({ children, tight = false }) {
  return (
    <div className={tight ? 'ml-4 space-y-2 border-l border-slate-100 pl-2' : 'space-y-2 rounded-lg bg-slate-50 p-2.5'}>
      {children}
    </div>
  );
}

/* ------------------------ Color picker helper -------------------------- */
export function ColorRow({ label, value, onChange }) {
  return (
    <div className="space-y-1">
      <label className="flex justify-between text-xs font-medium text-slate-600">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-slate-300"
          aria-label={`${label} color`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 rounded border border-slate-300 px-2 py-1 text-xs font-mono"
          aria-label={`${label} hex`}
        />
      </div>
    </div>
  );
}

/* --------------------------- Toggle switch ---------------------------- */
export function ToggleRow({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-slate-300'}`}
      >
        <span className="sr-only">{label}</span>
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : ''}`}
        />
      </button>
    </label>
  );
}

/* --------------------------- Multiline field -------------------------- */
export function TextAreaRow({ label, value, onChange, rows = 3, mono = false }) {
  return (
    <Field label={label}>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded border border-slate-300 px-2 py-1.5 leading-relaxed ${mono ? 'font-mono text-[11px]' : 'text-sm'}`}
      />
    </Field>
  );
}

/* ------------------------------ Slider --------------------------------- */
/** Range input that shows its current value inline in the label. */
export function SliderRow({ label, value, min, max, step = 1, suffix = '', onChange }) {
  return (
    <Field label={`${label} (${value}${suffix})`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full accent-blue-600"
      />
    </Field>
  );
}

/* --------------------------- Editable string list --------------------- */
/**
 * Editor for an array of strings stored at one token path (feature bullets,
 * trust copy, why-points). Merchants can reorder with the arrows, remove a row,
 * or add one. Reordering matters because these lists read as ordered copy.
 */
export function ListEditor({ label, value = [], onChange, emptyHint }) {
  const items = Array.isArray(value) ? value : [];
  const write = (next) => onChange(next);
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    write(next);
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <button
          type="button"
          onClick={() => write([...items, ''])}
          className="inline-flex items-center gap-1 rounded border border-slate-300 px-1.5 py-0.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Plus size={11} aria-hidden="true" /> Add
        </button>
      </div>
      {items.length ? (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-1">
              <input
                type="text"
                value={item}
                onChange={(e) => write(items.map((x, j) => (j === i ? e.target.value : x)))}
                aria-label={`${label} item ${i + 1}`}
                className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
              />
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${label} item ${i + 1} up`} className="rounded p-1 text-slate-500 transition hover:bg-slate-100 disabled:opacity-30">
                <ChevronUp size={12} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Move ${label} item ${i + 1} down`} className="rounded p-1 text-slate-500 transition hover:bg-slate-100 disabled:opacity-30">
                <ChevronDown size={12} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => write(items.filter((_, j) => j !== i))} aria-label={`Remove ${label} item ${i + 1}`} className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600">
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] italic text-slate-400">{emptyHint || 'No items. This section is hidden when empty.'}</p>
      )}
    </div>
  );
}

/* --------------------------- Key/value stat editor --------------------- */
/** Editor for an array of { v, k } pairs (the About page stat tiles). */
export function StatsEditor({ label, value = [], onChange, emptyHint }) {
  const stats = Array.isArray(value) ? value : [];
  const write = (next) => onChange(next);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <button
          type="button"
          onClick={() => write([...stats, { v: '', k: '' }])}
          className="inline-flex items-center gap-1 rounded border border-slate-300 px-1.5 py-0.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Plus size={11} aria-hidden="true" /> Add
        </button>
      </div>
      {stats.length ? stats.map((s, i) => (
        <div key={i} className="flex items-center gap-1">
          <input
            type="text"
            value={s.v ?? ''}
            onChange={(e) => write(stats.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))}
            placeholder="Value"
            aria-label={`${label} value ${i + 1}`}
            className="w-16 shrink-0 rounded border border-slate-300 px-2 py-1 text-sm font-bold"
          />
          <input
            type="text"
            value={s.k ?? ''}
            onChange={(e) => write(stats.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))}
            placeholder="Label"
            aria-label={`${label} label ${i + 1}`}
            className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
          />
          <button type="button" onClick={() => write(stats.filter((_, j) => j !== i))} aria-label={`Remove ${label} item ${i + 1}`} className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600">
            <X size={12} aria-hidden="true" />
          </button>
        </div>
      )) : <p className="text-[11px] italic text-slate-400">{emptyHint || 'No stats. The stats row is hidden when empty.'}</p>}
    </div>
  );
}