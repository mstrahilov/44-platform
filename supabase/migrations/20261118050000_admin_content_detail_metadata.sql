create or replace function public.get_admin_content_detail(target_item_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  result jsonb;
  item_row public.catalog_items;
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;

  select * into item_row from public.catalog_items where id = target_item_id;
  if not found then
    raise exception 'Content not found.' using errcode = 'P0002';
  end if;

  select jsonb_build_object(
    'item', jsonb_build_object(
      'id', item_row.id,
      'title', item_row.title,
      'slug', item_row.slug,
      'creator', item_row.creator,
      'cover_url', item_row.cover_url,
      'hero_url', item_row.hero_url,
      'status', item_row.status,
      'experience_type', item_row.experience_type,
      'item_type', item_row.item_type,
      'year', item_row.year,
      'release_date', item_row.release_date,
      'short_description', item_row.short_description,
      'long_description', item_row.long_description,
      'price_cents', item_row.price_cents,
      'is_free', item_row.is_free,
      'featured', item_row.featured,
      'fulfillment_type', item_row.fulfillment_type,
      'download_purchase_enabled', item_row.download_purchase_enabled,
      'market_mode', item_row.market_mode,
      'available_locally_only', item_row.available_locally_only,
      'local_price_cents', item_row.local_price_cents,
      'local_currency', item_row.local_currency,
      'visuals_enabled', item_row.visuals_enabled,
      'external_links_enabled', item_row.external_links_enabled,
      'related_items_enabled', item_row.related_items_enabled,
      'created_at', item_row.created_at,
      'updated_at', item_row.updated_at
    ),
    'creator', (
      select jsonb_build_object('id', p.id, 'display_name', p.display_name, 'username', p.username, 'avatar_url', p.avatar_url, 'role', p.role)
      from public.profiles p where p.id = item_row.author_id
    ),
    'category', (
      select jsonb_build_object('name', c.name, 'slug', c.slug)
      from public.item_categories c where c.id = item_row.item_category_id
    ),
    'taxonomy', jsonb_build_object(
      'type', (
        select jsonb_build_object('id', t.id, 'label', t.label, 'slug', t.slug)
        from public.item_type_assignments a join public.item_types t on t.id = a.item_type_id
        where a.item_id = item_row.id
      ),
      'tags', coalesce((
        select jsonb_agg(jsonb_build_object('id', t.id, 'label', t.label, 'slug', t.slug) order by t.label)
        from public.item_tag_assignments a join public.item_tags t on t.id = a.item_tag_id
        where a.item_id = item_row.id
      ), '[]'::jsonb)
    ),
    'tracks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'number', t.number, 'title', t.title, 'duration_seconds', t.duration_seconds,
        'has_audio', nullif(btrim(t.audio_url), '') is not null
      ) order by t.number, t.id)
      from public.tracks t where t.item_id = item_row.id
    ), '[]'::jsonb),
    'assets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'asset_type', a.asset_type, 'title', a.title,
        'is_downloadable', a.is_downloadable,
        'has_file', coalesce(nullif(btrim(a.storage_path), ''), nullif(btrim(a.file_url), '')) is not null
      ) order by a.sort_order, a.id)
      from public.item_assets a where a.item_id = item_row.id
    ), '[]'::jsonb),
    'offers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'code', o.code, 'title', o.title, 'offer_type', o.offer_type,
        'status', o.status, 'price_cents', o.price_cents, 'currency', o.currency,
        'fulfillment_type', o.fulfillment_type
      ) order by o.created_at, o.id)
      from public.catalog_offers o where o.item_id = item_row.id
    ), '[]'::jsonb),
    'achievements', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'description', a.description, 'is_secret', a.is_secret) order by a.sort_order, a.id)
      from public.item_achievements a where a.item_id = item_row.id
    ), '[]'::jsonb),
    'external_links', coalesce((
      select jsonb_agg(jsonb_build_object('id', l.id, 'label', l.label, 'platform', l.platform, 'url', l.url) order by l.sort_order, l.id)
      from public.item_external_links l where l.item_id = item_row.id
    ), '[]'::jsonb),
    'videos', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'title', v.title, 'sort_order', a.sort_order) order by a.sort_order, a.id)
      from public.item_video_attachments a join public.creator_videos v on v.id = a.video_id
      where a.item_id = item_row.id
    ), '[]'::jsonb),
    'book', (
      select jsonb_build_object(
        'format', b.format, 'total_pages', b.total_pages, 'sample_page_limit', b.sample_page_limit,
        'language_code', b.language_code,
        'has_file', exists(select 1 from public.item_assets a where a.id = b.file_asset_id and coalesce(nullif(btrim(a.storage_path), ''), nullif(btrim(a.file_url), '')) is not null),
        'has_preview', nullif(btrim(b.preview_url), '') is not null
      )
      from public.book_contents b where b.item_id = item_row.id
    ),
    'sample_previews', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'title', s.title, 'duration_seconds', s.duration_seconds,
        'has_preview', nullif(btrim(s.preview_url), '') is not null,
        'has_file', exists(select 1 from public.item_assets a where a.id = s.source_asset_id and coalesce(nullif(btrim(a.storage_path), ''), nullif(btrim(a.file_url), '')) is not null)
      ) order by s.sort_order, s.id)
      from public.sample_pack_files s where s.item_id = item_row.id
    ), '[]'::jsonb),
    'interactive_build', (
      select jsonb_build_object(
        'runtime', b.runtime, 'build_version', b.build_version, 'unity_version', b.unity_version,
        'status', b.status, 'supports_desktop', b.supports_desktop, 'supports_mobile', b.supports_mobile,
        'supported_browsers', b.supported_browsers, 'supported_inputs', b.supported_inputs,
        'preferred_orientation', b.preferred_orientation, 'download_size_mb', b.download_size_mb
      )
      from public.interactive_builds b where b.item_id = item_row.id
    ),
    'health', coalesce((
      select jsonb_agg(jsonb_build_object('code', h.code, 'message', h.message) order by h.code)
      from public.catalog_item_health(item_row.id) h
    ), '[]'::jsonb),
    'submissions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'status', s.status, 'submission_kind', s.submission_kind,
        'submitted_at', s.submitted_at, 'decided_at', s.decided_at,
        'decision_reason', s.decision_reason,
        'proposed_item', (select to_jsonb(snapshot) from public.item_submission_items snapshot where snapshot.submission_id = s.id)
      ) order by s.submitted_at desc, s.id desc)
      from public.item_submissions s where s.item_id = item_row.id
    ), '[]'::jsonb),
    'lifecycle_history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', event.id, 'action', event.action, 'previous_status', event.previous_status,
        'new_status', event.new_status, 'reason', event.reason, 'created_at', event.created_at,
        'changed_by', coalesce(actor.display_name, actor.username, '44 Admin')
      ) order by event.created_at desc, event.id desc)
      from public.admin_item_lifecycle_events event
      left join public.profiles actor on actor.id = event.changed_by
      where event.item_id = item_row.id
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_admin_content_detail(uuid) from public, anon;
grant execute on function public.get_admin_content_detail(uuid) to authenticated, service_role;
