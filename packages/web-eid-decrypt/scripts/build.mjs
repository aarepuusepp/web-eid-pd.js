import { build } from 'esbuild';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const options = { entryPoints: [resolve(root, 'src/index.js')], bundle: true, target: 'es2022', platform: 'browser' };
await build({ ...options, format: 'esm', outfile: resolve(root, 'dist/es/web-eid-decrypt.js') });
await build({ ...options, format: 'iife', globalName: 'EidPdDecrypt', minify: true, outfile: resolve(root, 'dist/iife/web-eid-decrypt.min.js') });
// Preserve both the browser-global and CommonJS branches of the legacy UMD API.
const umd = await build({ ...options, format: 'cjs', write: false });
const source = `(function(root,factory){if(typeof module==='object'&&module.exports){module.exports=factory();}else{root.EidPdDecrypt=factory();}})(typeof globalThis!=='undefined'?globalThis:this,function(){var module={exports:{}};var exports=module.exports;\n${umd.outputFiles[0].text}\nreturn module.exports;});\n`;
mkdirSync(resolve(root, 'dist/umd'), { recursive: true });
for (const ext of ['js', 'cjs']) writeFileSync(resolve(root, `dist/umd/web-eid-decrypt.${ext}`), source);
for (const [dir, ext] of [['es', 'ts'], ['umd', 'cts']]) {
  copyFileSync(resolve(root, '../../index.d.ts'), resolve(root, `dist/${dir}/sdk.d.${ext}`));
  writeFileSync(resolve(root, `dist/${dir}/web-eid-decrypt.d.${ext}`), `export { ErrorCode, status, getDecryptCertificate, unwrapTransportKey, libraryVersion } from './sdk.${ext === 'cts' ? 'cjs' : 'js'}';\n`);
}
