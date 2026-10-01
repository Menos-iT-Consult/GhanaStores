/**
 * guide/sections.jsx
 * All Developer Guide copy, as data.
 *
 * Kept out of the page component for two reasons: the page stays a small piece
 * of layout with no prose in it, and the content can be reviewed (and
 * translated) as text rather than as JSX.
 *
 * EVERY factual claim here is verified against the code it describes. Where the
 * platform's behaviour has changed, the guide must change with it -
 * scripts/developerGuideTest.js asserts the current DNS guidance so a future
 * change cannot leave the guide quietly wrong.
 *
 * STRICT RULE: pure SVG / Lucide React icons ONLY - zero emojis.
 */
import { Store, ImageIcon, Package, Wallet, Receipt, Globe, ScanLine, LifeBuoy } from 'lucide-react';
import { Callout, Checklist, CodeBlock, FieldTable, Step } from './GuideUI.jsx';

/**
 * Section metadata only. The bodies are resolved by buildSections() because
 * several of them need live store state, which a module-level constant cannot
 * depend on.
 */
export const SECTION_META = [
  { id: 'quick-start', label: 'Quick start',      icon: Store },
  { id: 'store-setup', label: 'Store setup',      icon: ImageIcon },
  { id: 'products',    label: 'Products & stock', icon: Package },
  { id: 'payments',    label: 'Payments',         icon: Wallet },
  { id: 'orders',      label: 'Orders',           icon: Receipt },
  { id: 'domains',     label: 'Domains',          icon: Globe },
  { id: 'pos',         label: 'POS terminal',     icon: ScanLine },
  { id: 'help',        label: 'Getting help',     icon: LifeBuoy },
];

/* ==========================================================================
 * Quick start
 * ========================================================================== */

/** The six things that get a store trading. `done` comes from the page. */
export function quickStartItems(ctx) {
  return [
    {
      done: ctx.productCount > 0,
      label: 'Add your first product',
      hint: ctx.productCount > 0
        ? `${ctx.productCount} product${ctx.productCount === 1 ? '' : 's'} live`
        : 'Nothing sells until the catalogue is not empty',
    },
    {
      done: Boolean(ctx.hasTheme),
      label: 'Choose a theme',
      hint: ctx.hasTheme ? 'Your storefront theme is applied' : 'Pick a template from the Theme Market',
    },
    {
      done: Boolean(ctx.hasLogo),
      label: 'Upload your logo',
      hint: ctx.hasLogo
        ? 'Appears in your storefront header and browser tab'
        : 'Optional, but it is what customers see first',
    },
    {
      done: ctx.gatewayConfigured,
      label: 'Set up how you get paid',
      hint: ctx.gatewayConfigured
        ? `Customers pay by ${ctx.gatewayLabel}`
        : 'Card or Mobile Money needs your own gateway keys',
    },
    {
      done: Boolean(ctx.storefrontUrl),
      label: 'Share your storefront link',
      hint: ctx.storefrontUrl
        ? 'Your free address is ready to send on WhatsApp'
        : 'You get one automatically at sign-up',
    },
    {
      done: Boolean(ctx.customDomain),
      label: 'Connect your own domain (optional)',
      hint: ctx.customDomain
        ? `Live on ${ctx.customDomain}`
        : 'Skip this - your free address works fine to start',
    },
  ];
}

export const QuickStart = ({ ctx }) => (
  <>
    <p>
      Work down this list in order. The first four are the difference between a
      shop that can take money and one that cannot.
    </p>
    <Checklist items={quickStartItems(ctx)} />
    <Callout tone="info" title="Nothing here is permanent">
      Every setting can be changed later without losing orders or customers, so
      start with something reasonable rather than trying to get it perfect
      first.
    </Callout>
  </>
);

/* ==========================================================================
 * Store setup
 * ========================================================================== */

export const StoreSetup = () => (
  <>
    <ol className="space-y-4">
      <Step n={1} title="Upload your logo">
        <p>
          Go to <strong>Theme Market</strong>, then <strong>Customize</strong>, and
          open <strong>Identity &amp; Tagline</strong>. Drop in a square image and
          it is used everywhere at once: your storefront header, your WhatsApp
          share preview, and the icon in your customers&apos; browser tabs.
        </p>
        <p>Square images work best. JPEG, PNG, WebP or AVIF, up to 5MB.</p>
      </Step>

      <Step n={2} title="Name your shop">
        <p>
          The same panel sets your store name and tagline. The name is what your
          customers see in the header and in their browser tab title.
        </p>
      </Step>

      <Step n={3} title="Design the rest">
        <p>
          The customizer is a WordPress-style panel. Every change appears
          immediately in the preview beside it, and nothing goes live until you
          press <strong>Publish</strong>. If you try to leave with unpublished
          changes, DiDwa asks whether to save or discard them first.
        </p>
        <p>
          Colours, fonts, corner rounding, the header and footer, and all your
          page content (home, shop, cart, contact, about) are editable there.
        </p>
      </Step>
    </ol>

    <Callout tone="info" title="Changing your logo later">
      You can replace or remove your logo from the same panel. Removing it also
      clears your browser tab icon and falls back to the default DiDwa mark.
    </Callout>

    <Callout tone="warn" title="Switching templates keeps your logo">
      Your logo is stored on your store, not on the theme, so buying or changing
      your theme never blanks it.
    </Callout>
  </>
);


/* ==========================================================================
 * Products & stock
 * ========================================================================== */

export const Products = () => (
  <>
    <ol className="space-y-4">
      <Step n={1} title="Add a product">
        <p>
          Go to <strong>Inventory</strong> and add a product with a name,
          description, price and photo. A clear photo on a plain background
          sells considerably better than a phone snapshot.
        </p>
      </Step>
      <Step n={2} title="Add options as variants">
        <p>
          If a product comes in sizes or colours, add them as variants rather
          than as separate products. Each variant carries its own stock, so you
          can sell a medium while the large is out.
        </p>
      </Step>
      <Step n={3} title="Watch your low-stock alerts">
        <p>
          Set a low-stock threshold per product. DiDwa warns you by SMS as stock
          runs down, so a popular product does not quietly sell out.
        </p>
      </Step>
    </ol>

    <Callout tone="info" title="Prices after a product is live">
      Editing a product changes the price new customers pay from then on.
      Orders already placed keep the price they were charged, so your records
      stay accurate - but tell your customers when a price goes up.
    </Callout>
  </>
);


/* ==========================================================================
 * Payments
 * ========================================================================== */

export const Payments = ({ ctx }) => (
  <>
    <p>
      Go to <strong>Payments</strong> in the sidebar. DiDwa charges through your
      own gateway account - you paste your own keys, and money goes from your
      customer straight into your account. DiDwa never holds your funds.
    </p>

    <FieldTable
      head={['Method', 'What you need', 'What you do']}
      rows={[
        ['Cash on Delivery', 'Nothing', 'The customer pays the rider. Always available.'],
        ['Card (Paystack)', 'A Paystack account', 'Paste your public and secret keys, then press Test connection.'],
        ['Mobile Money (Hubtel)', 'A Hubtel merchant account', 'Paste your client ID, client secret and merchant account ID.'],
      ]}
    />

    <Callout tone="warn" title="Press Test connection before you save">
      DiDwa checks your keys against the gateway before saving them. A typo
      caught here is a five-second fix; a typo saved straight to a live store
      means your customers cannot pay.
    </Callout>

    <Callout tone="info" title="Once saved, a key cannot be read back">
      For security, keys are write-only. DiDwa shows a masked version such as
      sk_live_...4f2a and never returns the real key. To change one, type a new
      one - leaving the field blank keeps the key you already have.
    </Callout>

    <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
      Which rail your customers see
    </h3>
    <p>
      You pick one active method under Payments, and your storefront shows that
      one only - there is no payment picker for your customers to get wrong.
    </p>
    <p>
      {ctx.gatewayConfigured
        ? <>Yours is currently set to <strong>{ctx.gatewayLabel}</strong>.</>
        : <>Yours is currently <strong>Cash on Delivery</strong>, which needs no keys.</>}
    </p>

    <Callout tone="info" title="Mobile Money charges are not retried">
      A customer approving a Mobile Money prompt is a one-time event. If they
      dismiss it or it does not complete, DiDwa does not silently charge them
      again - they try again, or you collect the balance on delivery.
    </Callout>
  </>
);


/* ==========================================================================
 * Orders
 * ========================================================================== */

export const Orders = () => (
  <>
    <ol className="space-y-4">
      <Step n={1} title="Orders arrive in one place">
        <p>
          Storefront checkouts and WhatsApp orders both land in{' '}
          <strong>Orders</strong>. Each one shows what was bought, who it is for,
          and how the customer is paying.
        </p>
      </Step>
      <Step n={2} title="Move an order along">
        <p>
          Orders move through <strong>Pending</strong>, then <strong>Paid</strong>,
          then <strong>Fulfilled</strong> and <strong>Delivered</strong>.
          Marking an order paid also credits your wallet and awards the customer
          their loyalty points.
        </p>
      </Step>
      <Step n={3} title="Print or share the receipt">
        <p>
          Every order produces a PDF receipt with a verification code, which you
          can send to the customer on WhatsApp.
        </p>
      </Step>
    </ol>

    <Callout tone="info" title="Cancelling restocks automatically">
      Cancelling an order puts its units back into your inventory, so a
      cancelled order never leaves phantom stock you cannot sell.
    </Callout>

    <Callout tone="info" title="Refunds are yours to make">
      DiDwa does not hold customer money, so it cannot reverse a card or Mobile
      Money payment for you. Issue the refund from your gateway dashboard, then
      cancel the order here so your stock and records stay correct.
    </Callout>
  </>
);


/* ==========================================================================
 * Domains
 * ========================================================================== */

/**
 * The DNS table. Both rows are CNAMEs to the same target, and there is
 * deliberately no A row: an A record pointing at a Cloudflare edge address is
 * refused with Error 1000 ("DNS points to prohibited IP"), which is the single
 * most common way this goes wrong.
 */
export const DNS_ROWS = [
  ['@', 'CNAME', 'the target shown on your Domains page'],
  ['www', 'CNAME', 'the same target as @'],
];

export const Domains = ({ ctx }) => (
  <>
    <p>
      You get a free storefront address automatically when you sign up, and it
      works immediately. Connect a domain you already own only if you want a
      branded address instead.
    </p>

    {ctx.storefrontUrl ? (
      <CodeBlock label="Your free storefront address">{ctx.storefrontUrl}</CodeBlock>
    ) : null}

    <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
      Connecting a domain you own
    </h3>
    <ol className="space-y-4">
      <Step n={1} title="Open Domains and choose Connect Existing Domain">
        <p>
          Enter the domain you want to connect. You can also buy a new domain
          from the <strong>Buy New Domain</strong> tab.
        </p>
      </Step>
      <Step n={2} title="Create both DNS records at your registrar">
        <p>
          Log in wherever you bought the domain (GoDaddy, Namecheap, Hostinger
          and so on), open its DNS settings, and add <strong>two</strong> records.
          Your Domains page shows the exact target - copy it rather than typing
          it, so you cannot introduce a typo.
        </p>
        <FieldTable
          head={['Host', 'Type', 'Points to']}
          rows={DNS_ROWS.map(([host, type]) => [host, type, ctx.dnsTarget || 'your Domains page target'])}
        />
        <Callout tone="danger" title="Both records are required">
          Setting only <code>www</code>, or only <code>@</code>, is the usual
          cause of a domain that looks connected but never loads. Set both.
        </Callout>
      </Step>
      <Step n={3} title="Wait, then check back">
        <p>
          DNS changes can take a few minutes to a few hours to spread. Your
          Domains page keeps checking and tells you when it is live.
        </p>
      </Step>
      <Step n={4} title="Your certificate is issued automatically">
        <p>
          Once the records resolve, your secure <code>https</code> certificate
          is provisioned for you. Nothing to buy and nothing to install.
        </p>
      </Step>
    </ol>

    <Callout tone="warn" title="If your registrar will not allow a root CNAME">
      Some registrars refuse a CNAME on the root <code>@</code> record. Create
      it as an <strong>ALIAS</strong> or <strong>ANAME</strong> instead - the
      result is identical, and that is the only supported workaround.
    </Callout>

    <Callout tone="danger" title="Do not create an A record">
      Pointing an A record at a Cloudflare address is refused by Cloudflare with
      Error 1000, and your store will not load. Only ever create CNAME (or
      ALIAS/ANAME) records.
    </Callout>
  </>
);


/* ==========================================================================
 * POS terminal
 * ========================================================================== */

export const Pos = () => (
  <>
    <p>
      The <strong>POS Terminal</strong> is for selling to someone standing in
      front of you, without making them wait on a payment prompt.
    </p>
    <ol className="space-y-4">
      <Step n={1} title="Ring up the sale">
        <p>
          Search for the product, set the quantity, and the order total is
          calculated for you.
        </p>
      </Step>
      <Step n={2} title="Take the money">
        <p>
          A cash sale is recorded immediately - there is nothing to confirm with
          a gateway, because nobody is being charged online.
        </p>
      </Step>
      <Step n={3} title="Reconcile deliveries later">
        <p>
          Cash-on-delivery sales taken by riders appear in the same order list as
          your online ones, so you can mark them paid when the money is in.
        </p>
      </Step>
    </ol>

    <Callout tone="info" title="Cash sales still reduce your stock">
      A POS sale is a real sale. Stock comes off, and the sale shows up in your
      analytics and your day's takings like any other order.
    </Callout>

    <Callout tone="warn" title="Mobile Money is not retried">
      If a Mobile Money payment does not complete, the customer has to approve a
      fresh prompt. DiDwa never charges the same customer twice on the
      assumption that the first attempt was simply slow.
    </Callout>
  </>
);

/* ==========================================================================
 * Getting help
 * ========================================================================== */

export const Help = () => (
  <>
    <p>
      If something here does not match what you see, or your store is behaving
      strangely, get in touch and include the details below - they turn a long
      conversation into a one-line fix.
    </p>

    <FieldTable
      head={['Include', 'Example']}
      rows={[
        ['Your storefront address', 'https://yourstore.didwaghana.com'],
        ['The order number, if it is about an order', 'e.g. #1042'],
        ['What you did, and what you expected', '"Pressed Publish, the colour did not change"'],
        ['A screenshot', 'Usually the fastest route to a fix'],
      ]}
    />

    <Callout tone="info" title="Most payment problems are one of three things">
      A key saved with a typo, a payment still waiting on the customer, or a
      gateway that is fine but briefly unreachable. Press <strong>Test
      connection</strong> in Payments to rule out the first of those quickly.
    </Callout>
  </>
);

/* ==========================================================================
 * Registry
 * ========================================================================== */

/**
 * The renderable sections, in order, keyed by the ids in SECTION_META.
 *
 * A function rather than a constant because every body needs the merchant's
 * live store state.
 */
export function buildSections(ctx) {
  return [
    { id: 'quick-start', body: <QuickStart ctx={ctx} /> },
    { id: 'store-setup', body: <StoreSetup /> },
    { id: 'products',    body: <Products /> },
    { id: 'payments',    body: <Payments ctx={ctx} /> },
    { id: 'orders',      body: <Orders /> },
    { id: 'domains',     body: <Domains ctx={ctx} /> },
    { id: 'pos',         body: <Pos /> },
    { id: 'help',        body: <Help /> },
  ];
}


export { Callout, Checklist, CodeBlock, FieldTable, Step };