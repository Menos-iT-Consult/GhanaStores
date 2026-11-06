import { useCallback, useEffect, useState } from 'react';
import { Eye, RefreshCw, Save } from 'lucide-react';
import { adminApi } from '../../api.js';
import { Button, ErrorBanner, Field, LoadingBlock, PageHeader, Panel, PanelHeader, inputClass } from '../../components/admin/ui.jsx';

const TEXT_FIELDS = [
  ['eyebrow', 'Eyebrow'], ['title', 'Heading'], ['titleAccent', 'Heading accent'],
  ['description', 'Description'], ['primaryLabel', 'Primary button label'], ['primaryHref', 'Primary button link'],
  ['secondaryLabel', 'Secondary button label'], ['secondaryHref', 'Secondary button link'],
  ['sectionEyebrow', 'Section eyebrow'], ['sectionTitle', 'Section heading'],
];
const MEDIA_FIELDS = [
  ['mediaUrl', 'Image or video URL'], ['posterUrl', 'Video poster / image fallback URL'],
  ['mediaAlt', 'Media alternative text'], ['mediaCaption', 'Media caption'],
  ['seoTitle', 'SEO title'], ['seoDescription', 'SEO description'], ['ogImage', 'Social preview image URL'],
];

export default function AdminPublicPages() {
  const [pages, setPages] = useState([]);
  const [slug, setSlug] = useState('/');
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const result = await adminApi.get('/api/admin/public-pages');
      setPages(result.pages || []);
    } catch (requestError) {
      setError(requestError.message || 'Public page content could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const page = pages.find((item) => item.slug === slug);
    if (page) setDraft(page.draft || {});
  }, [pages, slug]);

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const save = async (publish) => {
    setBusy(true);
    setSaveError('');
    setNotice('');
    try {
      const encoded = encodeURIComponent(slug === '/' ? 'home' : slug.replace(/^\//, ''));
      const result = await adminApi.put(`/api/admin/public-pages/${encoded}`, {
        content: draft,
        publish,
        reason: reason || (publish ? 'Publish public page redesign' : 'Save public page draft'),
      });
      await load();
      setDraft(result.draft || draft);
      setReason('');
      setNotice(publish ? 'Public page published.' : 'Public page draft saved.');
    } catch (requestError) {
      setSaveError(requestError.message || 'Public page content could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingBlock label="Loading public page editor..." />;
  if (error && pages.length === 0) return <ErrorBanner error={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-5">
      <PageHeader title="Public pages" subtitle="Manage welcome and public-page copy, media, links, and SEO metadata." actions={<Button icon={RefreshCw} onClick={() => void load()}>Refresh</Button>} />
      {error && <ErrorBanner error={error} />}
      {saveError && <ErrorBanner error={saveError} />}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}
      <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
        <Panel>
          <PanelHeader title="Pages" subtitle="Select a route to edit." />
          <div className="space-y-1 p-3">
            {pages.map((page) => (
              <button key={page.slug} type="button" onClick={() => setSlug(page.slug)} className={`w-full rounded-lg px-3 py-2 text-left text-sm font-bold transition ${slug === page.slug ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {page.slug === '/' ? 'Welcome /' : page.slug}
              </button>
            ))}
          </div>
        </Panel>
        <div className="space-y-5">
          <Panel>
            <PanelHeader title="Page copy" subtitle={`Editing draft content for ${slug}`} />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {TEXT_FIELDS.map(([key, label]) => (
                <Field key={key} label={label}>
                  {key === 'description' ? (
                    <textarea className={`${inputClass} min-h-24`} maxLength={300} value={draft[key] || ''} onChange={(event) => update(key, event.target.value)} />
                  ) : (
                    <input className={inputClass} maxLength={500} value={draft[key] || ''} onChange={(event) => update(key, event.target.value)} />
                  )}
                </Field>
              ))}
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="Media & search" subtitle="Use HTTPS URLs or root-relative paths." />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {MEDIA_FIELDS.map(([key, label]) => (
                <Field key={key} label={label}>
                  {key === 'seoDescription' ? (
                    <textarea className={`${inputClass} min-h-20`} maxLength={300} value={draft[key] || ''} onChange={(event) => update(key, event.target.value)} />
                  ) : (
                    <input className={inputClass} maxLength={500} value={draft[key] || ''} onChange={(event) => update(key, event.target.value)} />
                  )}
                </Field>
              ))}
              <Field label="Media type">
                <select className={inputClass} value={draft.mediaType || 'image'} onChange={(event) => update('mediaType', event.target.value)}>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </Field>
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="Publish changes" subtitle="Current published content remains live until you publish." />
            <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
              <Field label="Change reason" hint="Recorded in the admin audit log.">
                <input className={inputClass} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Describe this public-page change" />
              </Field>
              <Button icon={Eye} disabled={busy} onClick={() => save(false)}>Save draft</Button>
              <Button icon={Save} variant="primary" disabled={busy} onClick={() => save(true)}>Publish</Button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
