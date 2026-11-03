# web-eid-decrypt.js 1.1.1

Legacy compatibility API built from the canonical SDK in this repository.
Exports: `ErrorCode`, `status`, `getDecryptCertificate`, `unwrapTransportKey`,
and `libraryVersion` (the underlying SDK version, currently 1.0.3).

Build from a clean repository checkout with `npm ci && npm run validate` at the
repository root. Install the resulting `web-eid-decrypt.js-1.1.1.tgz` from
`artifacts/` or the GitHub Release. No sibling directory or runtime dependency
is needed by the installed package.

ESM and CommonJS consumers import/require `web-eid-decrypt.js`. Browser script
consumers use `dist/iife/web-eid-decrypt.min.js` or `dist/umd/web-eid-decrypt.js`,
which expose `globalThis.EidPdDecrypt`. TypeScript declarations accompany both
module formats. New applications should use `web-eid-pd.js` directly.

Certificate lookup reads a public certificate without PIN. Transport-key unwrap
delegates to the extension and local reader; PIN entry occurs in the native
dialog. This package does not parse or decrypt complete CDOC containers. Format
support depends on the caller and the reader. For NFC pass `mode`, `can` and
`lang`; never persist CAN or send it to the server. HTTPS top-level pages and
compatible EID-PD extension/native components are required.
