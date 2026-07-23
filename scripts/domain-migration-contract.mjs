import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const read = file => readFile(path.join(root, file), 'utf8');
const [proxy, rootLayout, landing, releases, siteUrl, metadata, manifest, authConfig, envExample, migration] = await Promise.all([
  read('src/proxy.ts'),
  read('src/app/layout.tsx'),
  read('src/app/marketing-surface/page.tsx'),
  read('src/app/marketing-surface/releases/page.tsx'),
  read('src/lib/siteUrl.ts'),
  read('src/lib/metadata.ts'),
  read('src/app/manifest.webmanifest/route.ts'),
  read('supabase/config.toml'),
  read('.env.example'),
  read('supabase/migrations/20260720060000_application_origin_email_links.sql'),
]);

assert.match(proxy, /MARKETING_SITE_ENABLED/);
assert.match(proxy, /x-forwarded-host[\s\S]*request\.headers\.get\('host'\)/);
assert.match(proxy, /pathname\.startsWith\('\/api\/'\)[\s\S]*applicationRequest\(request\)/);
assert.match(proxy, /NextResponse\.redirect\(destination, 308\)/);
assert.match(proxy, /LOCAL_PREVIEW_PATH = '\/landing-preview'/);
assert.match(proxy, /RELEASES_PATH = '\/releases'[\s\S]*marketingRewrite\(request, INTERNAL_RELEASES_PATH\)/, '44os.com\/releases stays on the editorial marketing origin');
assert.match(proxy, /pathname === '\/download'[\s\S]*status: 404/);
assert.match(proxy, /pathname === '\/manifest\.webmanifest'[\s\S]*status: 404/);
assert.match(rootLayout, /x-44os-surface/);
assert.match(rootLayout, /if \(marketing\)[\s\S]*marketing-surface/);
assert.match(rootLayout, /AUTH_HANDOFF_BOOTSTRAP[\s\S]*absoluteAppUrl\('\/'\)/);
assert.equal((rootLayout.match(/\$\{marketingUrl\}\/og\.png/g) ?? []).length, 2);
assert.doesNotMatch(rootLayout, /marketing\/og\.png/);
assert.match(landing, />Open App</g);
assert.match(landing, /href="\/releases">Release Notes</, 'marketing footer exposes the public release archive');
assert.match(releases, /PUBLIC_RELEASES[\s\S]*Open App/, 'release notes use structured history and retain the app handoff');
assert.doesNotMatch(landing, />Download(?: App)?</);
assert.doesNotMatch(landing, /MusicPlayer|WebPush|AnalyticsConsent|supabase/i);
assert.match(siteUrl, /DEFAULT_APP_URL = 'https:\/\/app\.44os\.com'/);
assert.match(siteUrl, /DEFAULT_MARKETING_URL = 'https:\/\/44os\.com'/);
assert.match(metadata, /getAppMetadataBaseUrl/);
assert.match(manifest, /id: '\/'[\s\S]*start_url: '\/'[\s\S]*scope: '\/'/);
for (const url of [
  'https://app.44os.com/',
  'https://app.44os.com/settings',
  'https://app.44os.com/account/recovery',
]) assert.ok(authConfig.includes(url), `Supabase Auth allowlist contains ${url}`);
assert.match(envExample, /NEXT_PUBLIC_APP_URL=https:\/\/app\.44os\.com/);
assert.match(envExample, /NEXT_PUBLIC_MARKETING_URL=https:\/\/44os\.com/);
assert.match(envExample, /MARKETING_SITE_ENABLED=false/);
assert.doesNotMatch(envExample, /NEXT_PUBLIC_SITE_URL/);
for (const route of ['/orders', '/support', '/studio', '/admin/people/', '/admin/content/']) {
  assert.ok(migration.includes(`https://app.44os.com${route}`), `forward migration moves ${route} email actions to the app origin`);
}

const activeRoots = ['src', 'scripts'];
const sourceFiles = [];
async function walk(directory) {
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(relative);
    else if (/\.(?:ts|tsx|js|mjs)$/.test(entry.name)) sourceFiles.push(relative);
  }
}
for (const directory of activeRoots) await walk(directory);
for (const file of sourceFiles) {
  if (file === 'scripts/domain-migration-contract.mjs') continue;
  const source = await read(file);
  assert.doesNotMatch(source, /NEXT_PUBLIC_SITE_URL/, `${file} does not use the retired ambiguous origin variable`);
}

console.log(`Domain migration contract passed: host routing, origin isolation, Auth redirects, PWA scope, and ${sourceFiles.length} active source files.`);
