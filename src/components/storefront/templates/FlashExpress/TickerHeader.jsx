/**
 * components/storefront/templates/FlashExpress/TickerHeader.jsx
 * Announcement ticker + location tag + compact brand row.
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis
 * (the spec's rocket emoji ships as a Lucide Rocket icon + text).
 */
import { Rocket, MapPin, Heart, PackageSearch, Menu, X } from 'lucide-react';
import { useState } from 'react';
import SafeImage from '../../../SafeImage.jsx';
import { IconLogo, IconCart } from '../../../icons.jsx';
import { NAV_LINKS } from '../../navigation.js';

export default function TickerHeader({ t, active, onNavigate, ctx }) {
  const { c, compact } = t;
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileMenu = Boolean(c.theme_design?.mobileMenu);
  const ticker = c.header?.announcement_text || 'Order now for same-day delivery';
  return (
    <div className="sticky top-0 z-20">
      <div className="flex items-center justify-center gap-1.5 overflow-hidden px-3 py-1.5 text-center text-[10px] font-extrabold uppercase tracking-widest" style={{ background: 'var(--accent)', color: 'var(--gs-header-ticker-fg, #0F172A)' }} role="status">
        <Rocket size={12} aria-hidden="true" className="shrink-0" />
        <span className="truncate">{ticker}</span>
      </div>
      <div style={{ background: 'var(--gs-header-surface, rgba(9,13,22,.96))', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--gs-header-border, rgba(148,163,184,.2))' }}>
        <div className={`mx-auto flex max-w-6xl items-center gap-2 ${compact ? 'px-3 py-2' : 'px-5 py-2.5'}`}>
          <button type="button" onClick={() => onNavigate('home')} className="flex min-w-0 items-center gap-2" aria-label="Store home">
            {c.branding.logo_url ? (
              <SafeImage src={c.branding.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover" />
            ) : (
              <IconLogo size={36} />
            )}
            <span className="min-w-0">
              <span className="block truncate text-xs font-extrabold" style={{ color: 'var(--gs-header-fg, #fff)' }}>{c.branding.site_title}</span>
              <span className="flex items-center gap-0.5 text-[9px] font-bold" style={{ color: 'var(--gs-header-muted, #6ee7b7)' }}>
                <MapPin size={9} aria-hidden="true" /> Delivering now
              </span>
            </span>
          </button>
          <span className="flex-1" />
          {mobileMenu && compact ? (
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? 'Close store navigation' : 'Open store navigation'}
              aria-expanded={menuOpen}
              aria-controls="ticker-store-navigation"
              data-gs-header-control=""
              className="relative shrink-0 rounded-lg p-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
              style={{ color: 'var(--gs-header-fg, rgba(255,255,255,.8))' }}
            >
              {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onNavigate('wishlist')}
            aria-label={`Open wishlist${ctx.wishlistCount ? `, ${ctx.wishlistCount} saved` : ''}`}
            data-gs-header-control=""
            className="relative shrink-0 rounded-lg p-2"
            style={{ color: 'var(--gs-header-muted, rgba(255,255,255,.8))' }}
          >
            <Heart size={16} aria-hidden="true" />
            {ctx.wishlistCount > 0 && <span className="absolute right-0 top-0 text-[9px] font-bold">{ctx.wishlistCount}</span>}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('track')}
            aria-label="Track order"
            data-gs-header-control=""
            className="shrink-0 rounded-lg p-2"
            style={{ color: 'var(--gs-header-muted, rgba(255,255,255,.8))' }}
          >
            <PackageSearch size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('cart')}
            aria-label="Open cart page"
            className="relative shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white"
            data-gs-header-control=""
            style={{ background: 'var(--gs-header-active-bg, var(--primary))', color: 'var(--gs-header-active-fg, #fff)', borderRadius: 'calc(var(--radius) - 4px)' }}
          >
            <IconCart size={13} className="mr-1 inline" /> {ctx.cartCount > 0 ? `${ctx.cartCount}` : 'Cart'}
            {ctx.cartCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-extrabold" style={{ background: 'var(--accent)', color: 'var(--gs-header-ticker-fg, #0F172A)' }}>{ctx.cartCount}</span>
            ) : null}
          </button>
        </div>
      </div>
      {mobileMenu ? (
        <nav
          id="ticker-store-navigation"
          className={`mx-auto max-w-6xl gap-1 px-3 pb-2 ${mobileMenu && compact
            ? menuOpen ? 'flex flex-col items-stretch' : 'hidden'
            : 'flex items-center overflow-x-auto'
          }`}
          aria-label="Storefront pages"
          style={{ background: 'var(--gs-header-surface, rgba(9,13,22,.96))' }}
        >
          {NAV_LINKS.map(({ key, label }) => {
            const on = active === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => { onNavigate(key); setMenuOpen(false); }}
                aria-current={on ? 'page' : undefined}
                data-gs-header-control=""
                className="shrink-0 rounded-md px-2.5 py-2 text-[11px] font-bold transition"
                style={on
                  ? { background: 'var(--gs-header-active-bg, var(--primary))', color: 'var(--gs-header-active-fg, #fff)' }
                  : { color: 'var(--gs-header-muted, rgba(255,255,255,.7))' }}
              >
                {label}
              </button>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
