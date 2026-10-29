/**
 * components/storefront/StorefrontFooter.jsx
 * The storefront footer: brand blurb, socials, link columns, newsletter and the
 * accepted-payment badges. Rendered by both the live shop and the customizer.
 */
import { Send, CreditCard } from 'lucide-react';
import { socialUrl } from '../../theme/config.js';
import SocialIconLink from '../SocialIconLink.jsx';

/**
 * The footer link columns. Entries marked `page` navigate to a real storefront
 * page; the rest were static text that used to look clickable but did nothing,
 * so they are now honest labels.
 */
const SHOP_LINKS = [
  { label: 'All Products', page: 'shop' },
  { label: 'New Arrivals', page: 'shop' },
  { label: 'Best Sellers', page: 'shop' },
];
const COMPANY_LINKS = [
  { label: 'About Us', page: 'about' },
  { label: 'Contact', page: 'contact' },
  { label: 'Delivery & Returns', page: null },
];

/**
 * @param {object} props
 * @param {object} props.t Render tokens from useTokens.
 * @param {Function} [props.onNavigate] Page navigation callback.
 */
export default function StorefrontFooter({ t, onNavigate }) {
  const { c, footColumns } = t;
  const f = c.footer || {};
  const socialSettings = c.social_settings || {};
  const socialVisibility = socialSettings.visibility || {};
  /* Every entry is [network, href, label]. A network appears ONLY when it has
     something to link to - the icons used to be plain <span>s driven by
     booleans, so they rendered on every storefront but went nowhere. */
  const waDigits = String(c.features?.whatsapp_number || '').replace(/\D/g, '').replace(/^0/, '233');
  const socials = [
    ['instagram', socialUrl('instagram', c.social?.instagram), 'Instagram'],
    ['facebook', socialUrl('facebook', c.social?.facebook), 'Facebook'],
    ['tiktok', socialUrl('tiktok', c.social?.tiktok), 'TikTok'],
    ['youtube', socialUrl('youtube', c.social?.youtube), 'YouTube'],
    ['x', socialUrl('x', c.social?.x), 'X'],
    ['linkedin', socialUrl('linkedin', c.social?.linkedin), 'LinkedIn'],
    ['whatsapp', c.features?.enable_whatsapp_buy && waDigits ? `https://wa.me/${waDigits}` : '', 'WhatsApp'],
  ].filter(([network, href]) => Boolean(href) && socialVisibility[network] !== false);

  const linkCls = 'block transition hover:underline';
  const socialAlignment = {
    center: 'justify-center',
    right: 'justify-end',
  }[socialSettings.alignment] || 'justify-start';

  return (
    <footer className="border-t" style={{ borderColor: 'rgba(148,163,184,.3)' }}>
      <div className="grid gap-6 px-5 py-6" style={{ gridTemplateColumns: `repeat(${footColumns}, minmax(0,1fr))` }}>
        <div className="space-y-2">
          <p className="text-sm font-extrabold" style={{ color: 'var(--text)' }}>{c.branding.site_title}</p>
          <p className="text-[11px] leading-relaxed opacity-70">{f.blurb}</p>
          {f.show_social && socials.length > 0 && (
            <div className={`flex flex-wrap gap-2 pt-1 ${socialAlignment}`}>
              {socials.map(([network, href, label]) => (
                <SocialIconLink
                  key={label}
                  href={href}
                  network={network}
                  label={label}
                  size={34}
                  style={socialSettings.style}
                  shape={socialSettings.shape}
                />
              ))}
            </div>
          )}
        </div>
        <nav className="space-y-1.5 text-[11px] font-semibold opacity-80" aria-label="Shop links">
          <p className="text-xs font-extrabold uppercase tracking-wide opacity-100">Shop</p>
          {SHOP_LINKS.map((x) => (
            x.page && onNavigate ? (
              <button key={x.label} type="button" onClick={() => onNavigate(x.page)} className={`text-left ${linkCls}`}>{x.label}</button>
            ) : (
              <span key={x.label} className="block">{x.label}</span>
            )
          ))}
        </nav>
        <nav className="space-y-1.5 text-[11px] font-semibold opacity-80" aria-label="Company links">
          <p className="text-xs font-extrabold uppercase tracking-wide opacity-100">Company</p>
          {COMPANY_LINKS.map((x) => (
            x.page && onNavigate ? (
              <button key={x.label} type="button" onClick={() => onNavigate(x.page)} className={`text-left ${linkCls}`}>{x.label}</button>
            ) : (
              <span key={x.label} className="block">{x.label}</span>
            )
          ))}
        </nav>
        <div className="space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-wide">Get updates</p>
          <a
            href={`mailto:${c.pages_content?.contact_email}?subject=${encodeURIComponent(`Enquiry about ${c.branding.site_title}`)}`}
            className="flex items-center gap-1.5 text-[11px] font-bold underline underline-offset-4 opacity-80 hover:opacity-100"
          >
            <Send size={12} aria-hidden="true" /> Email the shop
          </a>
        </div>
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