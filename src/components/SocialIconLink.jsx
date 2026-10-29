const NETWORK_STYLES = {
  facebook: 'bg-[#1877F2]',
  instagram: 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#515BD4]',
  linkedin: 'bg-[#0A66C2]',
  tiktok: 'bg-[#111111]',
  whatsapp: 'bg-[#25D366]',
  x: 'bg-[#111111]',
  youtube: 'bg-[#FF0033]',
};

const SOFT_NETWORK_STYLES = {
  facebook: 'bg-[#E8F1FF] text-[#1877F2]',
  instagram: 'bg-[#FCE7F3] text-[#C13584]',
  linkedin: 'bg-[#E6F2FF] text-[#0A66C2]',
  tiktok: 'bg-slate-100 text-slate-900',
  whatsapp: 'bg-[#E6F9ED] text-[#128C4A]',
  x: 'bg-slate-100 text-slate-900',
  youtube: 'bg-[#FFE8EA] text-[#D9002B]',
};

const SHAPE_STYLES = {
  circle: 'rounded-full',
  rounded: 'rounded-xl',
  square: 'rounded-md',
};

function NetworkMark({ network }) {
  switch (network) {
    case 'facebook':
      return <path fill="currentColor" d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.6 1.6-1.6h1.7V3.8c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V10H7.3v3h2.8v8h3.4z" />;
    case 'instagram':
      return (
        <>
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="17.6" cy="6.7" r="1.1" fill="currentColor" />
        </>
      );
    case 'linkedin':
      return (
        <>
          <path fill="currentColor" d="M5.2 8.6H2.1V21h3.1V8.6zM3.7 2.5a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zM21 13.9c0-3.7-2-5.5-4.7-5.5a4.1 4.1 0 0 0-3.7 2v-1.8H9.5V21h3.1v-6.1c0-1.6.3-3.2 2.4-3.2s2.1 1.9 2.1 3.3V21h3.1l.8-7.1z" />
        </>
      );
    case 'tiktok':
      return (
        <>
          <path d="M14 4v10.2a3.7 3.7 0 1 1-3-3.6" fill="none" stroke="#25F4EE" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" transform="translate(-1 1)" />
          <path d="M14 4v10.2a3.7 3.7 0 1 1-3-3.6" fill="none" stroke="#FE2C55" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" transform="translate(1 -0.5)" />
          <path d="M14 4v10.2a3.7 3.7 0 1 1-3-3.6M14 4c.5 2.8 2.1 4.5 5 4.8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case 'whatsapp':
      return (
        <>
          <path d="M20.2 11.7a8.2 8.2 0 0 1-12.1 7.2L4 20l1.2-4A8.2 8.2 0 1 1 20.2 11.7Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 8.3c.2-.5.4-.5.7-.5h.5c.2 0 .4.1.5.4l.7 1.7c.1.3.1.5-.1.7l-.5.6c-.2.2-.2.4 0 .6.5.9 1.3 1.7 2.3 2.2.3.2.5.2.7-.1l.7-.8c.2-.2.4-.3.7-.2l1.6.8c.3.1.4.3.4.5 0 .3-.2 1.2-.7 1.6-.5.5-1.2.7-1.9.6-1.1-.2-2.4-.8-3.8-2.1-1.2-1.1-2-2.5-2.2-3.5-.2-1 .2-1.9.4-2.5Z" fill="currentColor" />
        </>
      );
    case 'x':
      return <path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.8 5.7 22H2.5l7.3-8.4L2 2h6.5l4.5 6.7L18.9 2zm-1.1 17.8h1.7L7.5 4.1H5.7l12.1 15.7z" />;
    case 'youtube':
      return (
        <>
          <rect x="2.5" y="5" width="19" height="14" rx="4" fill="currentColor" />
          <path d="m10 8.7 5.5 3.3-5.5 3.3V8.7Z" fill="#FF0033" />
        </>
      );
    default:
      return null;
  }
}

export default function SocialIconLink({
  href,
  network,
  label,
  size = 36,
  style = 'brand',
  shape = 'circle',
  ...rest
}) {
  const brandStyle = NETWORK_STYLES[network];
  const accessibleLabel = rest['aria-label'] ?? label;
  if (!href || !brandStyle) return null;
  const iconStyle = style === 'soft'
    ? SOFT_NETWORK_STYLES[network]
    : style === 'monochrome'
      ? 'bg-slate-900 text-white'
      : style === 'outline'
        ? 'border border-slate-300 bg-transparent text-slate-700 shadow-none'
        : brandStyle;
  const shapeStyle = SHAPE_STYLES[shape] || SHAPE_STYLES.circle;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={accessibleLabel}
      title={label}
      className={`group inline-grid shrink-0 place-items-center ${shapeStyle} ${iconStyle} transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={Math.round(size * 0.52)} height={Math.round(size * 0.52)} aria-hidden="true">
        <NetworkMark network={network} />
      </svg>
    </a>
  );
}
