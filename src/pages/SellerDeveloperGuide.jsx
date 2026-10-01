/**
 * pages/SellerDeveloperGuide.jsx
 * The seller-facing guide to setting up and running a store (/developer-guide).
 *
 * Deliberately a small layout component: all of the copy lives in
 * ../guide/sections.jsx so it can be reviewed as text, and the primitives in
 * ../guide/GuideUI.jsx so the page itself contains no prose.
 *
 * The quick-start checklist reads the merchant's REAL store state rather than
 * presenting a static list, so a ticked box means something.
 *
 * STRICT RULE: pure SVG / Lucide React icons ONLY - zero emojis.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Search, X } from 'lucide-react';
import { api, getCachedStore } from '../api.js';
import { storefrontUrl } from '../config.js';
import { PAYMENT_LABELS } from '../components/storefront/data.js';
import { SECTION_META, buildSections } from '../guide/sections.jsx';
import { Collapsible } from '../guide/GuideUI.jsx';

/** Extract the plain text of a section, for search matching. */
function sectionText(node) {
  if (node == null || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(sectionText).join(' ');
  if (node.props) {
    return `${sectionText(node.props.title || '')} ${sectionText(node.props.children)}`;
  }
  return '';
}

export default function SellerDeveloperGuide() {
  const store = getCachedStore();
  const [productCount, setProductCount] = useState(0);
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState('quick-start');
  const sectionRefs = useRef({});

  /* Live state for the checklist. Both calls are best-effort: a failure must
     leave the guide readable, not half-blank. */
  useEffect(() => {
    api.get('/api/inventory')
      .then((d) => setProductCount((d.products || d.items || []).length))
      .catch(() => {});
    api.get('/api/payment-settings')
      .then((d) => setPaymentSettings(d.settings || null))
      .catch(() => {});
  }, []);

  const activeGateway = paymentSettings?.activeGateway || 'COD';
  const hasKeys = Boolean(
    paymentSettings?.paystack?.hasSecretKey || paymentSettings?.hubtel?.hasSecretKey,
  );

  const ctx = useMemo(() => ({
    productCount,
    hasTheme: Boolean(store?.active_theme_id || store?.theme_id),
    hasLogo: Boolean(store?.logo_url),
    gatewayConfigured: activeGateway === 'COD' || hasKeys,
    gatewayLabel: PAYMENT_LABELS[activeGateway] || 'Cash on Delivery',
    storefrontUrl: storefrontUrl(store?.subdomain_slug || null),
    customDomain: store?.custom_domain || '',
    dnsTarget: '',
  }), [productCount, store, activeGateway, hasKeys]);

  const sections = useMemo(() => buildSections(ctx), [ctx]);

  /* A section matches when every query word appears in its text or label. */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    const words = q.split(/\s+/);
    return sections.filter((s) => {
      const text = sectionText(s.body).toLowerCase();
      const label = (SECTION_META.find((m) => m.id === s.id)?.label || '').toLowerCase();
      return words.every((w) => text.includes(w) || label.includes(w));
    });
  }, [sections, query]);

  /* Scroll-spy: highlight the last section whose top has passed the fold. */
  const onScroll = useCallback(() => {
    let current = visible[0]?.id;
    for (const s of visible) {
      const el = sectionRefs.current[s.id];
      if (el && el.getBoundingClientRect().top <= 120) current = s.id;
    }
    if (current) setActive(current);
  }, [visible]);

  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-charcoal">
          <FileText size={20} className="text-blue-600" aria-hidden="true" />
          Developer Guide
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          How to set up your store and run it day to day.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">

        {/* Contents. Sticky on wide screens, a wrapping row on a phone. */}
        <nav aria-label="Guide contents" className="lg:sticky lg:top-4 lg:self-start">
          <div className="relative mb-3">
            <Search
              size={14}
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the guide"
              aria-label="Search the guide"
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-xs outline-none focus:border-blue-500"
            />
          </div>
          <ul className="flex flex-wrap gap-1 lg:block lg:space-y-0.5">
            {visible.map((s) => {
              const meta = SECTION_META.find((m) => m.id === s.id);
              const Icon = meta?.icon;
              return (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    onClick={() => setActive(s.id)}
                    aria-current={active === s.id ? 'true' : undefined}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                      active === s.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-charcoal'
                    }`}
                  >
                    {Icon ? <Icon size={13} className="shrink-0" aria-hidden="true" /> : null}
                    {meta?.label || s.id}
                  </a>
                </li>
              );
            })}
          </ul>
          {visible.length === 0 ? (
            <p className="px-2 py-3 text-xs text-slate-400">
              No section matches &ldquo;{query}&rdquo;.{' '}
              <button
                type="button"
                onClick={() => setQuery('')}
                className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline"
              >
                <X size={11} aria-hidden="true" />Clear
              </button>
            </p>
          ) : null}
        </nav>

        <div className="min-w-0 space-y-3">
          {visible.map((s) => {
            const meta = SECTION_META.find((m) => m.id === s.id);
            return (
              <div key={s.id} ref={(el) => { sectionRefs.current[s.id] = el; }} id={s.id}>
                <Collapsible title={meta?.label || s.id}>
                  {s.body}
                </Collapsible>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}