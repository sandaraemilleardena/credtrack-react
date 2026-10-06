import { createElement, Fragment, useEffect, useSyncExternalStore } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { subscribeSession, getSessionState, verifySession, logoutUser, hasFreshStaffLogin } from '../auth/session.js';

export default function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();
  const routeKey = location.key + location.pathname + location.search;
  const session = useSyncExternalStore(subscribeSession, getSessionState);
  useEffect(() => { verifySession(routeKey); }, [routeKey]);
  const login = '/' + ({ ADMIN: 'admin', PRINCIPAL: 'principal' }[allowedRoles?.[0]] || 'admin') + '-login';
  const checking = session.routeKey !== routeKey || session.status === 'checking';
  const roleAllowed = session.user && (!allowedRoles || allowedRoles.includes(session.user.role));
  if (checking || (session.status === 'authenticated' && roleAllowed)) {
    // Preserve in-progress forms during focus checks, but hide and disable the subtree.
    const keepContent = roleAllowed && session.validatedRouteKey === routeKey;
    return createElement(Fragment, null,
      checking && createElement('div', { role: 'status', className: 'session-status' }, 'Checking your session…'),
      createElement('div', { className: 'protected-portal', hidden: checking, inert: checking }, keepContent ? children : null));
  }
  if (session.status === 'error') {
    return createElement('div', { role: 'alert', className: 'session-status' },
      createElement('p', null, session.error),
      createElement('button', { onClick: () => verifySession(routeKey) }, 'Retry session check'),
      createElement(Link, { to: login, replace: true }, 'Sign in'),
      createElement('button', { onClick: () => { logoutUser().catch(() => {}); } }, 'Retry sign-out'));
  }
  if (!hasFreshStaffLogin(allowedRoles?.[0]) || session.status !== 'authenticated' || (allowedRoles && !allowedRoles.includes(session.user?.role))) {
    return createElement(Navigate, { to: login, replace: true });
  }
  return createElement('div', { className: 'protected-portal' }, children);
}
