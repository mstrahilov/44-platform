-- Profile headers were retired after usability testing showed that members
-- consistently set an avatar and ignored the separate cover image. Storage
-- objects are intentionally not mutated from SQL: Supabase requires deletions
-- to use the Storage API. Dropping the reference retires the feature safely;
-- any orphaned cover files can be removed by the supported maintenance API.

alter table public.profiles
  drop column if exists hero_url;
