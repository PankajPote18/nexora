// Central API base — change this once if your backend URL changes
const BASE = `${import.meta.env.VITE_API_URL}/api`;

// Plain fetch() has no timeout — a slow/hung backend response (e.g. under
// heavy concurrent load) would otherwise leave the UI waiting indefinitely
// with no error, no loading-state resolution, nothing. Every request below
// is bounded by this via AbortController so callers always get a resolved
// promise (success or a clear error) within DEFAULT_TIMEOUT_MS.
const DEFAULT_TIMEOUT_MS = 10000;

const fetchWithTimeout = (url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .catch((err) => {
      if (err.name === 'AbortError') throw new Error('Request timed out — please try again');
      throw err;
    })
    .finally(() => clearTimeout(timeoutId));
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// GET is the only verb retried automatically — it's idempotent, so retrying
// a transient failure (timeout, network blip, a 5xx from a momentarily
// overloaded backend) is safe. POST/PUT/PATCH/DELETE are never
// auto-retried: retrying a mutation on an ambiguous failure (request may
// have already been applied server-side) risks double-processing, which
// matters a lot for things like payments (see paymentRequest below, which
// intentionally has its own non-retrying error handling).
const RETRYABLE_STATUS = new Set([502, 503, 504]);
const RETRY_DELAY_MS = 500;

const get = async (path) => {
  const url = `${BASE}${path}`;
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const r = await fetchWithTimeout(url);
      if (!r.ok) {
        if (RETRYABLE_STATUS.has(r.status) && attempt === 0) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        throw new Error(`API error ${r.status}`);
      }
      return r.json();
    } catch (err) {
      const isNetworkFailure = err instanceof TypeError || err.message === 'Request timed out — please try again';
      if (isNetworkFailure && attempt === 0) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw err;
    }
  }
};

const post = (path, body) =>
  fetchWithTimeout(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const put = (path, body) =>
  fetchWithTimeout(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const patch = (path, body = {}) =>
  fetchWithTimeout(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const del = (path) =>
  fetchWithTimeout(`${BASE}${path}`, { method: 'DELETE' }).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

// ── Settings Menu ────────────────────────────────────────────────────────────
export const settingsMenuApi = {
  getAll: (activeOnly = false) => get(`/settings-menu${activeOnly ? '?active=1' : ''}`),
  getOne: (id) => get(`/settings-menu/${id}`),
  create: (data) => post('/settings-menu', data),
  update: (id, data) => put(`/settings-menu/${id}`, data),
  remove: (id) => del(`/settings-menu/${id}`),
  reorder: (items) => patch('/settings-menu/reorder', { items }),
};

// ── Subscription Plans ───────────────────────────────────────────────────────
export const plansApi = {
  getAll: (activeOnly = false) => get(`/subscription-plans${activeOnly ? '?active=1' : ''}`),
  getOne: (id) => get(`/subscription-plans/${id}`),
  create: (data) => post('/subscription-plans', data),
  update: (id, data) => put(`/subscription-plans/${id}`, data),
  remove: (id) => del(`/subscription-plans/${id}`),
  toggle: (id) => patch(`/subscription-plans/${id}/toggle`),
};

// ── Movies ───────────────────────────────────────────────────────────────────
// getAll takes a params object ({ page, limit, category_id, ids, search }) so
// every movie list fetch (Home, Search, Detail's fallback, Admin) goes
// through one place instead of ad-hoc query strings. `ids` accepts an array
// or a pre-joined string. Response shape: { data, total, page, limit, totalPages }.
const buildMoviesQuery = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.set(key, Array.isArray(value) ? value.join(',') : value);
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
};

export const moviesApi = {
  getAll: (params = {}) => get(`/movies${buildMoviesQuery(params)}`),
  getOne: (id) => get(`/movies/${id}`),
  create: (data) => post('/movies', data),
  update: (id, data) => put(`/movies/${id}`, data),
  remove: (id) => del(`/movies/${id}`),
};

// ── Settings Pages ───────────────────────────────────────────────────────────
export const settingsPagesApi = {
  getAll: () => get('/settings-pages'),
  getOne: (id) => get(`/settings-pages/${id}`),
  getBySlug: (slug) => get(`/settings-pages/slug/${slug}`),
  create: (data) => post('/settings-pages', data),
  update: (id, data) => put(`/settings-pages/${id}`, data),
  remove: (id) => del(`/settings-pages/${id}`),
};

// ── Payments (PayU UPI Intent S2S) ─────────────────────────────────────────
// Uses its own error handling (vs. the shared post/get helpers above) so the
// backend's validation message (e.g. "Invalid email address") reaches the UI
// instead of a generic "API error 400". Still timeout-bounded via
// fetchWithTimeout, but deliberately never auto-retried — see the note on
// RETRYABLE_STATUS above; a payment create/status call retrying itself
// silently is the wrong tradeoff for anything money-related. PlansPage.jsx
// already polls getStatus on its own schedule, which is the intended retry
// mechanism for this specific flow.
const paymentRequest = async (path, options) => {
  const res = await fetchWithTimeout(`${BASE}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `API error ${res.status}`);
  }
  return data;
};

export const paymentsApi = {
  create: (data) =>
    paymentRequest('/payments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  getStatus: (txnid) => paymentRequest(`/payments/status/${txnid}`),
};
