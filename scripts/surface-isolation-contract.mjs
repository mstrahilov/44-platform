import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [rootLayout, applicationShell, analytics, surfaceBase, applicationCss, preparation] = await Promise.all([
  read('src/app/layout.tsx'),
  read('src/app/ApplicationShell.tsx'),
  read('src/components/AnalyticsConsent.tsx'),
  read('src/app/surface-base.css'),
  read('src/app/globals.css'),
  read('scripts/prepare-surface-css.mjs'),
]);

assert.doesNotMatch(rootLayout, /globals\.css|canonical-system\.css|Sidebar|MusicPlayer|WebPushNotificationPrompt/, 'the shared root does not statically import application shell assets');
assert.match(rootLayout, /await import\('\.\/ApplicationShell'\)/, 'the application shell loads only for application requests');
assert.match(rootLayout, /marketing[\s\S]*AnalyticsConsentBoundary/, 'marketing retains the approved lightweight analytics consent boundary');
for (const required of ['Sidebar', 'MusicPlayer', 'WebPushNotificationPrompt']) {
  assert.ok(applicationShell.includes(required), `the application-only shell owns ${required}`);
}
assert.match(applicationShell, /href="\/_surface\/44os-app\.css\?v=20260807-[a-z0-9-]+"/, 'only the application shell links the cache-busted generated application stylesheet');
assert.doesNotMatch(applicationShell, /import ['"].*globals\.css|import ['"].*canonical-system\.css/, 'application CSS is not hoisted through a component import');
assert.match(preparation, /src\/app\/globals\.css[\s\S]*src\/styles\/44-ui\/canonical-system\.css[\s\S]*public\/_surface\/44os-app\.css/, 'the generated stylesheet preserves the accepted application CSS source order');
assert.match(analytics, /analytics-consent-button/, 'analytics consent has styling independent of application button CSS');
assert.doesNotMatch(surfaceBase, /app-frame|app-shell|sidebar|music-player/, 'the shared surface stylesheet contains no application shell rules');
assert.match(applicationCss, /--os-app-frame-inset:\s*0px/, 'web and native desktop shells use the full window edge');
assert.match(applicationCss, /\.app-shell\s*\{[\s\S]*?border-radius:\s*0;[\s\S]*?border:\s*0;[\s\S]*?box-shadow:\s*none;/, 'the shared desktop shell does not draw a second inset frame');

console.log('Surface isolation contract passed.');
