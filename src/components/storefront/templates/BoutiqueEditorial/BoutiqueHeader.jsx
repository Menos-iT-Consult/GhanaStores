/**
 * components/storefront/templates/BoutiqueEditorial/BoutiqueHeader.jsx
 * Centered logo, transparent overlaid navbar with glassmorphism.
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import SafeImage from '../../../SafeImage.jsx';
import { IconLogo, IconCart } from '../../../icons.jsx';
import { Menu, Search, X } from 'lucide-react';
import { Heart } from 'lucide-react';
import { NAV_LINKS } from '../../navigation.js';
import { useState } from 'react';

export default function BoutiqueHeader({ t, active, onNavigate, ctx }) {
  const { c, compact } = t;
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileMenu = Boolean(c.theme_design?.mobileMenu);
  return (
    <div className="sticky top-0 z-30">
      <div style={{ background: 'var(--gs-header-surface, rgba(9,13,22,.96))', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: '1px solid var(--gs-header-border, rgba(255,255,255,.12))' }}>
        <header className={`relative mx-auto flex max-w-6xl flex-col items-center gap-1.5 px-5 ${compact ? 'py-2.5' : 'py-4'}`}>
          {mobileMenu && compact ? (
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? 'Close store navigation' : 'Open store navigation'}
              aria-expanded={menuOpen}
              aria-controls="boutique-store-navigation"
              data-gs-header-control=""
              className="absolute right-4 top-3 rounded-lg p-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
              style={{ color: 'var(--gs-header-fg, #fff)' }}
            >
              {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          ) : null}
          <button type="button" onClick={() => onNavigate('home')} className="flex flex-col items-center gap-1.5" aria-label="Store home">
            {c.branding.logo_url ? (
              <SafeImage src={c.branding.logo_url} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-white/30" />
            ) : (
              <IconLogo size={48} className="rounded-full ring-1 ring-white/30" />
            )}
            <span className="text-center">
              <span className="block text-base font-extrabold tracking-[0.22em]" style={{ color: 'var(--gs-header-fg, #fff)', fontFamily: "'Playfair Display', Georgia, serif" }}>
                {(c.branding.site_title || '').toUpperCase()}
              </span>
              {c.branding.tagline ? <span className="block text-[10px] uppercase tracking-[0.3em]" style={{ color: 'var(--gs-header-muted, rgba(255,255,255,.6))' }}>{c.branding.tagline}</span> : null}
            </span>
          </button>
        </header>
        <nav
          id="boutique-store-navigation"
          className={`mx-auto max-w-6xl items-center justify-center gap-1 px-3 pb-2.5 ${
            mobileMenu && compact
              ? menuOpen ? 'flex flex-col' : 'hidden'
              : 'flex flex-wrap'
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
                data-gs-header-control=""
                className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] transition"
                style={on
                  ? { background: 'var(--gs-header-active-bg, #fff)', color: 'var(--gs-header-active-fg, #090D16)' }
                  : { color: 'var(--gs-header-muted, rgba(255,255,255,.75))' }}
              >
                {label}
              </button>
            );
          })}
          <span className="flex items-center gap-1.5 pl-2">
            <button type="button" onClick={() => onNavigate('wishlist')} aria-label={`Open wishlist${ctx.wishlistCount ? `, ${ctx.wishlistCount} saved` : ''}`} data-gs-header-control="" className="relative rounded-full p-1.5 transition" style={{ color: 'var(--gs-header-muted, rgba(255,255,255,.75))' }}>
              <Heart size={15} aria-hidden="true" />
              {ctx.wishlistCount > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full px-0.5 text-[9px] font-bold"
                  style={{ background: 'var(--accent)', color: 'var(--gs-header-ticker-fg, #0F172A)' }}
                >
                  {ctx.wishlistCount}
                </span>
              )}
            </button>
            <button type="button" onClick={() => onNavigate('shop')} aria-label="Search products" data-gs-header-control="" className="rounded-full p-1.5 transition" style={{ color: 'var(--gs-header-muted, rgba(255,255,255,.75))' }}>
              <Search size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('cart')}
              aria-label="Open cart page"
              data-gs-header-control=""
              className="relative rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] transition"
              style={{ border: '1px solid var(--gs-header-border, rgba(255,255,255,.35))', color: 'var(--gs-header-fg, #fff)' }}
            >
              <IconCart size={13} className="mr-1 inline" /> Cart
              {ctx.cartCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-extrabold" style={{ background: 'var(--accent)', color: 'var(--gs-header-ticker-fg, #0F172A)' }}>{ctx.cartCount}</span>
              ) : null}
            </button>
          </span>
        </nav>
      </div>
    </div>
  );
}
