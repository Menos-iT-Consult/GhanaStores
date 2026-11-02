import { ExternalLink, MessageCircle } from 'lucide-react';

export default function WhatsAppGroupLink({ href, audience, error, onRetry }) {
  if (error) {
    return (
      <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        {audience} WhatsApp group link could not be loaded.
        {onRetry && <> <button type="button" onClick={onRetry} className="font-bold underline">Try again</button></>}
      </p>
    );
  }
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Join the ${audience.toLowerCase()} WhatsApp group (opens in a new tab)`}
      className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900 transition hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
    >
      <MessageCircle size={19} aria-hidden="true" />
      <span>Join the {audience.toLowerCase()} WhatsApp group</span>
      <span className="ml-auto inline-flex items-center gap-1 text-xs underline">
        Open group <ExternalLink size={13} aria-hidden="true" />
      </span>
    </a>
  );
}
