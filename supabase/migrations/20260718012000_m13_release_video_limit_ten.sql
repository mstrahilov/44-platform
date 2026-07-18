-- Creator release videos use URL-only inputs and allow up to ten embeds.
-- A stable internal title remains for iframe accessibility and immutable review snapshots.

create or replace function public.replace_owned_item_video_embeds(
  target_item_id uuid,
  target_embeds jsonb default '[]'
)
returns void language plpgsql security definer set search_path=public as $$
declare embed jsonb; parsed_id text; next_order integer := 0;
begin
  if not public.can_manage_item(target_item_id) then
    raise exception 'Item management required.' using errcode='42501';
  end if;
  if jsonb_typeof(target_embeds) <> 'array' or jsonb_array_length(target_embeds) > 10 then
    raise exception 'Up to ten YouTube video embeds may be configured.' using errcode='22023';
  end if;

  delete from public.item_video_embeds where item_id=target_item_id;
  for embed in select * from jsonb_array_elements(target_embeds) loop
    parsed_id := public.youtube_video_id_from_url(embed->>'url');
    if parsed_id is null then
      raise exception 'Only valid HTTPS YouTube video URLs are accepted.' using errcode='22023';
    end if;
    insert into public.item_video_embeds(item_id,title,youtube_video_id,sort_order)
    values(
      target_item_id,
      coalesce(nullif(left(btrim(embed->>'title'),120),''), 'YouTube video ' || (next_order + 1)),
      parsed_id,
      next_order
    );
    next_order := next_order + 1;
  end loop;
end;
$$;

comment on function public.replace_owned_item_video_embeds(uuid,jsonb) is
  'Atomic owner-managed replacement for up to ten YouTube URLs. Internal titles are generated when the URL-only Studio form omits one.';
