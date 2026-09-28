/**
 * Seller store profile - the store's brand mark.
 *
 * The logo lives on the STORE (stores.logo_url holds the R2 key), not on the
 * theme, so switching a storefront template never blanks it. It is mirrored
 * into the theme config for the storefront header, and serves the browser tab
 * icon via /api/domains/resolve, which is why this page previews both.
 */
import { useCallback, useEffect, useState } from 'react';
import { Globe, ImageIcon, Loader2, Store } from 'lucide-react';
import { uploadApi } from '../api.js';
import { getPlatformDomain } from '../config.js';
import ImageUploader from '../components/ImageUploader.jsx';
import SafeImage from '../components/SafeImage.jsx';
import { IconLogo } from '../components/icons.jsx';

/** A miniature browser tab, so the seller can see the icon they will get. */
function TabPreview({ faviconUrl, name }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-t-lg border border-b-0 border-slate-200 bg-slate-100 px-3 py-1.5">
      <span className="flex h-4 w-4 items-center justify-center overflow-hidden rounded-[3px] bg-white">
        {faviconUrl
          ? <SafeImage src={faviconUrl} alt="" className="h-full w-full object-cover" />
          : <IconLogo size={10} />}
      </span>
      <span className="max-w-[180px] truncate text-[11px] font-semibold text-slate-600">
        {name || 'Your store'}
      </span>
    </div>
  );
}

export default function StoreProfile() {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const platformDomain = getPlatformDomain();

  const load = useCallback(async () => {
    setError('');
    try {
      setState(await uploadApi.logo());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function remove() {
    setBusy(true);
    setError('');
    try {
      await uploadApi.removeLogo();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const storefront = state?.store?.subdomainSlug && platformDomain
    ? `https://${state.store.subdomainSlug}.${platformDomain}`
    : null;

  return (
    <>
      <header>
        <h1 className="text-xl font-extrabold tracking-tight text-charcoal">Store profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your logo appears in your storefront header and as the icon in your customers' browser tabs.
        </p>
      </header>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      ) : null}

      {!state ? (
        <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
          <Loader2 className="mr-2 animate-spin" size={18} />Loading your store...
        </div>
      ) : (
        <>
          {state.configured === false ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Image uploads are not switched on for this platform yet. Ask the DiDwa team to
              enable the media bucket, then reload this page.
            </div>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-blue-50 p-2 text-blue-600"><ImageIcon size={18} /></span>
              <div>
                <h2 className="text-sm font-extrabold text-charcoal">Store logo</h2>
                <p className="text-xs text-slate-400">{state.store?.name}</p>
              </div>
            </div>

            <div className="mt-5 max-w-lg">
              <ImageUploader
                kind="logo"
                value={state.logoUrl}
                label="Upload logo"
                hint="A square image works best. Up to 5MB, JPEG/PNG/WebP/AVIF."
                previewClass="h-28 w-28"
                onUploaded={load}
                onRemoved={state.logoUrl ? remove : null}
              />
            </div>
            {busy ? <p className="mt-2 text-xs text-slate-400">Removing your logo...</p> : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="text-sm font-extrabold text-charcoal">Where it shows up</h2>

            <div className="mt-4 space-y-5">
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Browser tab</p>
                <div className="inline-block rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <TabPreview faviconUrl={state.faviconUrl} name={state.store?.name} />
                  <div className="h-6 rounded-b-lg border border-t-0 border-slate-200 bg-white" />
                </div>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Storefront header</p>
                <div className="flex max-w-sm items-center gap-3 rounded-xl border border-slate-200 p-3">
                  {state.logoUrl
                    ? <SafeImage src={state.logoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                    : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"><IconLogo size={24} /></span>}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-charcoal">{state.store?.name || 'Your store'}</p>
                    <p className="truncate text-[11px] text-slate-400">Quality goods, delivered nationwide</p>
                  </div>
                </div>
              </div>
            </div>

            {storefront ? (
              <p className="mt-5 flex items-center gap-1.5 text-xs text-slate-400">
                <Store size={13} />
                Live at
                <a
                  href={storefront}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                >
                  <Globe size={12} />{storefront.replace(/^https?:\/\//, '')}
                </a>
              </p>
            ) : null}
          </section>
        </>
      )}
    </>
  );
}
