-- `create or replace function` does not replace a function when the
-- parameter list changes shape (it creates a new overload instead), so the
-- previous migration left the old 19-arg `save_owned_beat_draft` sitting
-- alongside the new 20-arg version with `target_asset_subtype`. Drop the
-- stale overload so every caller resolves to the one function that knows
-- about the new parameter.
drop function if exists public.save_owned_beat_draft(
  uuid,text,text,text,date,text,integer,integer,text,text,boolean,text,text,text,text,uuid[],uuid[],jsonb,jsonb
);
