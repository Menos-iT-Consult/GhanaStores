import { useEffect, useState } from 'react';
import { ArrowRight, Handshake, LoaderCircle } from 'lucide-react';
import { api } from '../api.js';
import { navigate } from '../router.js';
import MetaTags from '../components/seo/MetaTags.jsx';
import { siteUrl } from '../lib/seo.js';

export default function PartnerLandingPage({ slug }) {
  const [partner, setPartner] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get(`/api/partners/public/${encodeURIComponent(slug)}`),
      api.get(`/api/partners/attribution?code=${encodeURIComponent(slug)}`),
    ])
      .then(([result]) => { if (active) setPartner(result.partner); })
      .catch((err) => { if (active) setError(err.message || 'This partner page is unavailable.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-white">
      <MetaTags
        title="DiDwa strategic partner | DiDwa"
        description="Join a DiDwa strategic partner's merchant network."
        canonical={siteUrl(`/p/${encodeURIComponent(slug)}`)}
      />
      <section className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl backdrop-blur sm:p-14">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
          <Handshake size={26} aria-hidden="true" />
        </span>
        {loading ? (
          <LoaderCircle className="mx-auto mt-8 animate-spin text-blue-300" aria-label="Loading partner page" />
        ) : error ? (
          <p role="alert" className="mt-8 text-sm text-rose-200">{error}</p>
        ) : (
          <>
            <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.2em] text-blue-300">DiDwa strategic partner</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
              Build your business online with {partner.organizationName}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
              Start a DiDwa store through this partner's network. Get the tools to manage products,
              orders, payments, and sales from one place.
            </p>
            <button
              type="button"
              onClick={() => navigate(`/login?ref=${encodeURIComponent(partner.partnerCode)}&source=partner`)}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-blue-400"
            >
              Create your DiDwa store <ArrowRight size={16} aria-hidden="true" />
            </button>
            <p className="mt-5 text-xs text-slate-400">Partner representative: {partner.fullName}</p>
          </>
        )}
      </section>
    </main>
  );
}
