import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [home, layout, landing, robots, sitemap, search, profile, metadata] = await Promise.all([
  readFile(new URL('../src/app/page.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/layout.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/marketing-surface/page.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/robots.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/sitemap.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/search/layout.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/profile/[username]/page.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/metadata.ts', import.meta.url), 'utf8'),
]);

assert.match(home, /title: \{ absolute: '44OS' \}/, 'app root uses the 44OS browser-tab identity');
assert.match(home, /title: '44OS'/, 'app root shared-link title is 44OS');
assert.match(layout, /alternateName: '44 OS'/, 'app WebSite schema supplies an alternate site name');
assert.match(layout, /siteName: '44OS'/, 'Open Graph consistently identifies 44OS');
assert.match(landing, /'@graph'/, 'marketing schema uses a connected entity graph');
assert.match(landing, /'@type': 'Organization'/, 'marketing home declares the organization once');
assert.match(landing, /icon-512\.png/, 'organization schema exposes a crawlable square logo');
assert.match(robots, /disallow:[\s\S]*'\/admin'[\s\S]*'\/studio'/, 'private application surfaces remain excluded');
assert.match(search, /robots: \{ index: false, follow: true \}/, 'internal search pages are noindex and links remain discoverable');
assert.doesNotMatch(sitemap, /'\/search'/, 'internal search is absent from the canonical sitemap');
assert.match(sitemap, /\.from\('profiles'\)[\s\S]*\.eq\('is_published', true\)/, 'published public profiles are discoverable');
assert.match(sitemap, /\.from\('community_discussions'\)[\s\S]*\.eq\('status', 'published'\)/, 'published community threads are discoverable');
assert.match(sitemap, /lastModified: validDate\(item\.updated_at\)/, 'item lastmod values reflect actual updates');
assert.doesNotMatch(sitemap, /const lastModified = new Date\(\)/, 'sitemap does not claim every page changed at request time');
assert.match(profile, /!profile\.is_published[\s\S]*robots: \{ index: false, follow: false \}/, 'unpublished profiles cannot be indexed');
assert.match(metadata, /alternates:[\s\S]*canonical: url/, 'public page metadata has canonical URLs');

console.log('SEO contract passed: identity, metadata, crawl controls, structured data, and sitemap coverage are coherent.');
