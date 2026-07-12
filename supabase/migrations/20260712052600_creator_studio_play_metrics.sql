-- Creator Studio play analytics. A play is recorded when a playable track
-- actually starts, regardless of ownership, entitlement, or playback surface.

create table public.item_play_events (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  session_id uuid not null,
  playback_mode text not null default 'standard' check (playback_mode in ('standard','radio')),
  play_reason text not null default 'manual' check (play_reason in ('manual','queue','auto','next','previous')),
  metadata jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  constraint item_play_events_session_track_key unique(session_id,track_id)
);

create index item_play_events_item_occurred_idx
  on public.item_play_events(item_id,occurred_at desc);
create index item_play_events_user_occurred_idx
  on public.item_play_events(user_id,occurred_at desc)
  where user_id is not null;

alter table public.item_play_events enable row level security;
revoke all on table public.item_play_events from public, anon, authenticated;
grant all on table public.item_play_events to service_role;

-- Preserve the trustworthy historical evidence already collected by M5.
insert into public.item_play_events(
  item_id,track_id,user_id,session_id,playback_mode,play_reason,metadata,occurred_at
)
select
  signal.item_id,
  signal.track_id,
  signal.user_id,
  signal.session_id,
  'standard',
  'auto',
  jsonb_build_object('backfilled_from','achievement_playback_signals'),
  signal.occurred_at
from public.achievement_playback_signals signal
where signal.signal_type='track_completed'
  and signal.track_id is not null
on conflict(session_id,track_id) do nothing;

create or replace function public.record_item_play(
  target_item_id uuid,
  target_track_id uuid,
  target_session_id uuid,
  target_playback_mode text default 'standard',
  target_play_reason text default 'manual'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_playback_mode not in ('standard','radio') then
    raise exception 'invalid playback mode';
  end if;
  if target_play_reason not in ('manual','queue','auto','next','previous') then
    raise exception 'invalid play reason';
  end if;
  if not exists(
    select 1
    from public.tracks track
    where track.id=target_track_id
      and track.item_id=target_item_id
      and track.audio_url is not null
  ) then
    raise exception 'track does not belong to playable Item';
  end if;

  insert into public.item_play_events(
    item_id,track_id,user_id,session_id,playback_mode,play_reason
  ) values(
    target_item_id,target_track_id,auth.uid(),target_session_id,target_playback_mode,target_play_reason
  )
  on conflict(session_id,track_id) do nothing;

  return found;
end;
$$;

revoke all on function public.record_item_play(uuid,uuid,uuid,text,text) from public;
grant execute on function public.record_item_play(uuid,uuid,uuid,text,text) to anon, authenticated, service_role;

create or replace function public.get_creator_total_plays()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.item_play_events play
  join public.catalog_items item on item.id=play.item_id
  where item.author_id=auth.uid();
$$;

revoke all on function public.get_creator_total_plays() from public, anon;
grant execute on function public.get_creator_total_plays() to authenticated, service_role;

comment on table public.item_play_events is
  'Append-only playback starts used for creator analytics across Store, Library, Radio, and owned Items.';
comment on function public.record_item_play(uuid,uuid,uuid,text,text) is
  'Records one validated playback start without requiring library ownership.';
comment on function public.get_creator_total_plays() is
  'Counts all recorded playback starts across Items owned by the signed-in creator.';
