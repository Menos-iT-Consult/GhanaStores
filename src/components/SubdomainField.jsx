/**
 * components/SubdomainField.jsx
 * The "your store lives here" address input on the signup form.
 *
 * Shows the apex as a fixed suffix so the seller can see the complete URL while
 * typing only their own label, and checks availability as they go.
 *
 * The normaliser and the reserved list are imported from the SAME module the
 * registration handler uses. A client-side copy would be free to drift from the
 * server's rules, and the failure mode is nasty: a green tick next to an address
 * the server then refuses, with no explanation of which of the two was wrong.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { normalizeSubdomain, subdomainProblem, SUBDOMAIN_MESSAGES } from '../../services/subdomainSlug.js';

/* Long enough to survive typing a word, short enough that the tick feels live. */
const DEBOUNCE_MS = 400;

export default function SubdomainField({
  id = 'subdomain',
  value,
  onChange,
  apex,
  label = 'Your store address',
}) {
  const [status, setStatus] = useState('idle'); // idle | checking | ok | error
  const [reason, setReason] = useState('');
  /* Guards against a slow response for an earlier keystroke overwriting the
     verdict for the current one - without this, typing "abc" quickly can end up
     showing the availability of "ab". */
  const seq = useRef(0);

  useEffect(() => {
    const slug = String(value || '').trim();
    if (!slug) { setStatus('idle'); setReason(''); return undefined; }

    /* Decided locally, so an obviously bad slug costs no request. */
    const problem = subdomainProblem(slug);
    if (problem) { setStatus('error'); setReason(problem); return undefined; }

    const mine = ++seq.current;
    setStatus('checking');
    const controller = new AbortController();
    /* Without this a request that never settles leaves the spinner turning
       forever and the seller with no way forward. Deliberately shorter than the
       app's general 20s: this is a convenience hint, and the server re-checks
       on submit, so giving up quickly and letting them proceed is correct. */
    const timeout = setTimeout(() => controller.abort(), 8000);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/domains/subdomain-available?slug=${encodeURIComponent(slug)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (mine !== seq.current) return; // a newer keystroke won
        const ok = Boolean(data?.available);
        setStatus(ok ? 'ok' : 'error');
        setReason(ok ? '' : String(data?.reason || 'taken'));
      } catch {
        /* A failed lookup must NOT read as "taken" - that would block a signup
           on a transient network blip. Fall back to letting the server decide. */
        if (mine !== seq.current) return;
        setStatus('idle');
        setReason('');
      } finally {
        clearTimeout(timeout);
      }
    }, DEBOUNCE_MS);
    return () => { clearTimeout(timer); clearTimeout(timeout); controller.abort(); };
  }, [value]);

  const suffix = apex ? `.${apex}` : '';
  const message = reason ? SUBDOMAIN_MESSAGES[reason] || '' : '';
  const border = status === 'error'
    ? 'border-red-400 focus:border-red-500'
    : status === 'ok'
      ? 'border-emerald-500 focus:border-emerald-600'
      : 'border-slate-300 focus:border-brand';

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <div className={`flex items-stretch overflow-hidden rounded-xl border bg-white transition-colors ${border}`}>
        <input
          id={id}
          type="text"
          value={value || ''}
          onChange={(e) => onChange(normalizeSubdomain(e.target.value))}
          placeholder="accra-beauty"
          required
          maxLength={40}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-describedby={`${id}-hint`}
          aria-invalid={status === 'error'}
          className="min-w-0 flex-1 border-0 bg-transparent px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        {/* Fixed, non-editable apex. aria-hidden: it is already in the value the
            server stores, and a screen reader announcing it twice is noise. */}
        <span aria-hidden="true" className="flex select-none items-center border-l border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
          {suffix}
        </span>
        <span className="flex w-9 items-center justify-center" aria-hidden="true">
          {status === 'checking' && <Loader2 size={16} className="animate-spin text-slate-400" />}
          {status === 'ok' && <Check size={16} className="text-emerald-600" />}
          {status === 'error' && <AlertCircle size={16} className="text-red-500" />}
        </span>
      </div>

      {/* Announced politely so a screen-reader user hears the verdict without
          being interrupted mid-sentence. */}
      <p id={`${id}-hint`} aria-live="polite" className="mt-1.5 text-xs">
        {message && <span className="text-red-600">{message}</span>}
        {!message && status === 'ok' && <span className="text-emerald-700">Available.</span>}
        {!message && status === 'idle' && (
          <span className="text-slate-500">Your store will be at {value ? `${value}${suffix}` : `your-shop${suffix}`}</span>
        )}
      </p>
    </div>
  );
}