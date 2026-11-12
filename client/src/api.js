const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  constructor(message, status, payload = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export async function apiRequest(path, { method = 'GET', body, token, headers = {} } = {}) {
  const requestHeaders = { ...headers };
  if (token) requestHeaders.Authorization = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) requestHeaders['Content-Type'] = 'application/json';
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    ...(body !== undefined ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {})
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token) window.dispatchEvent(new Event('auth:expired'));
    throw new ApiError(payload.error || `Error HTTP ${response.status}.`, response.status, payload);
  }
  return payload;
}

export function apiBaseUrl() { return API_BASE_URL; }
export const getSession = () => ({ token: sessionStorage.getItem('taller.token'), user: JSON.parse(sessionStorage.getItem('taller.user') || 'null') });
export function storeSession({ token, user }) { sessionStorage.setItem('taller.token', token); sessionStorage.setItem('taller.user', JSON.stringify(user)); }
export function clearSession() { sessionStorage.removeItem('taller.token'); sessionStorage.removeItem('taller.user'); }
