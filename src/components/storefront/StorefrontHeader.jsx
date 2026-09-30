/**
 * components/storefront/StorefrontHeader.jsx
 * The storefront's announcement bar, brand row and primary nav.
 *
 * Rendered by both the live shop (pages/LiveStorefront.jsx) and the theme
 * customizer preview frame - this is production chrome, not a preview-only
 * component.
 */
import SafeImage from '../SafeImage.jsx';
import { IconLogo, IconCart } from '../icons.jsx';
import { Search } from 'lucide-react';
import { NAV_LINKS } from './navigation.js';

/**
 * @param {object} props
 * @param {object} props.t Render tokens from useTokens.
 * @param {string} props.active The active page key.
 * @param {Function} props.onNavigate Page navigation callback.
 * @param {object} props.ctx Preview context (cartCount).
 */
export default function StorefrontHeader({ t, active, onNavigate, ctx }) {
  const { c, compact, centered } = t;
  const h = c.header || {};
  return (
    <div className={h.sticky ? 'sticky top-0 z-20 backdrop-blur' : ''} style={{ background: h.sticky ? 'color-mix(in srgb, var(--bg) 92%, transparent)' : 'transparent' }}>
      {h.announcement_enabled && h.announcement_text ? (
        <div className="px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider" style={{ background: 'var(--accent)', color: '#0F172A' }}>
          {h.announcement_text}
        </div>
      ) : null}
      <header className={`flex items-center gap-3 border-b px-5 py-3 ${compact ? 'px-3 py-2.5' : ''} ${centered ? 'flex-col justify-center gap-2' : 'justify-between'}`} style={{ borderColor: 'rgba(148,163,184,.25)' }}>
        <button type="button" onClick={() => onNavigate('home')} className={`flex items-center gap-2.5 ${centered ? 'flex-col' : ''}`}>
          {c.branding.logo_url ? (
            <SafeImage src={c.branding.logo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <IconLogo size={40} className="rounded-full" />
          )}
          <span className={centered ? 'text-center' : ''}>
            <span className="block text-sm font-extrabold leading-tight" style={{ fontWeight: c.typography.heading_weight }}>{c.branding.site_title}</span>
            {c.branding.tagline ? <span className={`block text-[10px] opacity-70 ${compact ? 'max-w-[180px] truncate' : ''}`}>{c.branding.tagline}</span> : null}
          </span>
        </button>
        <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-3'}`}>
          {h.show_search && (
            /* The search control itself lives on the shop page; this takes the
               shopper there rather than sitting in the header as decoration. */
            <button type="button" onClick={() => onNavigate('shop')} aria-label="Search products" className="rounded-md p-1 opacity-60 transition hover:opacity-100">
              <Search size={15} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('cart')}
            aria-label="Open cart page"
            className={`relative rounded-lg text-xs font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 ${compact ? 'px-2 py-1.5' : 'px-3 py-2'} ${t.btn()}`}
            style={{ background: 'var(--primary)', borderRadius: 'var(--radius)' }}
          >
            <IconCart size={14} className="inline" /> Cart
            {ctx.cartCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-extrabold" style={{ background: 'var(--accent)', color: '#0F172A' }}>{ctx.cartCount}</span>
            ) : null}
          </button>
        </div>
      </header>
      <nav className={`flex flex-wrap items-center gap-1 border-b px-3 py-1.5 ${compact ? 'justify-center' : ''}`} style={{ borderColor: 'rgba(148,163,184,.18)' }} aria-label="Storefront pages">
        {NAV_LINKS.map(({ key, label }) => {
          const on = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              aria-current={on ? 'page' : undefined}
              className={`rounded-md px-2.5 py-1 text-[11px] font-bold underline-offset-4 transition-colors hover:bg-black/5 ${on ? '' : 'hover:underline'}`}
              style={on ? { background: 'var(--primary)', color: '#fff' } : { color: 'var(--text)' }}
            >
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}