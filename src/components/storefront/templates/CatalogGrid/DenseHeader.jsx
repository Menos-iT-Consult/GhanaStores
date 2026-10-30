/**
 * components/storefront/templates/CatalogGrid/DenseHeader.jsx
 * High-density top bar: category dropdowns, sticky quick search bar,
 * cart badge count.
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import { useState } from 'react';
import SafeImage from '../../../SafeImage.jsx';
import { IconLogo, IconCart } from '../../../icons.jsx';
import { Search, ChevronDown, Menu, X } from 'lucide-react';
import { NAV_LINKS } from '../../navigation.js';
import { categoriesOf } from '../../catalog.js';

export default function DenseHeader({ t, active, onNavigate, ctx, onShopShortcut }) {
  const { c, compact } = t;
  const [term, setTerm] = useState('');
  const [cat, setCat] = useState('All');
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileMenu = Boolean(c.theme_design?.mobileMenu);
  const cats = categoriesOf(ctx.products);
  const submit = (e) => {
    e?.preventDefault?.();
    onShopShortcut?.({ term: term.trim(), category: cat });
    onNavigate('shop');
  };
  return (
    <div className="sticky top-0 z-20" style={{ background: 'rgba(9,13,22,.9)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(148,163,184,.2)' }}>
      <div className={`mx-auto flex max-w-6xl items-center gap-2 ${compact ? 'px-3 py-2' : 'px-5 py-2.5'}`}>
        <button type="button" onClick={() => onNavigate('home')} className="flex shrink-0 items-center gap-2" aria-label="Store home">
          {c.branding.logo_url ? (
            <SafeImage src={c.branding.logo_url} alt="" className="h-8 w-8 rounded object-cover" />
          ) : (
            <IconLogo size={32} />
          )}
          {!compact ? (
            <span className="max-w-[140px] truncate text-xs font-extrabold text-white">{c.branding.site_title}</span>
          ) : null}
        </button>
        <form onSubmit={submit} role="search" className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5">
          {/* Tier-conditional, NOT sm: - the storefront can render inside a
              375px customizer frame on a wide window, where sm: would lie. */}
          <label className={`relative shrink-0 items-center ${compact ? 'hidden' : 'flex'}`}>
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              aria-label="Category"
              className="appearance-none bg-transparent py-0.5 pl-1 pr-5 text-[11px] font-bold text-white/80 outline-none"
            >
              {cats.map((x) => <option key={x} value={x} className="text-slate-900">{x}</option>)}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-1 text-white/50" aria-hidden="true" />
          </label>
          <span className={`h-4 w-px bg-white/15 ${compact ? 'hidden' : 'block'}`} aria-hidden="true" />
          <Search size={13} className="shrink-0 text-white/50" aria-hidden="true" />
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search the catalog"
            aria-label="Quick search"
            className="min-w-0 flex-1 bg-transparent text-[11px] font-semibold text-white outline-none placeholder:text-white/40"
          />
        </form>
        {mobileMenu && compact ? (
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close store navigation' : 'Open store navigation'}
            aria-expanded={menuOpen}
            aria-controls="dense-store-navigation"
            className="shrink-0 rounded-lg p-2 text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {menuOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onNavigate('cart')}
          aria-label="Open cart page"
          className="relative shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white"
          style={{ background: 'var(--primary)', borderRadius: 'calc(var(--radius) - 4px)' }}
        >
          <IconCart size={13} className="mr-1 inline" /> Cart
          {ctx.cartCount > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-extrabold" style={{ background: 'var(--accent)', color: '#0F172A' }}>{ctx.cartCount}</span>
          ) : null}
        </button>
      </div>
      <nav
        id="dense-store-navigation"
        className={`mx-auto max-w-6xl gap-1 px-3 pb-1.5 ${compact ? 'px-2' : 'px-4'} ${
          mobileMenu && compact
            ? menuOpen ? 'flex flex-col items-stretch' : 'hidden'
            : 'flex items-center overflow-x-auto'
        }`}
        aria-label="Storefront pages"
      >
        {NAV_LINKS.map(({ key, label }) => {
          const on = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => { onNavigate(key); setMenuOpen(false); }}
              aria-current={on ? 'page' : undefined}
              className="shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold transition"
              style={on ? { background: 'var(--primary)', color: '#fff' } : { color: 'rgba(255,255,255,.7)' }}
            >
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
