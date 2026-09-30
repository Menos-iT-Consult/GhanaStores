/**
 * layouts/dashboard/customizer/sections/layout.jsx
 * Type stack, shape, grid density, type scale and button styling.
 */
import { Layout } from 'lucide-react';
import { Accordion, ToggleRow, SliderRow, SubHeading, INPUT_CLS } from '../ui.jsx';

export default function LayoutSection({ t, str, num, updateTokens, b }) {
  return (
    <Accordion id="layout" icon={Layout} title="Layout & Typography">
      <div className="space-y-2">
        <select
          value={t.typography.font_family}
          onChange={str('typography.font_family')}
          aria-label="Font family"
          className={INPUT_CLS}
        >
          <option value="Inter">Inter</option>
          <option value="Poppins">Poppins</option>
          <option value="Outfit">Outfit</option>
          <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
        </select>
        <select
          value={t.layout.border_radius}
          onChange={str('layout.border_radius')}
          aria-label="Corner rounding"
          className={INPUT_CLS}
        >
          <option value="0rem">Crisp (0rem)</option>
          <option value="0.375rem">Subtle (0.375rem)</option>
          <option value="0.75rem">Rounded (0.75rem)</option>
          <option value="1.5rem">Extra Rounded (1.5rem)</option>
        </select>
        <select
          value={t.layout.product_grid_columns}
          onChange={num('layout.product_grid_columns')}
          aria-label="Product grid columns"
          className={INPUT_CLS}
        >
          <option value={2}>2 columns</option>
          <option value={3}>3 columns</option>
          <option value={4}>4 columns</option>
        </select>
        <select
          value={t.layout.header_style}
          onChange={str('layout.header_style')}
          aria-label="Header alignment"
          className={INPUT_CLS}
        >
          <option value="left_aligned">Left aligned</option>
          <option value="centered">Centered</option>
        </select>

        <SubHeading>Type scale</SubHeading>
        {/* heading_weight is written as a string because it is interpolated
            straight into a fontWeight style, not used arithmetically. */}
        <SliderRow
          label="Heading weight"
          value={t.typography.heading_weight}
          min="400"
          max="900"
          step="100"
          onChange={(v) => updateTokens('typography.heading_weight', v)}
        />
        <SliderRow
          label="Body text size"
          value={t.typography.body_size}
          min={13}
          max={20}
          step={1}
          suffix="px"
          onChange={(v) => updateTokens('typography.body_size', Number(v))}
        />

        <SubHeading>Buttons</SubHeading>
        <ToggleRow label="Drop shadow" value={t.buttons.shadow} onChange={b('buttons.shadow')} />
        <ToggleRow label="Uppercase labels" value={t.buttons.uppercase} onChange={b('buttons.uppercase')} />
      </div>
    </Accordion>
  );
}