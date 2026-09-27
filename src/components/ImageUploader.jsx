/**
 * DiDwa - Seller image uploader.
 *
 * One component for both product photos and the store logo. The three-step
 * exchange (presign -> PUT to R2 -> confirm) is hidden behind a single
 * onUploaded callback, so a caller only deals with "here is the file, tell me
 * when it is stored".
 *
 * The file never touches the app server: it is PUT straight to Cloudflare R2
 * with a signed URL, which is why progress is real progress and why a 5MB
 * photo costs the platform nothing in bandwidth.
 */
import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { putToSignedUrl, uploadApi } from '../api.js';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
const MAX_BYTES = 5 * 1024 * 1024;

const mb = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)}MB`;

export default function ImageUploader({
  kind = 'product',
  productId = null,
  value = null,
  onUploaded,
  onRemoved,
  label = 'Product image',
  hint = 'JPEG, PNG, WebP or AVIF. Square images look best.',
  previewClass = 'h-24 w-24',
}) {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    setError('');

    // Checked before signing so a seller gets an instant answer rather than
    // signing a URL that would then be rejected server-side anyway.
    if (!ACCEPT.split(',').includes(file.type)) {
      setError('Images must be JPEG, PNG, WebP or AVIF.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`That image is ${mb(file.size)}. The limit is ${mb(MAX_BYTES)}.`);
      return;
    }

    setBusy(true);
    setProgress(0);
    setDone(false);
    try {
      const signed = await uploadApi.presign(kind, file);
      await putToSignedUrl(signed.uploadUrl, file, setProgress);
      // The server re-checks size and type against what actually landed, then
      // attaches the key to the product (or the store, for a logo).
      const saved = await uploadApi.confirm(kind, signed.key, productId);
      setDone(true);
      onUploaded?.(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      // Allow re-picking the same file after a failure.
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <div className={`${previewClass} shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50`}>
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-slate-300">
              <ImagePlus size={22} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            id={`upload-${kind}-${productId || 'new'}`}
            onChange={(e) => handleFile(e.target.files?.[0])}
            disabled={busy}
          />
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor={`upload-${kind}-${productId || 'new'}`}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 ${busy ? 'pointer-events-none opacity-50' : ''}`}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
              {busy ? 'Uploading...' : value ? 'Replace' : label}
            </label>

            {value && onRemoved && !busy ? (
              <button
                type="button"
                onClick={onRemoved}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
              >
                <Trash2 size={14} />Remove
              </button>
            ) : null}

            {done && !busy ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <CheckCircle2 size={14} />Saved
              </span>
            ) : null}
          </div>

          {busy ? (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${Math.max(4, progress)}%` }}
              />
            </div>
          ) : (
            !error ? <p className="mt-1.5 text-[11px] text-slate-400">{hint}</p> : null
          )}

          {error ? (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-rose-600">
              <AlertCircle size={13} className="mt-px shrink-0" />{error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
