/**
 * layouts/dashboard/customizer/sections/cartContent.jsx
 * Cart page copy: heading, empty state and the two navigation affordances.
 */
import { IconCart } from '../../../../components/icons.jsx';
import { Accordion, Field, INPUT_CLS } from '../ui.jsx';

export default function CartContentSection({ t, str }) {
  return (
    <Accordion id="cart-content" icon={IconCart} title="Cart Copy">
      <div className="space-y-2">
        <Field label="Cart heading">
          <input
            type="text"
            value={t.cart_content.heading}
            onChange={str('cart_content.heading')}
            placeholder="Your Cart"
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Empty cart message">
          <input
            type="text"
            value={t.cart_content.empty_body}
            onChange={str('cart_content.empty_body')}
            placeholder="Your cart is empty."
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Browse button label">
          <input
            type="text"
            value={t.cart_content.browse_label}
            onChange={str('cart_content.browse_label')}
            placeholder="Browse the collection"
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Continue shopping link">
          <input
            type="text"
            value={t.cart_content.continue_label}
            onChange={str('cart_content.continue_label')}
            placeholder="Continue shopping"
            className={INPUT_CLS}
          />
        </Field>
      </div>
    </Accordion>
  );
}