/**
 * layouts/dashboard/customizer/sections/homeContent.jsx
 * Home page hero and featured-section copy, plus the trust strip's own toggle
 * (separate from the global Trust Badges switch, which also gates the product
 * page).
 */
import { PanelTop } from 'lucide-react';
import ImageUploader from '../../../../components/ImageUploader.jsx';
import { Accordion, ToggleRow, Field, INPUT_CLS, Note } from '../ui.jsx';

export default function HomeContentSection({ t, str, b, updateTokens }) {
  return (
    <Accordion id="home-content" icon={PanelTop} title="Homepage & Hero">
      <div className="space-y-2">
        <Note>
          Make the opening section feel like your store. Clear custom copy to
          restore the selected theme’s wording; a blank image uses a featured
          product photo.
        </Note>
        <Field label="Hero eyebrow">
          <input
            type="text"
            value={t.home_content.hero_eyebrow}
            onChange={str('home_content.hero_eyebrow')}
            placeholder="New season"
            maxLength={60}
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Hero headline">
          <input
            type="text"
            value={t.home_content.hero_title}
            onChange={str('home_content.hero_title')}
            placeholder={t.branding.site_title || 'Your store headline'}
            maxLength={100}
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Hero description">
          <textarea
            value={t.home_content.hero_description}
            onChange={str('home_content.hero_description')}
            placeholder={t.branding.tagline || 'A short introduction to your store'}
            rows={3}
            maxLength={240}
            className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </Field>
        <div className="space-y-1">
          <span className="block text-xs font-medium text-slate-600">Hero image</span>
          <ImageUploader
            kind="hero"
            value={t.home_content.hero_image_url}
            label="Upload hero image"
            hint="Wide landscape photos work best. JPEG, PNG, WebP or AVIF, up to 5MB."
            previewClass="h-16 w-28"
            onUploaded={(saved) => updateTokens('home_content.hero_image_url', saved.url || saved.rawUrl || '')}
            onRemoved={() => updateTokens('home_content.hero_image_url', '')}
          />
        </div>
        <Field label="Or use an image URL" hint="Leave blank to use your theme’s image or a featured product photo.">
          <input
            type="url"
            value={t.home_content.hero_image_url}
            onChange={str('home_content.hero_image_url')}
            placeholder="https://example.com/your-store-image.jpg"
            maxLength={2048}
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Hero button label">
          <input
            type="text"
            value={t.home_content.hero_button_label}
            onChange={str('home_content.hero_button_label')}
            placeholder="Shop Now"
            maxLength={32}
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