/**
 * components/storefront/templates/FlashExpress/TickerHeader.jsx
 * Announcement ticker + location tag + compact brand row.
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis
 * (the spec's rocket emoji ships as a Lucide Rocket icon + text).
 */
import { Rocket, MapPin, Heart, PackageSearch } from 'lucide-react';
import SafeImage from '../../../SafeImage.jsx';
import { IconLogo, IconCart } from '../../../icons.jsx';

export default function TickerHeader({ t, active, onNavigate, ctx }) {
  const { c, compact } = t;
  const ticker = c.header?.announcement_text || 'Order now for same-day delivery';
  return (
    <div className="sticky top-0 z-20">
      <div className="flex items-center justify-center gap-1.5 overflow-hidden px-3 py-1.5 text-center text-[10px] font-extrabold uppercase tracking-widest" style={{ background: 'var(--accent)', color: '#0F172A' }} role="status">
        <Rocket size={12} aria-hidden="true" className="shrink-0" />
        <span className="truncate">{ticker}</span>
      </div>
      <div style={{ background: 'rgba(9,13,22,.92)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(148,163,184,.2)' }}>
        <div className={`mx-auto flex max-w-6xl items-center gap-2 ${compact ? 'px-3 py-2' : 'px-5 py-2.5'}`}>
          <button type="button" onClick={() => onNavigate('home')} className="flex min-w-0 items-center gap-2" aria-label="Store home">
            {c.branding.logo_url ? (
              <SafeImage src={c.branding.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover" />
            ) : (
              <IconLogo size={36} />
            )}
            <span className="min-w-0">
              <span className="block truncate text-xs font-extrabold text-white">{c.branding.site_title}</span>
              <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-300">
                <MapPin size={9} aria-hidden="true" /> Delivering now
              </span>
            </span>
          </button>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => onNavigate('wishlist')}
            aria-label={`Open wishlist${ctx.wishlistCount ? `, ${ctx.wishlistCount} saved` : ''}`}
            className="relative shrink-0 rounded-lg p-2 text-white/80 hover:bg-white/10"
          >
            <Heart size={16} aria-hidden="true" />
            {ctx.wishlistCount > 0 && <span className="absolute right-0 top-0 text-[9px] font-bold">{ctx.wishlistCount}</span>}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('track')}
            aria-label="Track order"
            className="shrink-0 rounded-lg p-2 text-white/80 hover:bg-white/10"
          >
            <PackageSearch size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('cart')}
            aria-label="Open cart page"
            className="relative shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white"
            style={{ background: 'var(--primary)', borderRadius: 'calc(var(--radius) - 4px)' }}
          >
            <IconCart size={13} className="mr-1 inline" /> {ctx.cartCount > 0 ? `${ctx.cartCount}` : 'Cart'}
            {ctx.cartCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-extrabold" style={{ background: 'var(--accent)', color: '#0F172A' }}>{ctx.cartCount}</span>
            ) : null}
          </button>
        </div>
      </div>
    </div>
  );
}
