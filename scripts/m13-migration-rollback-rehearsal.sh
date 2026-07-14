#!/usr/bin/env bash
set -euo pipefail

container="${SUPABASE_DB_CONTAINER:-supabase_db_44-platform}"
database="m13_migration_rollback_rehearsal"
schema_dump="$(mktemp -t m13-rollback-schema.XXXXXX)"
sanitized_schema="$(mktemp -t m13-rollback-schema-sanitized.XXXXXX)"

cleanup() {
  docker exec "$container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "drop database if exists $database" >/dev/null 2>&1 || true
  rm -f "$schema_dump" "$sanitized_schema"
}
trap cleanup EXIT

docker exec "$container" pg_dump -U postgres -d postgres --schema-only --no-owner --no-privileges > "$schema_dump"
sed '/log_min_messages/d' "$schema_dump" > "$sanitized_schema"
docker exec "$container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "drop database if exists $database" >/dev/null
docker exec "$container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "create database $database" >/dev/null
docker exec -i "$container" psql -U postgres -d "$database" -v ON_ERROR_STOP=1 < "$sanitized_schema" >/dev/null

docker exec -i "$container" psql -U postgres -d "$database" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
begin;
drop trigger if exists review_live_write_fence on public.catalog_items;
drop trigger if exists review_live_write_fence on public.tracks;
drop trigger if exists review_live_write_fence on public.item_assets;
drop trigger if exists review_live_write_fence on public.catalog_offers;
drop trigger if exists review_live_write_fence on public.offer_entitlements;
drop trigger if exists review_live_write_fence on public.item_type_assignments;
drop trigger if exists review_live_write_fence on public.item_tag_assignments;
drop trigger if exists review_live_write_fence on public.item_capabilities;
drop trigger if exists review_live_write_fence on public.item_members;
drop trigger if exists review_live_write_fence on public.item_external_links;
drop trigger if exists review_live_write_fence on public.item_achievements;
do $$
declare
  function_row record;
begin
  for function_row in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'publishing_review_is_required',
        'reject_live_item_mutation_during_review',
        'snapshot_item_for_review',
        'submit_item_for_review',
        'withdraw_item_submission',
        'add_item_submission_child_tombstone',
        'decide_item_submission'
      )
  loop
    execute format('drop function if exists %s cascade', function_row.signature);
  end loop;
end $$;
drop table if exists public.item_submission_notification_events cascade;
drop table if exists public.item_submission_decisions cascade;
drop table if exists public.item_submission_child_tombstones cascade;
drop table if exists public.item_child_archives cascade;
drop table if exists public.item_submission_achievements cascade;
drop table if exists public.item_submission_external_links cascade;
drop table if exists public.item_submission_members cascade;
drop table if exists public.item_submission_capabilities cascade;
drop table if exists public.item_submission_tag_assignments cascade;
drop table if exists public.item_submission_type_assignments cascade;
drop table if exists public.item_submission_offer_entitlements cascade;
drop table if exists public.item_submission_offers cascade;
drop table if exists public.item_submission_assets cascade;
drop table if exists public.item_submission_tracks cascade;
drop table if exists public.item_submission_items cascade;
drop table if exists public.item_submissions cascade;
commit;
SQL

result="$(docker exec "$container" psql -U postgres -d "$database" -Atc "select (to_regclass('public.catalog_items') is not null)::text || ':' || (to_regclass('public.item_assets') is not null)::text || ':' || (to_regclass('public.publishing_runtime_controls') is not null)::text || ':' || (to_regclass('public.item_submissions') is null)::text")"
[[ "$result" == 'true:true:true:true' ]] || { echo "Rollback simulation failed: $result" >&2; exit 1; }
echo 'M13 disposable migration rollback simulation passed: baseline catalog, asset, and runtime-control relations survived while M13 objects were removed.'
