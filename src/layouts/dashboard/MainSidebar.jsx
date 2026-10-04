/**
 * layouts/dashboard/MainSidebar.jsx
 * The dark navy seller navigation column, shown whenever the customizer is
 * closed: brand, primary nav, and a footer linking out to the live storefront.
 */
import { storefrontUrl } from '../../config.js';
import CopyButton from '../../components/CopyButton.jsx';
import { DASHBOARD_NAV, DRAWER_POSITION, IconX, IconLogo, IconLogout } from './constants.js';

/**
 * @param {object} props
 * @param {boolean} props.open Whether the off-canvas drawer is open (<768px).
 * @param {object|null} props.store The seller's store row, for the storefront link.
 * @param {Function} props.onNavClose Close the mobile drawer.
 * @param {Function} props.onNavigate Route navigation handler.
 * @param {Function} props.isActive Whether a nav path is the current route.
 */
export default function MainSidebar({ open, store, onNavClose, onNavigate, isActive }) {
  return (
    <aside
      id="gs-sidebar"
      aria-label="Seller dashboard navigation"
      className={`${DRAWER_POSITION} h-full w-[280px] max-w-[92vw] overflow-y-auto bg-[#0B1120] text-slate-100 ${
        open ? 'translate-x-0 shadow-2xl' : '-translate-x-full invisible'
      } md:visible md:w-[280px] md:shadow-none`}
    >
      {/* Brand header */}
      <div className="-mx-2 mb-2 flex h-12 items-center justify-between">
        <div className="flex items-center gap-2.5">
          <IconLogo size={30} className="rounded-full" />
          <span className="font-bold">DiDwa</span>
        </div>
        <button
          type="button"
          onClick={onNavClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
          aria-label="Close menu"
        >
          <IconX size={18} />
        </button>
      </div>

      {/* Primary nav */}
      <nav className="mt-3 space-y-1" aria-label="Main navigation">
        {DASHBOARD_NAV.map(({ path, label, icon: Icon }) => (
          <button
            key={path}
            type="button"
            onClick={() => onNavigate(path)}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              isActive(path)
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Icon size={17} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Footer: store + logout */}
      <div className="mt-auto border-t border-slate-800 p-4">
        {/* The name opens the storefront too, so a seller never has to aim at
            the small URL text to preview their shop. */}
        <a
          href={storefrontUrl(store)}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-sm font-bold text-white hover:text-blue-300"
          title={store?.name ? `Open ${store.name}` : 'Open my store'}
        >
          {store?.name || 'My Store'}
        </a>
        {/* Hostname shown without the scheme; the copy button puts the FULL url
            (with https://) on the clipboard, because that is what gets pasted
            into a message to a customer. Displayed and copied strings are
            deliberately different. */}
        <div className="flex items-center gap-1.5">
          <a
            href={storefrontUrl(store)}
            target="_blank"
            rel="noreferrer"
            className="block min-w-0 flex-1 truncate text-xs text-blue-400 hover:text-blue-300"
          >
            {storefrontUrl(store).replace(/^https?:\/\//, '')}
          </a>
          {/* Renders nothing when there is no url to copy, rather than a dead control. */}
          <CopyButton value={storefrontUrl(store)} label="Copy store url" size="xs" iconOnly />
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('gs:logout'))}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-red-600 hover:text-white"
        >
          <IconLogout size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
