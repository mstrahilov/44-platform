import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sources = [
  resolve(root, 'src/app/globals.css'),
  resolve(root, 'src/styles/44-ui/canonical-system.css'),
];
const output = resolve(root, 'public/_surface/44os-app.css');
const css = (await Promise.all(sources.map(path => readFile(path, 'utf8')))).join('\n\n');

await mkdir(dirname(output), { recursive: true });
await writeFile(output, css, 'utf8');
console.log(`Prepared application-only CSS (${Buffer.byteLength(css)} bytes).`);
