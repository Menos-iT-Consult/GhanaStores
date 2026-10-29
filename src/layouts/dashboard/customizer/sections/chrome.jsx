/**
 * layouts/dashboard/customizer/sections/chrome.jsx
 * The storefront's persistent chrome: the header (announcement bar, sticky
 * behaviour, search affordance) and the footer (columns, blurb, socials).
 */
import { PanelTop, PanelBottom } from 'lucide-react';
import { Accordion, ToggleRow, ConditionalGroup, TextAreaRow, INPUT_CLS, SubHeading } from '../ui.jsx';

export function HeaderSection({ t, str, b }) {
  return (
    <Accordion id="header" icon={PanelTop} title="Header & Navigation">
      <div className="space-y-2">
        <ToggleRow label="Sticky header" value={t.header.sticky} onChange={b('header.sticky')} />
        <ToggleRow label="Show search icon" value={t.header.show_search} onChange={b('header.show_search')} />
        <ToggleRow label="Announcement bar" value={t.header.announcement_enabled} onChange={b('header.announcement_enabled')} />
        {t.header.announcement_enabled && (
          <input
            type="text"
            value={t.header.announcement_text}
            onChange={str('header.announcement_text')}
            placeholder="Announcement message"
            aria-label="Announcement message"
            className={INPUT_CLS}
          />
        )}
      </div>
    </Accordion>
  );
}

export function FooterSection({ t, str, num, b }) {
  return (
    <Accordion id="footer" icon={PanelBottom} title="Footer & Social">
      <div className="space-y-2">
        <select
          value={t.footer.columns}
          onChange={num('footer.columns')}
          aria-label="Footer columns"
          className={INPUT_CLS}
        >
          <option value={1}>1 column</option>
          <option value={2}>2 columns</option>
          <option value={3}>3 columns</option>
          <option value={4}>4 columns</option>
        </select>
        <input
          type="text"
          value={t.footer.copyright}
          onChange={str('footer.copyright')}
          placeholder="Copyright line"
          aria-label="Copyright line"
          className={INPUT_CLS}
        />
        <TextAreaRow label="Footer blurb" value={t.footer.blurb} onChange={str('footer.blurb')} rows={2} />
        <ToggleRow label="Show payment badges" value={t.footer.show_payments} onChange={b('footer.show_payments')} />
        <ToggleRow label="Show social icons" value={t.footer.show_social} onChange={b('footer.show_social')} />
        {t.footer.show_social && (
          <ConditionalGroup>
            <SubHeading>Icon appearance</SubHeading>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">Icon style</span>
              <select
                value={t.social_settings.style}
                onChange={(e) => str('social_settings.style')(e)}
                aria-label="Social icon style"
                className={INPUT_CLS}
              >
                <option value="brand">Brand colours</option>
                <option value="soft">Soft brand colours</option>
                <option value="monochrome">Monochrome</option>
                <option value="outline">Outline</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">Icon shape</span>
              <select
                value={t.social_settings.shape}
                onChange={(e) => str('social_settings.shape')(e)}
                aria-label="Social icon shape"
                className={INPUT_CLS}
              >
                <option value="circle">Circle</option>
                <option value="rounded">Rounded square</option>
                <option value="square">Square</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">Footer alignment</span>
              <select
                value={t.social_settings.alignment}
                onChange={(e) => str('social_settings.alignment')(e)}
                aria-label="Social icon alignment"
                className={INPUT_CLS}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
            <SubHeading>Social links</SubHeading>
            {/* Social URLs are accepted directly so a merchant can paste a full
                profile URL or a short handle and the storefront still renders a
                working link. */}
            {[
              ['Instagram', 'instagram', 'https://instagram.com/yourshop'],
              ['Facebook', 'facebook', 'https://facebook.com/yourshop'],
              ['TikTok', 'tiktok', 'https://tiktok.com/@yourshop'],
              ['YouTube', 'youtube', 'https://youtube.com/@yourshop'],
              ['X / Twitter', 'x', 'https://x.com/yourshop'],
              ['LinkedIn', 'linkedin', 'https://linkedin.com/in/yourshop'],
              ['WhatsApp', 'whatsapp', 'Uses your WhatsApp purchasing number'],
            ].map(([label, key, ph]) => (
              <div key={key} className="space-y-1">
                <ToggleRow
                  label={`Show ${label}`}
                  value={t.social_settings.visibility[key]}
                  onChange={(value) => str(`social_settings.visibility.${key}`)({ target: { value } })}
                />
                {key !== 'whatsapp' && (
                  <label className="block space-y-1">
                    <span className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>{label} URL</span>
                      {typeof t.social[key] === 'string' && t.social[key]
                        ? <span className="text-[10px] font-bold text-emerald-600">Linked</span>
                        : <span className="text-[10px] font-semibold text-slate-400">Hidden until linked</span>}
                    </span>
                    <input
                      type="url"
                      value={typeof t.social[key] === 'string' ? t.social[key] : ''}
                      onChange={(e) => str(`social.${key}`)(e)}
                      placeholder={ph}
                      className={INPUT_CLS}
                    />
                  </label>
                )}
              </div>
            ))}
          </ConditionalGroup>
        )}
      </div>
    </Accordion>
  );
}