/**
 * components/CopyButton.jsx
 * A copy-to-clipboard button with a brief "Copied" confirmation.
 *
 * Extracted from the Developer Guide's CodeBlock so the post-signup popup and
 * the dashboard sidebar share ONE implementation instead of each growing their
 * own. The behaviour there was deliberate and is preserved exactly:
 *
 * `navigator.clipboard` is unavailable on plain http and in some in-app
 * browsers, and the values being copied here are things a merchant pastes into
 * a message to a customer. So a silent no-op would be the worst outcome: the
 * merchant taps Copy, sees nothing change, and pastes stale text. The
 * textarea + execCommand fallback covers that, and `selectable` gives them a
 * last resort by hand.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

const cx = (...v) => v.filter(Boolean).join(' ');

/**
 * @param {object} props
 * @param {string} props.value The exact text placed on the clipboard.
 * @param {string} [props.label] Button text before copying.
 * @param {string} [props.copiedLabel] Button text after a successful copy.
 * @param {'sm'|'xs'} [props.size] Visual weight.
 * @param {string} [props.className] Extra classes for the button.
 * @param {boolean} [props.iconOnly] Render just the icon, with an aria-label.
 * @param {Function} [props.onCopied] Called after the copy settles either way.
 */
export default function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
  size = 'sm',
  className,
  iconOnly = false,
  onCopied,
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timerRef = useRef(null);

  // Never leave a timer running past unmount: the sidebar unmounts on every
  // route change and a stray setState would warn in development.
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const text = String(value || '');
  if (!text) return null;

  const settle = (ok) => {
    setCopied(ok);
    setFailed(!ok);
    onCopied?.(ok);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setCopied(false); setFailed(false); }, 2000);
  };

  const fallbackCopy = () => {
    const ta = document.createElement('textarea');
    ta.value = text;
    // Off-screen rather than display:none - a hidden textarea cannot be selected.
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    document.body.removeChild(ta);
    settle(ok);
  };

  const copy = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => settle(true)).catch(() => fallbackCopy());
    } else {
      fallbackCopy();
    }
  };

  const sizing = size === 'xs' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs';
  const iconSize = size === 'xs' ? 12 : 14;
  const tone = copied
    ? 'text-emerald-400'
    : failed
      ? 'text-amber-400'
      : 'text-blue-400 hover:text-blue-300';

  return (
    <button
      type="button"
      onClick={copy}
      // Announced to screen readers, since the visible text can be an icon only.
      aria-label={copied ? copiedLabel : `${label} ${text}`}
      className={cx(
        'inline-flex shrink-0 items-center gap-1 rounded-md font-bold transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        sizing,
        tone,
        className,
      )}
    >
      {copied
        ? <Check size={iconSize} aria-hidden="true" />
        : <Copy size={iconSize} aria-hidden="true" />}
      {!iconOnly && (copied ? copiedLabel : failed ? 'Copy failed' : label)}
    </button>
  );
}