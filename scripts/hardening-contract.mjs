import { readFile } from 'node:fs/promises';

const migration = await readFile('supabase/migrations/20260712054000_m8_private_item_files_foundation.sql', 'utf8');
const moderation = await readFile('supabase/migrations/20260712055000_m9_moderation_reporting_rate_limits.sql', 'utf8');
const review = await readFile('supabase/migrations/20260713030000_m13_creator_submission_review_foundation.sql', 'utf8');
const observability = await readFile('src/instrumentation.ts', 'utf8');
const domain = await readFile('src/lib/domain/studioPublishing.ts', 'utf8');
const communityDomain = await readFile('src/lib/domain/community.ts', 'utf8');

const requirements = [
  ['private item-files bucket', /insert into storage\.buckets[\s\S]*?public\s*=\s*false/, migration],
  ['bounded item-file size', /file_size_limit[\s\S]*?524288000/, migration],
  ['entitlement-authorized protected reads', /item_files_authorized_read[\s\S]*?can_access_item_file/, migration],
  ['creator-owned upload boundary', /item_files_creator_insert[\s\S]*?owner_id\s*=\s*auth\.uid\(\)::text/, migration],
  ['community rate-event ledger', /create table if not exists public\.community_rate_events/, moderation],
  ['community insert rate-limit trigger', /create trigger content_entries_rate_limit[\s\S]*?enforce_community_rate_limit/, moderation],
  ['typed removal tombstones', /create table public\.item_submission_child_tombstones/, review],
  ['append-only review decision audit', /create trigger item_submission_decisions_immutable/, review],
  ['notification outbox without delivery', /create table public\.item_submission_notification_events[\s\S]*?delivered_at/, review],
  ['review mutation fence', /create or replace function public\.reject_live_item_mutation_during_review/, review],
  ['sanitized request-error contract', /request_error[\s\S]*?headers[\s\S]*?query/, observability],
  ['dormant submission domain boundary', /listStudioItemSubmissions[\s\S]*?submitStudioItemForReview[\s\S]*?proposeStudioChildRemoval/, domain],
  ['stale community slugs fail as not found', /if \(!UUID_IDENTIFIER\.test\(identifier\)\) return null;[\s\S]*?\.eq\('id', identifier\)/, communityDomain],
];

const failures = requirements.filter(([, pattern, source]) => !pattern.test(source)).map(([label]) => label);
if (failures.length) {
  throw new Error(`Hardening contract failed:\n${failures.map(failure => `- ${failure}`).join('\n')}`);
}

console.log(`Hardening contract passed: ${requirements.length} storage, abuse, review, observability, and domain-boundary invariants.`);
