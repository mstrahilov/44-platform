import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [configText, packageText, cargoText, rustSource, nextConfig, notificationCapabilityText, notificationClient, macDmgPackager, dmgBackground, dmgVolumeIcon] = await Promise.all([
  read('src-tauri/tauri.conf.json'),
  read('package.json'),
  read('src-tauri/Cargo.toml'),
  read('src-tauri/src/lib.rs'),
  read('next.config.ts'),
  read('src-tauri/capabilities/desktop-notifications.json'),
  read('src/lib/deviceNotifications.ts'),
  read('scripts/package-branded-mac-dmg.mjs'),
  stat(new URL('../src-tauri/dmg/background.png', import.meta.url)),
  stat(new URL('../src-tauri/dmg/volume-icon.icns', import.meta.url)),
]);
const config = JSON.parse(configText);
const packageJson = JSON.parse(packageText);
const notificationCapability = JSON.parse(notificationCapabilityText);

assert.equal(config.productName, '44OS', 'desktop product name is permanent');
assert.equal(config.identifier, 'com.fortyfour.os44', 'desktop application identifier is permanent');
assert.equal(config.build.frontendDist, 'https://app.44os.com/', 'production opens only the canonical app origin');
assert.equal(config.build.devUrl, 'http://localhost:3000', 'development opens only the explicit local Next origin');
assert.equal(config.app.withGlobalTauri, false, 'remote content never receives the global Tauri bridge');
assert.deepEqual(config.app.security.capabilities, ['desktop-notifications'], 'only the reviewed desktop notification capability is active');
assert.deepEqual(notificationCapability.remote.urls, ['https://app.44os.com/*', 'http://localhost:3000/*'], 'native notification access is origin-bound');
assert.deepEqual(notificationCapability.platforms, ['macOS', 'windows'], 'the notification bridge is desktop-only');
assert.deepEqual(notificationCapability.permissions, [
  'notification:allow-is-permission-granted',
  'notification:allow-request-permission',
  'notification:allow-notify',
], 'the remote app can only check, request, and display notifications');
assert.deepEqual(config.plugins, {}, 'no plugin configuration expands the native scope');
assert.deepEqual(config.app.windows.map(({ width, height, minWidth, minHeight }) => ({ width, height, minWidth, minHeight })), [
  { width: 1280, height: 800, minWidth: 960, minHeight: 640 },
]);
const [mainWindow] = config.app.windows;
assert.equal(mainWindow.decorations, true, 'native Mac traffic-light controls remain available');
assert.equal(mainWindow.titleBarStyle, 'Transparent', 'Mac controls sit in a slim title bar matching the application background');
assert.equal(mainWindow.hiddenTitle, true, 'the redundant native window title stays hidden');
assert.equal(mainWindow.trafficLightPosition, undefined, 'transparent title-bar controls retain native placement');
assert.equal(config.bundle.macOS.signingIdentity, '-', 'Mac packages use only the approved ad-hoc identity');
assert.deepEqual(config.bundle.macOS.dmg, {
  background: './dmg/background.png',
  windowPosition: { x: 360, y: 180 },
  windowSize: { width: 720, height: 440 },
  appPosition: { x: 205, y: 220 },
  applicationFolderPosition: { x: 515, y: 220 },
}, 'the Mac DMG uses the reviewed branded layout');
assert.ok(dmgBackground.size > 0, 'the branded DMG background is present');
assert.ok(dmgVolumeIcon.size > 0, 'the custom mounted-volume icon is present');
assert.match(macDmgPackager, /--volicon/, 'the Mac packager applies the custom mounted-volume icon');
assert.match(macDmgPackager, /--app-drop-link/, 'the Mac packager creates the Applications drag target');
assert.equal(config.bundle.windows.nsis.installMode, 'currentUser', 'Windows uses a standard-user NSIS install');
assert.match(packageJson.devDependencies['@tauri-apps/cli'], /^2\.11\.4$/, 'the reviewed Tauri CLI is pinned exactly');
assert.match(packageJson.dependencies['@tauri-apps/plugin-notification'], /^2\.3\.3$/, 'the reviewed notification JavaScript bridge is pinned exactly');
assert.match(cargoText, /tauri-plugin-notification = "=2\.3\.3"/, 'the reviewed notification Rust bridge is pinned exactly');
for (const script of ['desktop:dev', 'desktop:check', 'desktop:build', 'desktop:package:mac']) {
  assert.equal(typeof packageJson.scripts[script], 'string', `${script} exists`);
}
assert.doesNotMatch(nextConfig, /output\s*:\s*['"]export['"]/, 'the hosted Next application is never converted to a static export');
assert.doesNotMatch(`${configText}\n${cargoText}\n${rustSource}\n${notificationCapabilityText}`, /service[_-]?role|supabase.*secret|stripe.*secret|resend.*secret|printful.*secret|updater|withGlobalTauri['"]?\s*:\s*true/i, 'desktop files contain no secrets, updater, or global bridge');
assert.doesNotMatch(JSON.stringify(notificationCapability.permissions), /(?:shell|process|fs|http|upload|dialog|clipboard):/i, 'the desktop capability contains no broad native permissions');
assert.doesNotMatch(rustSource, /invoke_handler/, 'the Rust entry point exposes no custom commands');
assert.match(rustSource, /plugin\(tauri_plugin_notification::init\(\)\)/, 'the Rust entry point initializes only native notifications');
assert.match(notificationClient, /sendNotification\(\{[\s\S]*title: 'Notifications enabled'/, 'granting permission confirms native delivery immediately');
for (const destination of ['profile', 'studio', 'orders', 'messages', 'settings']) {
  assert.match(rustSource, new RegExp(`MenuItemBuilder::with_id\\("(?:view-)?${destination}"`), `the native Mac menu includes ${destination}`);
}
assert.doesNotMatch(rustSource, /with_id\("(?:log-?out|logout)"/i, 'the native menu does not duplicate Log Out');
assert.match(rustSource, /Submenu::with_items\(app, "Help", true, &\[&support\]\)/, 'the native Mac Help menu links to 44OS Support');
assert.match(await read('src-tauri/src/main.rs'), /cfg_attr\(not\(debug_assertions\), windows_subsystem = "windows"\)/, 'release builds use the Windows GUI subsystem without an extra console window');

console.log('Desktop security contract passed.');
