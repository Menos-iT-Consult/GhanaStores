/**
 * layouts/dashboard/customizer/sections/contactContent.jsx
 * Contact page copy and the WhatsApp number behind the contact card. The card
 * falls back to the WhatsApp Buy number, and is hidden when both are blank.
 */
import { MessageSquare } from 'lucide-react';
import { Accordion, Field, Note, INPUT_CLS } from '../ui.jsx';

export default function ContactContentSection({ t, str }) {
  return (
    <Accordion id="contact-content" icon={MessageSquare} title="Contact Form Copy">
      <div className="space-y-2">
        <Note>
          The WhatsApp card on the contact page uses this number, falling back to
          your WhatsApp Buy number. Clear it and that card is hidden.
        </Note>
        <Field label="WhatsApp number for the contact card">
          <input
            type="tel"
            value={t.contact_content.whatsapp_number}
            onChange={str('contact_content.whatsapp_number')}
            placeholder="Uses your WhatsApp Buy number"
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Name field placeholder">
          <input
            type="text"
            value={t.contact_content.form_name_placeholder}
            onChange={str('contact_content.form_name_placeholder')}
            placeholder="Your name"
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Email field placeholder">
          <input
            type="text"
            value={t.contact_content.form_email_placeholder}
            onChange={str('contact_content.form_email_placeholder')}
            placeholder="Email address"
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Message field placeholder">
          <input
            type="text"
            value={t.contact_content.form_message_placeholder}
            onChange={str('contact_content.form_message_placeholder')}
            placeholder="How can we help?"
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Submit button label">
          <input
            type="text"
            value={t.contact_content.submit_label}
            onChange={str('contact_content.submit_label')}
            placeholder="Send message"
            className={INPUT_CLS}
          />
        </Field>
      </div>
    </Accordion>
  );
}