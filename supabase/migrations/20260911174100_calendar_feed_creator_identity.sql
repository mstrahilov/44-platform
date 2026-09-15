-- calendar_feed's event branch only ever returned a username/slug for the
-- organizer, never a display name or avatar, so the iOS Calendar and Event
-- Detail pages fell back to showing "@username" instead of a real name and
-- had no avatar to show at all. The release branch already has this via a
-- separate client-side join (CatalogItem.creatorProfile), but plumbing it
-- through calendar_feed directly for both branches keeps the client's read
-- path uniform. Return type is changing (two new columns), so the function
-- has to be dropped and recreated rather than replaced in place.

drop function if exists public.calendar_feed(timestamptz, timestamptz);

create function public.calendar_feed(range_start timestamptz, range_end timestamptz)
returns table(
  source_type text, source_id uuid, creator_id uuid, title text, description text,
  starts_at timestamptz, ends_at timestamptz, timezone text, state text, format text,
  venue_name text, locality text, region text, country_code text, online_url text,
  info_url text, profile_username text, profile_slug text, profile_display_name text,
  profile_avatar_url text, item_slug text, item_cover_url text
)
language sql stable security definer set search_path=public as $$
  select 'event',e.id,e.creator_id,e.title,e.short_description,e.starts_at,e.ends_at,e.timezone,e.lifecycle_state,e.format,e.venue_name,e.locality,e.region,e.country_code,e.online_url,e.info_url,p.username,p.slug,p.display_name,p.avatar_url,null::text,e.cover_url
  from public.creator_events e join public.profiles p on p.id=e.creator_id
  where e.moderation_state='visible' and e.lifecycle_state<>'removed' and e.starts_at>=range_start and e.starts_at<range_end
  union all
  select 'release',i.id,i.author_id,i.title,coalesce(i.short_description,i.long_description),i.upcoming_release_at,null,i.upcoming_release_timezone,'upcoming',null,null,null,null,null,null,null,p.username,p.slug,p.display_name,p.avatar_url,i.slug,i.cover_url
  from public.catalog_items i join public.profiles p on p.id=i.author_id
  where i.status='published' and i.upcoming_release_at is not null and i.upcoming_release_at>=greatest(range_start,now()) and i.upcoming_release_at<range_end
  order by 6,1,2;
$$;

revoke all on function public.calendar_feed(timestamptz,timestamptz) from public;
grant execute on function public.calendar_feed(timestamptz,timestamptz) to anon, authenticated;
