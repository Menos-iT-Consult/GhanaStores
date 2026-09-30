/**
 * layouts/dashboard/customizer/sections/productPage.jsx
 * Product detail page switches plus the two fallback-copy tokens that only
 * appear when a product row has no description or specs of its own.
 */
import { Package } from 'lucide-react';
import { Accordion, ToggleRow, TextAreaRow, ListEditor } from '../ui.jsx';

export default function ProductPageSection({ t, str, b, updateTokens }) {
  return (
    <Accordion id="product-page" icon={Package} title="Product Page">
      <div className="space-y-2">
        <ToggleRow label="Breadcrumbs" value={t.product_page.breadcrumbs} onChange={b('product_page.breadcrumbs')} />
        <ToggleRow label="Quantity stepper" value={t.product_page.quantity_stepper} onChange={b('product_page.quantity_stepper')} />
        <ToggleRow label="Customer reviews" value={t.product_page.reviews} onChange={b('product_page.reviews')} />
        <ToggleRow label="Related products" value={t.product_page.related_products} onChange={b('product_page.related_products')} />
        <TextAreaRow
          label="Fallback description (when a product has none)"
          value={t.product_page.fallback_description}
          onChange={str('product_page.fallback_description')}
          rows={2}
        />
        <ListEditor
          label="Spec bullet points"
          value={t.product_page.feature_bullets}
          onChange={(v) => updateTokens('product_page.feature_bullets', v)}
        />
      </div>
    </Accordion>
  );
}