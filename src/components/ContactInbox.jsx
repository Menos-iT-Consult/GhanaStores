/**
 * components/ContactInbox.jsx
 * The contact-message inbox, shared by the seller dashboard and the super admin.
 *
 * One component for both because they are the same list with a different fetch
 * and a different heading. Two copies would drift - and the seller copy is the
 * one that must stay scoped, so a divergence there is a privacy bug.
 */
import { useCallback, useEffect, useState } from 'react';
import { Archive, ArchiveRestore, Mail, MailOpen, RefreshCw, Reply } from 'lucide-react';

/** Relative time, so "2h ago" beats a raw ISO stamp in a list. */
function ago(iso) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'new', label: 'Unread' },
  { key: 'read', label: 'Read' },
  { key: 'archived', label: 'Archived' },
];

function Row({ msg, showStore, busy, onMove }) {
  return (
    <li className={[
      'rounded-xl border bg-white p-4 transition',
      msg.status === 'new' ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200',
      msg.status === 'archived' ? 'opacity-60' : '',
    ].join(' ')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-slate-900">
            {msg.status === 'new'
              ? <Mail size={13} className="text-blue-600" aria-hidden="true" />
              : <MailOpen size={13} className="text-slate-400" aria-hidden="true" />}
            {msg.name}
            {msg.topic && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {msg.topic}
              </span>
            )}
            {showStore && msg.store?.name && (
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                {msg.store.name}
              </span>
            )}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            <a href={`mailto:${msg.email}`} className="font-semibold text-blue-700 hover:underline">{msg.email}</a>
            {msg.phone ? ` · ${msg.phone}` : ''} · {ago(msg.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <a
            href={`mailto:${msg.email}?subject=${encodeURIComponent(`Re: your message to ${msg.store?.name || 'us'}`)}`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Reply size={12} aria-hidden="true" /> Reply
          </a>
          {msg.status === 'archived' ? (
            <button type="button" disabled={busy} onClick={() => onMove(msg, 'new')}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              <ArchiveRestore size={12} aria-hidden="true" /> Restore
            </button>
          ) : (
            <>
              {msg.status === 'new' && (
                <button type="button" disabled={busy} onClick={() => onMove(msg, 'read')}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                  <MailOpen size={12} aria-hidden="true" /> Mark read
                </button>
              )}
              <button type="button" disabled={busy} onClick={() => onMove(msg, 'archived')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                <Archive size={12} aria-hidden="true" /> Archive
              </button>
            </>
          )}
        </div>
      </div>
      <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{msg.message}</p>
    </li>
  );
}
export default function ContactInbox({
  fetchMessages,
  updateMessage,
  emptyHint = 'Messages from your contact form will appear here.',
  showStore = false,
  title,
}) {
  const [messages, setMessages] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async (status) => {
    setLoading(true);
    setError('');
    try {
      const qs = status ? `?status=${status}` : '';
      const data = await fetchMessages(qs);
      setMessages(data?.messages || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchMessages]);

  useEffect(() => { load(filter); }, [load, filter]);

  const move = async (msg, status) => {
    setBusyId(msg.id);
    setError('');
    try {
      await updateMessage(msg.id, status);
      await load(filter);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  const unread = messages.filter((m) => m.status === 'new').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">{title}</h1>
          {unread > 0 && <p className="mt-0.5 text-xs font-semibold text-blue-700">{unread} unread</p>}
        </div>
        <button type="button" onClick={() => load(filter)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          <RefreshCw size={13} aria-hidden="true" /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter messages">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)}
            className={[
              'rounded-lg px-3 py-1.5 text-xs font-bold transition',
              filter === f.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            ].join(' ')}>
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">Loading messages...</p>
      ) : messages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
          <Mail size={22} className="mx-auto text-slate-300" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-slate-600">No messages here</p>
          <p className="mt-1 text-xs text-slate-400">{emptyHint}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {messages.map((msg) => (
            <Row key={msg.id} msg={msg} showStore={showStore} busy={busyId === msg.id} onMove={move} />
          ))}
        </ul>
      )}
    </div>
  );
}