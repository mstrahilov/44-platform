begin;

-- Closed testing can activate paid digital offers before the public launch date.
-- An Admin may explicitly re-base an already-approved Creator's 30-day manual
-- paperwork follow-up at launch. This records a second immutable decision; it
-- never changes payout readiness or automatically suspends sales.
create or replace function public.set_admin_creator_paid_sales(
  target_creator_id uuid,target_status text,target_reason text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare previous_status text;
declare normalized_reason text:=btrim(target_reason);
declare due_at timestamptz;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  if target_status not in ('approved','disabled') then raise exception 'Invalid paid-sales decision.' using errcode='22023'; end if;
  if char_length(coalesce(normalized_reason,'')) not between 3 and 500 then
    raise exception 'A reason between 3 and 500 characters is required.' using errcode='22023';
  end if;
  if not exists(select 1 from public.profiles where id=target_creator_id and role in ('creator','admin')) then
    raise exception 'Creator not found.' using errcode='P0002';
  end if;

  select admin_status into previous_status from public.creator_paid_sales_access
  where creator_id=target_creator_id for update;
  previous_status:=coalesce(previous_status,'not_reviewed');
  if previous_status=target_status and target_status='disabled' then
    raise exception 'Paid sales already have that decision.' using errcode='55000';
  end if;
  due_at:=case when target_status='approved' then now()+interval '30 days' else null end;

  insert into public.creator_paid_sales_access(
    creator_id,admin_status,decision_reason,approved_by,approved_at,disabled_at,paperwork_due_at
  ) values(
    target_creator_id,target_status,normalized_reason,auth.uid(),
    case when target_status='approved' then now() else null end,
    case when target_status='disabled' then now() else null end,due_at
  ) on conflict(creator_id) do update set
    admin_status=excluded.admin_status,decision_reason=excluded.decision_reason,
    approved_by=excluded.approved_by,approved_at=excluded.approved_at,
    disabled_at=excluded.disabled_at,paperwork_due_at=excluded.paperwork_due_at,updated_at=now();

  insert into public.creator_paid_sales_access_events(
    creator_id,previous_status,new_status,changed_by,reason
  ) values(target_creator_id,previous_status,target_status,auth.uid(),normalized_reason);
  perform public.refresh_creator_paid_offers(target_creator_id);
  return public.get_creator_paid_sales_state(target_creator_id);
end;
$$;

comment on function public.set_admin_creator_paid_sales(uuid,text,text) is
  'Admin-only paid-sales pause, restore, or documented 30-day manual paperwork-follow-up rebase. No payout approval or automatic suspension.';

commit;
