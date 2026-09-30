/**
 * components/storefront/TrustStrip.jsx
 * The "GH Secured / 24-hr delivery / MoMo accepted" reassurance row, shown under
 * the home and product pages when the seller has enabled trust badges.
 */
import { IconShield, IconTruck, IconWallet } from '../icons.jsx';

/**
 * @param {object} props
 * @param {object} props.t Render tokens from useTokens.
 */
export default function TrustStrip({ t }) {
  const { c } = t;
  if (!c.features.enable_trust_badges) return null;
  if (c.home_content?.show_trust_strip === false) return null;
  const copy = c.trust_badges || {};
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t px-4 py-4 text-[11px] font-bold" style={{ borderColor: 'rgba(148,163,184,.3)' }}>
      {copy.secured ? <span className="flex items-center gap-1.5"><IconShield size={14} style={{ color: 'var(--primary)' }} /> {copy.secured}</span> : null}
      {copy.delivery ? <span className="flex items-center gap-1.5"><IconTruck size={14} style={{ color: 'var(--primary)' }} /> {copy.delivery}</span> : null}
      {copy.payment ? <span className="flex items-center gap-1.5"><IconWallet size={14} style={{ color: 'var(--primary)' }} /> {copy.payment}</span> : null}
    </div>
  );
}