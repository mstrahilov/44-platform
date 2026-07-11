# Supabase

The linked live Supabase project is the source of truth for current schema and content. Inspect it read-only with the Supabase CLI or public API; do not infer current tables, columns, policies, storage, or rows from old SQL files.

`migrations/` is the complete, ordered execution history for the linked database. These files are retained even after later migrations supersede their structures because a clean database rebuild must replay the full sequence. They are not current-state schema documentation.

There are no manual SQL scripts in the app. New database changes belong in a timestamped migration, are dry-run locally, and are then pushed with the Supabase CLI.

`backups/` is intentionally ignored by Git. Keep it empty during normal work; create a short-lived backup only immediately before an authorized database write, then remove it when the change is verified.
