/**
 * components/storefront/pages/AboutBody.jsx
 * The About page: the gradient banner, the seller's about copy, three store
 * stats and the "why shop with us" panel.
 */
import { IconShield } from '../../icons.jsx';

/**
 * @param {object} props
 * @param {object} props.t Render tokens from useTokens.
 * @param {Function} props.onNavigate Page navigation callback.
 */
export default function AboutBody({ t, onNavigate }) {
  const { c, compact } = t;
  const pc = c.pages_content || {};
  const ac = c.about_content || {};
  const stats = Array.isArray(ac.stats) && ac.stats.length ? ac.stats : [];
  const whyPoints = ac.why_points || [];
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
        {stats.length ? (
          <div className={`mt-5 grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-3'}`}>
            {stats.map((s) => (
              <div key={s.k} className="p-3 text-center rounded-lg" style={{ background: 'var(--surface)', borderRadius: 'var(--radius)' }}>
                <p className="text-base font-extrabold" style={{ color: 'var(--primary)' }}>{s.v}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide opacity-60">{s.k}</p>
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-5 rounded-lg border p-4" style={{ borderColor: 'rgba(148,163,184,.35)', borderRadius: 'var(--radius)' }}>
          {ac.why_title || ac.why_points.length ? <h2 className="mb-1 text-xs font-extrabold uppercase tracking-wide">{ac.why_title || 'Why shop with us'}</h2> : null}
          {whyPoints.length ? (
            <ul className="space-y-1.5 text-xs font-semibold opacity-80">
              {whyPoints.map((x) => (
                <li key={x} className="flex items-center gap-1.5"><IconShield size={12} style={{ color: 'var(--primary)' }} aria-hidden="true" /> {x}</li>
              ))}
            </ul>
          ) : null}
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