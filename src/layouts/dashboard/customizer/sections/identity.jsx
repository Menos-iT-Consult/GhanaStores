/**
 * layouts/dashboard/customizer/sections/identity.jsx
 * Store name, tagline and logo - the tokens a shopper sees first.
 */
import { Type } from 'lucide-react';
import ImageUploader from '../../../../components/ImageUploader.jsx';
import { Accordion, Field, Note, INPUT_CLS } from '../ui.jsx';

export default function IdentitySection({ t, str, updateTokens }) {
  return (
    <Accordion id="identity" icon={Type} title="Identity & Tagline">
      <div className="space-y-2">
        <input
          type="text"
          value={t.branding.site_title}
          onChange={str('branding.site_title')}
          className={INPUT_CLS}
          placeholder="Site title"
        />
        <input
          type="text"
          value={t.branding.tagline}
          onChange={str('branding.tagline')}
          className={INPUT_CLS}
          placeholder="Tagline"
        />

        {/* The logo uploads straight to R2 and is stored on the STORE, not the
            theme; the upload endpoint mirrors the URL into this token. */}
        <div className="space-y-1">
          <span className="block text-xs font-medium text-slate-600">Store logo</span>
          <ImageUploader
            kind="logo"
            value={t.branding.logo_url}
            label="Upload logo"
            hint="Square images work best. Up to 5MB, JPEG/PNG/WebP/AVIF."
            previewClass="h-16 w-16"
            onUploaded={(saved) => updateTokens('branding.logo_url', saved.rawUrl || saved.url || '')}
            onRemoved={() => updateTokens('branding.logo_url', '')}
          />
        </div>

        <Field label="Logo image URL">
          <input
            type="url"
            value={t.branding.logo_url}
            onChange={str('branding.logo_url')}
            placeholder="https://.../logo.png"
            className={INPUT_CLS}
          />
        </Field>
        <Note>
          The browser tab icon is derived from this logo automatically, so there
          is nothing else to set. Paste an image URL to use an image hosted
          elsewhere.
        </Note>
      </div>
    </Accordion>
  );
}