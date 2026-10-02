/**
 * SellerThemeMarketplace - WordPress-style theme discovery gallery.
 * The currently ACTIVE theme pins to the front of the grid and gets an
 * elevated, emerald-accented active card; every other template follows.
 *
 * STRICT RULE: pure SVG / Lucide icons only, ZERO emojis.
 */
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { IconCheck, IconAlert } from '../components/icons.jsx';
import { templateToCustomizerTokens, mergeThemeConfig, normalizeCustomThemeConfig } from '../theme/config.js';
import { themeGridState } from '../theme/catalogState.js';
import { ThemeThumb, ThemePreview } from '../theme/preview.jsx';
import {
  BadgeCheck, Eye, Filter, LayoutGrid, Maximize2, Palette, Search, X,
} from 'lucide-react';

const CATEGORY_LABELS = {
  fashion: 'Fashion & Apparel',
  electronics: 'Electronics & Gadgets',
  beauty: 'Beauty & Cosmetics',
  marketplace: 'General Marketplace',
  groceries: 'Groceries & Supermarket',
};

const FILTER_PILLS = [
  { key: 'popular', label: 'Popular' },
  { key: 'minimal', label: 'Minimal' },
  { key: 'fashion', label: 'Fashion' },
  { key: 'electronics', label: 'Electronics' },
  { key: 'supermarket', label: 'Supermarket' },
];

function ThemeCard({ theme, isActive, isApplying, onApply, onPreview, onCustomize, onSolo, isSolo }) {
  const cfg = theme.config || {};
  const layout = cfg.layout || {};
  const radius = cfg.borderRadius?.base || layout.productCardRounded || '0.5rem';
  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 ${
        isActive
          ? 'border-emerald-300 ring-2 ring-emerald-400/70 shadow-lg shadow-emerald-500/10'
          : 'border-slate-200'
      }`}
    >
      {/* Active theme banner strip */}
      {isActive && (
        <div className="flex items-center gap-1.5 bg-emerald-500 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
          <BadgeCheck size={12} /> {isSolo ? 'Your active theme' : 'Active theme'}
        </div>
      )}

      {/* Expandable card: collapsed shows the top of the real storefront,
          expanded (solo) reveals the whole theme at a readable scale. */}
      {isSolo ? (
        <div className="relative border-b border-slate-100">
          <ThemePreview config={cfg} />
          <button
            type="button"
            onClick={onSolo}
            aria-label="Collapse theme preview"
            className="absolute right-2.5 top-2.5 z-20 flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-bold text-charcoal shadow-md transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X size={13} /> Collapse
          </button>
        </div>
      ) : (
        <div className={`relative aspect-[16/10] overflow-hidden ${isActive ? '' : 'border-b border-slate-100'}`}>
          <ThemeThumb config={cfg} />

          {/* Hover quick-actions - keyboard reachable via focus-within */}
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-slate-900/55 opacity-0 backdrop-blur-[1.5px] transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
            <button
              type="button"
              onClick={onPreview}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-charcoal shadow-sm transition hover:bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <Eye size={14} /> Live Preview
            </button>
            <button
              type="button"
              onClick={onSolo}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-charcoal shadow-sm transition hover:bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <Maximize2 size={14} /> Expand
            </button>
            <button
              type="button"
              onClick={() => (isActive ? onCustomize(theme) : onApply(theme))}
              disabled={!isActive && isApplying}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {isApplying ? <LayoutGrid size={14} className="animate-spin" /> : isActive ? <Palette size={14} /> : <IconCheck size={14} />}
              {isApplying ? 'Applying' : isActive ? 'Customize' : 'Apply Theme'}
            </button>
          </div>

          {!isActive && isApplying && (
            <span className="absolute left-2.5 top-2.5 z-20 inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-md">
              <LayoutGrid size={11} /> Applying
            </span>
          )}
        </div>
      )}

      <div className="p-3.5">
        <h3 className="line-clamp-1 text-sm font-bold text-charcoal" title={theme.name}>{theme.name}</h3>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
            {CATEGORY_LABELS[theme.category] || theme.category}
          </span>
          {/* Real, checkable traits from the template config. The card used to
              show a hashed fake star rating and a fake review count, which
              implied social proof that does not exist. */}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            {cfg.typography?.headingFont?.split(',')[0] || 'System'} font
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            {cfg.borderRadius?.name || 'Custom'} corners
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            {layout.gridColumns || 3}-col grid
          </span>
        </div>

        {/* Expanded view gets its actions inline; the collapsed card puts them
            in the hover overlay, which is hidden while a preview is showing. */}
        {isSolo && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => (isActive ? onCustomize(theme) : onApply(theme))}
              disabled={!isActive && isApplying}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {isApplying ? <LayoutGrid size={14} className="animate-spin" /> : isActive ? <Palette size={14} /> : <IconCheck size={14} />}
              {isApplying ? 'Applying' : isActive ? 'Customize this theme' : 'Apply this theme'}
            </button>
            <button
              type="button"
              onClick={onPreview}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-charcoal transition hover:bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <Eye size={14} /> Open interactive demo
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default function SellerThemeMarketplace() {
  const [themes, setThemes] = useState([]);
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState('popular');
  const [activeId, setActiveId] = useState(null);
  /* The seller's saved customisations, re-layered over the template when the
     customizer opens so switching themes never discards their work. */
  const [overrides, setOverrides] = useState({});
  const [applyingId, setApplyingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [catalogError, setCatalogError] = useState('');
  const [loading, setLoading] = useState(true);
  /* Which card is expanded to a full, readable preview. Null = all collapsed. */
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let alive = true;
    /* The catalog is public; the seller's own active theme is not. Fetch them
       separately so a 401 on one (an expired session) can never blank the
       other - that coupling is what made an empty market impossible to tell
       apart from a failed one. */
    api.get('/api/themes')
      .then((catalog) => { if (alive) setThemes(catalog.themes || []); })
      .catch((e) => { if (alive) setCatalogError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    api.get('/api/store/theme')
      .then((mine) => {
        if (!alive) return;
        setActiveId(mine.activeThemeId || null);
        /* Kept so opening the customizer can re-layer the seller's own
           customisations over whatever template is active. */
        setOverrides(mine.overrides || {});
      })
      .catch((e) => { if (alive) setFeedback({ ok: false, msg: `Could not read your active theme: ${e.message}` }); });
    return () => { alive = false; };
  }, []);

  const visible = useMemo(() => {
    /* An expanded card is shown on its own, whatever the filters say - it is
       the theme the seller asked to look at. */
    if (expandedId) return themes.filter((t) => t.id === expandedId);
    const q = search.trim().toLowerCase();
    let list = themes.filter((t) => {
      if (!q) return true;
      return `${t.name} ${t.category}`.toLowerCase().includes(q);
    });

    if (pill === 'popular') {
      /* Was sorted by themeRating(), a hash of the id - i.e. arbitrary. Now it
         sorts on real template attributes: a hero-led layout reads as more
         feature-rich than a bare product grid, then more product columns. */
      list = [...list].sort((a, b) => {
        const score = (t) => {
          const l = t.config?.layout || {};
          return (l.heroBanner !== false ? 100 : 0) + (l.gridColumns || 0) * 5;
        };
        return score(b) - score(a) || a.name.localeCompare(b.name);
      });
    } else if (pill === 'minimal') {
      list = list.filter((t) => {
        const l = t.config?.layout || {};
        return l.cardStyle === 'minimal' || l.heroBanner === false;
      });
    } else if (pill === 'supermarket') {
      list = list.filter((t) => t.category === 'groceries');
    } else if (pill !== 'all') {
      list = list.filter((t) => t.category === pill);
    }

    /* Active theme ALWAYS pins to the front, then the rest. */
    const pinned = list.filter((t) => t.id === activeId);
    const rest = list.filter((t) => t.id !== activeId);
    return [...pinned, ...rest];
  }, [themes, search, pill, activeId]);

  const gridState = themeGridState({
    loading,
    error: catalogError,
    catalogSize: themes.length,
    visibleCount: visible.length,
  });

  async function applyTheme(theme) {
    if (applyingId) return;
    setApplyingId(theme.id);
    setFeedback(null);
    try {
      await api.put('/api/store/theme', { active_theme_id: theme.id });
      setActiveId(theme.id);
      setFeedback({ ok: true, msg: `"${theme.name}" is now your active theme.` });
    } catch (e) {
      setFeedback({ ok: false, msg: e.message });
    } finally {
      setApplyingId(null);
    }
  }

  function openDemo(theme) {
    navigate(`/dashboard/themes/demo/${encodeURIComponent(theme.id)}`);
  }

  /* Open the customizer PRE-SEEDED with the given (active) theme's config
     so it never opens with the default token schema. */
  function openCustomizer(theme) {
    /* Template tokens first, the seller's saved overrides ON TOP.
       Seeding with the template alone used to throw their customisations away:
       switching template then clicking "Customize" reset the draft to the new
       template's defaults, so colours, logo, contact details and copy all
       reverted with no warning and no undo. Same layering the storefront
       resolver uses. */
    const seeded = normalizeCustomThemeConfig(
      mergeThemeConfig(templateToCustomizerTokens(theme), overrides),
    );
    window.dispatchEvent(new CustomEvent('gs:open-customizer', { detail: seeded }));
    navigate('/dashboard/themes/customizer');
  }

  const activeTheme = themes.find((t) => t.id === activeId);
  /* Expanding one card shows that theme alone at a readable scale. Filters are
     left untouched so collapsing restores the seller's exact previous view. */
  const toggleSolo = (theme) => {
    setExpandedId((cur) => (cur === theme.id ? null : theme.id));
  };

  return (
    <div className="min-h-screen space-y-5 bg-slate-100/60 p-4 pb-16 sm:p-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 px-5 py-8 text-white sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-600/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden="true" />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-200">
              <LayoutGrid size={12} /> Theme Marketplace
            </p>
            <h1 className="mt-3 max-w-xl text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
              Give your storefront a conversion-ready look
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Preview any theme live in the sandbox, then make it yours. When a theme is active it stays pinned to the front.
            </p>
          </div>
          <button
            type="button"
            onClick={() => (activeTheme ? openCustomizer(activeTheme) : (navigate('/dashboard/themes/customizer')))}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-bold text-charcoal shadow-lg transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Palette size={13} /> Open Customizer
          </button>
        </div>

        <div className="relative mt-6 max-w-xl">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or category..."
            aria-label="Search themes"
            className="w-full rounded-xl border border-white/10 bg-white/95 py-3 pl-11 pr-4 text-sm font-medium text-charcoal shadow-lg outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </section>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter themes">
        <Filter size={15} className="mr-1 text-slate-400" aria-hidden="true" />
        {FILTER_PILLS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setPill(key)}
            aria-pressed={pill === key}
            className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              pill === key
                ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'
            }`}
          >
            {label}
          </button>
        ))}
        {activeId && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <BadgeCheck size={12} /> Active theme pinned first
          </span>
        )}
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div role="status" className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${feedback.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {feedback.ok ? <IconCheck size={16} /> : <IconAlert size={16} />}
          {feedback.msg}
          <button type="button" onClick={() => setFeedback(null)} className="ml-auto rounded p-0.5 hover:bg-black/5" aria-label="Dismiss message">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Results meta */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-slate-500" aria-live="polite">
          {gridState === 'no-catalog'
            ? 'No templates published'
            : expandedId
              ? `${visible[0]?.name || 'Theme'} — expanded preview`
              : `Showing ${visible.length} of ${themes.length} templates`}
          {!expandedId && pill !== 'popular' ? ` - ${FILTER_PILLS.find((p) => p.key === pill)?.label}` : ''}
        </p>
        {activeTheme && (
          <p className="hidden items-center gap-1.5 text-xs font-bold text-emerald-700 sm:flex">
            <BadgeCheck size={13} /> {activeTheme.name} is live on your storefront
          </p>
        )}
      </div>

      {/* Template grid - active theme first */}
      {gridState === 'loading' ? (
        <div className="flex h-64 items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white text-slate-400">
          <LayoutGrid size={22} className="animate-pulse" />
          <span className="text-sm font-medium">Loading the catalog...</span>
        </div>
      ) : gridState === 'error' ? (
        <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50 p-12 text-center">
          <IconAlert size={28} className="mx-auto text-rose-300" />
          <p className="mt-3 text-sm font-semibold text-rose-700">The theme catalog could not be loaded.</p>
          <p className="mx-auto mt-2 max-w-md text-xs text-rose-600">{catalogError}</p>
        </div>
      ) : gridState === 'no-catalog' ? (
        <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-12 text-center">
          <LayoutGrid size={28} className="mx-auto text-amber-300" />
          <p className="mt-3 text-sm font-semibold text-amber-800">No themes have been published yet.</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-amber-700">
            Templates live in the <code className="font-mono">theme_templates</code> table, which is seeded by
            {' '}<code className="font-mono">npm run db:migrate</code>. Run it once against the production
            database, then reload this page.
          </p>
        </div>
      ) : gridState === 'no-matches' ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <LayoutGrid size={28} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-500">No templates match your filters.</p>
          <button
            type="button"
            onClick={() => { setPill('popular'); setSearch(''); }}
            className="mt-3 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Reset filters
          </button>
        </div>
      ) : (
        /* One expanded card takes the full width so the whole theme is legible;
           otherwise fall back to the responsive grid. */
        <div className={expandedId ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'}>
          {visible.map((t) => (
            <ThemeCard
              key={t.id}
              theme={t}
              isActive={t.id === activeId}
              isApplying={applyingId === t.id}
              isSolo={expandedId === t.id}
              onSolo={() => toggleSolo(t)}
              onApply={applyTheme}
              onPreview={() => openDemo(t)}
              onCustomize={openCustomizer}
            />
          ))}
        </div>
      )}
    </div>
  );
}
/* __M3__ */