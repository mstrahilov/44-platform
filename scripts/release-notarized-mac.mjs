#!/usr/bin/env node

import { cp, mkdir, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'darwin') {
  throw new Error('The notarized Mac release must be created on macOS.');
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(join(projectRoot, 'src-tauri', 'tauri.conf.json'), 'utf8'));
const version = config.version;
const target = 'universal-apple-darwin';
const bundleRoot = join(projectRoot, 'src-tauri', 'target', target, 'release', 'bundle');
const appPath = join(bundleRoot, 'macos', '44OS.app');
const dmgPath = join(bundleRoot, 'dmg', `44OS_${version}_universal.dmg`);
const publicPath = join(projectRoot, 'public', 'downloads', `44OS-${version}-mac-universal.dmg`);
const notaryProfile = process.env.NOTARYTOOL_KEYCHAIN_PROFILE?.trim() || '44os-notary';
const publish = process.argv.includes('--publish');

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    env: options.env ?? process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = options.capture ? `\n${result.stderr || result.stdout}` : '';
    throw new Error(`${command} failed with exit code ${result.status}.${detail}`);
  }
  return options.capture ? result.stdout : '';
};

const identityOutput = run('security', ['find-identity', '-v', '-p', 'codesigning'], { capture: true });
const developerIdentities = [...identityOutput.matchAll(/"(Developer ID Application:[^"]+)"/g)].map(match => match[1]);
const configuredIdentity = process.env.APPLE_SIGNING_IDENTITY?.trim();
const identity = configuredIdentity || (developerIdentities.length === 1 ? developerIdentities[0] : null);

if (!identity?.startsWith('Developer ID Application:')) {
  throw new Error(
    developerIdentities.length === 0
      ? 'No Developer ID Application identity is installed in Keychain. Create one in Xcode → Settings → Apple Accounts → your team → Manage Certificates.'
      : 'Multiple Developer ID Application identities are installed. Set APPLE_SIGNING_IDENTITY to the exact identity to use.',
  );
}
if (!identityOutput.includes(`"${identity}"`)) {
  throw new Error('APPLE_SIGNING_IDENTITY does not match a valid code-signing identity in Keychain.');
}

const configuredNotaryKeychain = process.env.NOTARYTOOL_KEYCHAIN?.trim();
const defaultNotaryKeychain = run('security', ['default-keychain', '-d', 'user'], { capture: true }).trim().replace(/^"|"$/g, '');
const notaryKeychain = configuredNotaryKeychain || defaultNotaryKeychain;
if (!notaryKeychain) throw new Error('No user Keychain is available for the notarization profile.');

// Verify that the named Keychain profile exists before spending time on a universal build.
run('xcrun', ['notarytool', 'history', '--keychain-profile', notaryProfile, '--keychain', notaryKeychain, '--output-format', 'json'], { capture: true });

const tauriEnv = { ...process.env, APPLE_SIGNING_IDENTITY: identity };
for (const name of ['APPLE_ID', 'APPLE_PASSWORD', 'APPLE_TEAM_ID', 'APPLE_API_ISSUER', 'APPLE_API_KEY', 'APPLE_API_KEY_PATH']) {
  delete tauriEnv[name];
}

run(join(projectRoot, 'node_modules', '.bin', 'tauri'), ['build', '--target', target, '--bundles', 'app'], { env: tauriEnv });
run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', appPath]);

run(process.execPath, [join(projectRoot, 'scripts', 'package-branded-mac-dmg.mjs'), '--app', appPath, '--output', dmgPath, '--force']);
run('codesign', ['--force', '--timestamp', '--sign', identity, dmgPath]);
run('codesign', ['--verify', '--verbose=2', dmgPath]);

const submission = run('xcrun', [
  'notarytool', 'submit', dmgPath,
  '--keychain-profile', notaryProfile,
  '--keychain', notaryKeychain,
  '--wait',
  '--output-format', 'json',
], { capture: true });
const result = JSON.parse(submission);
if (result.status !== 'Accepted') {
  throw new Error(`Apple notarization returned ${result.status ?? 'an unknown status'} for submission ${result.id ?? 'unknown'}.`);
}

run('xcrun', ['stapler', 'staple', '--verbose', dmgPath]);
run('xcrun', ['stapler', 'validate', '--verbose', dmgPath]);
run('spctl', ['--assess', '--type', 'open', '--context', 'context:primary-signature', '--verbose=2', dmgPath]);

const mountRoot = await mkdtemp(join(tmpdir(), '44os-notarized-dmg-'));
try {
  run('hdiutil', ['attach', '-nobrowse', '-readonly', '-mountpoint', mountRoot, dmgPath]);
  const mountedApp = join(mountRoot, basename(appPath));
  await stat(mountedApp);
  run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', mountedApp]);
  run('spctl', ['--assess', '--type', 'execute', '--verbose=2', mountedApp]);
} finally {
  spawnSync('hdiutil', ['detach', mountRoot], { cwd: projectRoot, stdio: 'ignore' });
  await rm(mountRoot, { recursive: true, force: true });
}

const digest = createHash('sha256').update(await readFile(dmgPath)).digest('hex');
if (publish) {
  await mkdir(dirname(publicPath), { recursive: true });
  await cp(dmgPath, publicPath);
  console.log(`Verified installer copied to ${publicPath}`);
}

console.log(`Notarized 44OS ${version} installer: ${dmgPath}`);
console.log(`SHA-256: ${digest}`);
if (!publish) console.log('Re-run with --publish to replace the local website artifact after review.');
