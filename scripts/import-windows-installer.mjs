import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, open, stat } from 'node:fs/promises';
import path from 'node:path';

const sourceArgument = process.argv[2];
assert.ok(sourceArgument, 'Usage: npm run desktop:import:windows -- /absolute/path/to/44OS-windows-installer.exe');

const source = path.resolve(sourceArgument);
assert.equal(path.extname(source).toLowerCase(), '.exe', 'The Windows artifact must be an .exe file.');

const sourceStat = await stat(source);
assert.ok(sourceStat.isFile(), 'The Windows artifact must be a regular file.');
assert.ok(sourceStat.size > 100_000, 'The Windows artifact is unexpectedly small.');

const handle = await open(source, 'r');
try {
  const dosHeader = Buffer.alloc(64);
  await handle.read(dosHeader, 0, dosHeader.length, 0);
  assert.equal(dosHeader.subarray(0, 2).toString('ascii'), 'MZ', 'The file is not a Windows executable.');

  const peOffset = dosHeader.readUInt32LE(0x3c);
  assert.ok(peOffset > 0 && peOffset + 6 <= sourceStat.size, 'The Windows executable header is invalid.');
  const peHeader = Buffer.alloc(6);
  await handle.read(peHeader, 0, peHeader.length, peOffset);
  assert.equal(peHeader.subarray(0, 4).toString('hex'), '50450000', 'The PE signature is invalid.');
  const machine = peHeader.readUInt16LE(4);
  assert.ok(
    machine === 0x014c || machine === 0x8664,
    'The installer must use a recognized x86-compatible or x64 Windows PE stub.',
  );
} finally {
  await handle.close();
}

const digest = createHash('sha256');
for await (const chunk of createReadStream(source)) digest.update(chunk);
const checksum = digest.digest('hex');

const destination = path.resolve('src-tauri/target/windows-x64/44OS-0.1.0-windows-x64-setup.exe');
await mkdir(path.dirname(destination), { recursive: true });
if (source !== destination) await copyFile(source, destination);

console.log(`Imported ${path.basename(destination)} (${sourceStat.size} bytes).`);
console.log(`SHA-256 ${checksum}`);
