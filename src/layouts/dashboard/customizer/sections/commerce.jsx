/**
 * layouts/dashboard/customizer/sections/commerce.jsx
 * WhatsApp purchasing and the storefront feature switches. The WhatsApp fields
 * only appear while the purchasing toggle is on, because they are meaningless
 * without it.
 */
import { MessageSquare } from 'lucide-react';
import { Accordion, ToggleRow, ConditionalGroup, Field, INPUT_CLS } from '../ui.jsx';

export default function CommerceSection({ t, str, b }) {
  return (
    <Accordion id="whatsapp" icon={MessageSquare} title="WhatsApp & Integrations">
      <div className="space-y-2">
        <ToggleRow
          label="Direct WhatsApp Purchasing"
          value={t.features.enable_whatsapp_buy}
          onChange={b('features.enable_whatsapp_buy')}
        />
        {t.features.enable_whatsapp_buy && (
          <ConditionalGroup tight>
            <input
              type="tel"
              value={t.features.whatsapp_number}
              onChange={str('features.whatsapp_number')}
              placeholder="233201234567"
              aria-label="WhatsApp number"
              className={INPUT_CLS}
            />
            <Field label="Custom checkout message">
              <input
                type="text"
                value={t.features.whatsapp_custom_message}
                onChange={str('features.whatsapp_custom_message')}
                placeholder="Hello! I would like to buy"
                className={INPUT_CLS}
              />
            </Field>
          </ConditionalGroup>
        )}
        <ToggleRow label="Hero Banner" value={t.features.enable_hero_banner} onChange={b('features.enable_hero_banner')} />
        <ToggleRow label="Trust Badges" value={t.features.enable_trust_badges} onChange={b('features.enable_trust_badges')} />
        <ToggleRow label="Stock Counter" value={t.features.enable_stock_counter} onChange={b('features.enable_stock_counter')} />
      </div>
    </Accordion>
  );
}