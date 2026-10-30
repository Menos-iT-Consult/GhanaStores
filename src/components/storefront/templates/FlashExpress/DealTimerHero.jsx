/**
 * components/storefront/templates/FlashExpress/DealTimerHero.jsx
 * High-impact deal timer widget: live countdown + featured product.
 * Falls back gracefully when no deal end is configured.
 * STRICT RULE: pure SVG / Lucide React icons ONLY - ZERO emojis.
 */
import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import SafeImage from '../../../SafeImage.jsx';
import GlassCard from '../../templates/shared/GlassCard.jsx';
import { ghs } from '../../../../api.js';

function useCountdown(targetMs) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!targetMs) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  if (!targetMs) return null;
  const left = Math.max(0, targetMs - now);
  return {
    h: Math.floor(left / 3600000),
    m: Math.floor((left % 3600000) / 60000),
    s: Math.floor((left % 60000) / 1000),
    done: left <= 0,
  };
}

const pad = (n) => String(n).padStart(2, '0');

export default function DealTimerHero({ t, onNavigate, ctx, variant }) {
  const { c, compact } = t;
  const hc = c.home_content || {};
  const defaults = c.theme_defaults || {};
  if (c.features?.enable_hero_banner === false) return null;
  const dealEndsAt = c.conversion?.deal_ends_at ? new Date(c.conversion.deal_ends_at).getTime() : null;
  const cd = useCountdown(Number.isFinite(dealEndsAt) ? dealEndsAt : null);
  const featured = ctx.products[0];
  const image = hc.hero_image_url || defaults.hero_image_url || featured?.img;
  return (
    <GlassCard heroLayout={variant || 'compact'} className={`gs-hero-layout relative overflow-hidden p-5 ${compact ? '' : 'min-h-[18rem]'}`} tint="color-mix(in srgb, var(--accent) 45%, transparent)">
      {image ? <SafeImage src={image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-35" /> : null}
      <div className="absolute inset-0 bg-slate-950/70" aria-hidden="true" />
      <div className="relative grid h-full items-center gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-white/70">
            {hc.hero_eyebrow || defaults.hero_eyebrow || (cd && !cd.done ? 'Limited-time offer' : 'Welcome to our store')}
          </p>
          <h1 className={`${compact ? 'text-2xl' : 'text-4xl'} mt-2 max-w-2xl font-extrabold leading-tight text-white`}>
            {hc.hero_title || defaults.hero_title || c.branding.site_title}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">
            {hc.hero_description || defaults.hero_description || c.branding.tagline || 'Fresh finds, ready for you.'}
          </p>
          <button type="button" onClick={() => onNavigate('shop')} className="mt-4 inline-flex items-center rounded-lg px-4 py-2.5 text-xs font-extrabold text-white transition hover:brightness-110" style={{ background: 'var(--primary)' }}>
            {hc.hero_button_label || defaults.hero_button_label || 'Shop now'}
          </button>
        </div>
        <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/15 bg-slate-950/35 p-3 backdrop-blur-sm">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: 'color-mix(in srgb, var(--accent) 25%, transparent)', color: 'var(--accent)' }}>
            <Zap size={16} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em]" style={{ color: 'var(--accent)' }}>
              {cd && !cd.done ? 'Deal ends in' : 'Today\'s flash deal'}
            </p>
            {cd && !cd.done ? (
              <p className="font-mono text-xl font-extrabold tabular-nums text-white" role="timer" aria-label={`Deal ends in ${cd.h} hours ${cd.m} minutes`}>
                {pad(cd.h)}:{pad(cd.m)}:{pad(cd.s)}
              </p>
            ) : (
              <p className="text-sm font-extrabold text-white">{c.conversion?.urgencyTicker || 'Selling fast'}</p>
            )}
          </div>
          {featured && !hc.hero_image_url ? (
            <button type="button" onClick={() => onNavigate('product', featured.id)} className="flex shrink-0 items-center gap-2 rounded-lg bg-white/5 p-1.5 pr-3 text-left transition hover:bg-white/10">
              <SafeImage src={featured.img} alt="" className="h-11 w-11 rounded-md object-cover" />
              <span>
                <span className="block max-w-[110px] truncate text-[11px] font-bold text-white">{featured.name}</span>
                <span className="block text-xs font-extrabold" style={{ color: '#34D399' }}>{ghs(featured.price)}</span>
              </span>
            </button>
          ) : null}
        </div>
      </div>
    </GlassCard>
  );
}
