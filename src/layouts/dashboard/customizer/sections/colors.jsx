/**
 * layouts/dashboard/customizer/sections/colors.jsx
 * The five palette tokens. Every painted surface on the storefront derives from
 * these, so this is the section with the widest blast radius.
 */
import { Palette } from 'lucide-react';
import { Accordion, ColorRow } from '../ui.jsx';

export default function ColorsSection({ t, color }) {
  return (
    <Accordion id="colors" icon={Palette} title="Colors & Accents" defaultOpen>
      <div className="space-y-2">
        <ColorRow label="Primary" value={t.colors.primary} onChange={color('colors.primary')} />
        <ColorRow label="Background" value={t.colors.background} onChange={color('colors.background')} />
        <ColorRow label="Surface Card" value={t.colors.surface} onChange={color('colors.surface')} />
        <ColorRow label="Text" value={t.colors.text} onChange={color('colors.text')} />
        <ColorRow label="Highlight" value={t.colors.accent} onChange={color('colors.accent')} />
      </div>
    </Accordion>
  );
}