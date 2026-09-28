/**
 * DiDwa API client.
 * Attaches the seller JWT and normalizes errors. No emojis, ever.
 */
const TOKEN_KEY = 'gs_token';
const STORE_KEY = 'gs_store';
const ADMIN_TOKEN_KEY = 'gs_admin_token';
export const OFFLINE_POS_KEY = 'didwa_pos_pending';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setSession(token, store) {
  localStorage.setItem(TOKEN_KEY, token);
  if (store) localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(STORE_KEY);
}

export function getCachedStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
}
export function setAdminSession(token, admin) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  if (admin) localStorage.setItem('gs_admin_profile', JSON.stringify(admin));
}
export function getAdminProfile() {
  try { return JSON.parse(localStorage.getItem('gs_admin_profile') || 'null'); } catch { return null; }
}
export function clearAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem('gs_admin_profile');
}

function readPendingSales() {
  try { return JSON.parse(localStorage.getItem(OFFLINE_POS_KEY) || '[]'); } catch { return []; }
}
function writePendingSales(sales) {
  localStorage.setItem(OFFLINE_POS_KEY, JSON.stringify(sales.slice(-100)));
}
export function queueOfflineSale(sale) {
  const sales = readPendingSales().filter((s) => s.idempotencyKey !== sale.idempotencyKey);
  writePendingSales([...sales, sale]);
}
export function pendingOfflineSales() { return readPendingSales(); }
export async function flushOfflineSales() {
  const pending = readPendingSales();
  const remaining = [];
  for (const sale of pending) {
    try { await request('/api/pos/sales', { method: 'POST', body: sale.payload }); }
    catch (error) {
      if (error.status === 401) throw error;
      remaining.push(sale);
    }
  }
  writePendingSales(remaining);
  return pending.length - remaining.length;
}

async function request(path, { method = 'GET', body, isForm, token: explicitToken } = {}) {
  const headers = {};
  const token = explicitToken !== undefined ? explicitToken : getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    if (res.status === 401 && !explicitToken && !path.startsWith('/api/billing/login')) {
      // Session expired - hard reset so the login screen appears.
      clearSession();
      window.dispatchEvent(new Event('gs:logout'));
    }
    throw err;
  }
  return data;
}

export const adminApi = {
  get: (p) => request(p, { token: getAdminToken() }),
  post: (p, body) => request(p, { method: 'POST', body, token: getAdminToken() }),
  patch: (p, body) => request(p, { method: 'PATCH', body, token: getAdminToken() }),
  // Revoking an administrator is a DELETE on the admin API; the seller client
  // has no equivalent because a merchant never deletes platform-level records.
  del: (p) => request(p, { method: 'DELETE', token: getAdminToken() }),
};

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  put: (p, body) => request(p, { method: 'PUT', body }),
  patch: (p, body) => request(p, { method: 'PATCH', body }),
  // Removing a store logo is the one delete a seller may perform.
  del: (p) => request(p, { method: 'DELETE' }),
};

/* ------------------------------ Media uploads ------------------------------
 * Seller images go straight to Cloudflare R2: the API only signs the PUT and
 * confirms what landed, so image bytes never pass through the app server. The
 * Content-Type is signed into the URL, so it MUST be sent verbatim or R2
 * rejects the PUT with a signature mismatch. */
export const uploadApi = {
  /** Ask for a signed PUT URL and the key the bytes must be sent to. */
  presign: (kind, file) => api.post('/api/uploads/presign', {
    kind,
    contentType: file.type,
    size: file.size,
  }),

  /** Verify the upload and attach it to a product (or, with no id, the store). */
  confirm: (kind, key, productId = null) => api.post('/api/uploads/confirm', { kind, key, productId }),

  logo: () => api.get('/api/uploads/logo'),
  removeLogo: () => api.del('/api/uploads/logo'),
};

/**
 * PUT the file to the signed URL. XMLHttpRequest rather than fetch, because
 * upload progress is the whole point of uploading a 2MB photo on a Ghanaian
 * mobile connection.
 * @returns {Promise<void>} resolves on 2xx, rejects with a readable Error.
 */
export function putToSignedUrl(uploadUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    // Must match the signed Content-Type exactly.
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      // R2 answers 403 for a signature/Content-Type mismatch, which is the
      // most likely failure here and is not the seller's fault.
      reject(new Error(xhr.status === 403
        ? 'The upload could not be authorised. Please try again.'
        : `Upload failed (${xhr.status}).`));
    };
    // A blocked CORS preflight, an offline browser and a dropped connection all
    // arrive here as a network error with no status, so the copy stays
    // actionable and the real cause is left in the console. A bucket with no
    // CORS rule fails exactly here - see `npm run r2:cors`.
    xhr.onerror = () => reject(new Error('The upload could not reach storage. Check your connection and try again.'));
    xhr.ontimeout = () => reject(new Error('The upload timed out. Please try again.'));
    xhr.send(file);
  });
}

/**
 * The unresized original behind a delivery URL.
 *
 * Delivery normally goes through Cloudflare Image Transformations
 * (`/cdn-cgi/image/width=640,.../<key>`), which the zone has to have enabled.
 * Where it is not, that path 404s, so an <img> swaps to this URL instead of
 * showing a broken image - the storefront keeps working and simply transfers the
 * original bytes. A URL that is not a rendition comes back unchanged, which makes
 * the swap a no-op once the feature is enabled.
 */
export function originalImageUrl(url) {
  const value = String(url || '');
  const marker = '/cdn-cgi/image/';
  const at = value.indexOf(marker);
  if (at === -1) return value;
  const rest = value.slice(at + marker.length);
  const afterOptions = rest.indexOf('/');
  return afterOptions === -1 ? value : value.slice(0, at) + rest.slice(afterOptions);
}

/** GHS currency formatter used across all dashboards. */
export function ghs(value) {
  const n = Number(value || 0);
  return `GHS ${n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function shortDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}
