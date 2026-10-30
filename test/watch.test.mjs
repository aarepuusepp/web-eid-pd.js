import test from 'node:test';
import assert from 'node:assert/strict';
import {watchStatus} from '../index.js';
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function fixture(t){
 t.mock.timers.enable({apis:['setTimeout']});
 const listeners=new Set(),calls=[],pending=[];
 const ready={protocol:1,extension:'2.1.0',nativeApp:'2.1.0',access:{personalData:'ask'},diagnostics:{pcscAvailable:true,readerCount:1,cardPresent:false}};
 const w={isSecureContext:true,location:{protocol:'https:',origin:'https://visitor.test'},addEventListener:(_t,f)=>listeners.add(f),removeEventListener:(_t,f)=>listeners.delete(f),postMessage(m){calls.push(m.action);pending.push(m);}};
 w.top=w;globalThis.window=w;
 const doc=new EventTarget();doc.visibilityState='visible';globalThis.document=doc;
 t.after(()=>{delete globalThis.document;delete globalThis.window;});
 function reply(cardPresent=false){const m=pending.shift();assert.ok(m);for(const f of listeners)f({source:w,origin:w.location.origin,data:{target:'EIDPD_CLIENT_RESPONSE',requestId:m.requestId,ok:true,result:{...ready,diagnostics:{...ready.diagnostics,cardPresent}}}});}
 return {calls,reply,doc,listeners,hide(){doc.visibilityState='hidden';doc.dispatchEvent(new Event('visibilitychange'));},show(){doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));}};
}
test('watch observes insertion/removal using status only and stops on disposal',async t=>{
 const f=fixture(t),states=[];const stop=watchStatus(s=>states.push(s));f.reply(false);await flush();
 t.mock.timers.tick(1000);f.reply(true);await flush();t.mock.timers.tick(1000);f.reply(false);await flush();
 assert.deepEqual(states.map(s=>s.status.diagnostics.cardPresent),[false,true,false]);assert.deepEqual(f.calls,['STATUS','STATUS','STATUS']);
 stop();t.mock.timers.tick(10000);assert.equal(f.calls.length,3);assert.equal(f.listeners.size,0);
});
test('watch never overlaps slow requests and ignores stale hidden results',async t=>{
 const f=fixture(t),states=[];const stop=watchStatus(s=>states.push(s));t.mock.timers.tick(2000);assert.equal(f.calls.length,1);
 f.hide();f.reply(true);await flush();t.mock.timers.tick(10000);assert.equal(f.calls.length,1);assert.equal(states.length,0);
 f.show();f.reply(false);await flush();assert.equal(states.at(-1).status.diagnostics.cardPresent,false);
 stop();t.mock.timers.tick(10000);assert.equal(f.calls.length,2);
});
test('missing extension backs off, then recovers without card access',async t=>{
 const f=fixture(t),states=[];const stop=watchStatus(s=>states.push(s));t.mock.timers.tick(5000);await flush();
 assert.equal(states.at(-1).error.code,'ERR_EIDPD_EXTENSION_UNAVAILABLE');t.mock.timers.tick(4999);assert.equal(f.calls.length,1);
 t.mock.timers.tick(1);assert.equal(f.calls.length,2);f.reply();f.reply(true);await flush();assert.equal(states.at(-1).status.diagnostics.cardPresent,true);stop();
});
