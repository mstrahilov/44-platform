# Supabase

`migrations/` is the complete, ordered schema history for the linked 44OS database. These files are retained even after later migrations supersede their structures because a clean database rebuild must replay the full sequence.

There are no manual SQL scripts in the app. New database changes belong in a timestamped migration, are dry-run locally, and are then pushed with the Supabase CLI.

`backups/` contains local safety snapshots and is intentionally ignored by Git.
