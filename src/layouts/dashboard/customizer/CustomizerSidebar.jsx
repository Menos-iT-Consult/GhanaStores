/**
 * layouts/dashboard/customizer/CustomizerSidebar.jsx
 * The customizer's control rail: a publish header plus every section module,
 * composed in merchant-facing order.
 *
 * This component owns the TOKEN WRITERS (color/num/str/b and updateTokens),
 * which is why each section receives them as props instead of importing a
 * module-level store: the whole rail stays a pure function of the config it is
 * handed, with no hidden shared state.
 *
 * The rail is a WORDPRESS-STYLE panel - it replaces the dashboard's dark nav
 * column entirely while open, granting the remaining width to the preview
 * canvas. Its body scrolls; the header stays pinned so Publish is always
 * reachable.
 */
import { useEffect } from 'react';
import { PanelLeftClose, ArrowLeft, Loader2, Check } from 'lucide-react';
import { DRAWER_POSITION } from '../constants.js';

import IdentitySection from './sections/identity.jsx';
import ColorsSection from './sections/colors.jsx';
import CommerceSection from './sections/commerce.jsx';
import LayoutSection from './sections/layout.jsx';
import { HeaderSection, FooterSection } from './sections/chrome.jsx';
import ProductPageSection from './sections/productPage.jsx';
import HomeContentSection from './sections/homeContent.jsx';
import TrustBadgesSection from './sections/trustBadges.jsx';
import ShopContentSection from './sections/shopContent.jsx';
import CartContentSection from './sections/cartContent.jsx';
import ContactContentSection from './sections/contactContent.jsx';
import AboutContentSection from './sections/aboutContent.jsx';
import PageContentSection from './sections/pageContent.jsx';
import AdvancedSection from './sections/advanced.jsx';

/**
 * Push the theme's colors, shape and font onto the dashboard's own CSS custom
 * properties, so the rail and the preview agree while the merchant edits. Only
 * the document root is touched - never the storefront's own scoped variables.
 */
function useLiveThemeVars(customTheme) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary', customTheme.colors.primary);
    root.style.setProperty('--bg', customTheme.colors.background);
    root.style.setProperty('--surface', customTheme.colors.surface);
    root.style.setProperty('--text', customTheme.colors.text);
    root.style.setProperty('--accent', customTheme.colors.accent);
    root.style.setProperty('--radius', customTheme.layout.border_radius);
    root.style.setProperty(
      '--font-stack',
      `'${customTheme.typography.font_family}', system-ui, sans-serif`,
    );
    root.style.fontSize = `${customTheme.typography.body_size}px`;
  }, [customTheme]);
}
/**
 * @param {object} props
 * @param {boolean} props.open Whether the off-canvas drawer is open (<768px).
 * @param {boolean} props.collapsed Whether the rail is hidden on lg+ screens.
 * @param {Function} props.onToggleCollapse Collapse/expand handler.
 * @param {object} props.customTheme The working theme config.
 * @param {Function} props.setCustomTheme Config setter.
 * @param {boolean} props.isPublishing Publish in flight.
 * @param {boolean} props.publishSuccess Publish just succeeded.
 * @param {Function} props.onPublish Publish handler.
 * @param {Function} props.onBack Leave customizer mode.
 * @param {Function} props.onResetDefaults Restore schema defaults.
 * @param {Function} props.onRemoveLogo Clear the store logo on the store record
 *   and blank the token. Handled here rather than in IdentitySection so the
 *   section modules stay pure token writers with no API side effects.
 * @param {string} props.logoError Message from a failed logo removal.
 * @param {boolean} props.removingLogo A removal request is in flight.
 */
export default function CustomizerSidebar({
  open,
  collapsed,
  onToggleCollapse,
  customTheme, setCustomTheme, isPublishing, publishSuccess,
  onPublish, onBack, onResetDefaults, onRemoveLogo, logoError, removingLogo,
}) {
  useLiveThemeVars(customTheme);

  const updateTokens = (path, value) =>
    setCustomTheme((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let node = next;
      for (let i = 0; i < keys.length - 1; i++) node = node[keys[i]];
      node[keys[keys.length - 1]] = value;
      return next;
    });

  /* Curried writers, so a section can bind a token path once and hand the
     result straight to a control: str('footer.blurb'). */
  const color = (path) => (hex) => updateTokens(path, hex);
  const num = (path) => (e) => updateTokens(path, Number(e.target.value));
  const str = (path) => (e) => updateTokens(path, e.target.value);
  const b = (path) => (v) => updateTokens(path, v);

  /* Shorthand handed to every section: `t` is the config, `str`/`num`/`color`/`b`
     are the path-curried writers, and `updateTokens` is the raw escape hatch. */
  const t = customTheme;
  const shared = { t, str, num, color, b, updateTokens, onRemoveLogo, logoError, removingLogo };

  return (
    <aside
      id="gs-sidebar"
      aria-label="Theme customizer controls"
      className={`${DRAWER_POSITION} h-screen w-[380px] max-w-[92vw] border-r border-gray-200 bg-white text-slate-900 ${
        open ? 'translate-x-0 shadow-2xl' : '-translate-x-full invisible'
      } md:visible md:w-[380px] md:shadow-none ${collapsed ? 'lg:hidden' : ''}`}
    >
      {/* Publish header */}
      <header className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Hide controls"
            aria-label="Hide customizer controls"
            className="hidden rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:block"
          >
            <PanelLeftClose size={16} aria-hidden="true" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">You are customizing</p>
            <p className="truncate text-base font-extrabold leading-tight text-charcoal" title={t.branding.site_title}>
              {t.branding.site_title}
            </p>
          </div>

          <button
            type="button"
            onClick={onPublish}
            disabled={isPublishing}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            aria-live="polite"
          >
            {isPublishing ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : publishSuccess ? (
              <Check size={14} aria-hidden="true" />
            ) : null}
            {isPublishing ? 'Publishing' : publishSuccess ? 'Saved' : 'Publish'}
          </button>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-w-0 items-center gap-1 rounded text-[11px] font-bold text-blue-600 transition hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ArrowLeft size={12} aria-hidden="true" />
            <span className="truncate">Back to dashboard</span>
          </button>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <span
              className={`h-1.5 w-1.5 rounded-full ${publishSuccess ? 'bg-emerald-brand' : ''}`}
              style={publishSuccess ? undefined : { background: t.colors.primary }}
              aria-hidden="true"
            />
            {publishSuccess ? 'All changes are live' : 'In sync with storefront'}
          </span>
        </div>
      </header>

      {/* Scrollable section body */}
      <div className="flex-1 space-y-1 overflow-y-auto border-gray-200 px-1 py-1">
        <IdentitySection {...shared} />
        <ColorsSection {...shared} />
        <CommerceSection {...shared} />
        <LayoutSection {...shared} />
        <HeaderSection {...shared} />
        <FooterSection {...shared} />
        <ProductPageSection {...shared} />
        <HomeContentSection {...shared} />
        <TrustBadgesSection {...shared} />
        <ShopContentSection {...shared} />
        <CartContentSection {...shared} />
        <ContactContentSection {...shared} />
        <AboutContentSection {...shared} />
        <PageContentSection {...shared} />
        <AdvancedSection t={t} str={str} onResetDefaults={onResetDefaults} />
      </div>
    </aside>
  );
}