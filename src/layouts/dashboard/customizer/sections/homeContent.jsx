/**
 * layouts/dashboard/customizer/sections/homeContent.jsx
 * Home page hero and featured-section copy, plus the trust strip's own toggle
 * (separate from the global Trust Badges switch, which also gates the product
 * page).
 */
import { PanelTop } from 'lucide-react';
import { Accordion, ToggleRow, Field, INPUT_CLS } from '../ui.jsx';

export default function HomeContentSection({ t, str, b }) {
  return (
    <Accordion id="home-content" icon={PanelTop} title="Home Page Copy">
      <div className="space-y-2">
        <Field label="Hero button label">
          <input
            type="text"
            value={t.home_content.hero_button_label}
            onChange={str('home_content.hero_button_label')}
            placeholder="Shop Now"
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Featured section heading">
          <input
            type="text"
            value={t.home_content.featured_heading}
            onChange={str('home_content.featured_heading')}
            placeholder="Featured products"
            className={INPUT_CLS}
          />
        </Field>
        <Field label='"View all" link label'>
          <input
            type="text"
            value={t.home_content.view_all_label}
            onChange={str('home_content.view_all_label')}
            placeholder="View all"
            className={INPUT_CLS}
          />
        </Field>
        <ToggleRow
          label="Show trust badge strip"
          value={t.home_content.show_trust_strip}
          onChange={b('home_content.show_trust_strip')}
        />
      </div>
    </Accordion>
  );
}