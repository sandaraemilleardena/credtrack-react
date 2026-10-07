import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = new EventTarget();
globalThis.document = new EventTarget();
document.documentElement = { dataset: {} };
document.visibilityState = 'visible';
globalThis.location = { hostname: 'localhost', protocol: 'http:' };
function storage() { const data = new Map(); return { getItem: k => data.get(k), setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k) }; }
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
const auth = await import('../src/auth/session.js');
const ok = data => Promise.resolve({ ok: true, json: async () => data });
const signedIn = { authenticated: true, user: { id: 1, role: 'ADMIN' } };
const tick = () => new Promise(resolve => setImmediate(resolve));
auth.installSessionProtection();

test('session lifecycle blocks stale history and trusts only the server', async t => {
  await t.test('refresh restores a server-validated session without a new login', async () => {
    assert.equal(auth.hasFreshStaffLogin('ADMIN'),false);
    globalThis.fetch=()=>ok(signedIn);
    await auth.verifySession('refreshed-dashboard');
    assert.equal(auth.hasFreshStaffLogin('ADMIN'),true);
    assert.equal(auth.getSessionState().status,'authenticated');
    window.dispatchEvent(new Event('pagehide'));
    const restored=new Event('pageshow');restored.persisted=true;
    window.dispatchEvent(restored);await tick();
    assert.equal(auth.hasFreshStaffLogin('ADMIN'),true);
    assert.equal(auth.getSessionState().status,'authenticated');
  });
  await t.test('returning to login revokes dashboard entry even if the server cookie is still valid', async () => {
    globalThis.fetch = url => ok(url.endsWith('csrf/') ? {csrfToken:'test-token'} : signedIn);
    await auth.loginUser('ict','password','ADMIN');
    assert.equal(auth.hasFreshStaffLogin('ADMIN'),true);
    let finish;
    globalThis.fetch = () => new Promise(resolve => {finish=resolve;});
    const pending=auth.verifySession('dashboard');
    auth.enterLoginScreen();
    assert.equal(auth.hasFreshStaffLogin('ADMIN'),false);
    finish({ok:true,json:async()=>signedIn}); await pending;
    assert.equal(auth.getSessionState().status,'anonymous');
    globalThis.fetch=()=>ok(signedIn);
    await auth.verifySession('old-dashboard-history-entry');
    assert.equal(auth.hasFreshStaffLogin('ADMIN'),false);
    globalThis.fetch = url => ok(url.endsWith('csrf/') ? {csrfToken:'test-token'} : signedIn);
    await auth.loginUser('ict','password','ADMIN');
    assert.equal(auth.hasFreshStaffLogin('ADMIN'),true);
    auth.enterLoginScreen();
  });
  await t.test('fresh navigation locks before validation and uses credentialed no-store requests', async () => {
    let finish;
    globalThis.fetch = (url, opts) => { assert.match(url, /localhost:7788/); assert.equal(opts.credentials,'include'); assert.equal(opts.cache,'no-store'); return new Promise(resolve => { finish=resolve; }); };
    const pending = auth.verifySession('dashboard');
    assert.equal(auth.getSessionState().status, 'checking');
    assert.equal(document.documentElement.dataset.sessionLocked, 'true');
    finish({ ok:true, json:async()=>signedIn }); await pending;
    assert.equal(auth.getSessionState().status, 'authenticated');
    assert.equal(auth.getSessionState().routeKey, 'dashboard');
  });
  await t.test('pagehide masks cached content; restored page rechecks revoked session', async () => {
    window.dispatchEvent(new Event('pagehide'));
    assert.equal(document.documentElement.dataset.sessionLocked, 'true');
    globalThis.fetch = () => ok({ authenticated:false, user:null });
    window.dispatchEvent(new Event('pageshow')); await tick();
    assert.equal(auth.getSessionState().status, 'anonymous');
  });
  await t.test('back and forward immediately hide the previous protected view', async () => {
    globalThis.fetch = () => ok(signedIn); await auth.verifySession('access');
    window.dispatchEvent(new Event('popstate'));
    assert.equal(auth.getSessionState().status,'checking');
    assert.equal(document.documentElement.dataset.sessionLocked,'true');
    globalThis.fetch = () => ok({ authenticated:false }); await auth.verifySession('dashboard');
    assert.equal(auth.getSessionState().status,'anonymous');
  });
  await t.test('network failures never expose protected content', async () => {
    globalThis.fetch = () => Promise.reject(new Error('offline'));
    await auth.verifySession('dashboard');
    assert.equal(auth.getSessionState().status,'error');
    assert.equal(auth.getSessionState().user,null);
  });
  await t.test('logout invalidates pending session checks, clears legacy data, and broadcasts', async () => {
    let finish;
    globalThis.fetch = () => new Promise(resolve=>{finish=resolve;});
    const pending = auth.verifySession('dashboard');
    localStorage.setItem('credtrackSession','stale'); sessionStorage.setItem('user','stale');
    globalThis.fetch = url => ok(url.endsWith('csrf/')?{csrfToken:'test-token'}:{});
    await auth.logoutUser();
    finish({ok:true,json:async()=>signedIn}); await pending;
    assert.equal(auth.getSessionState().status,'anonymous');
    assert.equal(localStorage.getItem('credtrackSession'),undefined);
    assert.equal(sessionStorage.getItem('user'),undefined);
    assert.ok(localStorage.getItem('credtrack-auth-change'));
  });
  await t.test('failed logout stays locked and does not claim success', async () => {
    globalThis.fetch = () => Promise.reject(new Error('offline'));
    await assert.rejects(auth.logoutUser());
    assert.equal(auth.getSessionState().status,'error');
    assert.equal(document.documentElement.dataset.sessionLocked,'true');
  });
  await t.test('other-tab changes and focus revalidate authentication', async () => {
    globalThis.fetch = () => ok(signedIn);
    const event = new Event('storage'); event.key='credtrack-auth-change';
    window.dispatchEvent(event); await tick();
    assert.equal(auth.getSessionState().status,'authenticated');
    globalThis.fetch=()=>ok({authenticated:false});
    window.dispatchEvent(new Event('focus')); await tick();
    assert.equal(auth.getSessionState().status,'anonymous');
  });
  await t.test('missing server role and forged storage do not authorize access', async () => {
    sessionStorage.setItem('user',JSON.stringify({role:'ADMIN'}));
    globalThis.fetch=()=>ok({authenticated:true,user:{id:1}});
    await auth.verifySession('dashboard');
    assert.equal(auth.getSessionState().status,'anonymous');
    const result=await auth.requireSession('ADMIN');
    assert.equal(result.allowed,false);
  });
});


test('teacher navigation to Student Records retains a validated teacher session', async () => {
  const teacher={authenticated:true,user:{id:2,role:'TEACHER'}};
  globalThis.fetch=url=>ok(url.endsWith('csrf/')?{csrfToken:'test-token'}:teacher);
  await auth.loginUser('teacher','password','TEACHER');
  for (const route of ['/teacher-gradebook','/teacher-student-records','/teacher-digital-sf9']) {
    await auth.verifySession(route);
    assert.equal(auth.hasFreshStaffLogin('TEACHER'),true);
    assert.equal(auth.getSessionState().status,'authenticated');
    assert.equal(auth.getSessionState().validatedRouteKey,route);
  }
});
