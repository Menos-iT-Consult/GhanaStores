# DiDwa

Multi-tenant e-commerce platform and seller Progressive Web App (PWA) built for
the Ghanaian and West African market. All money values are Ghana Cedi (GHS).

Non-technical merchants register in seconds, receive a 14-day free trial, launch
a storefront on a subdomain or custom domain, manage multi-variant inventory,
sell in-store or online, accept Mobile Money and cash, and cash out instantly
via MTN, Telecel/Vodafone or AT Money.

- `db/schema.sql` is the single canonical schema and the only SQL file in the repository.
- `npm run db:reset` is destructive and refuses to run unless `RESET_DATABASE=yes` is set.
- Apply the schema to a new Neon database, then run `npm run db:migrate` to seed the 100 theme templates.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Runtime / API | Node.js, Express.js (ESM, modular routers) |
| Database | Neon PostgreSQL (row-level multi-tenancy via `store_id`) |
| Frontend | React 18 + Vite PWA, Tailwind CSS, Recharts |
| Icons | Pure inline SVG components + Lucide-style strokes (zero emojis) |
| Payments | 2-way: MTN MoMo API first for MTN numbers (collections + disbursements, status polling), Hubtel for Telecel/AT + one-time fallback (dry-run fallback per provider) |
| SMS | Arkesel API (transactional + alerts, dry-run fallback) |
| PDF | PDFKit receipts with QR verification codes |
| Scheduler | node-cron (Africa/Accra timezone) |

## Quick Start

```bash
npm install            # install all dependencies
cp .env.example .env   # then edit values (see below)
# Fresh database (destructive):
RESET_DATABASE=yes npm run db:reset
npm run db:init        # optional: applies db/schema.sql and records its checksum (the app also self-applies)
npm run db:migrate     # add/seed the 100 theme templates
npm run db:seed        # optional demo store + catalog + orders
node server.js         # API on http://localhost:4000
npm run dev            # seller PWA on http://localhost:5173
```

Demo login after seeding: `demo@didwa.com` / `didwa1`

## Environment Variables (.env)

| Key | Purpose | Fallback behaviour |
| --- | --- | --- |
| `DATABASE_URL` | Neon/Postgres connection string | Local PG via PGHOST/PGUSER/... |
| `JWT_SECRET` | Token signing for sellers/admins | Dev default (change in production) |
| `MTN_MOMO_SUBSCRIPTION_KEY` / `MTN_MOMO_COLLECTION_USER_ID` / `MTN_MOMO_COLLECTION_API_KEY` | MTN MoMo collections + disbursements (primary for MTN numbers) | MTN dry-run mode (simulated success) |
| `MTN_MOMO_TARGET_ENVIRONMENT` | `sandbox` vs `mtn-ghana` | `sandbox` |
| `PAYMENT_FALLBACK_ENABLED` | Retry failed MTN legs once via Hubtel | `true` |
| `HUBTEL_CLIENT_ID` / `HUBTEL_CLIENT_SECRET` | Hubtel fallback + Telecel/AT traffic | Dry-run mode (simulated success) |
| `HUBTEL_MOMO_DISBURSEMENT_MERCHANT_ACCOUNT` | Payout merchant account number | Required for live payouts |
| `ARKESEL_API_KEY` | Arkesel transactional SMS | Dry-run mode (logged, not sent) |
| `RISK_THRESHOLD_GHS` | Payouts at/above this need admin review | `5000` |
| `PORT` | API port | `4000` |
| `PLATFORM_DOMAIN` | Platform apex domain for subdomains | `didwaghana.com` (falls back to `ROOT_DOMAIN`, then `didwaghana.com`) |
| `PLATFORM_URL` | Public origin for PDF/QR verification links | `https://didwaghana.com` |
| `ROOT_DOMAIN` | Apex used by the Host resolver (dev: `localhost:5173`) | `didwaghana.com` |
| `DOMAIN_FALLBACK_ORIGIN` | Cloudflare for SaaS fallback origin that sellers point **both** `@` and `www` at with a CNAME (or ALIAS/ANAME) | `fallback.<PLATFORM_DOMAIN>` (`fallback.didwaghana.com`) |
| `CNAME_TARGET` | Self-hosted / Caddy target only - no longer the record shown to sellers | Vercel project CNAME, e.g. `01c53a14e266ef4f.vercel-dns-017.com`; else `cname.<PLATFORM_DOMAIN>` |
| `VITE_PLATFORM_DOMAIN` | Browser-side apex for seller storefront URLs - **fallback only**, the API's own apex wins (see `src/config.js`) | `VITE_`-prefixed mirror of `PLATFORM_DOMAIN` (`didwaghana.com`) |
| `VITE_PREVIEW_HOSTS` | Host suffixes treated as platform traffic (preview URLs) | empty - nothing is exempt by default |
| `ENABLE_CRON` | Start the billing scheduler | `false` |
| `CLIENT_URL` | CORS origin for the PWA | `*` |

Without gateway keys the platform runs fully in dry-run: payments simulate
success, SMS is logged to the server console. Perfect for local development.

## Project Structure

```
config/database.js            Neon pool, withTransaction(), pingDb()
middleware/authMiddleware.js  JWT seller/admin guards
routes/
  billingRoutes.js            Registration, login, trial status, plans
  analyticsRoutes.js          KPIs + 6-month Recharts series
  posRoutes.js                POS sales, loyalty, rider COD reconciliation
  payoutRoutes.js             Instant MoMo cashout + admin review
  whatsappInvoiceRoutes.js    Buyer checkout, order lifecycle, PDF receipts
  inventoryRoutes.js          Products, variants, stock, low-stock SMS
  domainRoutes.js             Host resolution, custom domains, Caddy ask
services/
  mtnMomoService.js           MTN MoMo collections + disbursements (status polling)
  paymentRouter.js            2-way routing: MTN-first, one Hubtel retry on failure
  hubtelService.js            Telecel/AT traffic + Hubtel fallback leg
  smsService.js               Arkesel templates (welcome, trial, payout, stock)
  pdfService.js               PDFKit receipt with QR code
jobs/billingCron.js           Day 11 reminder / Day 14 PAST_DUE / Day 17 suspend
db/schema.sql                Single canonical schema, tables, indexes, trigger
db/applySchema.js            Automatic, idempotent schema applier (runs on first query)
scripts/dbInit.js             Manual schema applier (npm run db:init)
scripts/dbReset.js            Guarded destructive reset (npm run db:reset)
scripts/dbSeed.js             Demo data (npm run db:seed)
scripts/e2eTest.js            Full 37-assertion end-to-end suite
src/                          React PWA (pages, components, SVG icons)
public/                       manifest.webmanifest, sw.js, favicon.svg
```

## Platform Modules

| # | Module | Where | Highlights |
| --- | --- | --- | --- |
| 1 | 14-day free trial | `routes/billingRoutes.js`, `jobs/billingCron.js`, DB trigger | Auto `trial_ends_at` on register, Arkesel welcome SMS, Day 11 reminder, Day 14 PAST_DUE, Day 17 suspend |
| 2 | Analytics & loyalty | `routes/analyticsRoutes.js`, `src/pages/SellerAnalytics.jsx`, `LoyaltyCheckout.jsx` | Revenue/AOV/paid-orders KPIs, 6-month Recharts trend, points per GHS with checkout redemption |
| 3 | Instant payouts | `routes/payoutRoutes.js`, `paymentRouter.js`, `mtnMomoService.js`, `hubtelService.js` | `available_balance` vs `pending_balance`, `SELECT ... FOR UPDATE` locking, MTN-first disbursement under GHS 5,000 with one Hubtel retry on failure, `provider`/`fallback_used` recorded per payout, admin review above |
| 4 | Offline POS & COD | `routes/posRoutes.js`, `SellerPOS.jsx`, `POSCart.jsx` | Cash/MoMo register sales (MoMo collections are MTN-first with Hubtel fallback), atomic stock decrement, Rider Transit Balance with one-click reconciliation |
| 5 | WhatsApp & PDF invoices | `routes/whatsappInvoiceRoutes.js`, `pdfService.js` | Cart-to-`wa.me` structured payload, stock reservation, cancel-restock, PDFKit receipts with QR verification tokens |
| 6 | Variants & low-stock SMS | `routes/inventoryRoutes.js`, `SellerInventory.jsx` | Multi-option variants (size/colour/SKU), custom thresholds, alert latch prevents duplicate SMS, re-arms after restock |
| 7 | Domains & SSL | `routes/domainRoutes.js` | Host-header tenant resolution (`custom_domain` or `subdomain_slug`), CNAME instructions, Caddy on-demand TLS `/api/domains/caddy-ask` |

## API Surface

```
POST   /api/billing/register          Register store (trial auto-starts)
POST   /api/billing/login             Seller login -> JWT
GET    /api/billing/status            Trial countdown + lifecycle state
GET    /api/analytics/dashboard       KPIs, monthlyTrend, recentOrders, operations
GET    /api/pos/loyalty/:phone        Points balance + redeemable GHS value
POST   /api/pos/sales                 Log POS sale (CASH/MOMO) - decrements stock
POST   /api/pos/riders/dispatch       Hand COD orders to a rider
POST   /api/pos/riders/:id/reconcile  Move transit cash into wallet
GET    /api/payouts/summary           Wallet balances + payout stats
POST   /api/payouts/request           Instant MoMo cashout (row-locked)
POST   /api/orders/storefront/checkout Buyer cart -> order + WhatsApp deep link
PATCH  /api/orders/:id/status         PAID (wallet+loyalty) / CANCELLED (restock)
GET    /api/orders/:id/receipt        PDF receipt (seller JWT or ?token= HMAC share link)
GET    /api/inventory/products        Catalog with variants
PATCH  /api/inventory/variants/:id/stock  Adjust stock (delta or absolute)
GET    /api/inventory/low-stock       Below-threshold report
GET    /api/domains/my                Subdomain, custom domain, DNS + Caddyfile
PUT    /api/domains/my                Attach/remove custom domain
GET    /api/domains/caddy-ask?domain= On-demand TLS gate for Caddy
GET    /health                        Liveness + DB connectivity probe
```

All seller/admin routes require `Authorization: Bearer <jwt>`. Every query is
scoped by `store_id` from the token - cross-tenant reads are impossible by
construction (verified in the e2e suite).

## Testing

```bash
node scripts/e2eTest.js     # 37 assertions across all 7 modules
node scripts/routeTest.js   # 44 route-table assertions (no server, no DB)
npm run test:uploads        # storage guards, signed-URL contract, bucket CORS policy
npm run test:domain-dns     # the DNS records sellers are told to create (no A records)
npm run r2:cors             # live R2 probe: bucket policy + browser preflight + PUT
```

The suite registers two fresh stores and asserts: trial trigger + welcome SMS,
catalog creation, POS sale with loyalty redemption, oversell rejection (409),
instant payout with balance debit, large-payout review queue, WhatsApp checkout
to PAID with wallet credit, cancellation restock, PDF receipt magic bytes,
custom-domain attach plus Caddy ask 204/403, and strict tenant isolation.

## Production Notes

- **Vercel + Cloudflare (current setup):** `didwaghana.com`, `www` and
  `*.didwaghana.com` are added to the Vercel project, while the zone stays on
  Cloudflare with the wildcard proxied. The Vercel wildcard entry is mandatory:
  without it every storefront subdomain fails with Cloudflare error 525.
  See "Domain, DNS and customer domains" below for the record table.
- **Self-hosted alternative:** serve the API behind Caddy with
  `on_demand_tls { ask ... }` pointed at `/api/domains/caddy-ask`; wildcard
  `*.didwaghana.com` plus per-store custom domains then receive certificates
  automatically.
- Set `ENABLE_CRON=true` on exactly one instance so billing jobs run once.
  On Vercel this is unnecessary - the platform Cron hits `/api/cron/billing`.
- `CRON_SECRET` must be set in production. Without it Vercel sends no auth
  header *and* the handler skips verification, so `/api/cron/billing` becomes a
  public endpoint that can trigger the whole billing cycle on demand.
- Swap the dry-run gateway modes for live keys in `.env` when ready
  (MTN MoMo for MTN numbers, Hubtel for Telecel/AT + fallback);
  no code changes are needed.

## Deploy on Vercel

The repo ships with Vercel configuration in place - no scaffolding needed:

| Concern | File / mechanism |
| --- | --- |
| Frontend (PWA) | `npm run build` emits `dist/`, served from Vercel's edge |
| Backend (Express) | `api/index.js` wraps the whole modular app in one Node function |
| API routing | `vercel.json` rewrites `/api/(.*)` and `/health` to that function |
| SPA fallback | `/(.*)` rewrites to `/index.html`; static assets in `dist/` win first |
| Billing cron | Vercel Cron calls `/api/cron/billing` daily (`0 8 * * *` per `vercel.json` - Vercel Cron is always UTC and Ghana is GMT+0, so this fires at 08:00 Accra; `ENABLE_CRON=true` only matters when self-hosting) |
| DB pool | `config/database.js` auto-tunes for Vercel (`PGPOOL_MAX=3`, smaller gateway timeouts) |

### 1. Push the repo to GitHub and import it in Vercel

Vercel auto-detects the framework (Other), the build command (`npm run build`)
and the output directory (`dist`). No code changes required.

### 2. Set environment variables (Project Settings -> Environment Variables)

| Key | Value |
| --- | --- |
| `DATABASE_URL` | **Neon pooled** connection string (`-pooler`) so many serverless instances share the connection budget |
| `JWT_SECRET` | Long random string (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `CRON_SECRET` | Long random string - Vercel sends it as `Authorization: Bearer` on cron hits |
| `HUBTEL_CLIENT_ID` / `HUBTEL_CLIENT_SECRET` / `HUBTEL_MERCHANT_ACCOUNT` | Live MoMo keys (omit to stay in dry-run) |
| `MTN_MOMO_SUBSCRIPTION_KEY` / `MTN_MOMO_COLLECTION_USER_ID` / `MTN_MOMO_COLLECTION_API_KEY` | Live MTN MoMo keys (omit to keep MTN in dry-run) |
| `MTN_MOMO_TARGET_ENVIRONMENT` | `sandbox` for testing, `mtn-ghana` for live traffic |
| `ARKESEL_API_KEY` | Live SMS key (omit to stay in dry-run) |
| `PLATFORM_DOMAIN` | Platform apex domain, `didwaghana.com` (no protocol). Falls back to `ROOT_DOMAIN`, then to `didwaghana.com`, so a missing value never declassifies the apex |
| `VITE_PLATFORM_DOMAIN` | Same value. Baked into the bundle at build time, so redeploy after changing it. It is only the fallback: the client adopts the apex reported by `GET /api/domains/resolve`, so a stale value here can no longer show a wrong storefront URL in the dashboard |
| `VITE_PREVIEW_HOSTS` | Optional comma separated host suffixes treated as platform traffic (e.g. `vercel.app` on Preview deployments); those hosts render the marketing site instead of a storefront |
| `PLATFORM_URL` | `https://didwaghana.com` (used for PDF verification links) |
| `ROOT_DOMAIN` | `didwaghana.com` (apex used by the Host-header resolver) |
| `CNAME_TARGET` | The project-specific CNAME from your Vercel domain card - only for self-hosted/Caddy setups |
| `DOMAIN_FALLBACK_ORIGIN` | The Cloudflare for SaaS fallback origin shown to sellers in the DNS table (`fallback.didwaghana.com`). Add it to the Vercel project domains if you self-host, or leave it unset to derive it from `PLATFORM_DOMAIN` |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` | Cloudflare R2 credentials + bucket (`didwa-media`) for seller photos and store logos. The access key can stay Object Read & Write; the bucket CORS policy is applied separately, see "Media uploads (Cloudflare R2)" below |
| `R2_PUBLIC_URL` | The bucket's public custom domain, `https://media.didwaghana.com`. Must be Cloudflare-proxied, because delivery goes through `/cdn-cgi/image/...`. Image Transformations must be enabled on the zone, or set `R2_IMAGE_RESIZE=off` |
| `R2_ALLOWED_ORIGINS` | Optional. Comma-separated browser origins allowed to upload, or `*` (default). `R2_CHECK_ORIGIN` picks the origin `npm run r2:cors` probes with |

### 3. Cron job & auth

`vercel.json` declares the cron under `crons: [{ path: "/api/billing/cron", schedule: "0 8 * * *" }]`.
Vercel includes `Authorization: Bearer <CRON_SECRET>` automatically **when the
`CRON_SECRET` variable exists on the project**, and the endpoint rejects
requests without the correct secret. The daily run executes the full billing
cycle: day-11 renewal reminders, day-14 `PAST_DUE`, and day-17 suspension.

### 4. Domain, DNS and customer domains (didwaghana.com on Cloudflare + Vercel)

Add the apex, `www` and the wildcard to the Vercel project (Project -> Settings ->
Domains): `didwaghana.com`, `www.didwaghana.com` and `*.didwaghana.com`. The
wildcard entry is what makes every seller subdomain resolve, so do not skip it.

Vercel issues a **project-specific CNAME** (for example
`01c53a14e266ef4f.vercel-dns-017.com`) rather than the legacy
`cname.vercel-dns.com`, and marks it as "DNS Change Recommended" until you
create the record. Copy the exact value from the Vercel domain card - it is
unique per project. Then create these records in the Cloudflare zone, all pointed
at the value Vercel gave you:

| Type | Name | Content | Proxy | Why |
| --- | --- | --- | --- | --- |
| CNAME | `@` | `01c53a14e266ef4f.vercel-dns-017.com` (your value) | Proxied | Cloudflare flattens the apex, so no A record is needed |
| CNAME | `www` | same value | Proxied | Vercel provisions the certificate |
| CNAME | `*` | same value | **Proxied (orange cloud)** | Storefront subdomains (`slug.didwaghana.com`) |

Using a CNAME at the apex is only possible because Cloudflare performs CNAME
flattening. It also means you never have to maintain Vercel's apex IPs
(`76.76.21.x`), which change without notice. If you would rather not rely on
flattening, Vercel's domain card will also show the A-record values it accepts.

Two ways to get SSL on the wildcard, and they are mutually exclusive:

- **Cloudflare proxy (recommended here).** Keep the zone's nameservers at
  Cloudflare and leave the `*` record proxied. Cloudflare Universal SSL covers
  `didwaghana.com` and `*.didwaghana.com` (one level), so storefront subdomains
  are served over HTTPS. Remove any `AAAA` records for the apex and never use
  the "Flexible" mode - it causes redirect loops against Vercel.
- **Vercel nameservers.** Vercel issues its own wildcard certificates only when
  the zone is delegated to `ns1.vercel-dns.com` / `ns2.vercel-dns.com`, because
  wildcard certificates need the DNS-01 challenge and Vercel cannot create that
  record in a zone it does not control. Domains registered through Cloudflare
  Registrar cannot change nameservers, so this needs a registrar transfer.

Origin-leg TLS is the subtle part. With external DNS Vercel cannot present a
certificate matching `slug.didwaghana.com`, so `Full (strict)` can fail with
**526**, while `Full` accepts the origin without validating it. Start with
`Full` (still encrypted), or give the wildcard a Cloudflare-for-SaaS custom
hostname whose fallback origin is `didwaghana.vercel.app` - then Cloudflare
validates a real origin certificate and `Full (strict)` works.

Notes:

- Seller custom domains are pointed at the **Cloudflare for SaaS fallback
  origin** (`DOMAIN_FALLBACK_ORIGIN`, default `fallback.<PLATFORM_DOMAIN>`), not
  at a Vercel CNAME: both `@` and `www` get a CNAME (or ALIAS/ANAME) to that
  host. An A record to a Cloudflare edge address is what produced Error 1000
  ("DNS points to prohibited IP"), so the platform emits no A record at all - see
  `npm run test:domain-dns`, which pins the table, the `/api/domains/verify`
  instructions and the accepted target together.
- The verification endpoint recognises the fallback origin, the self-hosted
  `CNAME_TARGET`, the project-scoped Vercel targets, the legacy
  `cname.vercel-dns.com`, Vercel's apex IPs and Cloudflare-proxied records, so
  verification keeps working whichever shape a merchant's registrar produces.
- The tenant resolver (`middleware/domainMiddleware.js`) maps the `Host` header
  to `stores.custom_domain` or `stores.subdomain_slug`, so storefronts work the
  same behind Cloudflare or Vercel - both preserve the `Host` header.
- The Cloudflare-for-SaaS flow in `services/domainService.js`
  (`CLOUDFLARE_ZONE_ID` + `CLOUDFLARE_API_TOKEN`) targets the real
  `didwaghana.com` zone, so keep the zone on Cloudflare if you want that
  automated custom-hostname provisioning.

### 5. Serverless caveats (already handled)

- **Balance safety** - wallet rows are locked with `SELECT ... FOR UPDATE`, and
  gateway failures are handled inside the same transaction, so double-spend is
  impossible even on concurrent invocations.
- **Timeout budget** - live Hubtel and Arkesel calls get an 8s cap inside
  Vercel (Hobby functions die at 10s), while local runs keep the full 15-25s.
- **Local manifest** - `public/sw.js` + `public/manifest.webmanifest` are
  copied verbatim into `dist/`, so the installed PWA works identically on the
  Vercel deployment URL.
- On a Pro plan you may raise the ceiling via
  `vercel.json` -> `"functions": { "api/index.js": { "maxDuration": 30 } }`.

### 6. Media uploads (Cloudflare R2)

Seller photos and store logos are uploaded straight from the browser to R2 with a
short-lived presigned PUT, so image bytes never pass through the serverless
function. Two things must be true, and only the first is a credential:

| Requirement | Why |
| --- | --- |
| An **Object Read & Write** R2 API token plus the bucket name in the env vars | The server signs the PUT and re-checks (`HeadObject`) what actually landed |
| A **CORS policy on the bucket** | The browser PUTs to `<bucket>.<account>.r2.cloudflarestorage.com`, a different origin from the storefront, so it sends an OPTIONS preflight first. R2 returns no `Access-Control-Allow-Origin` header without a bucket rule, so the PUT is never sent: the seller gets a generic upload error, the console shows `blocked by CORS policy` / `net::ERR_FAILED`, and nothing at all reaches the bucket |

The policy lives in `services/storage.js` (origins, methods and headers) and is
applied with a script, so it cannot drift from what the uploader actually sends:

```bash
npm run r2:cors -- --apply    # write the policy the app expects to R2_BUCKET
npm run r2:cors               # diagnose: preflight + real PUT/DELETE round trip
npm run r2:cors -- --show     # print the policy currently on the bucket
```

The diagnostic signs a real PUT with the same code the API uses, sends the
preflight a browser would send, performs the upload, and deletes the probe
object afterwards. If the key cannot write bucket configuration, it prints the
JSON to paste into Cloudflare dashboard -> R2 -> bucket -> Settings -> CORS
Policy instead.

`R2_ALLOWED_ORIGINS` narrows the policy (for example
`https://didwaghana.com,https://*.didwaghana.com,http://localhost:5173`); the
default is `*`. That is deliberate: the origin is not what grants write access -
a valid 15-minute presigned URL is, and one can only be obtained by a signed-in
seller - while sellers reach their dashboard through custom domains that no
fixed origin list can enumerate in advance.

Delivery is public and read-only through `media.didwaghana.com` (the bucket's
custom domain, set as `R2_PUBLIC_URL`), so one stored key serves the product
card, the hero image, the logo and the browser-tab icon:

```bash
# what services/storage.js builds for a stored key
https://media.didwaghana.com/cdn-cgi/image/width=640,height=640,fit=scale-down,quality=75,format=auto/stores/<store>/products/<id>.jpg
https://media.didwaghana.com/stores/<store>/products/<id>.jpg   # original, no options
```

Two things to know about that first URL:

- The options are `key=value`, comma separated. A colon form (`width:640`) is
  not parsed by Cloudflare and 404s - so it is asserted in `npm run test:uploads`,
  not left to chance.
- **Image Transformations must be enabled for the zone** (Cloudflare dashboard ->
  Images -> Transformations). `npm run r2:cors` checks the real rendition URL and
  says so if it 404s. If you would rather not enable it, set
  `R2_IMAGE_RESIZE=off` and delivery serves the originals instead - images keep
  working, at the cost of bandwidth.

Reads need no CORS policy (`<img>`/`<link rel="icon">` are not CORS-checked), and
the public host answers `200` with `access-control-allow-origin: *` anyway;
writes are the only half that needs the bucket rule above.

> Tip: run `npx vercel` locally for a preview deployment; every push to your
> git branch redeploys automatically.

