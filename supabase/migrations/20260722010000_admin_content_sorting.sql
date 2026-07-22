-- Add stable Admin Content ordering without changing the existing RPC contract.

create or replace function public.list_admin_content_sorted(
  target_query text default null,
  target_status text default null,
  target_type text default null,
  target_sort text default 'created',
  target_limit integer default 8,
  target_offset integer default 0
)
returns table(
  item_id uuid,title text,slug text,cover_url text,creator_id uuid,creator_name text,creator_username text,
  experience_type text,item_type text,assigned_type text,publication_status text,review_status text,
  pending_submission_id uuid,release_date date,created_at timestamptz,updated_at timestamptz,total_count bigint
)
language plpgsql security definer stable set search_path=public as $$
declare
  normalized_query text := nullif(btrim(target_query),'');
  normalized_status text := nullif(lower(btrim(target_status)),'');
  normalized_type text := nullif(lower(btrim(target_type)),'');
  normalized_sort text := coalesce(nullif(lower(btrim(target_sort)),''),'created');
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  if target_limit<1 or target_limit>100 or target_offset<0 then raise exception 'Invalid content paging.' using errcode='22023'; end if;
  if normalized_query is not null and char_length(normalized_query)>100 then raise exception 'Search is too long.' using errcode='22023'; end if;
  if normalized_status is not null and normalized_status not in ('draft','published','archived','pending','approved','rejected','withdrawn') then raise exception 'Invalid content status.' using errcode='22023'; end if;
  if normalized_sort not in ('created','release_date') then raise exception 'Invalid content sort.' using errcode='22023'; end if;
  return query
    select i.id,i.title,i.slug,i.cover_url,i.author_id,coalesce(p.display_name,i.creator),p.username,
      i.experience_type,i.item_type,assigned.label,i.status,coalesce(review.status,'none'),
      case when review.status='pending' then review.id else null end,i.release_date,i.created_at,i.updated_at,count(*) over()
    from public.catalog_items i
    left join public.profiles p on p.id=i.author_id
    left join public.item_type_assignments assignment on assignment.item_id=i.id
    left join public.item_types assigned on assigned.id=assignment.item_type_id
    left join lateral (
      select submission.id,submission.status from public.item_submissions submission
      where submission.item_id=i.id
      order by (submission.status='pending') desc,submission.submitted_at desc,submission.id desc limit 1
    ) review on true
    where (normalized_query is null or i.title ilike '%'||normalized_query||'%' or i.creator ilike '%'||normalized_query||'%' or coalesce(p.username,'') ilike '%'||normalized_query||'%')
      and (normalized_status is null or (normalized_status in ('draft','published','archived') and i.status=normalized_status) or (normalized_status in ('pending','approved','rejected','withdrawn') and review.status=normalized_status))
      and (normalized_type is null or lower(i.experience_type)=normalized_type or lower(i.item_type)=normalized_type or lower(coalesce(assigned.slug,''))=normalized_type or lower(coalesce(assigned.label,''))=normalized_type)
    order by
      case when normalized_sort='release_date' then i.release_date end desc nulls last,
      case when normalized_sort='created' then i.created_at end desc,
      i.created_at desc,
      i.id desc
    limit target_limit offset target_offset;
end;
$$;

revoke all on function public.list_admin_content_sorted(text,text,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.list_admin_content_sorted(text,text,text,text,integer,integer) to authenticated,service_role;

comment on function public.list_admin_content_sorted(text,text,text,text,integer,integer) is
  'Administrator-only content directory with stable created-time or release-date ordering.';
