/**
 * layouts/dashboard/customizer/sections/chrome.jsx
 * The storefront's persistent chrome: the header (announcement bar, sticky
 * behaviour, search affordance) and the footer (columns, blurb, socials).
 */
import { PanelTop, PanelBottom } from 'lucide-react';
import { Accordion, ToggleRow, ConditionalGroup, TextAreaRow, INPUT_CLS } from '../ui.jsx';

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
            <ToggleRow label="Instagram" value={t.social.instagram} onChange={b('social.instagram')} />
            <ToggleRow label="Facebook" value={t.social.facebook} onChange={b('social.facebook')} />
            <ToggleRow label="TikTok" value={t.social.tiktok} onChange={b('social.tiktok')} />
          </ConditionalGroup>
        )}
      </div>
    </Accordion>
  );
}