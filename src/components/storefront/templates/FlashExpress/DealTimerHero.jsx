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

export default function DealTimerHero({ t, onNavigate, ctx }) {
  const { c, compact } = t;
  if (c.features?.enable_hero_banner === false) return null;
  const dealEndsAt = c.conversion?.deal_ends_at ? new Date(c.conversion.deal_ends_at).getTime() : null;
  const cd = useCountdown(Number.isFinite(dealEndsAt) ? dealEndsAt : null);
  const featured = ctx.products[0];
  return (
    <GlassCard className="relative overflow-hidden p-4" tint="color-mix(in srgb, var(--accent) 45%, transparent)">
      <div className="flex items-center gap-2">
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
        {featured ? (
          <button type="button" onClick={() => onNavigate('product', featured.id)} className="flex shrink-0 items-center gap-2 rounded-lg bg-white/5 p-1.5 pr-3 text-left transition hover:bg-white/10">
            <SafeImage src={featured.img} alt="" className="h-11 w-11 rounded-md object-cover" />
            <span>
              <span className="block max-w-[110px] truncate text-[11px] font-bold text-white">{featured.name}</span>
              <span className="block text-xs font-extrabold" style={{ color: '#34D399' }}>{ghs(featured.price)}</span>
            </span>
          </button>
        ) : null}
      </div>
      {!compact ? (
        <p className="mt-2 text-[11px] text-white/60">{c.branding.tagline || 'Fresh stock, priced to move.'}</p>
      ) : null}
    </GlassCard>
  );
}
