import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';
import { applicationCssHref, readApplicationCss } from './application-css.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = transformSync(readApplicationCss(), {
  loader: 'css',
  minifyWhitespace: true,
  legalComments: 'inline',
}).code;
const href = applicationCssHref(css);
const output = resolve(root, `public${href}`);
const legacyOutput = resolve(root, 'public/_surface/44os-app.css');
const versionedDir = dirname(output);

await mkdir(versionedDir, { recursive: true });
await Promise.all([writeFile(output, css), writeFile(legacyOutput, css)]);
await Promise.all((await readdir(versionedDir))
  .filter(file => /^44os-app\.[a-f\d]{20}\.css$/.test(file) && resolve(versionedDir, file) !== output)
  .map(file => unlink(resolve(versionedDir, file))));
console.log(`Prepared application-only CSS (${Buffer.byteLength(css)} bytes).`);
