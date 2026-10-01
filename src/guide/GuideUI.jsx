/**
 * guide/GuideUI.jsx
 * Presentational primitives for the seller Developer Guide.
 *
 * Each one is a pure function of its props so the guide's layout can be tested
 * without a browser, and so a section in sections.jsx reads as content rather
 * than markup.
 *
 * STRICT RULE: pure SVG / Lucide React icons ONLY - zero emojis.
 */
import { useEffect, useRef, useState } from 'react';
import {
  Check, ChevronDown, Copy, Info, TriangleAlert, CircleCheck,
} from 'lucide-react';

/* ------------------------------- Callout -------------------------------- */

/**
 * A boxed aside. `tone` picks the palette: 'info' (blue), 'warn' (amber) and
 * 'danger' (rose). The icon is resolved here so no section imports one.
 */
export function Callout({ tone = 'info', title, children }) {
  const TONES = {
    info: { cls: 'border-blue-200 bg-blue-50 text-blue-900', icon: Info, iconCls: 'text-blue-600' },
    warn: { cls: 'border-amber-200 bg-amber-50 text-amber-900', icon: TriangleAlert, iconCls: 'text-amber-600' },
    danger: { cls: 'border-rose-200 bg-rose-50 text-rose-900', icon: TriangleAlert, iconCls: 'text-rose-600' },
  };
  const { cls, icon: Icon, iconCls } = TONES[tone] || TONES.info;
  return (
    <div className={`flex gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${cls}`}>
      <Icon size={16} className={`mt-0.5 shrink-0 ${iconCls}`} aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-bold">{title}</p> : null}
        <div className="text-[13px] leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
}

/* --------------------------------- Step --------------------------------- */

/** One numbered instruction. */
export function Step({ n, title, children }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-extrabold text-white"
      >
        {n}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-bold text-charcoal">{title}</p>
        <div className="space-y-2 text-[13px] leading-relaxed text-slate-600">{children}</div>
      </div>
    </li>
  );
}

/* -------------------------------- CodeBlock ----------------------------- */

/**
 * A monospace block with a copy button.
 *
 * The copy fallback matters here: the values in this guide are things a
 * merchant pastes into a registrar, and `navigator.clipboard` is unavailable
 * on plain http, which is exactly the context some sellers are in.
 */
export function CodeBlock({ children, label = '' }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const text = String(children).trim();

  const fallbackCopy = (value, done) => {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch { /* clipboard unavailable */ }
    document.body.removeChild(ta);
  };

  const copy = () => {
    const done = () => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-1.5">
        <span className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-blue-600 transition hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {copied
            ? <><Check size={12} aria-hidden="true" />Copied</>
            : <><Copy size={12} aria-hidden="true" />Copy</>}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2.5 text-[12px] leading-relaxed text-charcoal">
        <code>{text}</code>
      </pre>
    </div>
  );
}

/* ------------------------------- FieldTable ----------------------------- */

/** A two-column table of labels and values - DNS records, settings, status. */
export function FieldTable({ head, rows }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-bold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.join('-')}>
              {row.map((cell, i) => (
                <td key={i} className={`px-3 py-2.5 ${i === 0 ? 'font-semibold text-charcoal' : 'text-slate-600'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------- Checklist ----------------------------- */

/**
 * The quick-start list. `done` is passed in from the page, which derives it
 * from the merchant's real store state, so a ticked box means something.
 */
export function Checklist({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.label}
          className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5"
        >
          <span className="mt-px shrink-0">
            {item.done
              ? <CircleCheck size={16} className="text-emerald-600" aria-hidden="true" />
              : <span className="block h-4 w-4 rounded-full border-2 border-slate-300" aria-hidden="true" />}
          </span>
          <span className="min-w-0 flex-1 text-[13px] leading-snug text-slate-700">
            {item.label}
            {item.hint ? <span className="mt-0.5 block text-[11px] text-slate-400">{item.hint}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------ Collapsible ----------------------------- */

/**
 * A self-collapsing section. Open by default: the guide is a reference, and a
 * merchant who has to click eight times to read one answer will not come back.
 */
export function Collapsible({ title, children, open = true }) {
  const [expanded, setExpanded] = useState(open);
  const panelId = `guide-panel-${title.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      >
        <h2 className="text-sm font-extrabold text-charcoal">{title}</h2>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      <div id={panelId} hidden={!expanded} className="space-y-4 border-t border-slate-100 px-4 py-4">
        {children}
      </div>
    </section>
  );
}
