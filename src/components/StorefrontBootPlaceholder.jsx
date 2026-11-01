import { IconStore } from './icons.jsx';

export default function StorefrontBootPlaceholder({ label = 'Opening storefront' }) {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label={label}
      className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-700"
    >
      <div className="w-full max-w-xs text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-blue-700 shadow-sm">
          <IconStore size={30} />
        </div>
        <p className="mt-5 text-base font-bold">{label}</p>
        <p className="mt-1 text-sm text-slate-500">Getting the shop ready for you...</p>
        <div className="mx-auto mt-5 h-1 w-40 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-2/5 animate-pulse rounded-full bg-blue-600" />
        </div>
      </div>
    </main>
  );
}
