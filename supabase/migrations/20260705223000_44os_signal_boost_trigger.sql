-- Unlock Signal Boost from share visits server-side so RLS stays intact.

create or replace function public.unlock_signal_boost_from_share_visit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_achievement public.product_achievements%rowtype;
  v_overachiever public.product_achievements%rowtype;
  v_inserted integer := 0;
begin
  if new.referrer_id is null or new.product_id is null then
    return new;
  end if;

  select *
  into v_achievement
  from public.product_achievements
  where product_id = new.product_id
    and trigger_type = 'shared_link_opened'
  order by sort_order
  limit 1;

  if v_achievement.id is not null then
    insert into public.user_achievements (user_id, product_id, achievement_id)
    values (new.referrer_id, new.product_id, v_achievement.id)
    on conflict do nothing;

    get diagnostics v_inserted = row_count;

    if v_inserted > 0 then
      insert into public.achievement_events (user_id, product_id, achievement_id, event_type, metadata)
      values (
        new.referrer_id,
        new.product_id,
        v_achievement.id,
        'achievement_unlocked',
        jsonb_build_object(
          'trigger_type', v_achievement.trigger_type,
          'achievement_code', v_achievement.code,
          'source', 'shared_product_link',
          'visitor_id', new.visitor_id,
          'share_visit_id', new.id
        )
      );
    end if;
  end if;

  select *
  into v_overachiever
  from public.product_achievements
  where product_id = new.product_id
    and code = 'overachiever'
  limit 1;

  if v_overachiever.id is not null
    and exists (
      select 1 from public.product_achievements required
      where required.product_id = new.product_id
        and required.code <> 'overachiever'
    )
    and not exists (
      select 1
      from public.product_achievements required
      where required.product_id = new.product_id
        and required.code <> 'overachiever'
        and not exists (
          select 1
          from public.user_achievements unlocked
          where unlocked.user_id = new.referrer_id
            and unlocked.product_id = new.product_id
            and unlocked.achievement_id = required.id
        )
    )
  then
    insert into public.user_achievements (user_id, product_id, achievement_id)
    values (new.referrer_id, new.product_id, v_overachiever.id)
    on conflict do nothing;

    get diagnostics v_inserted = row_count;

    if v_inserted > 0 then
      insert into public.achievement_events (user_id, product_id, achievement_id, event_type, metadata)
      values (
        new.referrer_id,
        new.product_id,
        v_overachiever.id,
        'achievement_unlocked',
        jsonb_build_object(
          'trigger_type', v_overachiever.trigger_type,
          'achievement_code', v_overachiever.code,
          'source', 'overachiever_check',
          'completed_trigger', 'shared_link_opened'
        )
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists product_share_visits_signal_boost on public.product_share_visits;
create trigger product_share_visits_signal_boost
after insert on public.product_share_visits
for each row
execute function public.unlock_signal_boost_from_share_visit();
