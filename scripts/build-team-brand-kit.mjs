import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const provisional = process.argv.includes('--provisional-local');
assert.ok(provisional, 'Brand Kit packaging requires --provisional-local until the owner approves final masters.');

const version = '0.1-provisional';
const outputDir = path.join(root, 'artifacts', 'team-brand-kit');
const stage = path.join(outputDir, `44-brand-kit-${version}`);
const archive = path.join(outputDir, `44-brand-kit-${version}.zip`);
assert.ok(stage.startsWith(path.join(root, 'artifacts', 'team-brand-kit')), 'Refusing an unsafe staging path.');

await mkdir(outputDir, { recursive: true });
await rm(stage, { recursive: true, force: true });
await rm(archive, { force: true });
await mkdir(path.join(stage, 'logos'), { recursive: true });
await mkdir(path.join(stage, '44os-icons'), { recursive: true });
await mkdir(path.join(stage, 'fonts', 'inter'), { recursive: true });

await cp(path.join(root, 'Other', 'brand-kit'), stage, { recursive: true });
const blackLogo = await readFile(path.join(root, 'public', 'icons', 'logo', '44-BLACK.svg'), 'utf8');
await writeFile(path.join(stage, 'logos', '44-black.svg'), blackLogo.replace(/22px/g, '220px'));
await writeFile(path.join(stage, 'logos', '44-white.svg'), blackLogo.replace(/22px/g, '220px').replaceAll('#000000', '#FFFFFF'));
await cp(path.join(root, 'public', 'icon-192.png'), path.join(stage, '44os-icons', '44os-icon-192.png'));
await cp(path.join(root, 'public', 'icon-512.png'), path.join(stage, '44os-icons', '44os-icon-512.png'));
await cp(path.join(root, 'public', 'maskable-icon-512.png'), path.join(stage, '44os-icons', '44os-maskable-512.png'));
await cp(path.join(root, 'node_modules', '@fontsource-variable', 'inter', 'files', 'inter-latin-wght-normal.woff2'), path.join(stage, 'fonts', 'inter', 'Inter-Variable-Latin.woff2'));
await cp(path.join(root, 'node_modules', '@fontsource-variable', 'inter', 'files', 'inter-latin-wght-italic.woff2'), path.join(stage, 'fonts', 'inter', 'Inter-Variable-Latin-Italic.woff2'));
await cp(path.join(root, 'node_modules', '@fontsource-variable', 'inter', 'LICENSE'), path.join(stage, 'fonts', 'inter', 'OFL.txt'));

async function filesBelow(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'manifest-sha256.json') continue;
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(path.join(directory, entry.name), relative));
    else files.push(relative);
  }
  return files.sort();
}

const files = await filesBelow(stage);
const manifest = [];
for (const relative of files) {
  const full = path.join(stage, relative);
  const bytes = await readFile(full);
  const details = await stat(full);
  manifest.push({ path: relative.split(path.sep).join('/'), bytes: details.size, sha256: createHash('sha256').update(bytes).digest('hex') });
}
await writeFile(path.join(stage, 'manifest-sha256.json'), `${JSON.stringify({ version, provisional: true, files: manifest }, null, 2)}\n`);

const zipped = spawnSync('zip', ['-qr', archive, path.basename(stage)], { cwd: outputDir, encoding: 'utf8' });
if (zipped.status !== 0) throw new Error(zipped.stderr || 'zip failed');
const archiveBytes = await readFile(archive);
console.log(JSON.stringify({ archive, bytes: archiveBytes.length, sha256: createHash('sha256').update(archiveBytes).digest('hex'), files: manifest.length }, null, 2));
