/**
 * components/storefront/Storefront.jsx
 * The live storefront rendered inside the customizer's simulated device
 * frame. Exports <StorefrontRouter> which routes between six pages and
 * paints shared chrome (announcement bar, header/nav, footer) from the
 * active theme tokens.
 *
 * Consumed by pages/ThemeCustomizer.jsx. Container-aware breakpoints are
 * measured from the frame itself so every page responds exactly like the
 * real storefront on a physical device.
 *
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import { useState } from 'react';
import { ghs } from '../../api.js';
import SafeImage from '../SafeImage.jsx';
import {
  IconStore, IconLogo, IconWhatsApp, IconCart,
  IconShield, IconTruck, IconWallet,
} from '../icons.jsx';
import {
  ArrowRight, Check, ChevronRight, CreditCard, Facebook, Instagram,
  Mail, MapPin, MessageCircle, Music2, Search, Send, Star, Trash2,
} from 'lucide-react';
import { FONT_OPTIONS, scopeCss } from '../../theme/config.js';
import { tierForWidth } from '../../lib/responsive.js';

/* ------------------------------ Demo catalogue ------------------------------ */

/**
 * Customer-facing names for the payment rails a store owner can configure under
 * /settings/payments. The keys match the orders.payment_method CHECK constraint;
 * the storefront shows only the owner's chosen rail, never a picker.
 */
const PAYMENT_LABELS = {
  COD: 'Cash on Delivery',
  PAYSTACK: 'Card',
  HUBTEL: 'Mobile Money',
};

export const DEMO_PRODUCTS = [
  { id: 1, name: 'Kente Cloth Scarf', price: 180, img: 'https://picsum.photos/seed/kente/400/300', stock: 3 },
  { id: 2, name: 'Ankara Print Dress', price: 250, img: 'https://picsum.photos/seed/ankara/400/300', stock: 12 },
  { id: 3, name: 'Shea Butter 250g', price: 45, img: 'https://picsum.photos/seed/shea/400/300', stock: 7 },
  { id: 4, name: 'Bolga Basket', price: 110, img: 'https://picsum.photos/seed/bolga/400/300', stock: 2 },
  { id: 5, name: 'Solar Power Bank', price: 280, img: 'https://picsum.photos/seed/solar/400/300', stock: 9 },
  { id: 6, name: 'Adinkra Wall Art', price: 210, img: 'https://picsum.photos/seed/adinkra/400/300', stock: 5 },
];

/* ------------------------------ Real catalog -------------------------------- */
/**
 * Shape a public-catalog row into what this renderer paints.
 *
 * The storefront API returns a product with nested variants; the cards want one
 * price, one image and a total stock figure, and the detail page wants the
 * variants. Demo products (price/img/stock, no variants) pass through the same
 * function so the customizer preview and the live shop share one code path.
 */
export function toDisplayProduct(row) {
  const variants = (row.variants || []).map((v) => ({
    id: v.id,
    label: [v.optionName, v.optionValue].filter(Boolean).join(' ') || 'Option',
    price: Number(v.price ?? 0),
    stock: Number(v.stockQuantity ?? 0),
    inStock: v.inStock !== false && Number(v.stockQuantity ?? 0) > 0,
  }));

  if (!variants.length) {
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      category: row.category || '',
      img: row.img || row.image_url || '',
      price: Number(row.price ?? 0),
      stock: Number(row.stock ?? 0),
      variants: [],
    };
  }

  const priced = variants.filter((v) => v.price > 0);
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    category: row.category || '',
    img: row.image_url || '',
    price: priced.length ? Math.min(...priced.map((v) => v.price)) : 0,
    stock: variants.reduce((sum, v) => sum + v.stock, 0),
    variants,
  };
}

/** The demo catalogue, run through the same mapper the live shop uses. */
const DEMO_CATALOG = DEMO_PRODUCTS.map(toDisplayProduct);

/* Derived preview context shared by every page body. */
export function useTokens(config, viewportWidth) {
  // tierForWidth is the single definition of the three tiers, shared with the
  // app shell via lib/responsive.js. It used to be re-derived here with its own
  // literals, so the storefront and the dashboard could disagree about what
  // "tablet" means.
  const tier = tierForWidth(viewportWidth);
  const compact = tier === 'mobile';
  const narrow = tier === 'tablet';
  const centered = config.layout.header_style === 'centered' || narrow || compact;
  return {
    c: config,
    compact,
    narrow,
    centered,
    gridColumns: Math.min(config.layout.product_grid_columns, compact ? 2 : narrow ? 3 : 4),
    footColumns: Math.min(config.footer.columns, compact ? 1 : narrow ? 2 : 4),
    fontStack: (FONT_OPTIONS.find((f) => f.value === config.typography.font_family) || FONT_OPTIONS[0]).stack,
    waDigits: String(config.features.whatsapp_number || '').replace(/\D/g, ''),
    btn: () => `${config.buttons?.shadow === false ? '' : 'shadow'} ${config.buttons?.uppercase ? 'uppercase tracking-wide' : ''}`,
  };
}

function ProductCard({ p, t, onNavigate, ctx }) {
  const { c, waDigits, btn } = t;
  const open = () => onNavigate('product', p.id);
  return (
    <article
      className="group overflow-hidden border border-slate-200/70 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      style={{ borderRadius: 'var(--radius)', background: 'var(--surface)' }}
    >
      <button type="button" onClick={open} className="relative block aspect-[4/3] w-full overflow-hidden">
        <SafeImage src={p.img} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        {c.features.enable_stock_counter && p.stock <= 5 && (
          <span className="absolute left-2 top-2 rounded-md px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide shadow-sm" style={{ background: 'var(--accent)', color: '#0F172A' }}>
            Only {p.stock} left
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 translate-y-full bg-black/55 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-white transition-transform duration-300 group-hover:translate-y-0">
          Quick view
        </span>
      </button>
      <div className="space-y-1.5 p-3">
        <h3 className="truncate text-sm font-bold">{p.name}</h3>
        <p className="inline-block rounded-md px-2 py-0.5 text-sm font-extrabold" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}>
          {ghs(p.price)}
        </p>
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => (ctx?.onAddToCart ? ctx.onAddToCart(p) : open())}
            className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 ${btn()}`}
            style={{ background: 'var(--primary)', borderRadius: 'calc(var(--radius) - 4px)' }}
          >
            Buy Now
          </button>
          {c.features.enable_whatsapp_buy && (
            <a
              href={waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent(`${c.features.whatsapp_custom_message} ${p.name}`)}` : undefined}
              target="_blank"
              rel="noreferrer"
              title={waDigits ? 'WhatsApp Quick Buy' : 'Set a WhatsApp number first'}
              className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold ${waDigits ? 'border-emerald-500 text-emerald-600 hover:bg-emerald-50' : 'pointer-events-none border-slate-200 text-slate-300'}`}
              style={{ borderRadius: 'calc(var(--radius) - 4px)' }}
            >
              <IconWhatsApp size={12} /> Quick Buy
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

const NAV_LINKS = [
  { key: 'home', label: 'Home' },
  { key: 'shop', label: 'Shop' },
  { key: 'about', label: 'About Us' },
  { key: 'contact', label: 'Contact' },
];

function PreviewHeader({ t, active, onNavigate, ctx }) {
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
          {h.show_search && <Search size={15} className="opacity-60" aria-label="Search products" />}
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

function PreviewFooter({ t }) {
  const { c, footColumns } = t;
  const f = c.footer || {};
  const socials = [
    [c.social.instagram, Instagram, 'Instagram'],
    [c.social.facebook, Facebook, 'Facebook'],
    [c.social.tiktok, Music2, 'TikTok'],
    [c.features.enable_whatsapp_buy, MessageCircle, 'WhatsApp'],
  ].filter(([on]) => on);

  return (
    <footer className="border-t" style={{ borderColor: 'rgba(148,163,184,.3)' }}>
      <div className="grid gap-6 px-5 py-6" style={{ gridTemplateColumns: `repeat(${footColumns}, minmax(0,1fr))` }}>
        <div className="space-y-2">
          <p className="text-sm font-extrabold" style={{ color: 'var(--text)' }}>{c.branding.site_title}</p>
          <p className="text-[11px] leading-relaxed opacity-70">{f.blurb}</p>
          {f.show_social && (
            <div className="flex gap-2 pt-1">
              {socials.map(([on, Icon, label]) => (
                <span key={label} title={label} className="grid h-7 w-7 place-items-center rounded-md opacity-70 ring-1 ring-current transition hover:opacity-100">
                  <Icon size={13} aria-hidden="true" />
                </span>
              ))}
            </div>
          )}
        </div>
        <nav className="space-y-1.5 text-[11px] font-semibold opacity-80" aria-label="Shop links">
          <p className="text-xs font-extrabold uppercase tracking-wide opacity-100">Shop</p>
          {['All Products', 'New Arrivals', 'Best Sellers'].map((x) => <span key={x} className="block">{x}</span>)}
        </nav>
        <nav className="space-y-1.5 text-[11px] font-semibold opacity-80" aria-label="Company links">
          <p className="text-xs font-extrabold uppercase tracking-wide opacity-100">Company</p>
          {['About Us', 'Contact', 'Delivery & Returns'].map((x) => <span key={x} className="block">{x}</span>)}
        </nav>
        {footColumns >= 4 && (
          <div className="space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-wide">Get updates</p>
            <div className="flex overflow-hidden rounded-lg ring-1 ring-black/10">
              <input type="email" placeholder="Email address" aria-label="Newsletter email" className="w-full bg-white px-2.5 py-1.5 text-[11px] outline-none" />
              <span className="grid place-items-center px-2.5 text-white" style={{ background: 'var(--primary)' }}><Send size={12} aria-hidden="true" /></span>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-2.5 text-[10px] font-semibold opacity-75" style={{ borderColor: 'rgba(148,163,184,.25)' }}>
        <span>{f.copyright}</span>
        {f.show_payments && (
          <span className="flex items-center gap-1.5">
            {['MoMo', 'Visa', 'Mastercard'].map((label) => (
              <span key={label} className="rounded border px-1.5 py-0.5">{label}</span>
            ))}
            <CreditCard size={11} aria-hidden="true" />
          </span>
        )}
      </div>
    </footer>
  );
}

/* ------------------------------ Page bodies -------------------------------- */
function TrustStrip({ t }) {
  const { c } = t;
  if (!c.features.enable_trust_badges) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t px-4 py-4 text-[11px] font-bold" style={{ borderColor: 'rgba(148,163,184,.3)' }}>
      <span className="flex items-center gap-1.5"><IconShield size={14} style={{ color: 'var(--primary)' }} /> GH Secured</span>
      <span className="flex items-center gap-1.5"><IconTruck size={14} style={{ color: 'var(--primary)' }} /> 24-hr delivery</span>
      <span className="flex items-center gap-1.5"><IconWallet size={14} style={{ color: 'var(--primary)' }} /> MoMo accepted</span>
    </div>
  );
}

function HomeBody({ t, onNavigate, ctx }) {
  const { c, compact, gridColumns } = t;
  return (
    <>
      {c.features.enable_hero_banner && (
        <section className={`relative overflow-hidden text-center ${compact ? 'px-4 py-7' : 'px-6 py-10'}`} style={{ background: 'linear-gradient(125deg, var(--primary) 0%, var(--accent) 165%)', color: '#fff' }}>
          <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/15 blur-2xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-14 -left-8 h-40 w-40 rounded-full bg-black/10 blur-2xl" aria-hidden="true" />
          <h1 className={`relative ${compact ? 'text-lg' : 'text-xl sm:text-2xl'} font-extrabold`} style={{ fontWeight: c.typography.heading_weight }}>
            {c.branding.site_title}
          </h1>
          <p className="relative mx-auto mt-1.5 max-w-md text-sm opacity-90">{c.branding.tagline || 'Shop our latest arrivals'}</p>
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className={`relative mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 ${t.btn()}`}
            style={{ background: 'rgba(255,255,255,.16)', borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,.45)' }}
          >
            Shop Now <ChevronRight size={12} aria-hidden="true" />
          </button>
        </section>
      )}
      <section className="p-5" aria-label="Featured products">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-base font-extrabold">Featured products</h2>
          <button type="button" onClick={() => onNavigate('shop')} className="text-[11px] font-bold underline opacity-70 hover:opacity-100">View all</button>
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0,1fr))` }}>
          {ctx.products.slice(0, gridColumns * 2).map((p) => (
            <ProductCard key={p.id} p={p} t={t} onNavigate={onNavigate} ctx={ctx} />
          ))}
        </div>
      </section>
      <TrustStrip t={t} />
    </>
  );
}

function ShopBody({ t, onNavigate, ctx }) {
  const { gridColumns } = t;
  const [cat, setCat] = useState('All');
  const cats = ['All', ...Array.from(new Set(ctx.products.map((p) => p.category).filter(Boolean)))];
  const list = cat === 'All' ? ctx.products : ctx.products.filter((p) => p.category === cat);
  return (
    <section className="p-5" aria-label="Shop catalog">
      <nav className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide opacity-60" aria-label="Breadcrumb">
        <span>Home</span> <ChevronRight size={10} aria-hidden="true" /> <span>Shop</span>
      </nav>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-extrabold">{cat === 'All' ? 'All Products' : cat} <span className="text-xs font-bold opacity-50">({list.length})</span></h1>
        <select aria-label="Sort products" className="rounded-md border px-2 py-1 text-[11px] font-semibold" style={{ borderColor: 'rgba(148,163,184,.4)', background: 'var(--surface)', color: 'var(--text)' }}>
          <option>Sort: Featured</option><option>Price: Low to High</option><option>Newest</option>
        </select>
      </div>
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Categories">
        {cats.map((x) => (
          <button
            key={x}
            type="button"
            role="tab"
            aria-selected={cat === x}
            onClick={() => setCat(x)}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${cat === x ? 'text-white' : ''}`}
            style={cat === x ? { background: 'var(--primary)' } : { background: 'var(--surface)', color: 'var(--text)' }}
          >
            {x}
          </button>
        ))}
      </div>
      {!list.length ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-xs font-semibold opacity-70" style={{ borderColor: 'rgba(148,163,184,.4)' }}>
          This store has no products available yet.
        </p>
      ) : null}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(gridColumns, 4)}, minmax(0,1fr))` }}>
        {list.map((p) => <ProductCard key={p.id} p={p} t={t} onNavigate={onNavigate} ctx={ctx} />)}
      </div>
      <div className="mt-5 flex justify-center gap-1.5" aria-label="Pagination">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`grid h-7 w-7 place-items-center rounded-md text-[11px] font-bold ${n === 1 ? 'text-white' : ''}`} style={n === 1 ? { background: 'var(--primary)' } : { background: 'var(--surface)', color: 'var(--text)' }}>{n}</span>
        ))}
      </div>
    </section>
  );
}

function Stars({ label = 'Rated 4.8 out of 5' }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={12} className="text-amber-400" fill="currentColor" aria-hidden="true" />)}
    </span>
  );
}

function ProductBody({ t, onNavigate, ctx }) {
  const { c, compact, narrow, waDigits, btn } = t;
  const [qty, setQty] = useState(1);
  const [thumb, setThumb] = useState(0);
  const [variantId, setVariantId] = useState(null);
  const pp = c.product_page || {};
  const p = ctx.product || ctx.products[0] || DEMO_CATALOG[0];
  const stack = compact || narrow;
  const thumbs = ['kente', 'kente-b', 'kente-c'];
  /* Real products carry purchasable variants; demo products do not. */
  const chosen = p.variants.find((v) => v.id === variantId)
    || p.variants.find((v) => v.inStock)
    || null;

  return (
    <section className="p-5" aria-label="Product detail">
      {pp.breadcrumbs && (
        <nav className="mb-3 flex flex-wrap items-center gap-1 text-[10px] font-bold uppercase tracking-wide opacity-60" aria-label="Breadcrumb">
          <button type="button" onClick={() => onNavigate('home')} className="hover:underline">Home</button> <ChevronRight size={10} aria-hidden="true" />
          <button type="button" onClick={() => onNavigate('shop')} className="hover:underline">Shop</button> <ChevronRight size={10} aria-hidden="true" />
          <span>{p.name}</span>
        </nav>
      )}

      <div className={`gap-5 ${stack ? 'grid grid-cols-1' : 'flex'}`}>
        <div className={stack ? '' : 'w-[46%] shrink-0'}>
          <SafeImage src={p.img || `https://picsum.photos/seed/${thumbs[thumb]}/640/480`} alt={p.name} className="w-full rounded-lg object-cover shadow-sm" style={{ borderRadius: 'var(--radius)' }} />
          <div className={`mt-2 flex gap-2 ${ctx.isLive ? 'hidden' : ''}`}>
            {thumbs.map((seed, i) => (
              <button
                key={seed}
                type="button"
                onClick={() => setThumb(i)}
                aria-label={`View image ${i + 1}`}
                aria-pressed={thumb === i}
                className={`h-14 w-14 overflow-hidden rounded-md ring-2 transition ${thumb === i ? '' : 'opacity-60 hover:opacity-100'}`}
                style={{ borderRadius: 'calc(var(--radius) - 6px)', boxShadow: thumb === i ? '0 0 0 2px var(--primary)' : undefined }}
              >
                <img src={`https://picsum.photos/seed/${seed}/120/120`} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          {pp.reviews && <Stars />}
          <h1 className={`${compact ? 'text-base' : 'text-xl'} font-extrabold leading-tight`}>{p.name}</h1>
          <p className="text-lg font-extrabold" style={{ color: 'var(--primary)' }}>{ghs(p.price)}</p>
          <p className="text-xs leading-relaxed opacity-75">{p.description || 'Handcrafted in Ghana with premium local materials. Ships within 24 hours nationwide with tracked delivery.'}</p>

          <ul className="space-y-1 text-xs opacity-75">
            {['Hand-woven authentic weave', 'Colourfast natural dyes'].map((x) => (
              <li key={x} className="flex items-center gap-1.5"><Check size={12} style={{ color: 'var(--primary)' }} aria-hidden="true" /> {x}</li>
            ))}
          </ul>

          {p.variants.length > 1 ? (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choose a variant">
              {p.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  disabled={!v.inStock}
                  onClick={() => setVariantId(v.id)}
                  aria-pressed={chosen?.id === v.id}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition disabled:opacity-40 ${chosen?.id === v.id ? 'text-white' : ''}`}
                  style={chosen?.id === v.id
                    ? { background: 'var(--primary)', borderColor: 'var(--primary)' }
                    : { borderColor: 'rgba(148,163,184,.5)' }}
                >
                  {v.label} · {ghs(v.price)}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {pp.quantity_stepper && (
              <span className="flex items-center rounded-lg border" style={{ borderColor: 'rgba(148,163,184,.5)' }}>
                <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-2 py-1.5"><StepperIcon d="M6 9l6 6 6-6" /></button>
                <span className="min-w-6 text-center text-xs font-extrabold">{qty}</span>
                <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(99, q + 1))} className="px-2 py-1.5"><StepperIcon d="M18 15l-6-6-6 6" /></button>
              </span>
            )}
            <button type="button" onClick={() => ctx.onAddToCart?.(p, chosen, qty)} className={`flex-1 rounded-lg px-4 py-2 text-xs font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 ${btn()}`} style={{ background: 'var(--primary)', borderRadius: 'var(--radius)' }}>
              Add to Cart
            </button>
            {c.features.enable_whatsapp_buy && (
              <a
                href={waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent(`${c.features.whatsapp_custom_message} ${p.name}`)}` : undefined}
                target="_blank"
                rel="noreferrer"
                title={waDigits ? 'WhatsApp Quick Buy' : 'Set a WhatsApp number first'}
                className={`flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold ${waDigits ? 'border-emerald-500 text-emerald-600 hover:bg-emerald-50' : 'pointer-events-none border-slate-200 opacity-50'}`}
                style={{ borderRadius: 'var(--radius)' }}
              >
                <IconWhatsApp size={13} /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      {pp.related_products && (
        <>
          <h2 className="mb-3 mt-6 text-sm font-extrabold uppercase tracking-wide">You may also like</h2>
          <div className={`grid gap-4 ${compact ? 'grid-cols-2' : 'grid-cols-4'}`}>
            {ctx.products.filter((x) => x.id !== p.id).slice(0, compact ? 2 : 4).map((x) => (
              <ProductCard key={x.id} p={x} t={t} onNavigate={onNavigate} ctx={ctx} />
            ))}
          </div>
        </>
      )}
      <TrustStrip t={t} />
    </section>
  );
}

/* Tiny inline chevron used by quantity steppers. */
function StepperIcon({ d }) {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}

/** Demo cart lines, shaped exactly like the live ones the storefront passes in. */
const CART_ITEMS = DEMO_CATALOG.slice(0, 2).map((p) => ({
  id: p.id, name: p.name, label: '', price: p.price, quantity: 1, img: p.img, stock: p.stock,
}));

function CartBody({ t, onNavigate, ctx }) {
  const { compact } = t;
  const [promo, setPromo] = useState('');
  /* Live shop: the lines and every mutation live in the storefront page. The
     customizer preview keeps its own self-contained quantities. */
  const [demoQtys, setDemoQtys] = useState(CART_ITEMS.map(() => 1));
  const items = ctx.isLive
    ? ctx.cart
    : CART_ITEMS.map((i, idx) => ({ ...i, quantity: demoQtys[idx] }));
  const subtotal = items.reduce((s, i) => s + Number(i.price) * Number(i.quantity || 0), 0);
  const setQty = (line, next) => (ctx.isLive
    ? ctx.onSetQty?.(line, next)
    : setDemoQtys((q) => q.map((v, i) => (i === items.indexOf(line) ? Math.max(1, next) : v))));

  return (
    <section className="p-5" aria-label="Shopping cart">
      <h1 className="mb-4 text-lg font-extrabold">Your Cart</h1>
      {ctx.isLive && !items.length ? (
        <div className="rounded-lg border border-dashed p-8 text-center" style={{ borderColor: 'rgba(148,163,184,.4)' }}>
          <p className="text-xs font-semibold opacity-75">Your cart is empty.</p>
          <button type="button" onClick={() => onNavigate('shop')} className="mt-3 rounded-lg px-4 py-2 text-xs font-bold text-white" style={{ background: 'var(--primary)', borderRadius: 'var(--radius)' }}>
            Browse the collection
          </button>
        </div>
      ) : (
      <div className={`gap-5 ${compact ? 'grid grid-cols-1' : 'flex'}`}>
        <ul className="min-w-0 flex-1 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 border-b pb-3" style={{ borderColor: 'rgba(148,163,184,.25)' }}>
              <SafeImage src={item.img} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold">{item.name}</span>
                {item.label ? <span className="block text-[10px] font-semibold opacity-60">{item.label}</span> : null}
                <span className="block text-[11px] font-semibold" style={{ color: 'var(--primary)' }}>{ghs(item.price)}</span>
              </span>
              <span className="flex items-center rounded-md border" style={{ borderColor: 'rgba(148,163,184,.5)' }}>
                <button type="button" aria-label={`Decrease ${item.name}`} onClick={() => setQty(item, Number(item.quantity) - 1)} className="px-1.5 py-1"><StepperIcon d="M6 9l6 6 6-6" /></button>
                <span className="min-w-5 text-center text-[11px] font-extrabold">{item.quantity}</span>
                <button type="button" aria-label={`Increase ${item.name}`} onClick={() => setQty(item, Number(item.quantity) + 1)} className="px-1.5 py-1"><StepperIcon d="M18 15l-6-6-6 6" /></button>
              </span>
              <button type="button" aria-label={`Remove ${item.name}`} onClick={() => ctx.onRemove?.(item)} className="opacity-50 transition hover:opacity-100"><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>

        <aside className={`${compact ? '' : 'w-56 shrink-0'} self-start rounded-lg border p-4`} style={{ borderRadius: 'var(--radius)', background: 'var(--surface)', borderColor: 'rgba(148,163,184,.35)' }}>
          <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wide">Order Summary</h2>
          <dl className="space-y-1 text-[11px] font-semibold">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{ghs(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd className="font-bold text-emerald-600">Free</dd></div>
            <div className="flex justify-between border-t pt-1 text-sm font-extrabold" style={{ borderColor: 'rgba(148,163,184,.35)' }}><dt>Total</dt><dd>{ghs(subtotal)}</dd></div>
          </dl>
          {ctx.checkout ? (
            /* Cash on delivery: the real order the storefront posts to the API. */
            <form className="mt-3 space-y-1.5" onSubmit={ctx.checkout.onSubmit}>
              {/* The payment method the shop owner selected. Shown as a fixed
                  summary, not a picker: the customer pays however the owner
                  configured the store, so the cart can never offer a rail the
                  merchant has not set up. */}
              <div className="flex items-center justify-between gap-2 rounded-md border bg-slate-50 px-2 py-1.5" style={{ borderColor: 'rgba(148,163,184,.5)' }}>
                <span className="text-[10px] font-bold uppercase tracking-wide opacity-60">Payment</span>
                <span className="text-[11px] font-extrabold" style={{ color: 'var(--primary)' }}>
                  {PAYMENT_LABELS[ctx.checkout.method] || 'Cash on Delivery'}
                </span>
              </div>
              <input required value={ctx.checkout.customer.name} onChange={(e) => ctx.checkout.setCustomer({ ...ctx.checkout.customer, name: e.target.value })} placeholder="Full name" aria-label="Full name" className="w-full rounded-md border bg-white px-2 py-1.5 text-[11px] outline-none" style={{ borderColor: 'rgba(148,163,184,.5)' }} />
              <input required value={ctx.checkout.customer.phone} onChange={(e) => ctx.checkout.setCustomer({ ...ctx.checkout.customer, phone: e.target.value })} placeholder="Phone number" aria-label="Phone number" className="w-full rounded-md border bg-white px-2 py-1.5 text-[11px] outline-none" style={{ borderColor: 'rgba(148,163,184,.5)' }} />
              <textarea required value={ctx.checkout.customer.address} onChange={(e) => ctx.checkout.setCustomer({ ...ctx.checkout.customer, address: e.target.value })} placeholder="Delivery address" aria-label="Delivery address" rows={2} className="w-full rounded-md border bg-white px-2 py-1.5 text-[11px] outline-none" style={{ borderColor: 'rgba(148,163,184,.5)' }} />
              <button type="submit" disabled={ctx.checkout.busy || !items.length} className={`w-full rounded-lg px-3 py-2 text-xs font-bold text-white transition disabled:opacity-40 ${t.btn()}`} style={{ background: 'var(--primary)', borderRadius: 'var(--radius)' }}>
                {ctx.checkout.busy ? 'Placing order...' : `Pay with ${PAYMENT_LABELS[ctx.checkout.method] || 'Cash on Delivery'}`}
              </button>
              {ctx.checkout.message ? (
                <p className="text-[10px] font-semibold leading-snug" style={{ color: ctx.checkout.error ? '#B91C1C' : 'var(--primary)' }}>
                  {ctx.checkout.message}
                </p>
              ) : null}
            </form>
          ) : (
            <>
              <div className="mt-3 flex overflow-hidden rounded-lg ring-1 ring-black/10">
                <input type="text" value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Promo code" aria-label="Promo code" className="w-full bg-white px-2 py-1.5 text-[11px] outline-none" />
                <span className="grid shrink-0 place-items-center px-2.5 text-[10px] font-extrabold uppercase tracking-wide text-white" style={{ background: 'var(--primary)' }}>Apply</span>
              </div>
              <button type="button" className={`mt-2.5 w-full rounded-lg px-3 py-2 text-xs font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 ${t.btn()}`} style={{ background: 'var(--primary)', borderRadius: 'var(--radius)' }}>
                Checkout with MoMo
              </button>
            </>
          )}
          <button type="button" onClick={() => onNavigate('shop')} className="mt-2 block w-full text-center text-[10px] font-bold underline opacity-70 hover:opacity-100">Continue shopping</button>
        </aside>
      </div>
      )}
    </section>
  );
}

function AboutBody({ t, onNavigate }) {
  const { c, compact } = t;
  const pc = c.pages_content || {};
  const stats = [
    { v: '10k+', k: 'Happy customers' },
    { v: '24hr', k: 'Nationwide delivery' },
    { v: '16', k: 'Regions served' },
  ];
  return (
    <>
      <section className={`relative overflow-hidden text-center ${compact ? 'px-4 py-7' : 'px-6 py-9'}`} style={{ background: 'linear-gradient(125deg, var(--primary) 0%, var(--accent) 165%)', color: '#fff' }}>
        <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-white/15 blur-2xl" aria-hidden="true" />
        <h1 className={`relative ${compact ? 'text-lg' : 'text-xl sm:text-2xl'} font-extrabold`} style={{ fontWeight: c.typography.heading_weight }}>
          {pc.about_title || 'Our Story'}
        </h1>
        <p className="relative mx-auto mt-1.5 max-w-md text-sm opacity-90">{c.branding.tagline}</p>
      </section>
      <section className="p-5">
        <p className="mx-auto max-w-lg text-center text-xs leading-relaxed opacity-80">{pc.about_body}</p>
        {/* Three stats sit side by side on a phone too, which squeezes the
            numbers to ~10 characters each at 320px. Stacked on mobile. */}
        <div className={`mt-5 grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-3'}`}>
          {stats.map((s) => (
            <div key={s.k} className="p-3 text-center rounded-lg" style={{ background: 'var(--surface)', borderRadius: 'var(--radius)' }}>
              <p className="text-base font-extrabold" style={{ color: 'var(--primary)' }}>{s.v}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-60">{s.k}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-lg border p-4" style={{ borderColor: 'rgba(148,163,184,.35)', borderRadius: 'var(--radius)' }}>
          <h2 className="mb-1 text-xs font-extrabold uppercase tracking-wide">Why shop with us</h2>
          <ul className="space-y-1.5 text-xs font-semibold opacity-80">
            <li className="flex items-center gap-1.5"><IconShield size={12} style={{ color: 'var(--primary)' }} /> Buyer protection on every order</li>
            <li className="flex items-center gap-1.5"><IconTruck size={12} style={{ color: 'var(--primary)' }} /> Tracked same-day dispatch in Accra</li>
            <li className="flex items-center gap-1.5"><IconWallet size={12} style={{ color: 'var(--primary)' }} /> MoMo, cards and cash on delivery</li>
          </ul>
        </div>
        <div className="mt-5 text-center">
          <button type="button" onClick={() => onNavigate('shop')} className={`rounded-lg px-4 py-2 text-xs font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 ${t.btn()}`} style={{ background: 'var(--primary)', borderRadius: 'var(--radius)' }}>
            Browse the collection
          </button>
        </div>
      </section>
    </>
  );
}

function ContactBody({ t }) {
  const { c, compact } = t;
  const pc = c.pages_content || {};
  const cards = [
    { Icon: Mail, label: 'Email', value: pc.contact_email, href: `mailto:${pc.contact_email}` },
    { Icon: Phone, label: 'Phone', value: pc.contact_phone, href: `tel:${String(pc.contact_phone).replace(/\s/g, '')}` },
    { Icon: MessageCircle, label: 'WhatsApp', value: 'Chat with support', href: 'https://wa.me/233201234567' },
  ];
  const inputCls = 'w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

  return (
    <section className="p-5" aria-label="Contact us">
      <h1 className="text-lg font-extrabold">Contact Us</h1>
      <p className="mt-1 text-[11px] opacity-70">We reply within one business day.</p>

      <div className={`mt-4 grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-3'}`}>
        {cards.map(({ Icon, label, value, href }) => (
          <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="rounded-lg border p-3 transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderRadius: 'var(--radius)', background: 'var(--surface)', borderColor: 'rgba(148,163,184,.35)' }}>
            <Icon size={16} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-wide opacity-60">{label}</p>
            <p className="break-words text-[11px] font-bold">{value}</p>
          </a>
        ))}
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="mt-5 space-y-2.5" aria-label="Contact form">
        <div className={`grid gap-2.5 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <input type="text" placeholder="Your name" aria-label="Your name" className={inputCls} style={{ borderColor: 'rgba(148,163,184,.5)' }} />
          <input type="email" placeholder="Email address" aria-label="Email address" className={inputCls} style={{ borderColor: 'rgba(148,163,184,.5)' }} />
        </div>
        <textarea rows={3} placeholder="How can we help?" aria-label="Message" className={`w-full resize-none ${inputCls}`} style={{ borderColor: 'rgba(148,163,184,.5)' }} />
        <button
          type="submit"
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 ${t.btn()}`}
          style={{ background: 'var(--primary)', borderRadius: 'var(--radius)' }}
        >
          <Send size={12} aria-hidden="true" /> Send message
        </button>
      </form>

      <div
        className="mt-5 flex h-28 items-center justify-center rounded-lg text-[11px] font-bold text-white"
        style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #334155 130%)', borderRadius: 'var(--radius)' }}
        role="img"
        aria-label="Map showing store location"
      >
        <span className="flex items-center gap-1.5 opacity-90"><MapPin size={14} aria-hidden="true" /> {pc.contact_address}</span>
      </div>
    </section>
  );
}

/* ------------------------------- Page router ------------------------------- */
const PAGE_BODIES = {
  home: HomeBody,
  shop: ShopBody,
  product: ProductBody,
  cart: CartBody,
  about: AboutBody,
  contact: ContactBody,
};

/**
 * StorefrontRouter - renders any storefront page inside the token-styled root,
 * for BOTH the customizer preview and the live shop.
 *
 * Backward compatible: `page` defaults to 'home' and `onNavigate` is optional,
 * so in-frame links become no-ops. Every data prop is optional too - with no
 * `products` the router paints the demo catalogue, which is exactly what
 * ThemeCustomizer passes.
 */
export default function StorefrontRouter({
  config,
  viewportWidth = null,
  page = 'home',
  onNavigate,
  products = null,
  cart = [],
  productId = null,
  onAddToCart = null,
  onSetQty = null,
  onRemove = null,
  checkout = null,
}) {
  const t = useTokens(config, viewportWidth);
  const Body = PAGE_BODIES[page] || HomeBody;
  const nav = onNavigate || (() => {});
  const scoped = scopeCss(config.advanced?.custom_css);

  /* isLive separates a real shop from the demo frame: the demo keeps its own
     cart quantities, hides the COD form and keeps the promo/MoMo affordances. */
  const isLive = Boolean(products);
  const lines = isLive ? cart : CART_ITEMS;
  const ctx = {
    isLive,
    products: isLive ? products : DEMO_CATALOG,
    cart: lines,
    cartCount: lines.length,
    product: (isLive ? products : DEMO_CATALOG).find((p) => p.id === productId) || null,
    onAddToCart,
    onSetQty,
    onRemove,
    checkout,
  };

  return (
    <div
      data-gs-preview=""
      className="h-full w-full overflow-y-auto overflow-x-hidden"
      style={{
        '--primary': config.colors.primary,
        '--bg': config.colors.background,
        '--text': config.colors.text,
        '--accent': config.colors.accent,
        '--radius': config.layout.border_radius,
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: t.fontStack,
        fontSize: `${config.typography.body_size}px`,
      }}
      aria-label={`Live storefront preview - ${page} page`}
    >
      {scoped ? <style>{scoped}</style> : null}
      <PreviewHeader t={t} active={page} onNavigate={nav} ctx={ctx} />
      <main style={{ minHeight: '60%' }}>
        <Body t={t} onNavigate={nav} ctx={ctx} />
      </main>
      <PreviewFooter t={t} />
    </div>
  );
}







