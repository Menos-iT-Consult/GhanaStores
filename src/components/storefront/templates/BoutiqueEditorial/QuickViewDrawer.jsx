/**
 * components/storefront/templates/BoutiqueEditorial/QuickViewDrawer.jsx
 * Slide-over drawer on product click instead of page navigation.
 * Add-to-cart reuses the shared ctx callback.
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import { X } from 'lucide-react';
import SafeImage from '../../../SafeImage.jsx';
import { ghs } from '../../../../api.js';
import { IconWhatsApp } from '../../../icons.jsx';

export default function QuickViewDrawer({ t, product, onClose, ctx }) {
  const { c, waDigits, btn } = t;
  if (!product) return null;
  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={`Quick view ${product.name}`}>
      <button type="button" aria-label="Close quick view" onClick={onClose} className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />
      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-y-auto"
        style={{ background: 'rgba(9,13,22,.92)', backdropFilter: 'blur(18px)', borderLeft: '1px solid rgba(255,255,255,.12)', color: '#E2E8F0' }}
      >
        <div className="flex items-center justify-between p-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">Quick view</span>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <SafeImage src={product.img} alt={product.name} className="mx-4 aspect-[4/3] w-[calc(100%-2rem)] rounded-lg object-cover" style={{ borderRadius: 'var(--radius)' }} />
        <div className="space-y-2.5 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">{product.category || 'Collection'}</p>
          <h2 className="text-xl font-extrabold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{product.name}</h2>
          <p className="text-lg font-extrabold" style={{ color: 'var(--accent)' }}>{ghs(product.price)}</p>
          {product.description ? <p className="text-xs leading-relaxed text-white/70">{product.description}</p> : null}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => { ctx.onAddToCart?.(product); onClose(); }}
              className={`flex-1 rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white ${btn()}`}
              style={{ background: 'var(--primary)', borderRadius: 'var(--radius)' }}
            >
              Add to Cart
            </button>
            {c.features?.enable_whatsapp_buy && waDigits ? (
              <a
                href={`https://wa.me/${waDigits}?text=${encodeURIComponent(`${c.features.whatsapp_custom_message} ${product.name}`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-emerald-400/60 px-3 py-2.5 text-xs font-bold text-emerald-300"
                style={{ borderRadius: 'var(--radius)' }}
              >
                <IconWhatsApp size={13} /> WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
