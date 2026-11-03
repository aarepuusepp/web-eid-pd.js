import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import * as sdk from '../../../index.js';
import * as esm from '../dist/es/web-eid-decrypt.js';

const names = ['ErrorCode', 'getDecryptCertificate', 'libraryVersion', 'status', 'unwrapTransportKey'].sort();
const variants = { esm, commonjs: createRequire(import.meta.url)('../dist/umd/web-eid-decrypt.cjs') };
for (const path of ['iife/web-eid-decrypt.min.js', 'umd/web-eid-decrypt.js']) {
  const context = {};
  runInNewContext(readFileSync(new URL(`../dist/${path}`, import.meta.url), 'utf8'), context);
  variants[path] = context.EidPdDecrypt;
}
for (const [name, api] of Object.entries(variants)) {
  test(`${name} exposes the compatibility API and SDK error codes`, async () => {
    assert.deepEqual(Object.keys(api).sort(), names);
    assert.equal(api.libraryVersion, sdk.libraryVersion);
    assert.deepEqual(JSON.parse(JSON.stringify(api.ErrorCode)), sdk.ErrorCode);
    await assert.rejects(api.status(), { code: sdk.ErrorCode.ERR_EIDPD_CONTEXT_INSECURE });
  });
}
