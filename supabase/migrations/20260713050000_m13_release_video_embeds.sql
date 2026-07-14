-- Launch release feature: explicitly named YouTube video embeds.
-- This is intentionally separate from speculative generic media/component models.

create table public.item_video_embeds (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  youtube_video_id text not null check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  sort_order integer not null default 0 check (sort_order >= 0 and sort_order < 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, youtube_video_id),
  unique (item_id, sort_order)
);
create index item_video_embeds_item_order_idx on public.item_video_embeds(item_id, sort_order);

create table public.item_submission_video_embeds (
  submission_id uuid not null references public.item_submissions(id) on delete cascade,
  source_id uuid not null default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  youtube_video_id text not null check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  sort_order integer not null check (sort_order >= 0 and sort_order < 10),
  primary key (submission_id, source_id),
  unique (submission_id, youtube_video_id),
  unique (submission_id, sort_order)
);

create or replace function public.youtube_video_id_from_url(target_url text)
returns text language plpgsql immutable security definer set search_path=public as $$
declare normalized text := nullif(btrim(target_url),''); video_id text;
begin
  if normalized is null then return null; end if;
  if normalized ~* '^https://(www\.)?youtube\.com/watch\?v=[A-Za-z0-9_-]{11}(&.*)?$' then
    video_id := substring(normalized from 'v=([A-Za-z0-9_-]{11})');
  elsif normalized ~* '^https://youtu\.be/[A-Za-z0-9_-]{11}(\?.*)?$' then
    video_id := substring(normalized from 'youtu\.be/([A-Za-z0-9_-]{11})');
  elsif normalized ~* '^https://(www\.)?youtube\.com/shorts/[A-Za-z0-9_-]{11}(\?.*)?$' then
    video_id := substring(normalized from 'shorts/([A-Za-z0-9_-]{11})');
  end if;
  return video_id;
end;
$$;

create or replace function public.validate_item_video_embed()
returns trigger language plpgsql security definer set search_path=public as $$
declare item_row public.catalog_items;
begin
  select * into item_row from public.catalog_items where id=new.item_id;
  if item_row.id is null or item_row.experience_type not in ('music','book','game') then
    raise exception 'Video embeds are supported only for music, book, and game releases.' using errcode='22023';
  end if;
  if public.youtube_video_id_from_url(new.youtube_video_id) is not null then
    raise exception 'Video embeds store a YouTube video ID, not a URL.' using errcode='22023';
  end if;
  return new;
end;
$$;

create or replace function public.reject_video_embed_mutation_during_review()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if public.publishing_review_is_required() and coalesce(current_setting('os44.review_apply', true), '') <> '1' then
    raise exception 'Direct Item changes are disabled while submission review is active.' using errcode='55000';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

create trigger validate_item_video_embed before insert or update on public.item_video_embeds
for each row execute function public.validate_item_video_embed();
create trigger video_embed_review_write_fence before insert or update or delete on public.item_video_embeds
for each row execute function public.reject_video_embed_mutation_during_review();
create trigger item_video_embeds_touch_updated_at before update on public.item_video_embeds
for each row execute function public.touch_content_updated_at();

create or replace function public.snapshot_item_video_embeds_for_submission()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.item_submission_video_embeds(submission_id,title,youtube_video_id,sort_order)
  select new.id,title,youtube_video_id,sort_order from public.item_video_embeds where item_id=new.item_id order by sort_order;
  return new;
end;
$$;

create or replace function public.snapshot_item_video_embeds_from_item_snapshot()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.item_submission_video_embeds(submission_id,title,youtube_video_id,sort_order)
  select new.submission_id,title,youtube_video_id,sort_order from public.item_video_embeds where item_id=new.item_id order by sort_order
  on conflict (submission_id, youtube_video_id) do nothing;
  return new;
end;
$$;

create or replace function public.apply_item_video_embeds_from_submission()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='approved' and old.status is distinct from new.status then
    delete from public.item_video_embeds where item_id=new.item_id;
    insert into public.item_video_embeds(item_id,title,youtube_video_id,sort_order)
    select new.item_id,title,youtube_video_id,sort_order from public.item_submission_video_embeds where submission_id=new.id order by sort_order;
  end if;
  return new;
end;
$$;

create trigger item_submission_video_embed_snapshot after insert on public.item_submissions
for each row execute function public.snapshot_item_video_embeds_for_submission();
create trigger item_submission_item_video_embed_snapshot after insert on public.item_submission_items
for each row execute function public.snapshot_item_video_embeds_from_item_snapshot();
create trigger item_submission_video_embed_apply after update of status on public.item_submissions
for each row execute function public.apply_item_video_embeds_from_submission();

create or replace function public.replace_owned_item_video_embeds(target_item_id uuid, target_embeds jsonb default '[]')
returns void language plpgsql security definer set search_path=public as $$
declare embed jsonb; parsed_id text; next_order integer := 0;
begin
  if not public.can_manage_item(target_item_id) then raise exception 'Item management required.' using errcode='42501'; end if;
  if jsonb_typeof(target_embeds) <> 'array' or jsonb_array_length(target_embeds) > 3 then
    raise exception 'Up to three YouTube video embeds may be configured.' using errcode='22023';
  end if;
  delete from public.item_video_embeds where item_id=target_item_id;
  for embed in select * from jsonb_array_elements(target_embeds) loop
    parsed_id := public.youtube_video_id_from_url(embed->>'url');
    if parsed_id is null then raise exception 'Only valid HTTPS YouTube video URLs are accepted.' using errcode='22023'; end if;
    insert into public.item_video_embeds(item_id,title,youtube_video_id,sort_order)
    values(target_item_id,left(btrim(embed->>'title'),120),parsed_id,next_order);
    next_order := next_order + 1;
  end loop;
end;
$$;

alter table public.item_video_embeds enable row level security;
alter table public.item_submission_video_embeds enable row level security;
create policy item_video_embeds_public_or_manager_read on public.item_video_embeds
for select to anon,authenticated using (
  public.can_manage_item(item_id)
  or exists(select 1 from public.catalog_items item where item.id=item_video_embeds.item_id and item.status='published')
);
create policy item_submission_video_embeds_owner_read on public.item_submission_video_embeds
for select to authenticated using (
  exists(select 1 from public.item_submissions submission where submission.id=item_submission_video_embeds.submission_id and (submission.submitter_id=auth.uid() or public.is_platform_admin()))
);
revoke all on public.item_video_embeds from anon,authenticated;
grant select on public.item_video_embeds to anon,authenticated;
revoke all on public.item_submission_video_embeds from anon,authenticated;
grant select on public.item_submission_video_embeds to authenticated;
grant all on public.item_video_embeds,public.item_submission_video_embeds to service_role;
revoke all on function public.youtube_video_id_from_url(text),public.replace_owned_item_video_embeds(uuid,jsonb) from public,anon;
grant execute on function public.youtube_video_id_from_url(text) to authenticated;
grant execute on function public.replace_owned_item_video_embeds(uuid,jsonb) to authenticated;
grant execute on function public.youtube_video_id_from_url(text),public.replace_owned_item_video_embeds(uuid,jsonb) to service_role;

comment on table public.item_video_embeds is 'Named HTTPS YouTube videos displayed as an optional release feature for published music, book, and game Items.';
comment on function public.replace_owned_item_video_embeds(uuid,jsonb) is 'Atomic owner-managed YouTube embed replacement. Direct table writes remain revoked and review-gated.';
