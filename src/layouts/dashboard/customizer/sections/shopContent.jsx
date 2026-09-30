/**
 * layouts/dashboard/customizer/sections/shopContent.jsx
 * Catalog copy, including both distinct empty states: a store with no products
 * at all, and a shopper whose search matched nothing.
 */
import { Layout } from 'lucide-react';
import { Accordion, Field, TextAreaRow, INPUT_CLS } from '../ui.jsx';

export default function ShopContentSection({ t, str }) {
  return (
    <Accordion id="shop-content" icon={Layout} title="Shop Page Copy">
      <div className="space-y-2">
        <Field label="Catalog heading">
          <input
            type="text"
            value={t.shop_content.heading_all}
            onChange={str('shop_content.heading_all')}
            placeholder="All Products"
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Search field placeholder">
          <input
            type="text"
            value={t.shop_content.search_placeholder}
            onChange={str('shop_content.search_placeholder')}
            placeholder="Search products"
            className={INPUT_CLS}
          />
        </Field>
        <TextAreaRow
          label="Empty store message"
          value={t.shop_content.empty_body}
          onChange={str('shop_content.empty_body')}
          rows={2}
        />
        <Field label="Empty store hint">
          <input
            type="text"
            value={t.shop_content.empty_hint}
            onChange={str('shop_content.empty_hint')}
            placeholder="Check back soon."
            className={INPUT_CLS}
          />
        </Field>
        <TextAreaRow
          label="No search results message (use {query} for the search term)"
          value={t.shop_content.no_match_body}
          onChange={str('shop_content.no_match_body')}
          rows={2}
        />
        <Field label="No results hint">
          <input
            type="text"
            value={t.shop_content.no_match_hint}
            onChange={str('shop_content.no_match_hint')}
            placeholder="Try a different search or browse everything."
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Clear filters button">
          <input
            type="text"
            value={t.shop_content.clear_filters_label}
            onChange={str('shop_content.clear_filters_label')}
            placeholder="Clear filters"
            className={INPUT_CLS}
          />
        </Field>
      </div>
    </Accordion>
  );
}