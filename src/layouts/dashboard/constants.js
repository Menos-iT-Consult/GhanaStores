/**
 * layouts/dashboard/constants.js
 * Shell constants shared by the dashboard sidebar and the customizer rail.
 *
 * Both panels occupy the same slot in the layout - the leftmost column - so
 * they share one positioning contract; only width, background and borders
 * differ (280px navy nav vs 380px light customizer panel).
 */
import {
  IconDashboard, IconCart, IconBox, IconReceipt,
  IconWallet, IconLogout, IconX, IconLogo,
} from '../../components/icons.jsx';
import { Palette, Globe, FileText, Mail } from 'lucide-react';

/** Primary seller navigation, shown whenever the customizer is closed. */
export const DASHBOARD_NAV = [
  { path: '/dashboard',        label: 'Analytics',     icon: IconDashboard },
  { path: '/pos',              label: 'POS Terminal',  icon: IconCart },
  { path: '/settings/payments',label: 'Payments',      icon: IconWallet },
  { path: '/inventory',        label: 'Inventory',     icon: IconBox },
  { path: '/orders',           label: 'Orders',        icon: IconReceipt },
  { path: '/messages',         label: 'Messages',      icon: Mail },
  { path: '/dashboard/themes', label: 'Theme Market',  icon: Palette },
  { path: '/domains',          label: 'Domains',        icon: Globe },
  { path: '/developer-guide',  label: 'Developer Guide', icon: FileText },
];

/** Route that flips the shell into sidebar-replacing customizer mode. */
export const CUSTOMIZER_ROUTE = '/dashboard/themes/customizer';

/**
 * Shared off-canvas drawer shell: overlay sheet below 768px, static
 * sidebar column from md (768px) up.
 */
export const DRAWER_POSITION =
  'fixed inset-y-0 left-0 z-50 flex h-full shrink-0 flex-col overflow-y-auto transition-transform duration-300 ease-in-out md:static md:z-0 md:h-screen md:max-w-none md:translate-x-0';

/* Icons the panels draw with, re-exported so panels need one import. */
export { IconX, IconLogo, IconLogout };