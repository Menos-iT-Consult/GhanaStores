/**
 * components/storefront/pages/ContactBody.jsx
 * The Contact page: the seller's email/phone/WhatsApp cards, an enquiry form and
 * the store location panel.
 */
import { Mail, Phone, MapPin, MessageCircle, Send } from 'lucide-react';

/**
 * @param {object} props
 * @param {object} props.t Render tokens from useTokens.
 */
export default function ContactBody({ t }) {
  const { c, compact } = t;
  const pc = c.pages_content || {};
  const cc = c.contact_content || {};
  /* The WhatsApp card used to point at a hard-coded demo number. It now uses
     the store's own number, and the card drops out entirely when unset rather
     than sending customers to someone else's business. */
  const waDigits = String(cc.whatsapp_number || c.features.whatsapp_number || '').replace(/\D/g, '');
  const cards = [
    { Icon: Mail, label: 'Email', value: pc.contact_email, href: `mailto:${pc.contact_email}` },
    { Icon: Phone, label: 'Phone', value: pc.contact_phone, href: `tel:${String(pc.contact_phone).replace(/\s/g, '')}` },
    waDigits ? { Icon: MessageCircle, label: 'WhatsApp', value: 'Chat with support', href: `https://wa.me/${waDigits}` } : null,
  ].filter(Boolean);
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
          <input type="text" placeholder={cc.form_name_placeholder || 'Your name'} aria-label="Your name" className={inputCls} style={{ borderColor: 'rgba(148,163,184,.5)' }} />
          <input type="email" placeholder={cc.form_email_placeholder || 'Email address'} aria-label="Email address" className={inputCls} style={{ borderColor: 'rgba(148,163,184,.5)' }} />
        </div>
        <textarea rows={3} placeholder={cc.form_message_placeholder || 'How can we help?'} aria-label="Message" className={`w-full resize-none ${inputCls}`} style={{ borderColor: 'rgba(148,163,184,.5)' }} />
        <button
          type="submit"
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 ${t.btn()}`}
          style={{ background: 'var(--primary)', borderRadius: 'var(--radius)' }}
        >
          <Send size={12} aria-hidden="true" /> {cc.submit_label || 'Send message'}
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

