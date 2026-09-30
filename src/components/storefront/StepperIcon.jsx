/**
 * components/storefront/StepperIcon.jsx
 * Tiny inline chevron used by the quantity steppers on the product and cart pages.
 *
 * @param {object} props
 * @param {string} props.d The chevron SVG path data.
 */
export default function StepperIcon({ d }) {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}