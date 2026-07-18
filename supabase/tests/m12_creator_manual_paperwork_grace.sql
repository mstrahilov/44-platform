begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users(id,email,raw_user_meta_data) values
  ('d3000000-0000-4000-8000-000000000001','grace-admin@example.test','{"username":"grace_admin"}'),
  ('d3000000-0000-4000-8000-000000000002','grace-creator@example.test','{"username":"grace_creator"}');

select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='admin',display_name='Grace Admin' where id='d3000000-0000-4000-8000-000000000001';
update public.profiles set role='creator',display_name='Grace Creator' where id='d3000000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','d3000000-0000-4000-8000-000000000001',true);
select lives_ok(
  $$select public.set_admin_creator_paid_sales('d3000000-0000-4000-8000-000000000002','approved','Creator accepted into the manual paperwork grace workflow.')$$,
  'an Admin can begin a Creator manual paperwork grace window'
);
select is(
  public.get_creator_paid_sales_state('d3000000-0000-4000-8000-000000000002'::uuid)->>'state',
  'grace','approved Creator without payout verification is in the manual grace state'
);
select ok(
  (public.get_creator_paid_sales_state('d3000000-0000-4000-8000-000000000002'::uuid)->>'can_sell_paid')::boolean,
  'manual grace enables paid digital checkout without claiming payout capability'
);
select ok(
  (public.get_creator_paid_sales_state('d3000000-0000-4000-8000-000000000002')->>'paperwork_due_at')::timestamptz
    between now()+interval '29 days' and now()+interval '31 days',
  'approval records a 30-calendar-day Admin-only follow-up date'
);
select lives_ok(
  $$select public.set_admin_creator_paid_sales('d3000000-0000-4000-8000-000000000002','approved','Public launch date re-based after closed testing.')$$,
  'an Admin can explicitly re-base an approved Creator follow-up at launch'
);
select ok(
  (public.get_creator_paid_sales_state('d3000000-0000-4000-8000-000000000002')->>'paperwork_due_at')::timestamptz
    between now()+interval '29 days' and now()+interval '31 days',
  'the launch re-base records a new 30-calendar-day manual follow-up date'
);

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
update public.creator_paid_sales_access
set paperwork_due_at=now()-interval '1 day'
where creator_id='d3000000-0000-4000-8000-000000000002';
select is(
  public.creator_paid_sales_state_code('d3000000-0000-4000-8000-000000000002'),
  'grace','passing the follow-up date does not automatically suspend Creator sales'
);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','d3000000-0000-4000-8000-000000000001',true);
select lives_ok(
  $$select public.set_admin_creator_paid_sales('d3000000-0000-4000-8000-000000000002','disabled','Paperwork follow-up requires a manual sales pause.')$$,
  'an Admin can manually pause Creator paid sales after follow-up'
);
select is(
  public.get_creator_paid_sales_state('d3000000-0000-4000-8000-000000000002'::uuid)->>'state',
  'disabled','the manual pause is enforced by the server-side paid-sales state'
);

select * from finish();
rollback;
