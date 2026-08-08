#!/usr/bin/env node

import { cp, mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundleRoot = join(projectRoot, 'src-tauri', 'target', 'universal-apple-darwin', 'release', 'bundle');
const defaultApp = join(bundleRoot, 'macos', '44OS.app');
const defaultOutput = join(bundleRoot, 'dmg', '44OS_0.1.0_universal.dmg');
const bundleScript = join(bundleRoot, 'dmg', 'bundle_dmg.sh');
const background = join(projectRoot, 'src-tauri', 'dmg', 'background.png');
const volumeIcon = join(projectRoot, 'src-tauri', 'dmg', 'volume-icon.icns');

const args = process.argv.slice(2);
const takeValue = flag => {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1];
};

const appPath = resolve(takeValue('--app') ?? defaultApp);
const outputPath = resolve(takeValue('--output') ?? defaultOutput);
const force = args.includes('--force');

const requirePath = async (path, label) => {
  try {
    await stat(path);
  } catch {
    throw new Error(`${label} was not found at ${path}`);
  }
};

await Promise.all([
  requirePath(appPath, '44OS application bundle'),
  requirePath(bundleScript, 'Tauri DMG bundler'),
  requirePath(background, 'DMG background'),
  requirePath(volumeIcon, 'DMG volume icon'),
]);

if (force) {
  await rm(outputPath, { force: true });
} else {
  try {
    await stat(outputPath);
    throw new Error(`Output already exists at ${outputPath}. Pass --force to replace that exact file.`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

await mkdir(dirname(outputPath), { recursive: true });
const stagingDirectory = await mkdtemp(join(tmpdir(), '44os-branded-dmg-'));
const stagedApp = join(stagingDirectory, basename(appPath));

try {
  await cp(appPath, stagedApp, { recursive: true, preserveTimestamps: true });
  const result = spawnSync(bundleScript, [
    '--volname', '44OS',
    '--volicon', volumeIcon,
    '--background', background,
    '--window-pos', '360', '180',
    '--window-size', '720', '440',
    '--text-size', '14',
    '--icon-size', '128',
    '--icon', basename(stagedApp), '205', '220',
    '--hide-extension', basename(stagedApp),
    '--app-drop-link', '515', '220',
    outputPath,
    stagingDirectory,
  ], { cwd: projectRoot, encoding: 'utf8', stdio: 'inherit' });

  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`DMG packaging failed with exit code ${result.status}.`);
  console.log(`Branded Mac installer created at ${outputPath}`);
} finally {
  await rm(stagingDirectory, { recursive: true, force: true });
}
