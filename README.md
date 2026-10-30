# web-eid-pd.js

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

Run `npm test`. Use `npm pack` to create a distributable tarball for your registry;
workspace applications currently use file dependencies. See
`../eid-pd-installer/DEPLOYMENT.md` for installation and administrator policy.

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
