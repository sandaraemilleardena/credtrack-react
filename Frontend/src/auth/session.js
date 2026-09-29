import { API_BASE_URL } from '../api/config.js';

const listeners = new Set();
let state = { status: 'checking', user: null, routeKey: null, error: '' };
let sequence = 0;
let signingOut = false;
let installed = false;
const SESSION_EVENT = 'credtrack-auth-change';

function publish(next) {
  state = next;
  // Hide synchronously, including the DOM snapshot saved in the back/forward cache.
  document.documentElement.dataset.sessionLocked = next.status === 'authenticated' ? 'false' : 'true';
  listeners.forEach(listener => listener());
}
export const subscribeSession = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export const getSessionState = () => state;

function lock() {
  sequence++;
  publish({ ...state, status: 'checking', error: '' });
}
function notifyOtherTabs() {
  try { localStorage.setItem(SESSION_EVENT, String(Date.now()) + ':' + sequence); } catch { /* Focus rechecks still work if storage is disabled. */ }
}
function clearLegacySession() {
  for (const storage of [localStorage, sessionStorage]) {
    try { storage.removeItem('credtrackSession'); storage.removeItem('user'); } catch { /* Storage is not an authentication source. */ }
  }
}
async function authRequest(path, options = {}) {
  const response = await fetch(API_BASE_URL + '/api/auth/' + path, {
    credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(15000), ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.detail || 'Unable to verify your session. Please retry.');
  return data;
}
export async function getCsrfToken() {
  const data = await authRequest('csrf/');
  if (!data.csrfToken) throw new Error('The server did not provide a security token.');
  return data.csrfToken;
}
export async function getCurrentSession() {
  const data = await authRequest('session/');
  return { authenticated: data.authenticated === true && Boolean(data.user?.role), user: data.user || null };
}
export async function verifySession(routeKey = state.routeKey) {
  if (signingOut) return;
  const current = ++sequence;
  publish({ ...state, status: 'checking', routeKey, error: '' });
  try {
    const result = await getCurrentSession();
    if (current !== sequence) return;
    publish({ status: result.authenticated ? 'authenticated' : 'anonymous', user: result.user, routeKey, validatedRouteKey: routeKey, error: '' });
  } catch (error) {
    if (current === sequence) publish({ status: 'error', user: null, routeKey, error: error.message });
  }
}
export function installSessionProtection() {
  if (installed) return;
  installed = true;
  window.addEventListener('pagehide', lock);
  window.addEventListener('pageshow', () => verifySession());
  window.addEventListener('popstate', lock);
  window.addEventListener('focus', () => verifySession());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') lock();
    else verifySession();
  });
  window.addEventListener('storage', event => {
    if (event.key === SESSION_EVENT) verifySession();
  });
}
export async function loginUser(username, password, role) {
  const csrfToken = await getCsrfToken();
  const data = await authRequest('login/', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
    body: JSON.stringify({ username, password, role }),
  });
  clearLegacySession();
  lock();
  notifyOtherTabs();
  return data;
}
export async function logoutUser() {
  signingOut = true;
  lock();
  publish({ ...state, user: null, validatedRouteKey: null });
  try {
    const csrfToken = await getCsrfToken();
    await authRequest('logout/', { method: 'POST', headers: { 'X-CSRFToken': csrfToken } });
    clearLegacySession();
    publish({ status: 'anonymous', user: null, routeKey: state.routeKey, error: '' });
    notifyOtherTabs();
  } catch (error) {
    publish({ status: 'error', user: null, routeKey: state.routeKey,
      error: 'Sign-out was not confirmed. Check the connection and retry sign-out.' });
    throw error;
  } finally { signingOut = false; }
}
export async function isAuthenticated() { try { return (await getCurrentSession()).authenticated; } catch { return false; } }
export async function getCurrentUser() { try { const s = await getCurrentSession(); return s.authenticated ? s.user : null; } catch { return null; } }
export async function requireSession(requiredRole = null) {
  try {
    const session = await getCurrentSession();
    const allowed = session.authenticated && (!requiredRole || session.user?.role === requiredRole.toUpperCase());
    return { allowed, user: session.user, reason: allowed ? 'AUTHORIZED' : session.authenticated ? 'WRONG_ROLE' : 'NOT_AUTHENTICATED' };
  } catch { return { allowed: false, user: null, reason: 'SESSION_ERROR' }; }
}
export const disablePageCache = installSessionProtection;
