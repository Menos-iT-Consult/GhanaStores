/**
 * layouts/DashboardLayout.jsx
 * The seller shell. Split-pane, implementing a sidebar-REPLACING customizer:
 *
 *   isCustomizerOpen === false -> dark navy (#0B1120) primary nav column,
 *                                 280px wide, hosting Analytics / POS /
 *                                 Inventory / Orders / Theme Market.
 *   isCustomizerOpen === true  -> dark nav unmounts completely and the light
 *                                 accordion control panel (380px) slides into
 *                                 the leftmost slot, granting the entire
 *                                 remaining flex-1 width to the live
 *                                 storefront preview canvas.
 *
 * Below 768px both panels become an off-canvas drawer sheet driven by the
 * sticky mobile top bar hamburger.
 *
 * This file is the ORCHESTRATION ONLY: which panel is mounted, where the drawer
 * and collapse states live, and the window events that bridge the rail to the
 * preview canvas. The panels themselves live in ./dashboard/, the theme draft
 * in ./dashboard/useThemeDraft.js, and the rail's controls in
 * ./dashboard/customizer/.
 *
 * STRICT RULE: pure SVG / Lucide React icons ONLY — zero emojis everywhere.
 */
import { useEffect, useState } from 'react';
import { Menu, Loader2, Check } from 'lucide-react';
import { IconStore } from '../components/icons.jsx';
import { navigate, usePathname } from '../router.js';
import { uploadApi } from '../api.js';
import MainSidebar from './dashboard/MainSidebar.jsx';
import CustomizerSidebar from './dashboard/customizer/CustomizerSidebar.jsx';
import { useThemeDraft } from './dashboard/useThemeDraft.js';
import { useUnsavedChanges } from './dashboard/useUnsavedChanges.js';
import UnsavedChangesDialog from './dashboard/UnsavedChangesDialog.jsx';
import { CUSTOMIZER_ROUTE } from './dashboard/constants.js';

export default function DashboardLayout({ children }) {
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(
    window.location.pathname === CUSTOMIZER_ROUTE,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  /* WordPress-style collapse of the customizer control rail (lg+ only). */
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const route = usePathname();
  const [store, setStore] = useState(null);

  const {
    customTheme, setCustomTheme, isPublishing, publishSuccess,
    onPublish, onResetDefaults, onDiscardChanges, isDirty, seedFromThemeConfig,
  } = useThemeDraft();

  /* '/dashboard' matches exactly only - theme sub-routes belong to
     Theme Market, not Analytics. */
  const isActive = (path) =>
    route === path ||
    (path !== '/' && path !== '/dashboard' && route.startsWith(`${path}/`));

  useEffect(() => {
    const onChange = () => setIsCustomizerOpen(window.location.pathname === CUSTOMIZER_ROUTE);
    window.addEventListener('popstate', onChange);
    return () => window.removeEventListener('popstate', onChange);
  }, []);

  useEffect(() => {
    const handleLogout = () => setStore(null);
    window.addEventListener('gs:logout', handleLogout);
    return () => window.removeEventListener('gs:logout', handleLogout);
  }, []);

  /* Escape dismisses the mobile drawer sheet (<768px only). */
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);
/* When the marketplace / demo viewer asks to customize the ACTIVE theme,
     pre-seed the working copy from that theme's config before opening the rail
     (requirement: customizer opens the active theme, not defaults). */
  useEffect(() => {
    const onOpenCustomizer = (e) => {
      if (e?.detail) seedFromThemeConfig(e.detail);
      setDrawerOpen(false);
      setIsCustomizerOpen(true);
    };
    window.addEventListener('gs:open-customizer', onOpenCustomizer);
    return () => window.removeEventListener('gs:open-customizer', onOpenCustomizer);
  }, [seedFromThemeConfig]);

  /* WordPress-style collapse: the preview canvas edge handle and the rail
     chevron both toggle this - hides the control column on lg+ screens so
     the storefront preview takes the full width. */
  useEffect(() => {
    const onToggle = () => setPanelCollapsed((v) => !v);
    window.addEventListener('gs:customizer-collapse', onToggle);
    return () => window.removeEventListener('gs:customizer-collapse', onToggle);
  }, []);

  const onNavigate = (path) => {
    navigate(path);
    setIsCustomizerOpen(path === CUSTOMIZER_ROUTE);
    setDrawerOpen(false);
  };

  /* Leaving customizer mode: the target route is not CUSTOMIZER_ROUTE, which
     closes the drawer and restores the dark primary nav sidebar. */
  const onBack = () => onNavigate('/dashboard/themes');

  /* Clear the store logo. The logo lives on the STORE (stores.logo_url) and is
     only MIRRORED into the theme token, so blanking the token alone would leave
     the uploaded file in place and keep serving the browser tab icon via
     /api/domains/resolve. The DELETE has to happen first; the token is blanked
     on success only, so a failed request leaves the draft showing the real
     logo rather than an empty field. */
  const [logoError, setLogoError] = useState('');
  const [removingLogo, setRemovingLogo] = useState(false);
  const onRemoveLogo = async () => {
    setLogoError('');
    setRemovingLogo(true);
    try {
      await uploadApi.removeLogo();
      setCustomTheme((prev) => ({ ...prev, branding: { ...prev.branding, logo_url: '' } }));
    } catch (err) {
      setLogoError(err.message || 'Could not remove your logo. Please try again.');
    } finally {
      setRemovingLogo(false);
    }
  };

  /* Warn before unsaved theme edits are lost. Guarded on isCustomizerOpen so
     the prompt only appears while the customizer is actually on screen - a
     dirty draft must not block navigation everywhere else in the dashboard. */
  const guard = useUnsavedChanges(isDirty && isCustomizerOpen, {
    onSave: onPublish,
    onDiscard: onDiscardChanges,
  });

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Off-canvas scrim - tap to dismiss the drawer sheet (<768px) */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close navigation menu"
        onClick={() => setDrawerOpen(false)}
        className={`fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {!isCustomizerOpen ? (
        <MainSidebar
          open={drawerOpen}
          store={store}
          onNavClose={() => setDrawerOpen(false)}
          onNavigate={onNavigate}
          isActive={isActive}
        />
      ) : (
        <CustomizerSidebar
          open={drawerOpen}
          collapsed={panelCollapsed}
          onToggleCollapse={() => setPanelCollapsed((v) => !v)}
          customTheme={customTheme}
          setCustomTheme={setCustomTheme}
          isPublishing={isPublishing}
          publishSuccess={publishSuccess}
          onPublish={onPublish}
          onBack={onBack}
          onResetDefaults={onResetDefaults}
          onRemoveLogo={onRemoveLogo}
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Sticky mobile top bar (<768px): hamburger opens the drawer */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-slate-700/60 bg-slate-900 px-2 py-2 text-white shadow-lg md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            aria-controls="gs-sidebar"
            className="rounded-lg p-2 text-slate-200 transition hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Menu size={20} />
          </button>
          <span className="flex items-center gap-2 text-sm font-bold">
            <IconStore size={18} className="text-blue-400" />
            DiDwa
          </span>
          {/* The rail's Publish button is off-canvas on a phone, so the
              mobile bar carries its own copy. */}
          {isCustomizerOpen && (
            <button
              type="button"
              onClick={onPublish}
              disabled={isPublishing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-60"
              aria-live="polite"
            >
              {isPublishing ? (
                <Loader2 size={13} className="animate-spin" />
              ) : publishSuccess ? (
                <Check size={13} />
              ) : null}
              {isPublishing ? 'Saving' : publishSuccess ? 'Saved' : 'Publish'}
            </button>
          )}
        </header>
        {children}
      </main>

      {/* Unsaved-changes prompt. Rendered at the shell level so it covers the
          customizer rail and the dashboard content alike. */}
      <UnsavedChangesDialog
        open={guard.pending}
        leaving={guard.leaving}
        onSave={() => guard.resolveLeave('save')}
        onDiscard={() => guard.resolveLeave('discard')}
        onStay={() => guard.resolveLeave('stay')}
      />
    </div>
  );
}