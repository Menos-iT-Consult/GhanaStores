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
            {/* Handles, not on/off switches. The icon appears exactly when a
                handle is present, so there is no separate toggle to forget and
                no way to publish an icon that links nowhere. */}
            {[
              ['Instagram', 'instagram', 'amashop'],
              ['Facebook', 'facebook', 'amashop'],
              ['TikTok', 'tiktok', 'amashop'],
            ].map(([label, key, ph]) => (
              <label key={key} className="block space-y-1">
                <span className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>{label} handle</span>
                  {typeof t.social[key] === 'string' && t.social[key]
                    ? <span className="text-[10px] font-bold text-emerald-600">Linked</span>
                    : <span className="text-[10px] font-semibold text-slate-400">Hidden</span>}
                </span>
                <input
                  type="text"
                  value={typeof t.social[key] === 'string' ? t.social[key] : ''}
                  onChange={(e) => str(`social.${key}`)(e)}
                  placeholder={ph}
                  className={INPUT_CLS}
                />
              </label>
            ))}
          </ConditionalGroup>
        )}
      </div>
    </Accordion>
  );
}