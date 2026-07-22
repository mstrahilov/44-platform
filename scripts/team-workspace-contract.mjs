import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const read = relative => readFile(path.join(root, relative), 'utf8');

const [migration, guideRoute, kitRoute, teamServer, boundary, brandClient, teamLayout, robots, sitemap, config, guide, packageJson] = await Promise.all([
  read('supabase/migrations/20260721010000_team_workspace_and_brand_system.sql'),
  read('src/app/api/team/brand-guide/route.ts'),
  read('src/app/api/team/brand-kit/route.ts'),
  read('src/lib/server/team.ts'),
  read('src/components/team/TeamPrimitives.tsx'),
  read('src/components/team/TeamBrandGuideApp.tsx'),
  read('src/app/team/layout.tsx'),
  read('src/app/robots.ts'),
  read('src/app/sitemap.ts'),
  read('next.config.ts'),
  read('Other/44OS_HANDBOOK.md'),
  read('package.json'),
]);

assert.match(migration, /create table public\.team_access_grants/, 'current Team permission is separate from profile roles');
assert.match(migration, /create table public\.team_access_events/, 'Team access keeps immutable history');
assert.match(migration, /previous_active <> new_active/, 'audit history represents real state changes');
assert.match(migration, /team_access_events_immutable before update or delete/, 'audit events cannot be rewritten');
assert.match(migration, /if target_role='admin'.*already inherit Team access/s, 'Admin inheritance cannot be weakened with a grant row');
assert.match(migration, /if not public\.has_team_access\(\).*Team access required/s, 'directories enforce Team access in the database');
assert.match(migration, /item\.status='published'/, 'release directory is published-only');
assert.doesNotMatch(migration.match(/create or replace function public\.list_team_creators[\s\S]*?\$\$;/)?.[0] ?? '', /auth\.users|email|country_code|payout|sale|draft/, 'Creator directory cannot expose account or commercial fields');
assert.doesNotMatch(migration.match(/create or replace function public\.list_team_releases[\s\S]*?\$\$;/)?.[0] ?? '', /download_url|long_description|price_cents|payout|sale|email/, 'release directory cannot expose private files or commerce facts');
assert.match(migration, /'team-access-granted\/'\|\|new\.id/, 'grant email is idempotent per immutable audit event');
assert.match(migration, /if not new\.new_active then return new/, 'revocation does not send the grant email');
assert.match(migration, /insert into storage\.buckets[\s\S]*'team-brand'[\s\S]*false/, 'Brand Kit bucket is private');

assert.match(teamServer, /^import 'server-only';/m, 'Team request authorization is server-only');
assert.match(teamServer, /rpc\('get_my_team_access'/, 'private endpoints use the authoritative Team access function');
assert.match(guideRoute, /requireTeamRequest\(request\)/, 'guide API authorizes before reading the source');
assert.match(guideRoute, /Cache-Control': 'private, no-store/, 'guide responses cannot be cached');
assert.match(kitRoute, /createSignedUrl\(kit\.storage_path, 60/, 'Brand Kit links are short-lived');
assert.match(kitRoute, /from\('team-brand'\)/, 'Brand Kit downloads come from private Team storage');
assert.match(kitRoute, /forty-four-brand-kit-1\.0\.zip/, 'local and production review use the approved version 1.0 archive name');
assert.doesNotMatch(brandClient, /44OS_HANDBOOK|Who Is forty four|Logo System/, 'private Handbook copy is not embedded in the client bundle');
assert.match(boundary, /fetchMyTeamAccess/, 'Team pages fail closed behind the authenticated boundary');
assert.match(teamLayout, /index: false, follow: false, nocache: true/, 'Team metadata is noindex and nofollow');
assert.match(robots, /'\/team'/, 'robots excludes Team');
assert.doesNotMatch(sitemap, /['"`]\/team/, 'Team routes are absent from the sitemap');
assert.match(config, /outputFileTracingIncludes[\s\S]*44OS_HANDBOOK\.md/, 'the private canonical Handbook is packaged only for its API route');
assert.match(guide, /^# Handbook/m, 'canonical Handbook uses its approved page title');
assert.match(guide, /## Working With People[\s\S]*## Brand Kit[\s\S]*## Support[\s\S]*## For Developers/, 'Support appears immediately before the developer reference');
assert.match(guide, /app\.44os\.com\/support[\s\S]*support@44os\.com/, 'Handbook includes both monitored Support paths');
assert.doesNotMatch(guide, /Editable social templates|Editable templates in the Brand Kit/, 'Brand Kit does not prescribe social templates');
assert.match(guide, /white mark is available for dark backgrounds[\s\S]*black mark is available for light backgrounds/i, 'guide contains the approved two-color logo system');
assert.doesNotMatch(guide, /green (?:44|forty four) mark|(?:44|forty four) logo (?:is|uses?) green|logo green/i, 'retired acid-green logo language is absent');
assert.match(packageJson, /@fontsource-variable\/inter/, 'Inter is self-hosted through a reviewed local dependency');

console.log('Team workspace contract passed.');
