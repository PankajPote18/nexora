// Central API base — change this once if your backend URL changes
const BASE = `${import.meta.env.VITE_API_URL}/api`;

const get = (path) =>
  fetch(`${BASE}${path}`).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const post = (path, body) =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const put = (path, body) =>
  fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const patch = (path, body = {}) =>
  fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const del = (path) =>
  fetch(`${BASE}${path}`, { method: 'DELETE' }).then((r) => {
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

// ── Movies (existing) ────────────────────────────────────────────────────────
export const moviesApi = {
  getAll: (params = '') => get(`/movies${params}`),
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
// instead of a generic "API error 400".
const paymentRequest = async (path, options) => {
  const res = await fetch(`${BASE}${path}`, options);
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
