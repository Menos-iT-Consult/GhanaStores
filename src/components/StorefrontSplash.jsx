/**
 * components/StorefrontSplash.jsx
 * The branded screen a customer sees while a storefront boots.
 *
 * Two things it deliberately does NOT do:
 *
 *  1. It does not render before the seller's logo is known. The host resolve
 *     request IS what returns the logo, so anything painted during that window
 *     would necessarily be the platform's own mark - a visitor would see the
 *     DiDwa logo and then watch it swap to someone else's shop. A blank
 *     background for those few frames is strictly better than showing the wrong
 *     brand. See the pending branch in App.jsx.
 *
 *  2. It does not disappear the instant data arrives. A splash that lives for
 *     150ms and vanishes reads as a glitch, not as polish, so it holds for a
 *     minimum and then fades.
 *
 * It paints the seller's own theme colours, so the screen flows straight into
 * the storefront instead of flashing a neutral card between two branded pages.
 */
import { useEffect, useRef, useState } from 'react';
import SafeImage from './SafeImage.jsx';
import { IconLogo } from './icons.jsx';

/* Mirrors the schema defaults in theme/config.js. A splash must never render
   unpainted just because the theme request has not landed yet. */
const FALLBACK_COLORS = {
  primary: '#0B6E4F',
  background: '#FFFFFF',
  surface: '#F8FAFC',
  text: '#0F172A',
};

/* Long enough to read as deliberate, short enough not to annoy a returning
   customer on a fast connection. */
const MIN_MS = 700;
/* Beat between the bar hitting 100% and the fade starting, so completion is
   legible before the screen starts dissolving. */
const SETTLE_MS = 240;
const FADE_MS = 420;
/* Safety valve. A storefront whose catalogue request hangs must still become
   reachable - a splash that can trap a customer is worse than no splash. */
const MAX_MS = 8000;

/* A 6-digit hex can take an alpha suffix, but a seller's theme colour is stored
   verbatim and may be a 3-digit hex or an rgb()/hsl() function. Appending "1F"
   to those produces invalid CSS that the browser silently drops, leaving an
   invisible track. Only the hex form is extended; anything else falls back. */
const withAlpha = (color, alphaHex) => (
  /^#[0-9a-f]{6}$/i.test(String(color || '').trim())
    ? `${color}${alphaHex}`
    : 'rgba(15, 23, 42, 0.08)'
);

export default function StorefrontSplash({
  logoUrl,
  storeName,
  colors,
  ready = false,
  onDone,
  minMs = MIN_MS,
}) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const startedAt = useRef(Date.now());
  const finished = useRef(false);
  /* Held in a ref so the effects below do not re-run when the parent passes a
     fresh arrow function on every render - that would restart the countdown and
     the splash would never finish. */
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; });

  const palette = { ...FALLBACK_COLORS, ...(colors || {}) };

  /* Creep toward completion but never reach it. A bar pinned at 100% while the
     shop is still fetching makes a promise the page has not kept yet. */
  useEffect(() => {
    const creep = setTimeout(() => setProgress(90), 140);
    return () => clearTimeout(creep);
  }, []);

  /* Release once the shop is genuinely ready AND the minimum hold has elapsed.
     The hold is measured from mount, so a slow first paint shortens the wait
     rather than stacking a fixed delay on top of it. */
  useEffect(() => {
    if (!ready) return undefined;
    const wait = Math.max(0, minMs - (Date.now() - startedAt.current));
    const fill = setTimeout(() => setProgress(100), wait);
    const fade = setTimeout(() => setLeaving(true), wait + SETTLE_MS);
    const end = setTimeout(() => {
      if (finished.current) return;
      finished.current = true;
      onDoneRef.current?.();
    }, wait + SETTLE_MS + FADE_MS);
    return () => { clearTimeout(fill); clearTimeout(fade); clearTimeout(end); };
  }, [ready, minMs]);

  /* Safety valve: reveal the storefront even if `ready` never arrives. */
  useEffect(() => {
    const bail = setTimeout(() => {
      if (finished.current) return;
      finished.current = true;
      setProgress(100);
      setLeaving(true);
      onDoneRef.current?.();
    }, MAX_MS);
    return () => clearTimeout(bail);
  }, []);

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={storeName ? `Loading ${storeName}` : 'Loading store'}
      className={[
        'fixed inset-0 z-50 flex flex-col items-center justify-center px-6',
        'transition-opacity duration-500 motion-reduce:transition-none',
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100',
      ].join(' ')}
      style={{ backgroundColor: palette.background }}
    >
      <div
        className={[
          'flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl',
          'shadow-lg ring-1 ring-black/5 motion-safe:animate-pulse',
        ].join(' ')}
        style={{ backgroundColor: palette.surface }}
      >
        {/* Same fallback the storefront header uses, so a store with no logo
            gets the platform mark here too and nothing changes underneath. */}
        {logoUrl
          ? <SafeImage src={logoUrl} alt="" className="h-full w-full object-cover" />
          : <IconLogo size={56} />}
      </div>

      {storeName ? (
        <p className="mt-5 max-w-[90%] truncate text-lg font-semibold" style={{ color: palette.text }}>
          {storeName}
        </p>
      ) : null}

      <div
        className="mt-8 h-1 w-40 overflow-hidden rounded-full"
        style={{ backgroundColor: withAlpha(palette.primary, '1F') }}
      >
        <div
          className={[
            'h-full rounded-full',
            'transition-[width] duration-700 ease-out motion-reduce:transition-none',
          ].join(' ')}
          style={{ width: `${progress}%`, backgroundColor: palette.primary }}
        />
      </div>
    </div>
  );
}