export declare const libraryVersion: string;
export declare const ErrorCode: Readonly<Record<string,string>>;
export interface Options { timeout?:number; userInteractionTimeout?:number; lang?:string; mode?:'contact'|'nfc'; can?:string; fileName?:string; }
export interface PersonalData { surname:string; givenName:string; personalCode:string; documentNumber?:string; documentNr?:string; birthDate?:string; issueDate?:string; dateOfBirth?:string; placeOfBirth?:string; issuedDate?:string; expiryDate?:string; citizenship?:string; sex?:string; source?:string; }
export interface CardResult { reader:string; duration:string; ok?:boolean; data?:PersonalData; error?:string; }
export interface ReadResult {ok:boolean;data?:PersonalData;error?:string;results?:CardResult[];}
export interface Status {protocol:1;nfcCryptoSupported?:boolean;nfcCryptoBridge?:boolean;library:string;extension:string;nativeApp:string;cdocVersions:string[];access:{personalData:'ask'|'allow'|'deny';decrypt:'ask'|'allow'|'deny'};diagnostics:{pcscAvailable:boolean;nfcReaderCount?:number;contactReaderCount?:number;nfcCardPresent?:boolean;contactCardPresent?:boolean;readerCount:number;cardPresent:boolean;pkcs11State:'missing'|'invalid'|'wrong_architecture'|'ready'};}
export declare function status():Promise<Status>;
export declare function readPersonalData(options?:Options):Promise<ReadResult>;
export declare function readAllReaders(options?:Options):Promise<ReadResult>;
export declare function getDecryptCertificate(options?:Options):Promise<{certificate?:string;certificatePem:string;thumbprintSha256:string;supportedKeyTypes?:string[];commonName?:string;subjectSerial?:string;serialNumber?:string}>;
export declare function unwrapTransportKey(certificate:string,challenge:unknown,options?:Options):Promise<{contentEncryptionKey:string}>;
export declare function describeStatus(status:Status,capability?:'personalData'|'decrypt',mode?:'contact'|'nfc'):string;
export declare function installationHelp(userAgent?:string,distribution?:{installerUrl?:string;chromeUrl?:string;edgeUrl?:string;firefoxUrl?:string}):{installerUrl?:string;extensionUrl?:string;browser:string;instructions:string;documentation:string;idSoftware:string};


export declare function watchStatus(listener:(state:{status:Status|null;error:Error|null})=>void,options?:{interval?:number;retryInterval?:number}):()=>void;
