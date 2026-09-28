/**
 * DiDwa - an <img> that never shows a broken picture because of the media host.
 *
 * The API builds delivery URLs that go through Cloudflare Image Transformations
 * (`/cdn-cgi/image/width=640,.../<key>`), and that feature has to be enabled on
 * the zone. Where it is not, the rendition 404s and the browser paints nothing -
 * so this falls back to the stored original and the merchant still sees their
 * photo, at the cost of transferring the original bytes. Once the feature is
 * enabled the fallback simply never fires, and the swap is a no-op for any URL
 * that is not a rendition.
 *
 * Use it for every R2-backed image (product photo, logo, tab icon preview).
 */
import { useEffect, useState } from 'react';
import { originalImageUrl } from '../api.js';

export default function SafeImage({ src, onError, ...rest }) {
  const [current, setCurrent] = useState(src);

  // A new upload or a theme edit replaces the URL, so the fallback has to reset
  // with it - otherwise the previous image would stay pinned on screen.
  useEffect(() => setCurrent(src), [src]);

  return (
    <img
      {...rest}
      src={current || undefined}
      onError={(event) => {
        const original = originalImageUrl(current);
        if (original && original !== current) setCurrent(original);
        onError?.(event);
      }}
    />
  );
}
