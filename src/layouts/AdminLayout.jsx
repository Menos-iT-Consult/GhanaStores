/**
 * DiDwa - Super admin shell.
 *
 * The old admin was one page with three tabs, so an operator could only ever see
 * one slice of the platform. This gives every area its own route and a sidebar,
 * mirroring DashboardLayout's structure and dark-navy column so the admin area
 * is visually distinct from the seller PWA and cannot be mistaken for it.
 */
import { useEffect, useState } from 'react';
import {
  Activity, Boxes, CreditCard, Globe, LayoutDashboard, LogOut, Mail,
  Menu, MessageSquare, Palette, Receipt, ScrollText, Server, ShieldAlert, Store, Tag, Truck, Users,
} from 'lucide-react';
import { navigate, usePathname } from '../router.js';
import { cx } from '../components/admin/ui.jsx';

/** Grouped navigation - the order here is the order operators work in. */
export const ADMIN_NAV = [
  {
    group: 'Platform',
    items: [{ path: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true }],
  },
  {
    group: 'Commerce',
    items: [
      { path: '/admin/merchants', label: 'Merchants', icon: Store },
      { path: '/admin/orders', label: 'Orders', icon: Receipt },
      { path: '/admin/catalog', label: 'Catalog', icon: Boxes },
      { path: '/admin/customers', label: 'Customers', icon: Users },
    ],
  },
  {
    group: 'Money',
    items: [
      { path: '/admin/payments', label: 'Payments', icon: CreditCard },
      { path: '/admin/logistics', label: 'Logistics', icon: Truck },
    ],
  },
  {
    group: 'Configuration',
    items: [
      { path: '/admin/domains', label: 'Domains', icon: Globe },
      { path: '/admin/pricing', label: 'Domain pricing', icon: Tag },
      { path: '/admin/plans', label: 'Subscription plans', icon: CreditCard },
      { path: '/admin/sms-pricing', label: 'SMS pricing', icon: MessageSquare },
      { path: '/admin/themes', label: 'Themes', icon: Palette },
      { path: '/admin/team', label: 'Team', icon: Users },
      { path: '/admin/system', label: 'System', icon: Server },
      { path: '/admin/audit', label: 'Audit log', icon: ScrollText },
    { path: '/admin/contact', label: 'Contact inbox', icon: Mail },
    ],
  },
];

const isActive = (route, item) => (item.exact ? route === item.path : route.startsWith(item.path));

function SidebarContent({ route, onNavigate }) {
  return (
    <div className="flex h-full flex-col bg-[#0B1120] text-slate-300">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="rounded-xl bg-blue-600 p-2 text-white"><ShieldAlert size={20} /></span>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold tracking-tight text-white">DiDwa Super Admin</p>
          <p className="text-[11px] text-slate-400">Platform operations</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label="Admin navigation">
        {ADMIN_NAV.map((section) => (
          <div key={section.group}>
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">{section.group}</p>
            <div className="space-y-0.5">
              {section.items.map(({ path, label, icon: Icon, exact }) => {
                const current = isActive(route, { path, exact });
                return (
                  <button
                    key={path}
                    type="button"
                    onClick={() => onNavigate(path)}
                    aria-current={current ? 'page' : undefined}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition',
                      current ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <p className="border-t border-white/10 px-5 py-3 text-[11px] text-slate-500">
        Every action taken here is recorded in the audit log.
      </p>
    </div>
  );
}

export default function AdminLayout({ admin, onLogout, children }) {
  const route = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // A new route must close the mobile drawer, or it covers the page it opened.
  useEffect(() => { setDrawerOpen(false); }, [route]);

  const onNavigate = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-mist lg:flex">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 w-64">
          <SidebarContent route={route} onNavigate={onNavigate} />
        </div>
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-slate-950/50" />
          <div className="relative h-full w-64">
            <SidebarContent route={route} onNavigate={onNavigate} />
          </div>
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              >
                <Menu size={18} />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold tracking-tight text-charcoal">
                  {admin?.name || admin?.email || 'Administrator'}
                </p>
                <p className="truncate text-[11px] text-slate-400">Super administrator</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 sm:inline-flex">
                <Activity size={13} />Live
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <LogOut size={14} />Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
