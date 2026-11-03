import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = resolve(root, 'artifacts');
mkdirSync(artifacts, { recursive: true });
// npm_execpath works on Windows too, without a shell or command-string quoting.
const npm = (args, cwd) => execFileSync(process.execPath, [process.env.npm_execpath, ...args], { cwd, encoding: 'utf8' });
const packed = [root, resolve(root, 'packages/web-eid-decrypt')].map(cwd => {
  const result = JSON.parse(npm(['pack', '--json', '--pack-destination', artifacts], cwd));
  return resolve(artifacts, Object.values(result)[0].filename);
});
const consumer = mkdtempSync(resolve(tmpdir(), 'eidpd-package-test-'));
writeFileSync(resolve(consumer, 'package.json'), '{"private":true,"type":"module"}\n');
npm(['install', '--ignore-scripts', '--no-audit', '--no-fund', ...packed], consumer);
writeFileSync(resolve(consumer, 'check.mjs'), `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as sdk from 'web-eid-pd.js';
import * as compat from 'web-eid-decrypt.js';
const cjs = createRequire(import.meta.url)('web-eid-decrypt.js');
assert.equal(sdk.libraryVersion, '1.0.3');
assert.equal(compat.libraryVersion, sdk.libraryVersion);
assert.equal(cjs.libraryVersion, sdk.libraryVersion);
await assert.rejects(sdk.status(), {code: 'ERR_EIDPD_CONTEXT_INSECURE'});
await assert.rejects(compat.status(), {code: 'ERR_EIDPD_CONTEXT_INSECURE'});
await assert.rejects(cjs.status(), {code: 'ERR_EIDPD_CONTEXT_INSECURE'});
`);
execFileSync(process.execPath, ['check.mjs'], { cwd: consumer, stdio: 'inherit' });
console.log('Both tarballs installed and passed ESM/CommonJS smoke checks in an independent consumer.');
