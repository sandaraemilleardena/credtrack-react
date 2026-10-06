import { useEffect, useState } from 'react';
import './loginLockout.css';
const empty = { until: 0, locked: false };
function loadWait(username) {
  try { return Number(sessionStorage.getItem('credtrack-login-wait:' + username)) || 0; }
  catch { return 0; }
}
export default function useLoginLockout(username) {
  const account = username.trim();
  const [limits, setLimits] = useState({});
  const [now, setNow] = useState(() => Date.now());
  const limit = limits[account] || { ...empty, until: loadWait(account) };
  const seconds = Math.max(0, Math.ceil((limit.until - now) / 1000));
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);
  function recordFailure(error) {
    const until = error.retryAfter > 0 ? Date.now() + error.retryAfter * 1000 : 0;
    if (!until && !error.accountLocked) return;
    setLimits(previous => ({ ...previous, [account]: { until, locked: error.accountLocked === true } }));
    setNow(Date.now());
    try { sessionStorage.setItem('credtrack-login-wait:' + account, String(until)); }
    catch { /* Server still enforces the lock when storage is unavailable. */ }
  }
  return {
    blocked: limit.locked || seconds > 0,
    seconds,
    recordFailure,
    message: limit.locked ? 'Your account is locked. Contact the Principal to unlock it.' : seconds > 0 ? 'Too many failed attempts. Try again in ' + seconds + ' seconds.' : '',
    buttonText: limit.locked ? 'Account locked' : seconds > 0 ? 'Try again in ' + seconds + 's' : 'Login',
  };
}
