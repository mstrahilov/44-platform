import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [page, localAction, route, artifacts, importer, packageText, proxy, sitemap, envExample] = await Promise.all([
  read('src/app/marketing-surface/download/page.tsx'),
  read('src/app/marketing-surface/download/LocalWindowsDownloadAction.tsx'),
  read('src/app/api/desktop/download/[platform]/route.ts'),
  read('src/lib/desktopArtifacts.ts'),
  read('scripts/import-windows-installer.mjs'),
  read('package.json'),
  read('src/proxy.ts'),
  read('src/app/sitemap.ts'),
  read('.env.example'),
]);

assert.match(page, /DESKTOP_MAC_DOWNLOAD_URL/, 'Mac publication requires an explicit production artifact URL');
assert.match(page, /DESKTOP_WINDOWS_DOWNLOAD_URL/, 'Windows publication requires an explicit production artifact URL');
assert.match(page, /url\.protocol === 'https:'/, 'production artifact configuration rejects unsafe URL schemes');
assert.match(page, /publishedMacDownload = '\/downloads\/44OS-0\.1\.0-mac-universal\.dmg'/, 'production has one immutable Mac artifact path');
assert.match(page, /publishedWindowsDownload = '\/downloads\/44OS-0\.1\.0-windows-x64-setup\.exe'/, 'production has one immutable Windows artifact path');
assert.match(page, /NODE_ENV === 'production' \? publishedMacDownload : localMacDownload/, 'Mac production and local review paths are explicit');
assert.match(page, /NODE_ENV === 'production' \? publishedWindowsDownload : localWindowsDownload/, 'Windows production and local review paths are explicit');
assert.match(localAction, /method: 'HEAD'[\s\S]*response\.ok[\s\S]*href=\{href\}>Download/, 'the retired local probe remains safe if reused');
assert.match(page, /not been notarized by Apple/, 'Mac notarization status is disclosed honestly');
assert.match(page, /support\.apple\.com\/guide\/mac-help/, 'Mac warning links to Apple guidance');
assert.match(page, /learn\.microsoft\.com\/windows\/apps\/package-and-deploy\/smartscreen-reputation/, 'Windows warning links to Microsoft guidance');
assert.match(route, /NODE_ENV === 'production'[\s\S]*status: 404/, 'the local artifact route can never serve a production installer');
assert.match(route, /export async function HEAD[\s\S]*await stat/, 'localhost checks artifact readiness without downloading the installer');
assert.match(artifacts, /44OS_0\.1\.0_universal\.dmg/, 'the local route exposes only the reviewed fixed Mac artifact');
assert.match(artifacts, /windows-x64\/44OS-0\.1\.0-windows-x64-setup\.exe/, 'the local route exposes only the fixed imported Windows artifact');
assert.doesNotMatch(route, /\.\.\/|readdir|glob|DESKTOP_.*DOWNLOAD_URL/, 'the local artifact route cannot traverse or proxy arbitrary files');
assert.match(importer, /50450000[\s\S]*0x014c[\s\S]*0x8664/, 'the Windows importer rejects non-PE files and accepts only recognized NSIS-compatible PE machines');
assert.match(importer, /src-tauri\/target\/windows-x64\/44OS-0\.1\.0-windows-x64-setup\.exe/, 'the Windows importer writes only the fixed ignored review path');
assert.match(packageText, /"desktop:import:windows": "node scripts\/import-windows-installer\.mjs"/, 'the reviewed Windows artifact has a deterministic local import command');
assert.match(proxy, /INTERNAL_DOWNLOAD_PATH[\s\S]*marketingRewrite\(request, INTERNAL_DOWNLOAD_PATH\)/, 'the public download page remains on the marketing surface');
assert.match(sitemap, /getMarketingUrl\(\)\}\/download/, 'the accepted download route is discoverable');
for (const name of ['DESKTOP_RELEASE_VERSION', 'DESKTOP_MAC_DOWNLOAD_URL', 'DESKTOP_WINDOWS_DOWNLOAD_URL']) {
  assert.match(envExample, new RegExp(`^${name}=`, 'm'), `${name} has a documented server-only deployment boundary`);
}

for (const [artifactPath, minimumBytes] of [
  ['public/downloads/44OS-0.1.0-mac-universal.dmg', 5_000_000],
  ['public/downloads/44OS-0.1.0-windows-x64-setup.exe', 1_000_000],
]) {
  const artifact = await stat(new URL(`../${artifactPath}`, import.meta.url));
  assert.ok(artifact.isFile() && artifact.size >= minimumBytes, `${artifactPath} is a complete published artifact`);
}

console.log('Desktop download contract passed.');
