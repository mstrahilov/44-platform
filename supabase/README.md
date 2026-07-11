# Supabase

The linked live Supabase project is the source of truth for current schema and content. Inspect it read-only with the Supabase CLI or public API; do not infer current tables, columns, policies, storage, or rows from old SQL files.

`migrations/20260712010000_44os_item_baseline.sql` is the canonical, replayable 44OS starting point. It consolidates the pre-launch history after the Item-foundation migration and matches the linked staging public schema. The retired incremental files remain available in Git history.

Do not edit the baseline after adoption. Every new database change belongs in its own later timestamped migration, is tested with a clean local reset and dry run, and is then pushed with the Supabase CLI. There are no manual SQL scripts in the app.

`seed.sql` intentionally contains no staging data. A fresh local environment verifies structure and security without copying user accounts or content.

`backups/` is intentionally ignored by Git. Keep it empty during normal work; create a short-lived backup only immediately before an authorized database write, then remove it when the change is verified.
