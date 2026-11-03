# web-eid-pd.js 1.0.3

Shared browser SDK for Visitor and digisign-encrypt. Bundle this npm package with
the web application; users install the EID-PD native package and browser extension.

```js
import { status, readAllReaders, describeStatus } from 'web-eid-pd.js';
console.log(describeStatus(await status())); // no personal data or PIN
const result = await readAllReaders(); // extension site consent, then card read
```

Requires HTTPS, a top-level page, protocol 1 and EID-PD extension/native 2.1+ (major 2).
API: status, readPersonalData, readAllReaders, getDecryptCertificate,
unwrapTransportKey. Type declarations accompany the package. Errors expose a
stable ERR_EIDPD_* code. PIN and PKCS#11 settings belong to the workstation.

## Install and develop

This repository is the canonical SDK source. Applications and extension tests use
a versioned release package; do not maintain copies in `vendor` folders:

```sh
npm install --save-exact --allow-remote=root https://github.com/aarepuusepp/web-eid-pd.js/releases/download/v1.0.3/web-eid-pd.js-1.0.3.tgz
```

With npm 12, set `allow-remote=root` in the application's `.npmrc` for subsequent
`npm ci` runs. This permits only URL dependencies declared directly by the project.
Commit the application's lockfile, which records the package URL and integrity hash. The root
package is `web-eid-pd.js`; `packages/web-eid-decrypt` contains the legacy
`web-eid-decrypt.js` compatibility package (1.1.1). Its ESM, CommonJS/UMD and IIFE
bundles are generated from the same SDK source and have no runtime dependencies.
For new integrations use the root SDK. Do not load both independently bundled
SDKs into one page; they have separate in-memory request locks.

```sh
npm ci
npm run validate
```

Validation runs SDK tests, builds compatibility formats, tests them, and installs
both tarballs in an independent consumer. Tarballs are written to `artifacts/`.
GitHub CI repeats validation on Linux and Windows. Pushing a `v*` tag publishes
both tarballs to a GitHub Release after all checks pass; npm registry publishing
is not configured. An offline application build can install a downloaded tarball
with `npm install ./web-eid-pd.js-1.0.3.tgz` (its other dependencies must also be cached).

SDK history was extracted with `git subtree split --prefix=web-eid-pd` from
`eid-pd-extension` at `0b78d8b9711304fbb01f0303ff43da871b4aed51`.
The split retains the original SDK authors, timestamps and messages; Git commit
IDs change because unrelated extension files are excluded.

## Source layout and generated files

Maintain the SDK in root `index.js` and `index.d.ts`, and the compatibility adapter
in `packages/web-eid-decrypt`. There is no separate sibling `web-eid-decrypt.js`
checkout or directory link. The extension and applications install released
packages; their old `web-eid-pd`/`vendor/web-eid-pd` copies have been removed.

`node_modules/`, `packages/web-eid-decrypt/dist/` and `artifacts/*.tgz` are ignored,
reproducible dependencies/build outputs. Recreate them with `npm ci` and
`npm run validate`. Keep migration backups outside this source tree; the temporary
`artifacts/legacy-decrypt-before-migration` backup is no longer needed.
See [installer documentation](https://github.com/aarepuusepp/eid-pd-installer)
for workstation installation and administrator policy.

Automatic presence indicator:

```js
import { watchStatus } from 'web-eid-pd.js';
const stop = watchStatus(({status, error}) => {
  const ready = !!status?.diagnostics.cardPresent && status.access.personalData !== 'deny';
  // Update an icon; do not call a personal-data method from this callback.
});
// Call stop() when the view unmounts.
```

Visible views check once per second after each completed response. Hidden views
pause; unavailable components retry after five seconds. Requests never overlap
within a watcher. Presence is a reader/card connection indicator, not a check of
certificate validity or PIN. No cardholder information is read by this watcher.

## NFC cryptography

getDecryptCertificate({mode: 'nfc', can, lang}) reads the public encryption
recipient certificate without PIN. unwrapTransportKey(certificate, challenge,
{mode: 'nfc', can, lang, fileName}) invokes the native PIN dialog and key operation.
Use reader and extension 2.1.5. Both nfcCryptoSupported and nfcCryptoBridge must
be present; an old component yields ERR_EIDPD_VERSION_MISMATCH.

Keep CAN only for the current operation, clear the field afterwards, and never
send it to the application's backend or store it. PIN is never an SDK option.
describeStatus(status, 'decrypt', 'nfc') reports the selected reader mode.
Real-card compatibility and format coverage are documented by the reader.
