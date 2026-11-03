# DiDwa: Seller App (React Native + Expo)

Mobile companion for DiDwa merchants — an offline-capable POS register, order
fulfilment, catalog management with image uploads, and a KPI command centre,
with push alerts for new orders. Built with **Expo Router**,
**TypeScript**, **React Query**, **Axios**, **React Native Paper**, and
**Expo Notifications**. Deployed to the App Store & Play Store via **EAS**.

> This is a standalone Expo project in `mobile/`; it is **not** part of the
> Vercel backend build. It talks to the DiDwa API directly.

## Structure

```
app/
  _layout.tsx                 providers (Paper, React Query, Auth) + push deep-links
  +not-found.tsx
  (auth)/login.tsx            email/password + 2FA code step
  (tabs)/_layout.tsx          bottom tabs
    dashboard/index.tsx       today's revenue, pending orders, quick actions
    orders/index.tsx          order list, status tabs (All/Pending/Processing/Delivered)
    orders/[id].tsx           order detail, line items, Call/WhatsApp, status update, share receipt (PDF)
    pos/index.tsx             offline-first register: cart, loyalty, cash/MoMo, outbox sync
    products/index.tsx        catalog list, stock toggle (optimistic), add-product FAB
    products/[id].tsx         create/edit product, image upload, per-option stock adjust
    customers/index.tsx       loyalty book: search, points, call/WhatsApp
  settings/                   (stack, gear icon on Dashboard)
    index.tsx                 store info, per-device push controls, sign out
    profile.tsx               storefront details, logo, verified account contacts
    store.tsx                 password, two-factor, subscription, account deletion
    payments.tsx              Paystack/Hubtel keys + Cash on Delivery
src/
  api/client.ts               axios + Bearer header + single-flight token refresh
  api/endpoints.ts            typed API calls
  auth/AuthProvider.tsx       session state (tokens in SecureStore)
  offline/catalog.ts          cached catalog for offline POS
  offline/posOutbox.ts        offline sale queue + idempotent reconnect flush
  offline/usePosSync.ts       NetInfo + outbox state hook
  components/                 StatCard, StatusBadge, Skeleton, SectionHeader, ScreenState
  services/pushNotifications.ts  permissions, token, register/unregister, deep-links
  theme.ts                    Paper MD3 theme (#0066FF / #1E293B / #F8FAFC)
```

## Backend it calls

All routes live under `/api/mobile` on the DiDwa API (see `routes/mobile*`,
`services/pushService.js` in the parent repo):

- `POST /api/mobile/auth/login`, `/login/2fa`, `/refresh`, `/logout`
- `POST /api/mobile/devices/register`, `DELETE /api/mobile/devices/unregister`
- `GET/PUT /api/mobile/devices/preferences` (per-device alert categories)
- `GET  /api/mobile/v1/dashboard/stats`
- `GET  /api/mobile/v1/orders`, `GET /api/mobile/v1/orders/:id`, `PATCH .../status`, `GET .../:id/receipt`
- `GET  /api/mobile/v1/products`, `PATCH .../:id/stock`, `PATCH .../:id/price`
- `GET /api/ai/products`, `POST /api/ai/gateway` (verified sellers only; same four system-generated actions as the web dashboard)
- `GET/POST /api/mobile/v1/settings/payment-keys`
- **v1.1 command centre / POS / catalog** (thin adapters over the shared PWA engines):
  - `GET  /api/mobile/v1/dashboard/full`, `GET /api/mobile/v1/analytics/top`
  - `POST /api/mobile/v1/pos/sales` (idempotent via `saleId`), `GET /api/mobile/v1/pos/loyalty/:phone`
  - `POST|PUT /api/mobile/v1/products`, `PATCH /api/mobile/v1/variants/:id/stock`
  - `POST /api/mobile/v1/uploads/presign`, `POST /api/mobile/v1/uploads/confirm`
  - `GET  /api/mobile/v1/customers` (search + pagination)

## Configure

```bash
cd mobile
cp .env.example .env      # set EXPO_PUBLIC_API_URL (default https://app.didwaghana.com)
npm install
```

`EXPO_PUBLIC_API_URL` should point at the API origin (a dedicated `app.`
subdomain is recommended — the app never uses host-header tenant routing).

## Initialize EAS & Expo project (one time, interactive)

```bash
npm i -g eas-cli
eas login
eas project:info
```

The mobile app is already linked to:

- EAS owner: `didwa-seller`
- EAS project ID: `3f211281-79e1-4a80-97a8-83b1209f7f52`
- Android package: `com.didwa.seller`
- iOS bundle identifier: `com.didwa.seller`
- API origin: `https://app.didwaghana.com`

Expo push tokens require the EAS project ID and a physical device. Push
registration is not available in Android emulators or iOS simulators.

## Push notification setup

### Android / Firebase Cloud Messaging

1. Create or select the Firebase project associated with `com.didwa.seller`.
2. In Firebase Console, register an Android app with package name
   `com.didwa.seller` and download the generated service configuration only if
   needed by the native build workflow.
3. Run:

   ```bash
   cd mobile
   eas credentials --platform android
   ```

4. Choose the EAS build profile, configure Google Service Account / FCM Key,
   and upload or link the Android push credentials in EAS.
5. Build a development or preview client; Expo Go does not provide the same
   native notification behavior as a standalone development build.

   ```bash
   eas build --profile development --platform android
   ```

The app creates these Android channels after notification permission is
granted:

- `orders` - new and updated orders
- `payments` - received payments
- `stock` - low-stock alerts
- `account` - subscription, plan, and security updates

Notification channel settings can be changed by the user in Android system
Settings. The app supplies the channel descriptions and default high importance.

### iOS / Apple Push Notifications

1. Use an Apple Developer account with access to the `com.didwa.seller` app
   identifier.
2. In Apple Developer certificates, identifiers, and profiles, enable the Push
   Notifications capability for `com.didwa.seller`.
3. Run:

   ```bash
   cd mobile
   eas credentials --platform ios
   ```

4. Let EAS create or select the Apple Push Key or APNs certificate for this
   bundle identifier. Store the Apple credentials only in EAS, not in source.
5. Build and install the app on a physical iPhone:

   ```bash
   eas build --profile development --platform ios
   ```

The app requests permission explicitly from **Settings**. Foreground alerts are
enabled on iOS, and notification taps open the relevant app route.

### Register and test

1. Install the development or preview build on a physical Android or iOS
   device.
2. Sign in as a seller and open **Settings**.
3. Enable notification permission when prompted.
4. Tap **Refresh push registration** if the registration status is not
   `Registered`.
5. Tap **Send test notification**.
6. Verify the banner or lock-screen alert, notification-category preference
   behavior, and notification history.

For a full validation pass, test:

- permission granted and denied
- foreground and background delivery
- app closed and cold-start notification tap
- order, payment, stock, and account deep links
- category preference changes
- token refresh
- Android channels
- Expo device-not-registered cleanup
- reconnect behavior after the device comes back online

## Build & submit

```bash
# local dev (dev client, shakes on errors)
npm start

# typecheck
npm run typecheck

# internal testing APK / TestFlight
eas build --profile preview --platform android
eas build --profile preview --platform ios

# production: Android .aab + iOS .ipa (auto-increments build numbers)
eas build --profile production --platform all

# submit to stores
eas submit --platform android
eas submit --platform ios
```

`eas.json` defines `development` (dev client), `preview` (APK + internal), and
`production` (app-bundle/`.aab` + `.ipa`, `autoIncrement`).

## Icons / splash (before store submission)

Replace the adaptive-icon references in `app.json` with real assets:
`icon`, `splash`, `ios.icon`, `android.adaptiveIcon.foregroundImage`. The
placeholders render a solid `#0066FF` tile in the meantime.

## Onboarding & Lottie animations

First-run shows a 3-slide animated onboarding carousel
(`app/(auth)/welcome.tsx`). It plays once per install; Skip and Get Started both
mark it done (AsyncStorage key `didwa.onboarded.v1`) and route to the login
screen. To force it to show again for testing: clear the app's storage, or
uninstall/reinstall.

The placeholder animations live in `mobile/assets/lottie/`:

- `splash-animation.json` — slide 1 ("Your store, in your pocket")
- `slide-payments.json` — slide 2 ("Sell with MoMo & cash")
- `slide-growth.json` — slide 3 ("Grow with insights")

**To swap in real animations:**

1. Grab a free `.json` animation from [LottieFiles.com](https://lottiefiles.com),
   or export one from After Effects via Bodymovin.
2. Overwrite the matching file in `mobile/assets/lottie/` (keep the same
   filename — no code change needed), or add a new file and point the `source`
   in `mobile/src/onboarding/slides.ts` at it.
3. Keep files self-contained (`assets: []`, no external images) and small
   (<~150 KB). Square canvases (e.g. 400×400 @ 60fps) fit the layout best.
4. Rebuild — `lottie-react-native@6.7.0` is pinned for Expo SDK 51, so run
   `npx expo install lottie-react-native` if you ever bump the SDK.

The animation square is sized responsively (72% of the smaller screen
dimension, so it scales on phones and tablets), and the slide text reflows via
flexbox.
