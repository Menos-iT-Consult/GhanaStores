/**
 * layouts/dashboard/customizer/sections/trustBadges.jsx
 * The three reassurance badges. Clearing a field hides that badge rather than
 * rendering an empty pill.
 */
import { Package } from 'lucide-react';
import { Accordion, Field, Note, INPUT_CLS } from '../ui.jsx';

export default function TrustBadgesSection({ t, str }) {
  return (
    <Accordion id="trust-badges" icon={Package} title="Trust Badge Copy">
      <div className="space-y-2">
        <Note>
          Clear a field to hide that badge. They appear under the home and
          product pages when Trust Badges are enabled.
        </Note>
        <Field label="Security badge">
          <input
            type="text"
            value={t.trust_badges.secured}
            onChange={str('trust_badges.secured')}
            placeholder="GH Secured"
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Delivery badge">
          <input
            type="text"
            value={t.trust_badges.delivery}
            onChange={str('trust_badges.delivery')}
            placeholder="24-hr delivery"
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Payment badge">
          <input
            type="text"
            value={t.trust_badges.payment}
            onChange={str('trust_badges.payment')}
            placeholder="MoMo accepted"
            className={INPUT_CLS}
          />
        </Field>
      </div>
    </Accordion>
  );
}