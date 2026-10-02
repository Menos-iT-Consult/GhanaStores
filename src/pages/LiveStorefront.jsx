/** Live tenant storefront. Uses database inventory, never demo products. */
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import {
  mergeThemeConfig,
  normalizeCustomThemeConfig,
  templateToCustomizerTokens,
} from '../theme/config.js';
import StorefrontRouter, { toDisplayProduct } from '../components/storefront/Storefront.jsx';
import StorefrontSplash from '../components/StorefrontSplash.jsx';
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
  /* Whether every boot request has settled. Distinct from `tenant`, which is
     set as soon as the host resolves - before the catalogue, theme and payment
     methods have arrived. */
  const [booted, setBooted] = useState(false);
  /* The splash has finished its minimum hold and faded out. Separate from
     `booted` because the splash outlives the data by design. */
  const [splashDone, setSplashDone] = useState(false);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [message, setMessage] = useState('');
  // Whether `message` is a failure, so the checkout form colours it red.
  const [checkoutError, setCheckoutError] = useState(false);
  const [busy, setBusy] = useState(false);
  /* Which themed page is on screen, and which product the detail page shows. */
  const [page, setPage] = useState('home');
  const [productId, setProductId] = useState(null);
  /* The seller's configured gateway, fetched from the public endpoint. Only the
     method the owner selected is offered: this is their shop, and letting a
     customer pick a different rail would contradict the setting they saved under
     /settings/payments. A store that has configured nothing falls back to COD,
     which needs no keys and is what the server reports in that case. */
  const [payMethod, setPayMethod] = useState('COD');
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
      const [catalog, themed, methods] = await Promise.all([
        api.get(`/api/domains/storefront/${encodeURIComponent(slug)}/products`).catch(() => null),
        api.get(`/api/store/theme/public/${encodeURIComponent(slug)}`).catch(() => null),
        // Never let a payment lookup failure break the shop: COD is the
        // keyless default, so a store still sells rather than showing an error.
        api.get(`/api/public/payment-methods?slug=${encodeURIComponent(slug)}`).catch(() => null),
      ]);
      if (!live) return;
      setProducts(catalog?.products || []);
      /* ALWAYS resolved, never conditionally. Two things depend on it.
       resolveStorefrontTheme already handles an absent config (it falls back to
       the schema defaults), so the old guard bought nothing and only made a
       null `theme` ambiguous: it meant both "still loading" and "this store has
       no theme". The boot splash needs those two states to be distinguishable,
       because it must not paint the default palette and then repaint it in the
       seller's colours. Setting it unconditionally makes a non-null `theme`
       mean exactly one thing: the real theme is known.
       It also fixes a store with no theme rendering the "My DiDwa Store"
       placeholder as its header, since resolveStorefrontTheme falls back to
       the real store name. */
      setTheme(resolveStorefrontTheme(themed, resolved.tenant));
      /* Trust the server's activeGateway only if it is genuinely offered: it
         validates readiness, whereas a hand-edited response naming an
         unconfigured rail would send the customer to a gateway that cannot
         charge them. */
      const active = String(methods?.activeGateway || '').toUpperCase();
      const offered = Array.isArray(methods?.methods) ? methods.methods : [];
      if (offered.includes(active)) setPayMethod(active);
      /* Every request has now settled (each one degrades to null rather than
         throwing), so the storefront is genuinely paintable. The splash waits
         for this instead of unmounting the moment `tenant` arrives, which used
         to reveal the shop with an empty product grid that then filled in. */
      if (live) setBooted(true);
    })();
    return () => { live = false; };
  }, []);

  const displayProducts = useMemo(() => (products || []).map(toDisplayProduct), [products]);

  /* The theme to paint with RIGHT NOW, preferring the copy already inlined in the
     resolve payload. That payload arrives in the same response as the logo, so
     the splash can mount in the seller's real colours immediately instead of
     waiting for /api/store/theme/public to finish - that wait was the blank
     screen ahead of the splash. When the dedicated theme request does land it
     supersedes this with the same data, so nothing repaints.
     Null only when neither source has answered, which is the one case where a
     neutral hold is correct: there is nothing to paint yet. */
  const bootTheme = useMemo(() => {
    if (theme) return theme;
    const inline = resolvedHost?.tenant?.theme;
    if (!inline) return null;
    return resolveStorefrontTheme(
      { templateConfig: inline.templateConfig, theme: { name: inline.name } },
      resolvedHost.tenant,
    );
  }, [theme, resolvedHost]);

  /* Identity (store name, WhatsApp number) is already layered on by
     resolveStorefrontTheme, so this only supplies a default when no theme
     resolved at all. */
  const config = useMemo(() => bootTheme || normalizeCustomThemeConfig({}), [bootTheme]);

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
    setBusy(true); setMessage(''); setCheckoutError(false);
    try {
      const result = await api.post('/api/public/orders', {
        slug: tenant?.subdomainSlug, customer_name: customer.name,
        customer_phone: customer.phone, customer_address: customer.address,
        // Card gateways need an email to charge; sent only when we collected one.
        customer_email: customer.email || undefined,
        payment_method: payMethod, items: cart.map((line) => ({ variantId: line.id, quantity: line.quantity })),
      });
      /* A gateway order is NOT settled yet: the customer still has to authorise
         on the provider's page and the webhook is what marks it paid. So send
         them there rather than claiming success. */
      const authUrl = result?.payment?.authorizationUrl;
      if (result?.payment?.requiresAction && authUrl) {
        window.location.assign(authUrl);
        return;
      }
      /* Reached when the gateway refused to start. The order still exists, so it
         is NOT reported as a failure that invites a duplicate - the customer is
         told what happened and can retry. */
      if (result?.payment?.requiresCharge) {
        setCheckoutError(true);
        setMessage(`Order ${result.order.orderNumber} was created but payment could not be started. Please contact the store to complete your order.`);
        setCart([]);
        return;
      }
      setMessage(`Order ${result.order.orderNumber} placed successfully. We will contact you to confirm delivery.`);
      setCart([]);
    } catch (error) { setCheckoutError(true); setMessage(error.message); }
    finally { setBusy(false); }
  }

  /* The branded boot screen, held until the catalogue, theme and payment methods
     have all settled and then released on the splash's own minimum-hold timer.
     Replaces a bare "Loading store..." string. The message check keeps a real
     failure (store not found, unreachable host) showing the error rather than an
     eternal splash. */
  if (!splashDone && !message) {
    /* Hold a neutral background only if NEITHER theme source has answered.
       Normally the resolve payload already carries the theme, so the splash
       mounts in the same paint as the logo and this branch is never taken. If
       it is, painting the default palette here would be the flash this is meant
       to prevent, so a blank - matching the one App.jsx paints during host
       resolve - is the correct thing to show. */
    if (!bootTheme) return <div className="min-h-screen bg-white" aria-hidden="true" />;
    return (
      <StorefrontSplash
        /* tenant.logoUrl is the pre-sized rendition from the resolve payload;
           the theme's branding.logo_url is the fallback for stores whose logo
           only arrives with the theme. */
        logoUrl={tenant?.logoUrl || config?.branding?.logo_url}
        /* site_title is what the storefront header itself prints, and
           resolveStorefrontTheme has already resolved it to the seller's typed
           title or the real store name - so the two cannot disagree. */
        storeName={config?.branding?.site_title || tenant?.name}
        colors={config?.colors}
        ready={booted}
        onDone={() => setSplashDone(true)}
      />
    );
  }
  /* Keyed on `splashDone` alone, NOT on `!tenant`. The splash has a safety
     timeout that releases it even when the tenant never arrives; were the
     condition to keep re-arming on a missing tenant, that release would remount
     the splash and start the whole cycle again, forever. Falling through to the
     error branch instead terminates cleanly. */
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
        checkout={{
          customer, setCustomer, onSubmit: checkout, busy, message,
          error: checkoutError, method: payMethod,
        }}
      />
    </div>
  );
}
