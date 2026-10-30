/**
 * components/storefront/templates/shared/GlassCard.jsx
 * Dark glassmorphism primitive shared by all 3 templates:
 * #090D16 slate at high opacity + backdrop-blur + 1px slate border, keeping
 * light foreground text legible over images and light storefront palettes.
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
export default function GlassCard({ children, className = '', style = {}, tint = null, heroLayout }) {
  return (
    <div
      data-gs-hero-layout={heroLayout}
      className={`overflow-hidden ${className}`}
      style={{
        background: 'rgba(9,13,22,.94)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
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
