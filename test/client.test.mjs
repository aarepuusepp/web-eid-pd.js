import test from 'node:test';
import assert from 'node:assert/strict';
import {status,readAllReaders,describeStatus,installationHelp,unwrapTransportKey} from '../index.js';
function browser(reply){
 const listeners=new Set();const w={isSecureContext:true,location:{protocol:'https:',origin:'https://visitor.test'},addEventListener:(t,f)=>listeners.add(f),removeEventListener:(t,f)=>listeners.delete(f),postMessage(m){queueMicrotask(()=>{const result=reply(m);for(const f of listeners)f({source:w,origin:w.location.origin,data:{target:'EIDPD_CLIENT_RESPONSE',requestId:m.requestId,...result}})});}};w.top=w;globalThis.window=w;return listeners;
}
const ready={protocol:1,extension:'2.1.0',nativeApp:'2.1.0',access:{personalData:'ask',decrypt:'ask'},diagnostics:{pcscAvailable:true,readerCount:1,cardPresent:true,pkcs11State:'ready'}};
test('status is diagnostic only and listeners are cleaned',async()=>{const calls=[];const listeners=browser(m=>{calls.push(m.action);return {ok:true,result:ready}});assert.equal((await status()).nativeApp,'2.1.0');assert.deepEqual(calls,['STATUS']);assert.equal(listeners.size,0);});
test('incompatible native protocol is rejected',async()=>{browser(()=>({ok:true,result:{...ready,protocol:0}}));await assert.rejects(status(),{code:'ERR_EIDPD_VERSION_MISMATCH'});});
test('reader operations use new transport after compatibility handshake',async()=>{const calls=[];browser(m=>{calls.push(m.action);return {ok:true,result:m.action==='STATUS'?ready:{ok:true,results:[]}}});assert.deepEqual((await readAllReaders()).results,[]);assert.deepEqual(calls,['STATUS','READ_ALL_READERS']);});
test('central denial preserves a stable code',async()=>{browser(()=>({ok:false,error:'denied',errorCode:'ERR_EIDPD_SITE_DENIED'}));await assert.rejects(status(),{code:'ERR_EIDPD_SITE_DENIED'});});
test('HTTP and frames are rejected before sending',async()=>{browser(()=>{throw Error('must not send')});window.location.protocol='http:';await assert.rejects(status(),{code:'ERR_EIDPD_CONTEXT_INSECURE'});window.location.protocol='https:';window.top={};await assert.rejects(status(),{code:'ERR_EIDPD_CONTEXT_INSECURE'});});
test('diagnostics distinguish architecture and no card and site block',()=>{assert.match(describeStatus({...ready,access:{decrypt:'deny'}},'decrypt'),/keelatud/);assert.match(describeStatus({...ready,diagnostics:{...ready.diagnostics,pkcs11State:'wrong_architecture'}},'decrypt'),/64-bitine/);assert.match(describeStatus({...ready,diagnostics:{...ready.diagnostics,cardPresent:false}}),/Sisesta/);assert.equal(installationHelp('Mozilla Firefox/145').browser,'Firefox');});


test('installation links select the current browser and reject unsafe URLs',()=>{
 const help=installationHelp('Edg/140',{installerUrl:'https://downloads.test/eidpd.exe',edgeUrl:'https://microsoftedge.microsoft.com/addons/detail/test',chromeUrl:'https://chromewebstore.google.com/detail/test'});
 assert.equal(help.browser,'Edge');assert.match(help.extensionUrl,/microsoftedge/);assert.match(help.installerUrl,/eidpd.exe/);
 assert.equal(installationHelp('Firefox/140',{installerUrl:'javascript:alert(1)',firefoxUrl:'http://unsafe.test'}).installerUrl,undefined);
 assert.equal(installationHelp('Firefox/140',{firefoxUrl:'http://unsafe.test'}).extensionUrl,undefined);
});


test('unwrap carries only filename display context and preserves crypto fields', async()=>{
 let sent;
 browser(m=>{if(m.action==='STATUS')return {ok:true,result:ready};sent=m;return {ok:true,result:{data:{contentEncryptionKey:'test'}}};});
 const challenge={wrappedKeyB64:'abc',displayContext:{name:'spoof',personalCode:'spoof'}};
 await unwrapTransportKey('certificate',challenge,{fileName:'example.cdoc'});
 assert.deepEqual(sent.challenge,{wrappedKeyB64:'abc',displayContext:{fileName:'example.cdoc'}});
 assert.equal(challenge.displayContext.name,'spoof');
});
test('native PIN timeout remains distinct and releases operation lock', async()=>{
 browser(m=>m.action==='STATUS'?{ok:true,result:ready}:{ok:false,errorCode:'ERR_EIDPD_PIN_TIMEOUT',error:'expired'});
 await assert.rejects(unwrapTransportKey('cert',{}),{code:'ERR_EIDPD_PIN_TIMEOUT'});
 await assert.rejects(unwrapTransportKey('cert',{}),{code:'ERR_EIDPD_PIN_TIMEOUT'});
});
