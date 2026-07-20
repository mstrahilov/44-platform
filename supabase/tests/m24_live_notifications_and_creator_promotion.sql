begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

select has_table('public','web_push_subscriptions','Web Push subscriptions are durable');
select has_table('public','web_push_deliveries','Web Push delivery has a durable outbox');

insert into auth.users(id,email,raw_user_meta_data) values
  ('a2400000-0000-4000-8000-000000000001','notify-author@example.test','{"username":"NotifyAuthor","display_name":"Notify Author","country_code":"US"}'),
  ('a2400000-0000-4000-8000-000000000002','notify-replier@example.test','{"username":"NotifyReplier","display_name":"Notify Replier","country_code":"US"}'),
  ('a2400000-0000-4000-8000-000000000003','notify-mentioned@example.test','{"username":"NotifyMention","display_name":"Notify Mention","country_code":"US"}'),
  ('a2400000-0000-4000-8000-000000000004','notify-admin@example.test','{"username":"NotifyAdmin","display_name":"Notify Admin","country_code":"US"}');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='admin' where id='a2400000-0000-4000-8000-000000000004';
insert into public.web_push_subscriptions(id,user_id,endpoint,p256dh,auth) values
  ('a2410000-0000-4000-8000-000000000001','a2400000-0000-4000-8000-000000000001','https://push.example.test/author','author-public-encryption-key','author-auth-key'),
  ('a2410000-0000-4000-8000-000000000002','a2400000-0000-4000-8000-000000000002','https://push.example.test/replier','replier-public-encryption-key','replier-auth-key'),
  ('a2410000-0000-4000-8000-000000000003','a2400000-0000-4000-8000-000000000003','https://push.example.test/mentioned','mentioned-public-encryption-key','mentioned-auth-key');

insert into public.content_entries(id,content_type,author_id,title,body,slug)
values('a2420000-0000-4000-8000-000000000001','discussion','a2400000-0000-4000-8000-000000000001',
  'Notification test','Hello (@NotifyMention)','notification-test');
select is((select count(*)::integer from public.achievement_events where user_id='a2400000-0000-4000-8000-000000000003' and event_type='mention_received'),1,'canonical Community posts notify mentioned members');
select is((select metadata->>'post_slug' from public.achievement_events where user_id='a2400000-0000-4000-8000-000000000003' and event_type='mention_received'),'notification-test','mention events retain the Community destination');
update public.content_entries set body='Edited copy still mentions @NotifyMention' where id='a2420000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.achievement_events where user_id='a2400000-0000-4000-8000-000000000003' and event_type='mention_received'),1,'editing a mentioned post does not duplicate its notification');

insert into public.content_replies(id,entry_id,author_id,reply_type,body)
values('a2430000-0000-4000-8000-000000000001','a2420000-0000-4000-8000-000000000001',
  'a2400000-0000-4000-8000-000000000002','comment','Replying here and tagging @NotifyMention');
select is((select count(*)::integer from public.achievement_events where user_id='a2400000-0000-4000-8000-000000000001' and event_type='reply_received'),1,'canonical Community replies notify the post author');
select is((select metadata->>'reply_id' from public.achievement_events where user_id='a2400000-0000-4000-8000-000000000001' and event_type='reply_received'),'a2430000-0000-4000-8000-000000000001','reply events retain the reply identity');
select is((select count(*)::integer from public.achievement_events where user_id='a2400000-0000-4000-8000-000000000003' and event_type='mention_received'),2,'mentions inside canonical replies notify the mentioned member once');
select is((select metadata->>'reply_id' from public.achievement_events where user_id='a2400000-0000-4000-8000-000000000003' and event_type='mention_received' and metadata->>'reply_id' is not null),'a2430000-0000-4000-8000-000000000001','reply mentions retain their exact reply destination');
update public.content_replies set body='Edited reply still tags @NotifyMention' where id='a2430000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.achievement_events where user_id='a2400000-0000-4000-8000-000000000003' and event_type='mention_received'),2,'editing a mentioned reply does not duplicate its notification');

insert into public.content_entry_reactions(entry_id,profile_id,reaction_type)
values('a2420000-0000-4000-8000-000000000001','a2400000-0000-4000-8000-000000000002','like');
select is((select count(*)::integer from public.achievement_events where user_id='a2400000-0000-4000-8000-000000000001' and event_type='like_received'),1,'canonical Community likes preserve existing in-app notifications');

insert into public.conversations(id,conversation_key,created_by)
values('a2440000-0000-4000-8000-000000000001','notify-direct','a2400000-0000-4000-8000-000000000002');
insert into public.conversation_members(conversation_id,profile_id) values
  ('a2440000-0000-4000-8000-000000000001','a2400000-0000-4000-8000-000000000001'),
  ('a2440000-0000-4000-8000-000000000001','a2400000-0000-4000-8000-000000000002');
insert into public.messages(id,conversation_id,sender_id,body)
values('a2450000-0000-4000-8000-000000000001','a2440000-0000-4000-8000-000000000001',
  'a2400000-0000-4000-8000-000000000002','A new direct message');
select is((select count(*)::integer from public.achievement_events where user_id='a2400000-0000-4000-8000-000000000001' and event_type='message_received'),1,'new inbox messages create notification events');
select is((select count(*)::integer from public.web_push_deliveries where status='pending'),4,'reply, mention, and message events queue Web Push without queuing likes');

set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select set_config('request.jwt.claim.sub','',true);
select throws_ok($$select * from public.web_push_subscriptions$$,'42501',null,'anonymous visitors cannot read private push endpoints');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','a2400000-0000-4000-8000-000000000001',true);
select throws_ok($$select * from public.claim_web_push_deliveries(10,'a2460000-0000-4000-8000-000000000001')$$,'42501',null,'browser accounts cannot claim the push delivery queue');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select is((select count(*)::integer from public.claim_web_push_deliveries(10,'a2460000-0000-4000-8000-000000000001')),4,'the worker atomically claims the eligible push batch');
select is((select count(*)::integer from public.claim_web_push_deliveries(10,'a2460000-0000-4000-8000-000000000002')),0,'a concurrent worker cannot claim the same push deliveries');
select lives_ok($$select public.complete_web_push_delivery((select id from public.web_push_deliveries order by created_at,id limit 1),'a2460000-0000-4000-8000-000000000001')$$,'a matching worker claim can complete a push delivery');
select is((select count(*)::integer from public.web_push_deliveries where status='sent'),1,'completed push delivery retains sent evidence');

insert into public.admin_profile_role_events(id,profile_id,previous_role,new_role,changed_by,reason)
values('a2470000-0000-4000-8000-000000000001','a2400000-0000-4000-8000-000000000002','member','creator',
  'a2400000-0000-4000-8000-000000000004','Approved Creator notification test');
select is((select count(*)::integer from public.email_outbox_events where event_key='creator-access-granted/a2470000-0000-4000-8000-000000000001' and template_key='creator_access_granted'),1,'every audited Creator promotion queues one branded email');
select is((select payload->>'studioUrl' from public.email_outbox_events where event_key='creator-access-granted/a2470000-0000-4000-8000-000000000001'),'https://app.44os.com/studio','Creator email carries the reviewed Studio action');
select is((select count(*)::integer from public.achievement_events where user_id='a2400000-0000-4000-8000-000000000002' and event_type='creator_access_granted'),1,'Creator promotion also creates an in-app notification');
select is((select count(*)::integer from public.web_push_deliveries delivery join public.achievement_events event on event.id=delivery.achievement_event_id where event.event_type='creator_access_granted' and delivery.status='pending'),1,'Creator promotion queues native push for subscribed devices');

select * from finish();
rollback;
