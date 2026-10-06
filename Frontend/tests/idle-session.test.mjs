import test from 'node:test';
import assert from 'node:assert/strict';
import {createIdleSession, IDLE_TIMEOUT_MS} from '../src/auth/idleSession.js';

test('idle deadline, activity renewal, and cross-tab input', () => {
  let time=0, expired=0, kept=0;
  const session=createIdleSession({now:()=>time,keepAlive:()=>kept++,expire:()=>expired++});
  session.start();
  time=IDLE_TIMEOUT_MS-1; session.check(); assert.equal(expired,0);
  time=IDLE_TIMEOUT_MS; session.check(); assert.equal(expired,1);
  session.check(); assert.equal(expired,1);
  session.start(); time+=600000; session.activity(); time+=1000; session.check(); assert.equal(kept,1);
  time+=IDLE_TIMEOUT_MS-1001; session.check(); assert.equal(expired,1);
  time+=1; session.check(); assert.equal(expired,2);
  session.start(); time+=500000; session.activity(time,true); time+=1000; session.check(); assert.equal(kept,2);
});
test('late input and polling cannot revive expired sessions', () => {
  let time=0,expired=0;
  const session=createIdleSession({now:()=>time,keepAlive:()=>{},expire:()=>expired++});
  session.start(); time=IDLE_TIMEOUT_MS; session.activity(); assert.equal(expired,1);
  session.start(); time+=IDLE_TIMEOUT_MS; session.check(); assert.equal(expired,2);
  session.stop(); time+=IDLE_TIMEOUT_MS; session.check(); assert.equal(expired,2);
});

test('refresh resumes the remaining idle time without broadcasting fake activity', () => {
 let time=800000,expired=0,broadcasts=0;
 const session=createIdleSession({now:()=>time,keepAlive:()=>{},expire:()=>expired++,broadcast:()=>broadcasts++});
 session.start(0,false);session.check();assert.equal(expired,0);assert.equal(broadcasts,0);
 time=899999;session.check();assert.equal(expired,0);
 time=900000;session.check();assert.equal(expired,1);
});
test('continuous real activity keeps the session alive beyond fifteen minutes', () => {
 let time=0,expired=0,kept=0;
 const session=createIdleSession({now:()=>time,keepAlive:()=>kept++,expire:()=>expired++});
 session.start();
 for(let i=0;i<40;i++){time+=30000;session.activity();session.check();}
 assert.equal(expired,0);assert.ok(kept>0);
 time+=900000;session.check();assert.equal(expired,1);
});
