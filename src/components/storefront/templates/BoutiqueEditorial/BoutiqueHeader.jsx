/**
 * components/storefront/templates/BoutiqueEditorial/BoutiqueHeader.jsx
 * Centered logo, transparent overlaid navbar with glassmorphism.
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import SafeImage from '../../../SafeImage.jsx';
import { IconLogo, IconCart } from '../../../icons.jsx';
import { Search } from 'lucide-react';
import { Heart } from 'lucide-react';
import { NAV_LINKS } from '../../navigation.js';

export default function BoutiqueHeader({ t, active, onNavigate, ctx }) {
  const { c, compact } = t;
  return (
    <div className="absolute inset-x-0 top-0 z-20">
      <div style={{ background: 'rgba(9,13,22,.45)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(255,255,255,.12)' }}>
        <header className={`mx-auto flex max-w-6xl flex-col items-center gap-1.5 px-5 ${compact ? 'py-2.5' : 'py-4'}`}>
          <button type="button" onClick={() => onNavigate('home')} className="flex flex-col items-center gap-1.5" aria-label="Store home">
            {c.branding.logo_url ? (
              <SafeImage src={c.branding.logo_url} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-white/30" />
            ) : (
              <IconLogo size={48} className="rounded-full ring-1 ring-white/30" />
            )}
            <span className="text-center">
              <span className="block text-base font-extrabold tracking-[0.22em] text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {(c.branding.site_title || '').toUpperCase()}
              </span>
              {c.branding.tagline ? <span className="block text-[10px] uppercase tracking-[0.3em] text-white/60">{c.branding.tagline}</span> : null}
            </span>
          </button>
        </header>
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-1 px-3 pb-2.5" aria-label="Storefront pages">
          {NAV_LINKS.map(({ key, label }) => {
            const on = active === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onNavigate(key)}
                aria-current={on ? 'page' : undefined}
                className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] transition"
                style={on ? { background: 'rgba(255,255,255,.92)', color: '#090D16' } : { color: 'rgba(255,255,255,.75)' }}
              >
                {label}
              </button>
            );
          })}
          <span className="flex items-center gap-1.5 pl-2">
            <button type="button" onClick={() => onNavigate('wishlist')} aria-label={`Open wishlist${ctx.wishlistCount ? `, ${ctx.wishlistCount} saved` : ''}`} className="relative rounded-full p-1.5 text-white/75 transition hover:bg-white/10 hover:text-white">
              <Heart size={15} aria-hidden="true" />
              {ctx.wishlistCount > 0 && <span className="absolute -right-0.5 -top-0.5 text-[9px] font-bold text-white">{ctx.wishlistCount}</span>}
            </button>
            <button type="button" onClick={() => onNavigate('shop')} aria-label="Search products" className="rounded-full p-1.5 text-white/75 transition hover:bg-white/10 hover:text-white">
              <Search size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('cart')}
              aria-label="Open cart page"
              className="relative rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white/10"
              style={{ border: '1px solid rgba(255,255,255,.35)' }}
            >
              <IconCart size={13} className="mr-1 inline" /> Cart
              {ctx.cartCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-extrabold" style={{ background: 'var(--accent)', color: '#0F172A' }}>{ctx.cartCount}</span>
              ) : null}
            </button>
          </span>
        </nav>
      </div>
    </div>
  );
}
