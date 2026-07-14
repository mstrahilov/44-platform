#!/usr/bin/env bash
set -euo pipefail

container="${SUPABASE_DB_CONTAINER:-supabase_db_44-platform}"
backup_file="${BACKUP_FILE:-supabase/backups/20260713_before_m17_interactive_foundation_data.sql}"
database="m13_data_restore_rehearsal"
schema_dump="$(mktemp -t m13-restore-schema.XXXXXX)"
sanitized_schema="$(mktemp -t m13-restore-schema-sanitized.XXXXXX)"

cleanup() {
  docker exec "$container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "drop database if exists $database" >/dev/null 2>&1 || true
  rm -f "$schema_dump" "$sanitized_schema"
}
trap cleanup EXIT

[[ -f "$backup_file" ]] || { echo "Backup file not found: $backup_file" >&2; exit 1; }

docker exec "$container" pg_dump -U postgres -d postgres --schema-only --no-owner --no-privileges > "$schema_dump"
sed '/log_min_messages/d' "$schema_dump" > "$sanitized_schema"
docker exec "$container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "drop database if exists $database" >/dev/null
docker exec "$container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "create database $database" >/dev/null
docker exec -i "$container" psql -U postgres -d "$database" -v ON_ERROR_STOP=1 < "$sanitized_schema" >/dev/null
docker exec -i "$container" psql -U postgres -d "$database" -v ON_ERROR_STOP=1 < "$backup_file" >/dev/null

counts="$(docker exec "$container" psql -U postgres -d "$database" -Atc "select (select count(*) from public.profiles) || ':' || (select count(*) from public.catalog_items) || ':' || (select count(*) from storage.objects)")"
IFS=: read -r profile_count item_count storage_count <<< "$counts"
if [[ "$profile_count" -le 0 || "$item_count" -le 0 || "$storage_count" -le 0 ]]; then
  echo "Data restore rehearsal failed: unexpected counts $counts" >&2
  exit 1
fi

echo "Data restore rehearsal passed: profiles=$profile_count items=$item_count storage_objects=$storage_count"
