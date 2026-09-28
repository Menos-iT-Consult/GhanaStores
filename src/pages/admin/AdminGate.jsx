/**
 * DiDwa - Super admin gate.
 *
 * The old admin rendered its dashboard unconditionally: there was no sign-in
 * screen wired into the SPA at all, so an unauthenticated visitor simply saw an
 * error banner where the data should be. This gate owns the whole admin entry
 * point - it validates the stored session against GET /api/admin/me (so an
 * administrator whose access was revoked is bounced out instead of staring at
 * failed requests), shows the sign-in screen when there is no session, and maps
 * the /admin/* routes onto pages inside the AdminLayout.
 */
import { useCallback, useEffect, useState } from 'react';
import { clearAdminSession, getAdminProfile, getAdminToken, adminApi } from '../../api.js';
import { usePathname } from '../../router.js';
import AdminLayout from '../../layouts/AdminLayout.jsx';
import { LoadingBlock } from '../../components/admin/ui.jsx';

import AdminLogin from './AdminLogin.jsx';
import AdminOverview from './AdminOverview.jsx';
import AdminMerchants from './AdminMerchants.jsx';
import AdminMerchantDetail from './AdminMerchantDetail.jsx';
import AdminOrders from './AdminOrders.jsx';
import AdminCatalog from './AdminCatalog.jsx';
import AdminCustomers from './AdminCustomers.jsx';
import AdminPayments from './AdminPayments.jsx';
import AdminPayouts from './AdminPayouts.jsx';
import AdminLogistics from './AdminLogistics.jsx';
import AdminDomains from './AdminDomains.jsx';
import AdminThemes from './AdminThemes.jsx';
import AdminTeam from './AdminTeam.jsx';
import AdminSystem from './AdminSystem.jsx';
import AdminAudit from './AdminAudit.jsx';
import AdminDomainPricing from './AdminDomainPricing.jsx';

/** Static admin routes, longest-prefix match first (detail routes are dynamic). */
const ADMIN_ROUTES = [
  ['/admin/merchants/', AdminMerchantDetail],
  ['/admin/merchants', AdminMerchants],
  ['/admin/orders', AdminOrders],
  ['/admin/catalog', AdminCatalog],
  ['/admin/customers', AdminCustomers],
  ['/admin/payments', AdminPayments],
  ['/admin/payouts', AdminPayouts],
  ['/admin/logistics', AdminLogistics],
  ['/admin/domains', AdminDomains],
  ['/admin/pricing', AdminDomainPricing],
  ['/admin/themes', AdminThemes],
  ['/admin/team', AdminTeam],
  ['/admin/system', AdminSystem],
  ['/admin/audit', AdminAudit],
];

function pageFor(route) {
  for (const [prefix, Page] of ADMIN_ROUTES) {
    // The merchants detail route must match on a segment boundary so
    // /admin/merchants-anything cannot be mistaken for a merchant id.
    const matches = prefix.endsWith('/')
      ? route.startsWith(prefix)
      : route === prefix || route.startsWith(`${prefix}/`);
    if (matches) return Page;
  }
  return AdminOverview;
}

export default function AdminGate() {
  const route = usePathname();
  const [admin, setAdmin] = useState(() => (getAdminToken() ? getAdminProfile() : null));
  const [checking, setChecking] = useState(Boolean(getAdminToken()));
  const [notice, setNotice] = useState('');

  const signOut = useCallback((message) => {
    clearAdminSession();
    setAdmin(null);
    setChecking(false);
    if (message) setNotice(message);
  }, []);

  // Re-validate the token on mount: an admin revoked by another operator must
  // lose access here, not discover it through a wall of failed requests.
  useEffect(() => {
    if (!getAdminToken()) { setChecking(false); return; }
    let live = true;
    (async () => {
      try {
        const result = await adminApi.get('/api/admin/me');
        if (live) setAdmin(result.admin);
      } catch {
        if (live) signOut('Your session is no longer valid. Please sign in again.');
      } finally {
        if (live) setChecking(false);
      }
    })();
    return () => { live = false; };
  }, [signOut]);

  // The API client fires this when an admin request comes back 401, so a token
  // that expires mid-session lands on the sign-in screen straight away instead
  // of leaving every panel on screen failing one request at a time.
  useEffect(() => {
    const onExpired = () => signOut('Your session has expired. Please sign in again.');
    window.addEventListener('gs:admin-logout', onExpired);
    return () => window.removeEventListener('gs:admin-logout', onExpired);
  }, [signOut]);

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-mist"><LoadingBlock label="Verifying administrator session..." /></div>;
  }

  if (!admin) {
    return (
      <AdminLogin
        notice={notice}
        onAuthed={(profile) => { setNotice(''); setAdmin(profile); }}
      />
    );
  }

  const Page = pageFor(route);

  return (
    <AdminLayout admin={admin} onLogout={() => signOut('')}>
      <Page />
    </AdminLayout>
  );
}
