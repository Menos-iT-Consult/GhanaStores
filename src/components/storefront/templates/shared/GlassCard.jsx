/**
 * components/storefront/templates/shared/GlassCard.jsx
 * Dark glassmorphism primitive shared by all 3 templates:
 * #090D16 slate at ~75% + backdrop-blur + 1px slate border.
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
export default function GlassCard({ children, className = '', style = {}, tint = null }) {
  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{
        background: 'rgba(9,13,22,.78)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: `1px solid ${tint ? tint : 'rgba(148,163,184,.18)'}`,
        borderRadius: 'var(--radius)',
        boxShadow: '0 18px 50px -18px rgba(2,6,23,.55)',
        color: '#E2E8F0',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
