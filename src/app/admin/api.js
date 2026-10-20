let token = null;
try { token = localStorage.getItem('sqw_admin_token'); } catch {}

export function getToken() { return token; }
export function clearToken() { token = null; try { localStorage.removeItem('sqw_admin_token'); localStorage.removeItem('sqw_admin_expiry'); } catch {} }
export async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`/api/admin${path}`, { ...options, headers });
  if (response.status === 401) { clearToken(); window.dispatchEvent(new CustomEvent('admin:unauthorized')); }
  const text = await response.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(data?.error || `请求失败（${response.status}）`);
  return data;
}
export async function login(username, password) {
  const data = await request('/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  token = data.token;
  try { localStorage.setItem('sqw_admin_token', token); localStorage.setItem('sqw_admin_expiry', String(Date.now() + 23 * 60 * 60 * 1000)); } catch {}
  return data;
}
export function isAuthenticated() {
  try {
    if (token && Date.now() >= Number(localStorage.getItem('sqw_admin_expiry') || 0)) clearToken();
    return Boolean(token);
  } catch { return Boolean(token); }
}
export async function verify() { await request('/verify'); return true; }
export const api = {
  stats: () => request('/stats'), users: () => request('/users'), tiers: () => request('/user-tiers'),
  deleteUser: username => request(`/users/${encodeURIComponent(username)}`, { method: 'DELETE' }),
  charts: () => request('/chart-users'), chartRecords: id => request(`/charts?userId=${encodeURIComponent(id)}`),
  divination: () => request('/divination-users'), divinationRecords: id => request(`/divination-records/${encodeURIComponent(id)}`),
  suggestions: () => request('/suggestion-users'), suggestionDetail: id => request(`/suggestion-detail/${encodeURIComponent(id)}`),
  folders: () => request('/book-folders'), books: query => request(`/books${query || ''}`), book: id => request(`/books/${id}`),
  prompts: () => request('/prompts'), updatePrompt: (key, value) => request(`/prompts/${encodeURIComponent(key)}`, { method: 'POST', body: JSON.stringify({ value }) }),
  updateTier: (username, tier, reason) => request('/user-tier', { method: 'PATCH', body: JSON.stringify({ username, tier, reason }) }),
  settings: () => request('/settings'),
  saveSettings: body => request('/settings', { method: 'POST', body: JSON.stringify(body) }),
  auditLog: (kind, username = '', limit = 50, offset = 0) => request(`/audit-log?kind=${encodeURIComponent(kind)}&limit=${limit}&offset=${offset}${username ? `&username=${encodeURIComponent(username)}` : ''}`),
  grantPermanentPoints: (username, points, reason, requestId) => request('/permanent-points', { method: 'POST', body: JSON.stringify({ username, points, reason, requestId }) }),
  password: body => request('/password', { method: 'POST', body: JSON.stringify(body) }),
};
