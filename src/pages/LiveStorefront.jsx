/** Live tenant storefront. Uses database inventory, never demo products. */
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import {
  mergeThemeConfig,
  normalizeCustomThemeConfig,
  templateToCustomizerTokens,
} from '../theme/config.js';
import StorefrontRouter, { toDisplayProduct } from '../components/storefront/Storefront.jsx';
import { useContainerTier } from '../lib/responsive.js';
import { getPlatformDomain } from '../config.js';

const slugFromHost = () => {
  const host = window.location.hostname.toLowerCase();
  const platform = getPlatformDomain();
  if (platform && host.endsWith(`.${platform}`)) return host.slice(0, -(platform.length + 1)).split('.')[0];
  return host;
};

/**
 * Resolve the config a live storefront paints with.
 *
 * The API hands back the active template and the seller's saved overrides as
 * SEPARATE layers, because the template speaks in presets (palette, hero, seo)
 * while the storefront speaks in tokens (colors, branding, layout). Flattening
 * the two into one object loses that boundary: every template key then looks
 * unset, so the storefront silently falls back to the schema defaults and a
 * seller who activated "Midnight Noir" still sees the default green. Layer
 * order: template tokens -> seller overrides -> store identity (always last,
 * so a real store's name and WhatsApp number beat the template's placeholders).
 */
export function resolveStorefrontTheme(resolved, tenantMeta) {
  const template = resolved?.templateConfig || resolved?.theme?.config || {};
  /* A store with no active theme must keep the schema defaults. Mapping an EMPTY
     template instead would produce empty-string tokens, and those empty values
     would be injected as CSS custom properties (an invalid declaration), so the
     storefront would lose its colours rather than fall back to a safe palette. */
  const hasTemplate = Boolean(template && Object.keys(template).length);
  const tokens = hasTemplate
    ? templateToCustomizerTokens({ config: template, name: resolved?.theme?.name })
    : normalizeCustomThemeConfig({});
  /* The seller's overrides are merged RAW. Normalising them first would expand
     them into a full config, and those schema defaults would then overwrite
     every token the template just set - which is how a chosen theme ended up
     painted in the default green. */
  const merged = normalizeCustomThemeConfig(mergeThemeConfig(tokens, resolved?.overrides || {}));

  // A title the SELLER typed wins; otherwise the real store name does, so the
  // template's demo title never labels a live storefront.
  const typed = resolved?.overrides?.branding?.site_title;
  const siteTitle = (typeof typed === 'string' && typed.trim())
    || tenantMeta?.name
    || merged.branding?.site_title
    || 'My DiDwa Store';

  return {
    ...merged,
    branding: { ...merged.branding, site_title: siteTitle },
    features: {
      ...merged.features,
      ...(tenantMeta?.whatsappNumber ? { whatsapp_number: tenantMeta.whatsappNumber } : {}),
    },
  };
}

export default function LiveStorefront({ onPlatformHost = null, onStoreNotFound = null, resolvedHost = null }) {
  const [tenant, setTenant] = useState(null);
  const [products, setProducts] = useState([]);
  const [theme, setTheme] = useState(null);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  /* Which themed page is on screen, and which product the detail page shows. */
  const [page, setPage] = useState('home');
  const [productId, setProductId] = useState(null);
  // The live shop's own width, so it picks the same mobile/tablet/desktop layout
  // the customizer previews. Measured, not a media query - see the prop below.
  const container = useContainerTier();

  useEffect(() => {
    let live = true;
    // The server is authoritative about tenancy, so resolve the host FIRST and
    // only request catalogue/theme data once a tenant is confirmed. Firing all
    // three calls together let a rejected storefront-catalog request short
    // circuit Promise.all, so the isPlatformRoot branch never ran and a system
    // root rendered "Storefront not found" instead of the platform site.
    const fail = (text) => { if (live) setMessage(text); };
    (async () => {
      // App resolves the host before mounting this screen, so reuse its answer
      // instead of querying twice. A transient failure is retried here.
      const answered = Boolean(resolvedHost)
        && (resolvedHost.status === 'tenant' || resolvedHost.status === 'unresolved');
      let resolved = answered
        ? { tenant: resolvedHost.tenant, isPlatformRoot: resolvedHost.isPlatformRoot }
        : null;
      if (!resolved) {
        try {
          resolved = await api.get('/api/domains/resolve');
        } catch {
          fail('Could not reach the store. Please try again.');
          return;
        }
      }
      if (!live) return;
      // Apex / www / app / api (anything the server calls a system root) is
      // platform traffic. Hand control back so the marketing site renders; this
      // also makes a stale or missing VITE_PLATFORM_DOMAIN harmless.
      if (!resolved?.tenant) {
        if (resolved?.isPlatformRoot) { if (onPlatformHost) onPlatformHost(); return; }
        // No live store owns this host: hand off to the branded Store Not Found
        // page when the app provides one, otherwise keep the inline message.
        if (onStoreNotFound) { onStoreNotFound(); return; }
        fail('Storefront not found.');
        return;
      }
      const slug = resolved.tenant.subdomainSlug || slugFromHost();
      setTenant(resolved.tenant);
      // A missing catalogue or theme must not blank a real store: degrade to an
      // empty catalogue and the default theme instead of an error screen.
      const [catalog, themed] = await Promise.all([
        api.get(`/api/domains/storefront/${encodeURIComponent(slug)}/products`).catch(() => null),
        api.get(`/api/store/theme/public/${encodeURIComponent(slug)}`).catch(() => null),
      ]);
      if (!live) return;
      setProducts(catalog?.products || []);
      if (themed?.theme?.config || themed?.templateConfig) {
        setTheme(resolveStorefrontTheme(themed, resolved.tenant));
      }
    })();
    return () => { live = false; };
  }, []);

  const displayProducts = useMemo(() => (products || []).map(toDisplayProduct), [products]);

  /* Identity (store name, WhatsApp number) is already layered on by
     resolveStorefrontTheme, so this only supplies a default when no theme
     resolved at all. */
  const config = useMemo(() => theme || normalizeCustomThemeConfig({}), [theme]);

  function addToCart(product, variant, qty = 1) {
    const variants = product.variants || [];
    const target = variant || variants.find((v) => v.inStock) || variants[0] || null;
    const id = target ? target.id : `p-${product.id}`;
    const price = target ? Number(target.price) : Number(product.price || 0);
    const stock = target ? Number(target.stock) : Number(product.stock || 0);
    const amount = Math.max(1, Number(qty) || 1);
    setCart((current) => {
      const found = current.find((line) => line.id === id);
      if (found) {
        return current.map((line) => (line.id === id
          ? { ...line, quantity: Math.min(line.quantity + amount, line.stock || 99) }
          : line));
      }
      return [...current, { id, name: product.name, label: target?.label || '', price, img: product.img, stock, quantity: amount }];
    });
    setPage('cart');
  }

  function setLineQty(line, next) {
    setCart((current) => current.map((l) => (l.id === line.id
      ? { ...l, quantity: Math.max(1, Math.min(Number(next) || 1, l.stock || 99)) }
      : l)));
  }

  function removeLine(line) {
    setCart((current) => current.filter((l) => l.id !== line.id));
  }

  async function checkout(event) {
    event.preventDefault();
    if (!cart.length || busy) return;
    setBusy(true); setMessage('');
    try {
      const result = await api.post('/api/public/orders', {
        slug: tenant?.subdomainSlug, customer_name: customer.name,
        customer_phone: customer.phone, customer_address: customer.address,
        payment_method: 'COD', items: cart.map((line) => ({ variantId: line.id, quantity: line.quantity })),
      });
      setMessage(`Order ${result.order.orderNumber} placed successfully. We will contact you to confirm delivery.`);
      setCart([]);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  if (!tenant && !message) return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading store...</div>;
  if (!tenant) return <div className="flex min-h-screen items-center justify-center text-red-600">{message}</div>;

  return (
    <div ref={container.ref} className="min-h-screen bg-slate-50">
      <StorefrontRouter
        config={config}
        // The storefront lays itself out from its OWN width, not the window: it
        // also renders inside the fixed 375/768/1024 device frames in the theme
        // customizer, where a media query would report the host window instead.
        // Without this the live shop always took the desktop branch and showed
        // a 4-column grid on a phone.
        viewportWidth={container.width || null}
        page={page}
        onNavigate={(next, id) => { setPage(next); if (id != null) setProductId(id); }}
        products={displayProducts}
        cart={cart}
        productId={productId}
        onAddToCart={addToCart}
        onSetQty={setLineQty}
        onRemove={removeLine}
        checkout={{ customer, setCustomer, onSubmit: checkout, busy, message }}
      />
    </div>
  );
}
