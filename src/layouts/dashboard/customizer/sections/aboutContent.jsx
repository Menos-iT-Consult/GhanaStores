/**
 * layouts/dashboard/customizer/sections/aboutContent.jsx
 * The About page's stat tiles and "why shop with us" proof points. Both are
 * list-shaped, so they get the reorderable editors; emptying either hides the
 * whole block on the storefront.
 */
import { FileText } from 'lucide-react';
import { Accordion, StatsEditor, ListEditor, Field, INPUT_CLS } from '../ui.jsx';

export default function AboutContentSection({ t, str, updateTokens }) {
  return (
    <Accordion id="about-content" icon={FileText} title="About Page Sections">
      <div className="space-y-2">
        <StatsEditor
          label="Stat tiles"
          value={t.about_content.stats}
          onChange={(v) => updateTokens('about_content.stats', v)}
        />
        <Field label='"Why shop with us" heading'>
          <input
            type="text"
            value={t.about_content.why_title}
            onChange={str('about_content.why_title')}
            placeholder="Why shop with us"
            className={INPUT_CLS}
          />
        </Field>
        <ListEditor
          label="Why shop with us points"
          value={t.about_content.why_points}
          onChange={(v) => updateTokens('about_content.why_points', v)}
        />
      </div>
    </Accordion>
  );
}