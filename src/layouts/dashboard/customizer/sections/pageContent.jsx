/**
 * layouts/dashboard/customizer/sections/pageContent.jsx
 * The long-form About and Contact page bodies - the prose a merchant actually
 * writes, kept apart from the short labels above.
 */
import { FileText } from 'lucide-react';
import { Accordion, Field, TextAreaRow, SubHeading, INPUT_CLS } from '../ui.jsx';

export default function PageContentSection({ t, str }) {
  return (
    <Accordion id="page-content" icon={FileText} title="Page Content">
      <div className="space-y-2">
        <SubHeading>About Us page</SubHeading>
        <Field label="About page heading">
          <input
            type="text"
            value={t.pages_content.about_title}
            onChange={str('pages_content.about_title')}
            placeholder="About page heading"
            className={INPUT_CLS}
          />
        </Field>
        <TextAreaRow
          label="About story"
          value={t.pages_content.about_body}
          onChange={str('pages_content.about_body')}
          rows={4}
        />

        <SubHeading>Contact page</SubHeading>
        <Field label="Contact email">
          <input
            type="email"
            value={t.pages_content.contact_email}
            onChange={str('pages_content.contact_email')}
            placeholder="Contact email"
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Contact phone">
          <input
            type="tel"
            value={t.pages_content.contact_phone}
            onChange={str('pages_content.contact_phone')}
            placeholder="Contact phone"
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Store address">
          <input
            type="text"
            value={t.pages_content.contact_address}
            onChange={str('pages_content.contact_address')}
            placeholder="Store address"
            className={INPUT_CLS}
          />
        </Field>
      </div>
    </Accordion>
  );
}