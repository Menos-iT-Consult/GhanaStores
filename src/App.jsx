/**
 * DiDwa web shell.
 *
 * Route map (History API router):
 *   /                         public marketing welcome page
 *   /login                    seller authentication (register / login modes)
 *   /dashboard                PWA home -> analytics
 *   /pos | /payouts | /inventory | /orders  PWA pages
 *   /dashboard/themes...      theme market / customizer / demo viewer
 *
 * Unauthenticated visitors always land on AuthScreen for any PWA route;
 * the web index stays open so merchants can discover the product first -
 * the PWA itself starts from the login page.
 */
import { useEffect, useMemo, useState } from 'react';
import { navigate, usePathname } from './router.js';
import { api, getToken, clearSession, getCachedStore } from './api.js';
import TrialBanner from './components/TrialBanner.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import AuthScreen from './pages/AuthScreen.jsx';
import WelcomePage from './pages/WelcomePage.jsx';
import { AboutPage, ContactPage, FeaturesPage, HowItWorksPage, PrivacyPage, PricingPage, TermsPage } from './pages/PublicPages.jsx';
import SellerAnalytics from './pages/SellerAnalytics.jsx';
import SellerPOS from './pages/SellerPOS.jsx';
import SellerPaymentSettings from './pages/SellerPaymentSettings.jsx';
import SellerPlan from './pages/SellerPlan.jsx';
import SellerInventory from './pages/SellerInventory.jsx';
import SellerOrders from './pages/SellerOrders.jsx';
import SellerThemeSelector from './pages/SellerThemeSelector.jsx';
import SellerThemeMarketplace from './pages/SellerThemeMarketplace.jsx';
import ThemeDemoViewer from './pages/ThemeDemoViewer.jsx';
import ThemeCustomizer from './pages/ThemeCustomizer.jsx';
import DomainManager from './pages/DomainManager.jsx';
import SellerDeveloperGuide from './pages/SellerDeveloperGuide.jsx';
import LiveStorefront from './pages/LiveStorefront.jsx';
import StorefrontFavicon from './components/StorefrontFavicon.jsx';
import AdminGate from './pages/admin/AdminGate.jsx';

import NotFoundPage from './pages/NotFoundPage.jsx';
import StoreNotFoundPage from './pages/StoreNotFoundPage.jsx';
import { isKnownRoute } from './routes.js';
import { setPlatformDomain } from './config.js';

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getToken()));
  const [store, setStore] = useState(getCachedStore());
  const [billing, setBilling] = useState(null);
  /* Preselected tab when the welcome page opens the auth screen. */
  const [authMode, setAuthMode] = useState('register');
  /* Set when the server reports the current host is a system root, which
     overrides the client-side host guess and renders the marketing site. */
  const [hostIsPlatform, setHostIsPlatform] = useState(false);
  const route = usePathname();

  /* Server-authoritative Host classification. The env var behind the
     client-side guess is baked in at build time and can be stale, so the API
     owns the final word: platform root -> marketing site, tenant -> storefront. */
  const [hostState, setHostState] = useState({
    status: 'pending', tenant: null, isPlatformRoot: false, isAdminHost: false, adminDomain: '',
  });
  /* Host reported by the storefront as having no store; only set when that
     differs from the server answer App already holds. */
  const [storeMissing, setStoreMissing] = useState('');
  const host = window.location.hostname.toLowerCase();
  const platform = String(import.meta.env.VITE_PLATFORM_DOMAIN || '').replace(/^https?:\/\//, '').split('/')[0];
  const platformHost = platform.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
  /* Hosts that must be treated as platform traffic outside production DNS
     (Vercel preview URLs, tunnels). Configured explicitly through
     VITE_PREVIEW_HOSTS as a comma separated list of suffixes - nothing is
     hardcoded, so a deployment URL is only exempt when it is opted in. */
  const previewHosts = String(import.meta.env.VITE_PREVIEW_HOSTS || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase().replace(/^\*?\.+/, ''))
    .filter(Boolean);
  const isPreviewHost = previewHosts.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  const isPlatformHost = !platformHost || host === platformHost || host === `www.${platformHost}` || host === 'localhost' || host.endsWith('.localhost') || isPreviewHost;
  // A host is tenanted only when it is a real subdomain of the platform apex.
  // Never treat "any host containing a dot" as a tenant: that misclassifies www
  // and other platform hosts, and the storefront then requests a bogus slug.
  const isPlatformSubdomain = Boolean(platformHost)
    && host.endsWith(`.${platformHost}`)
    && host !== `www.${platformHost}`
    && host !== `api.${platformHost}`;
  // A seller custom domain is not derivable from the client, so any other
  // non-platform host is offered to the storefront, which resolves it through
  // the API and renders a clean error when no store claims it.
  const isPlatformHostWithSubdomains = isPlatformHost || host === `api.${platformHost}`;
  const isTenantHost = isPlatformSubdomain
    || (!isPlatformHostWithSubdomains && host.includes('.') && host.split('.').length >= 2);

  /* The API classifies the Host header. This is the authoritative answer: the
     client-side guess above depends on a build-time env var that can be stale,
     which is how the apex domain ended up mounting a storefront. */
  useEffect(() => {
    let alive = true;
    api.get('/api/domains/resolve')
      .then((resolved) => {
        if (!alive) return;
        /* The API owns the apex: adopt it before anything renders a seller URL,
           so a stale VITE_PLATFORM_DOMAIN baked into an old bundle cannot leak
           into the dashboard, the Domains page or the legal copy. */
        setPlatformDomain(resolved?.platformDomain);
        setHostState({
          status: resolved?.tenant ? 'tenant' : (resolved?.isPlatformRoot ? 'platform' : 'unresolved'),
          tenant: resolved?.tenant || null,
          isPlatformRoot: Boolean(resolved?.isPlatformRoot),
          isAdminHost: Boolean(resolved?.isAdminHost),
          adminDomain: String(resolved?.adminDomain || ''),
        });
      })
      .catch(() => {
        if (alive) {
          setHostState({
            status: 'error', tenant: null, isPlatformRoot: false, isAdminHost: false, adminDomain: '',
          });
        }
      });
    return () => { alive = false; };
  }, []);

  /* Derived from the server answer so the apex can never be treated as a
     tenant, whatever the baked-in VITE_PLATFORM_DOMAIN says. */
  const serverSaysPlatform = hostState.status === 'platform';
  /* Refresh trial status whenever the dashboard mounts or route changes. */
  useEffect(() => {
    if (!authed) return;
    let alive = true;
    api.get('/api/billing/status')
      .then((d) => { if (alive) setBilling(d.billing); })
      .catch(() => {});
    return () => { alive = false; };
  }, [authed, route]);

  useEffect(() => {
    const onForceLogout = () => { clearSession(); setAuthed(false); setStore(null); };
    window.addEventListener('gs:logout', onForceLogout);
    return () => window.removeEventListener('gs:logout', onForceLogout);
  }, []);

  /* Signed-in sellers never sit on the auth screen. */
  useEffect(() => {
    if (authed && route === '/login') navigate('/dashboard');
  }, [authed, route]);

  /* Welcome-page CTAs open the auth screen with the right tab preselected. */
  const openAuth = (mode = 'register') => {
    setAuthMode(mode);
    navigate('/login');
  };

  /* Post-auth landing: always inside the PWA, never back on marketing. */
  function handleAuthed(nextStore) {
    setStore(nextStore);
    setAuthed(true);
    if (route !== '/dashboard') {
      navigate('/dashboard');
    }
  }

  /* ------------------ The super admin lives on its own subdomain ----------
   * admin.didwaghana.com mounts the admin app for EVERY path, so an operator
   * can land on the bare host and be taken to the dashboard. Everywhere else,
   * /admin is not an entrance at all: it redirects to the canonical admin host.
   * That is deliberate - before this, /admin rendered the admin sign-in on a
   * seller's own storefront subdomain and on the marketing site, which put a
   * fully-privileged login form in front of every visitor. */
  const isAdminRoute = route === '/admin' || route.startsWith('/admin/');
  const onAdminHost = Boolean(hostState.isAdminHost);
  const isLocalDev = host === 'localhost' || host.endsWith('.localhost');
  const adminDomain = hostState.adminDomain || `admin.${platformHost}`;
  /* On the admin host every path is the admin app; '/' means the overview. */
  const effectiveRoute = onAdminHost ? (route === '/' ? '/admin' : route) : route;

  useEffect(() => {
    // Localhost has no admin subdomain, so /admin keeps working while building.
    if (onAdminHost || isLocalDev || !isAdminRoute) return;
    if (hostState.status === 'pending' || hostState.status === 'error') return;
    window.location.replace(`https://${adminDomain}/admin`);
  }, [isAdminRoute, onAdminHost, isLocalDev, hostState.status, adminDomain]);

  const page = useMemo(() => {
    // Live demo viewer with a dynamic :templateId segment.
    if (effectiveRoute.startsWith('/dashboard/themes/demo/')) {
      const templateId = decodeURIComponent(effectiveRoute.slice('/dashboard/themes/demo/'.length));
      return templateId ? <ThemeDemoViewer templateId={templateId} /> : <SellerThemeMarketplace />;
    }
    /* The whole admin hub renders through one gate, which owns the sign-in, the
       session re-validation, the layout chrome, and the mapping of /admin/*
       (including the dynamic /admin/merchants/:id) onto a page. Matching the
       prefix here is what keeps a new admin page from needing an entry in this
       switch - it only has to exist in the route table. */
    if (effectiveRoute === '/admin' || effectiveRoute.startsWith('/admin/')) {
      return <AdminGate />;
    }
    switch (effectiveRoute) {
      case '/dashboard': return <SellerAnalytics />;
      case '/login': return null; // redirected by the effect above
      case '/pos': return <SellerPOS />;
      case '/settings/payments': return <SellerPaymentSettings />;
      case '/settings/plan': return <SellerPlan />;
      case '/inventory': return <SellerInventory />;
      case '/orders': return <SellerOrders />;
      case '/themes': return <SellerThemeSelector />;
      case '/dashboard/themes': return <SellerThemeMarketplace />;
      case '/dashboard/themes/customizer': return <ThemeCustomizer chromeless />;
      case '/domains': return <DomainManager subdomain={store?.subdomain_slug} storeId={store?.id} />;
      case '/developer-guide': return <SellerDeveloperGuide />;
      default: return <NotFoundPage authed={authed} embedded />;
    }
  }, [effectiveRoute, authed]);

  /* The admin host renders the admin app and nothing else - not the marketing
     site, and never a storefront. This sits ABOVE the tenant branch because the
     client-side guess still reads "admin" as a platform subdomain: it is a
     reserved label the API resolves to the platform, not a store. */
  if (onAdminHost) {
    if (hostState.status === 'pending') {
      return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Loading DiDwa Super Admin...</div>;
    }
    return page;
  }

  /* Public web pages - open to everyone, no dashboard chrome. The index
     (#/) plus About / Contact / Terms / Privacy stay reachable whether or
     not a seller is signed in. */
  /* Tenant storefront hosts are public and never require seller auth. The
     server has the final word: it is asked what this host is before anything
     storefront-shaped renders, so the apex/www/app/api hosts always reach the
     marketing site instead of firing a bogus /storefront/<host>/products call.
     A stale or wrong VITE_PLATFORM_DOMAIN is therefore harmless. */
  if (isTenantHost && !hostIsPlatform && !serverSaysPlatform) {
    /* Wait for the server before mounting the storefront: without this the
       apex renders a storefront for a moment and requests itself as a slug. */
    if (hostState.status === 'pending') {
      /* Deliberately no splash and no logo here. This request is what RETURNS
         the seller's logo, so any branded mark painted during this window would
         be the platform's own - the visitor would see DiDwa and then watch it
         swap to someone else's shop. A blank background for these few frames is
         strictly better than showing the wrong brand; the real splash mounts in
         LiveStorefront once the logo is in hand. */
      return <div className="min-h-screen bg-white" aria-hidden="true" />;
    }
    /* No live store owns this host - mistyped, closed or suspended address.
       Render the branded Store Not Found page, not a bare error string. */
    if (hostState.status === 'unresolved' || storeMissing) {
      return <StoreNotFoundPage host={storeMissing || host} />;
    }
    return (
      <>
        {/* The tenant's own tab icon, from the resolve payload. Mounted here
            because this is the point where the store is known to exist, and
            it renders nothing, so it cannot affect layout. */}
        <StorefrontFavicon faviconUrl={hostState.tenant?.faviconUrl} />
        <LiveStorefront
          resolvedHost={hostState}
          onPlatformHost={() => setHostIsPlatform(true)}
          onStoreNotFound={() => setStoreMissing(host)}
        />
      </>
    );
  }

  /* Unknown path: answer with a 404 and no dashboard chrome. A mistyped URL
     must never look like a login wall or silently show a dashboard page. */
  if (!isKnownRoute(route)) {
    return <NotFoundPage authed={authed} path={route} />;
  }

  const welcomeProps = {
    authed,
    onStart: openAuth,
    onDashboard: () => { navigate('/dashboard'); },
  };
  switch (route) {
    case '/': return <WelcomePage {...welcomeProps} />;
    case '/pricing': return <PricingPage authed={authed} />;
    case '/features': return <FeaturesPage authed={authed} />;
    case '/how-it-works': return <HowItWorksPage authed={authed} />;
    case '/about': return <AboutPage authed={authed} />;
    case '/contact': return <ContactPage authed={authed} />;
    case '/terms': return <TermsPage authed={authed} />;
    case '/privacy': return <PrivacyPage authed={authed} />;
    default: break;
  }

  /* PWA starts from the login page for unauthenticated visitors. */
  if (!authed) {
    return <AuthScreen key={authMode} initialMode={authMode} onAuthed={handleAuthed} />;
  }

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-6xl space-y-5 p-5 pb-16">
        <TrialBanner billing={billing} onActivated={() => {
          api.get('/api/billing/status').then((d) => setBilling(d.billing)).catch(() => {});
        }} />
        {page ?? <SellerAnalytics />}
      </div>
    </DashboardLayout>
  );
}
