# DiDwa: Seller App (React Native + Expo)

Mobile companion for DiDwa merchants — manage orders, products, and payment keys
on the go, with push alerts for new orders. Built with **Expo Router**,
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
    orders/[id].tsx           order detail, Call/WhatsApp, status update
    products/index.tsx        stock toggle (optimistic) + price quick-edit
    settings/index.tsx        store info, push opt-in, sign out
    settings/payments.tsx     Paystack/Hubtel keys + Cash on Delivery
src/
  api/client.ts               axios + Bearer header + single-flight token refresh
  api/endpoints.ts            typed API calls
  auth/AuthProvider.tsx       session state (tokens in SecureStore)
  services/pushNotifications.ts  permissions, token, register/unregister, deep-links
  theme.ts                    Paper MD3 theme (#0066FF / #1E293B / #F8FAFC)
```

## Backend it calls

All routes live under `/api/mobile` on the DiDwa API (see `routes/mobile*`,
`services/pushService.js` in the parent repo):

- `POST /api/mobile/auth/login`, `/login/2fa`, `/refresh`, `/logout`
- `POST /api/mobile/devices/register`, `DELETE /api/mobile/devices/unregister`
- `GET  /api/mobile/v1/dashboard/stats`
- `GET  /api/mobile/v1/orders`, `GET /api/mobile/v1/orders/:id`, `PATCH .../status`
- `GET  /api/mobile/v1/products`, `PATCH .../:id/stock`, `PATCH .../:id/price`
- `GET/POST /api/mobile/v1/settings/payment-keys`

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
eas login                 # GitHub / Google login both fine
eas init                  # writes your Expo username + projectId into app.json
```

`app.json` ships with `owner: REPLACE_WITH_EXPO_USERNAME` and
`extra.eas.projectId: REPLACE_WITH_EAS_PROJECT_ID` placeholders — `eas init`
fills both. **Expo push tokens only mint after a real projectId exists.**

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
