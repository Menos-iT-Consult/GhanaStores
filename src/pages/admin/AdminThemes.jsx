/**
 * DiDwa - Super admin theme catalog.
 *
 * The platform can curate template labels and see adoption, but it deliberately
 * cannot edit a template's `config` from here: that JSON re-renders the live
 * storefront of every merchant using the template, and changing it deserves a
 * migration rather than a dashboard form.
 */
import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../api.js';
import {
  Button, DataTable, EmptyState, ErrorBanner, Field, LoadingBlock, PageHeader, Pagination,
  Panel, PanelHeader, RefreshCw, Stacked, StatusPill, Toolbar, dateOrDash, inputClass, list,
} from '../../components/admin/ui.jsx';
import { useAdminList } from '../../components/admin/useAdminList.js';

export default function AdminThemes() {
  const themes = useAdminList('/api/admin/themes', { params: { rowsKey: 'themes' } });
  const [categories, setCategories] = useState([]);
  const [usage, setUsage] = useState([]);
  const [sideError, setSideError] = useState('');
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadSide = useCallback(async () => {
    setSideError('');
    try {
      const [cats, used] = await Promise.all([
        adminApi.get('/api/admin/themes/categories'),
        adminApi.get('/api/admin/themes/usage'),
      ]);
      setCategories(list(cats.categories));
      setUsage(list(used.merchants));
    } catch (err) {
      setSideError(err.message);
    }
  }, []);

  useEffect(() => { loadSide(); }, [loadSide]);

  function startEdit(theme) {
    setEditing(theme);
    setName(theme.name);
    setCategory(theme.category);
    setError('');
  }

  async function save() {
    setBusy(true);
    setError('');
    try {
      await adminApi.patch(`/api/admin/themes/${encodeURIComponent(editing.id)}`, { name, category });
      setEditing(null);
      await Promise.all([themes.reload(), loadSide()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const onDefault = usage.filter((row) => row.onDefaultTheme);
  const totalTemplates = categories.reduce((sum, row) => sum + Number(row.templates || 0), 0);

  return (
    <>
      <PageHeader
        title="Themes"
        subtitle="The storefront templates every merchant can pick from."
        actions={<Button icon={RefreshCw} onClick={() => { themes.reload(); loadSide(); }}>Refresh</Button>}
      />

      {sideError ? <ErrorBanner error={sideError} onRetry={loadSide} /> : null}

      {categories.length ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => themes.setFilter('category', '')}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${themes.filters.category ? 'bg-white text-slate-600' : 'bg-blue-600 text-white'}`}
          >
            All ({totalTemplates})
          </button>
          {categories.map((row) => (
            <button
              key={row.category}
              type="button"
              onClick={() => themes.setFilter('category', row.category)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${themes.filters.category === row.category ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}
            >
              {row.category} ({row.templates})
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader title="Catalog" subtitle={`${Number(themes.total || 0).toLocaleString()} templates`} />
          <Toolbar term={themes.term} onTerm={themes.setTerm} placeholder="Search template id, name or category..." />
          {themes.error ? <div className="p-5"><ErrorBanner error={themes.error} onRetry={themes.reload} /></div> : null}
          {themes.loading ? <LoadingBlock label="Loading templates..." /> : (
            <DataTable
              rows={themes.rows}
              empty={(
                <EmptyState
                  title={themes.isFiltered ? 'No templates match that search.' : 'The template catalog is empty.'}
                  hint="Templates are seeded automatically the first time the database boots."
                />
              )}
              columns={[
                { key: 'name', label: 'Template', render: (row) => <Stacked primary={row.name} secondary={row.id} /> },
                { key: 'category', label: 'Category', render: (row) => <span className="text-xs font-bold text-slate-500">{row.category}</span> },
                {
                  key: 'storesUsing',
                  label: 'In use',
                  align: 'right',
                  render: (row) => (
                    <span className={row.storesUsing > 0 ? 'font-bold text-charcoal' : 'text-slate-300'}>
                      {row.storesUsing}
                    </span>
                  ),
                },
                { key: 'created_at', label: 'Created', align: 'right', render: (row) => dateOrDash(row.created_at) },
                { key: 'actions', label: '', align: 'right', render: (row) => <Button onClick={() => startEdit(row)}>Rename</Button> },
              ]}
            />
          )}
          {!themes.loading && !themes.error ? (
            <Pagination page={themes.page} pages={themes.pages} total={themes.total} onPage={themes.setPage} />
          ) : null}
        </Panel>

        <Panel>
          <PanelHeader title="Adoption" subtitle="Which merchant runs which theme" />
          <ul className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto">
            {usage.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-charcoal">{row.name}</p>
                  <p className="truncate text-xs text-slate-400">{row.slug}</p>
                </div>
                {row.onDefaultTheme
                  ? <StatusPill status="TRIAL" label="Default" />
                  : <span className="max-w-[110px] shrink-0 truncate text-xs font-semibold text-slate-500">{row.themeName}</span>}
              </li>
            ))}
            {usage.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-slate-400">No merchants yet.</li>
            ) : null}
          </ul>
          {onDefault.length ? (
            <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
              {onDefault.length} {onDefault.length === 1 ? 'merchant is' : 'merchants are'} still on the default theme.
            </p>
          ) : null}
        </Panel>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" aria-label="Cancel" onClick={() => setEditing(null)} className="absolute inset-0 bg-slate-950/50" />
          <section className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-base font-extrabold tracking-tight text-charcoal">Edit template</h2>
            <p className="mt-1 font-mono text-xs text-slate-400">{editing.id}</p>
            <div className="mt-4 space-y-3">
              {error ? <ErrorBanner error={error} /> : null}
              <Field label="Name">
                <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Category" hint="How the marketplace groups this template.">
                <input className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} />
              </Field>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
              <Button tone="primary" onClick={save} busy={busy} disabled={!name.trim() || !category.trim()}>Save</Button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
