export const libraryVersion='1.0.1';
export const ErrorCode=Object.freeze(Object.fromEntries(['EXTENSION_UNAVAILABLE','NATIVE_UNAVAILABLE','VERSION_MISMATCH','USER_CANCELLED','USER_TIMEOUT','PIN_TIMEOUT','CARD_NOT_FOUND','READER_NOT_FOUND','PKCS11_UNAVAILABLE','SITE_DENIED','POLICY_INVALID','CONTEXT_INSECURE','ACTION_PENDING','INVALID_REQUEST','WRONG_KEY','UNKNOWN_ERROR'].map(k=>['ERR_EIDPD_'+k,'ERR_EIDPD_'+k])));
const failure=(code,message)=>Object.assign(new Error(message),{code});
let busy=false;
function request(action,payload={},timeout=120000){
 if(typeof window==='undefined'||!window.isSecureContext||window.location.protocol!=='https:'||window!==window.top)return Promise.reject(failure(ErrorCode.ERR_EIDPD_CONTEXT_INSECURE,'Ava rakendus HTTPS-aadressil'));
 const requestId=crypto.randomUUID();
 return new Promise((resolve,reject)=>{
  const cleanup=()=>{clearTimeout(timer);window.removeEventListener('message',receive);};
  const receive=event=>{
   if(event.source!==window||event.origin!==window.location.origin||event.data?.target!=='EIDPD_CLIENT_RESPONSE'||event.data.requestId!==requestId)return;
   cleanup();const r=event.data;
   if(r.ok===false)reject(failure(r.errorCode||ErrorCode.ERR_EIDPD_UNKNOWN_ERROR,r.error||'Kaarditoiming ebaõnnestus'));else resolve(r.result);
  };
  const timer=setTimeout(()=>{cleanup();reject(failure(action==='STATUS'?ErrorCode.ERR_EIDPD_EXTENSION_UNAVAILABLE:ErrorCode.ERR_EIDPD_USER_TIMEOUT,action==='STATUS'?'EID-PD laiendus puudub või on välja lülitatud':'Kaarditoimingu ooteaeg lõppes'));},timeout);
  window.addEventListener('message',receive);
  window.postMessage({target:'EIDPD_CLIENT',requestId,action,...payload},window.location.origin);
 });
}
export async function status(){
 const r=await request('STATUS',{},5000);
 const supported=v=>/^2\.(?:[1-9]\d*|0[1-9])\./.test(v||'');
 if(r?.protocol!==1||!supported(r.extension)||!supported(r.nativeApp||r.version))throw failure(ErrorCode.ERR_EIDPD_VERSION_MISMATCH,'Uuenda EID-PD laiendus ja tööjaamakomponent versioonile 2.1 või uuemale');
 return {...r,library:libraryVersion};
}
async function action(name,payload={},options={}){
 if(busy)throw failure(ErrorCode.ERR_EIDPD_ACTION_PENDING,'Kaarditoiming on juba pooleli');
 busy=true;
 try {await status();return await request(name,{...payload,options},Math.max(1000,Math.min(options.timeout||options.userInteractionTimeout||120000,180000)));}
 finally{busy=false;}
}
export const readPersonalData=(options={})=>action('READ_PERSONAL_DATA',{},options);
export const readAllReaders=(options={})=>action('READ_ALL_READERS',{},options);
export async function getDecryptCertificate(options={}){const r=await action('GET_DECRYPT_CERTIFICATE',{},options);return r.data;}
export async function unwrapTransportKey(certificate,challenge,options={}){
 if(!certificate||!challenge)throw failure(ErrorCode.ERR_EIDPD_INVALID_REQUEST,'Sertifikaat ja dekrüpteerimispäring on nõutud');
 // Display metadata is separate from the cryptographic challenge fields.
 // Existing extension bridges forward the challenge unchanged. The native
 // reader derives identity from the card, never from this metadata.
 const displayContext={fileName:typeof options.fileName==='string'?options.fileName.slice(0,512):''};
 const r=await action('UNWRAP_TRANSPORT_KEY',{certificate,challenge:{...challenge,displayContext}},options);
 return {contentEncryptionKey:r.data.contentEncryptionKey||r.data.contentEncryptionKeyBase64};
}
export function describeStatus(s,capability='personalData'){
 if(s.access?.[capability]==='deny')return 'See veebileht on keskse seadistusega keelatud.';
 const d=s.diagnostics;
 if(!d?.pcscAvailable)return 'Kiipkaardi teenus pole kättesaadav. Kontrolli ID-tarkvara paigaldust.';
 if(!d.readerCount)return 'Ühtegi kaardilugejat ei leitud.';
 if(capability==='decrypt'&&d.pkcs11State!=='ready')return d.pkcs11State==='wrong_architecture'?'PKCS#11 teegi arhitektuur ei sobi. Vajalik on 64-bitine teek.':'Dekrüpteerimise PKCS#11 teek puudub või ei laadu.';
 if(!d.cardPresent)return 'Kaardilugeja on valmis. Sisesta ID-kaart.';
 return s.access?.[capability]==='ask'?'Ühendus on valmis. Kaarditoimingul küsitakse veebilehe luba.':'Ühendus on valmis.';
}
export function installationHelp(userAgent=globalThis.navigator?.userAgent||'',distribution={}){
 const browser=/Firefox\//.test(userAgent)?'Firefox':/Edg\//.test(userAgent)?'Edge':'Chrome';
 const https=value=>{try {const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:undefined;}catch{return undefined;}};
 return {browser,installerUrl:https(distribution.installerUrl),extensionUrl:https(distribution[browser.toLowerCase()+'Url']),instructions:'Paigalda EID-PD tööjaamapakett ja lisa '+browser+'i EID-PD laiendus. Seejärel laadi leht uuesti.',
 documentation:'https://github.com/aarepuusepp/web-eid-pd',idSoftware:'https://www.id.ee/paigalda/'};
}


// Poll only while a consumer is visible. No card data, overlapping calls or background worker.
export function watchStatus(listener, options={}) {
 const interval=Math.max(1000,options.interval||1000);
 const retryInterval=Math.max(interval,options.retryInterval||5000);
 let stopped=false, running=false, timer, generation=0;
 const visible=()=>typeof document==='undefined'||document.visibilityState!=='hidden';
 function schedule(delay){clearTimeout(timer);if(!stopped&&visible())timer=setTimeout(poll,delay);}
 async function poll(){
  if(stopped||!visible())return;
  if(running){schedule(interval);return;}
  running=true;const current=generation;let delay=interval;
  try {const result=await status();if(!stopped&&visible()&&current===generation)listener({status:result,error:null});}
  catch(error){delay=retryInterval;if(!stopped&&visible()&&current===generation)listener({status:null,error});}
  finally {running=false;schedule(delay);}
 }
 function visibility(){generation++;clearTimeout(timer);if(visible()){listener({status:null,error:null});poll();}}
 globalThis.document?.addEventListener('visibilitychange',visibility);
 poll();
 return ()=>{stopped=true;generation++;clearTimeout(timer);globalThis.document?.removeEventListener('visibilitychange',visibility);};
}
