begin;
create extension if not exists pgtap with schema extensions;
select plan(85);

select has_table('public','email_outbox_events','application email has a dedicated durable outbox');
select has_table('public','email_provider_events','provider delivery evidence has a dedicated table');
select has_table('public','newsletter_consents','newsletter consent is explicit');
select has_table('public','support_cases','support cases are durable');
select has_table('public','support_case_events','support history is durable');
select has_table('public','email_control_events','email activation history is durable');
select has_table('public','email_reconciliation_events','ambiguous-delivery decisions are durable');
select has_table('public','newsletter_contact_retirements','old newsletter Contacts have a durable retirement queue');
select is((select delivery_enabled from public.email_delivery_controls where singleton),false,'application delivery defaults off');
select is((select newsletter_sync_enabled from public.email_delivery_controls where singleton),false,'newsletter synchronization defaults off');
select is((select support_intake_enabled from public.email_delivery_controls where singleton),false,'support intake defaults off');

insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
  ('e4400000-0000-4000-8000-000000000001','email-member@example.test',null,'{"username":"email_member"}'),
  ('e4400000-0000-4000-8000-000000000002','email-admin@example.test',now(),'{"username":"email_admin"}'),
  ('e4400000-0000-4000-8000-000000000003','email-other@example.test',now(),'{"username":"email_other"}');
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
update public.profiles set role='admin' where id='e4400000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','e4400000-0000-4000-8000-000000000003',true);
select throws_ok(
  $$select public.set_email_delivery_control('support_intake_enabled',true,'Member attempted activation.')$$,
  '42501','Administrator access required.','members cannot change email activation controls'
);
select set_config('request.jwt.claim.sub','e4400000-0000-4000-8000-000000000002',true);
select lives_ok(
  $$select public.set_email_delivery_control('support_intake_enabled',true,'Approved support intake rehearsal.')$$,
  'admin can enable one exact email control'
);
select is((select new_enabled from public.email_control_events where control_name='support_intake_enabled' order by created_at desc limit 1),true,'effective enable transition is audited');
select lives_ok(
  $$select public.set_email_delivery_control('support_intake_enabled',false,'Rehearsal completed; return fail closed.')$$,
  'admin can return one exact email control to off'
);
select is((select count(*)::integer from public.email_control_events where control_name='support_intake_enabled'),2,'each effective control transition has append-only history');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select throws_ok(
  $$select public.queue_welcome_email('e4400000-0000-4000-8000-000000000001','https://app.44os.com/library')$$,
  '55000','A confirmed account is required.','welcome cannot queue before account confirmation'
);
reset role;
update auth.users set email_confirmed_at=now() where id='e4400000-0000-4000-8000-000000000001';
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select lives_ok($$select public.queue_welcome_email('e4400000-0000-4000-8000-000000000001','https://app.44os.com/library')$$,'confirmed account can queue welcome');
select lives_ok($$select public.queue_welcome_email('e4400000-0000-4000-8000-000000000001','https://app.44os.com/library')$$,'duplicate welcome intent is idempotent');
select is((select count(*)::integer from public.email_outbox_events where event_key='welcome/e4400000-0000-4000-8000-000000000001'),1,'stable event key stores one welcome');
select throws_ok(
  $$select * from public.claim_application_email((select id from public.email_outbox_events where event_key='welcome/e4400000-0000-4000-8000-000000000001'),'e4410000-0000-4000-8000-000000000001')$$,
  '55000','Email delivery is disabled.','credentials cannot bypass the delivery control'
);

update public.email_delivery_controls set delivery_enabled=true,newsletter_sync_enabled=true,support_intake_enabled=true,approved_at=now(),approved_by='e4400000-0000-4000-8000-000000000002' where singleton;
select is((select count(*)::integer from public.claim_application_email((select id from public.email_outbox_events where event_key='welcome/e4400000-0000-4000-8000-000000000001'),'e4410000-0000-4000-8000-000000000001')),1,'worker claims one eligible event');
select is((select count(*)::integer from public.claim_application_email((select id from public.email_outbox_events where event_key='welcome/e4400000-0000-4000-8000-000000000001'),'e4410000-0000-4000-8000-000000000002')),0,'a claimed event cannot be concurrently claimed');
select lives_ok($$select public.complete_application_email((select id from public.email_outbox_events where event_key='welcome/e4400000-0000-4000-8000-000000000001'),'e4410000-0000-4000-8000-000000000001','provider-message-44')$$,'matching claim records provider send evidence');
select is((select status from public.email_outbox_events where event_key='welcome/e4400000-0000-4000-8000-000000000001'),'sent','completed outbox event is sent exactly once');

select lives_ok($$select public.queue_application_email('stale/retry','welcome',1,'e4400000-0000-4000-8000-000000000003','email-other@example.test','account','e4400000-0000-4000-8000-000000000003','{"displayName":"Other","libraryUrl":"https://app.44os.com/library"}')$$,'worker can queue a stale-claim recovery fixture');
select is((select count(*)::integer from public.claim_application_email((select id from public.email_outbox_events where event_key='stale/retry'),'e4410000-0000-4000-8000-000000000003')),1,'recovery fixture is initially claimed');
update public.email_outbox_events set claimed_at=now()-interval '11 minutes' where event_key='stale/retry';
select is(public.recover_stale_application_email_claims(),1,'stale worker claim is recovered once');
select is((select last_error_code from public.email_outbox_events where event_key='stale/retry'),'stale_claim_recovered','recovered claim remains eligible inside the provider idempotency window');
select is((select count(*)::integer from public.claim_application_email((select id from public.email_outbox_events where event_key='stale/retry'),'e4410000-0000-4000-8000-000000000004')),1,'recovered event can be reclaimed with the same durable event key');
select lives_ok($$select public.queue_application_email('stale/reconcile','welcome',1,'e4400000-0000-4000-8000-000000000003','email-other@example.test','account','e4400000-0000-4000-8000-000000000003','{"displayName":"Other","libraryUrl":"https://app.44os.com/library"}')$$,'worker can queue an expired idempotency-window fixture');
select is((select count(*)::integer from public.claim_application_email((select id from public.email_outbox_events where event_key='stale/reconcile'),'e4410000-0000-4000-8000-000000000005')),1,'expired-window fixture is initially claimed');
update public.email_outbox_events set created_at=now()-interval '24 hours',claimed_at=now()-interval '11 minutes' where event_key='stale/reconcile';
select is(public.recover_stale_application_email_claims(),1,'expired stale worker claim is recovered once');
select is((select last_error_code from public.email_outbox_events where event_key='stale/reconcile'),'stale_claim_reconciliation_required','claim outside the provider idempotency window requires operator reconciliation');
select is((select count(*)::integer from public.claim_application_email((select id from public.email_outbox_events where event_key='stale/reconcile'),'e4410000-0000-4000-8000-000000000006')),0,'expired idempotency-window event cannot auto-send');
update public.email_outbox_events set id='e4420000-0000-4000-8000-000000000001' where event_key='stale/reconcile';

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','e4400000-0000-4000-8000-000000000003',true);
select throws_ok(
  $$select public.reconcile_application_email('e4420000-0000-4000-8000-000000000001','provider_sent','provider-message-reconciled','Member cannot reconcile.')$$,
  '42501','Administrator access required.','members cannot reconcile ambiguous email delivery'
);
select set_config('request.jwt.claim.sub','e4400000-0000-4000-8000-000000000002',true);
select lives_ok(
  $$select public.reconcile_application_email('e4420000-0000-4000-8000-000000000001','provider_sent','provider-message-reconciled','Resend log proves the provider accepted this message.')$$,
  'admin can record provider evidence without sending again'
);
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select is((select status from public.email_outbox_events where event_key='stale/reconcile'),'sent','provider evidence closes an ambiguous send as sent');
select is((select count(*)::integer from public.email_reconciliation_events where resolution='provider_sent' and provider_message_id='provider-message-reconciled'),1,'provider-sent reconciliation has append-only evidence');

select lives_ok($$select public.queue_application_email('stale/manual-retry','welcome',1,'e4400000-0000-4000-8000-000000000003','email-other@example.test','account','e4400000-0000-4000-8000-000000000003','{"displayName":"Other","libraryUrl":"https://app.44os.com/library"}')$$,'worker can queue a manual-retry reconciliation fixture');
update public.email_outbox_events set id='e4420000-0000-4000-8000-000000000002',status='failed',created_at=now()-interval '24 hours',last_error_code='stale_claim_reconciliation_required',last_error_at=now(),next_attempt_at='infinity'::timestamptz where event_key='stale/manual-retry';
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','e4400000-0000-4000-8000-000000000002',true);
select lives_ok(
  $$select public.reconcile_application_email('e4420000-0000-4000-8000-000000000002','retry_approved',null,'Resend log confirms no provider message exists for this event.')$$,
  'admin can approve one retry only after provider inspection'
);
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select is((select last_error_code from public.email_outbox_events where event_key='stale/manual-retry'),'manual_retry_approved','approved retry is explicitly marked before worker pickup');
select is((select count(*)::integer from public.claim_application_email((select id from public.email_outbox_events where event_key='stale/manual-retry'),'e4410000-0000-4000-8000-000000000007')),1,'worker can claim exactly the manually approved retry');

do $$
declare fixture_id uuid;
begin
  fixture_id:=public.queue_application_email('stale/final-ambiguous-failure','welcome',1,'e4400000-0000-4000-8000-000000000003','email-other@example.test','account','e4400000-0000-4000-8000-000000000003','{"displayName":"Other","libraryUrl":"https://app.44os.com/library"}');
  perform * from public.claim_application_email(fixture_id,'e4410000-0000-4000-8000-000000000008');
  update public.email_outbox_events set created_at=now()-interval '24 hours' where id=fixture_id;
end;
$$;
select lives_ok(
  $$select public.fail_application_email((select id from public.email_outbox_events where event_key='stale/final-ambiguous-failure'),'e4410000-0000-4000-8000-000000000008','network_timeout',true)$$,
  'an ambiguous provider failure at the expired boundary is frozen'
);
select is((select last_error_code from public.email_outbox_events where event_key='stale/final-ambiguous-failure'),'stale_claim_reconciliation_required','final ambiguous failure enters the owner reconciliation queue');
select is((select count(*)::integer from public.claim_application_email((select id from public.email_outbox_events where event_key='stale/final-ambiguous-failure'),'e4410000-0000-4000-8000-000000000009')),0,'final ambiguous failure cannot bypass reconciliation');

select lives_ok($$select public.queue_application_email('provider/known-rejection','welcome',1,'e4400000-0000-4000-8000-000000000003','email-other@example.test','account','e4400000-0000-4000-8000-000000000003','{"displayName":"Other","libraryUrl":"https://app.44os.com/library"}')$$,'worker can queue a known provider-rejection fixture');
select is((select count(*)::integer from public.claim_application_email((select id from public.email_outbox_events where event_key='provider/known-rejection'),'e4410000-0000-4000-8000-000000000010')),1,'known provider-rejection fixture is initially claimed');
select lives_ok(
  $$select public.fail_application_email((select id from public.email_outbox_events where event_key='provider/known-rejection'),'e4410000-0000-4000-8000-000000000010','validation_error',false,false)$$,
  'a definite non-retryable provider rejection is frozen'
);
select is((select last_error_code from public.email_outbox_events where event_key='provider/known-rejection'),'provider_rejection_review_required','known provider rejection enters the owner review queue');
select is((select count(*)::integer from public.claim_application_email((select id from public.email_outbox_events where event_key='provider/known-rejection'),'e4410000-0000-4000-8000-000000000011')),0,'known provider rejection never retries automatically');
update public.email_outbox_events set id='e4420000-0000-4000-8000-000000000003' where event_key='provider/known-rejection';
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','e4400000-0000-4000-8000-000000000002',true);
select throws_ok(
  $$select public.reconcile_application_email('e4420000-0000-4000-8000-000000000003','provider_sent','provider-impossible','Provider returned a definite rejection response.')$$,
  '55000','A known provider rejection cannot be marked sent.','known provider rejection cannot be misrepresented as sent'
);
select lives_ok(
  $$select public.reconcile_application_email('e4420000-0000-4000-8000-000000000003','retry_approved',null,'Provider configuration was corrected after the definite rejection.')$$,
  'admin can release one retry after correcting a known provider rejection'
);
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select is((select count(*)::integer from public.claim_application_email((select id from public.email_outbox_events where event_key='provider/known-rejection'),'e4410000-0000-4000-8000-000000000012')),1,'worker can claim exactly the corrected known-rejection retry');

select lives_ok($$select public.record_email_provider_event('svix-bounce-44','email.bounced','provider-message-44',now(),'hard_bounce','email-member@example.test','{"subject":"must be removed","headers":{"authorization":"secret"}}')$$,'signed provider event can record a hard bounce');
select is((select reason from public.email_suppressions where email_normalized='email-member@example.test'),'hard_bounce','hard bounce suppresses the recipient');
select is((select metadata ? 'subject' from public.email_provider_events where provider_event_id='svix-bounce-44'),false,'provider event strips unnecessary message metadata');
select lives_ok($$select public.queue_application_email('support-ack/suppressed','support_acknowledgement',1,'e4400000-0000-4000-8000-000000000001','email-member@example.test','support_case',null,'{"caseReference":"SUP-X","subject":"X","receivedAt":"now","supportUrl":"https://app.44os.com/support"}')$$,'suppressed address still records durable intent');
select is((select status from public.email_outbox_events where event_key='support-ack/suppressed'),'suppressed','suppressed intent cannot enter delivery queue');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','e4400000-0000-4000-8000-000000000003',true);
select lives_ok($$select public.set_newsletter_consent(true,'44os-newsletter-v1','settings')$$,'member may explicitly consent in Settings');
select is((select status from public.newsletter_consents where user_id='e4400000-0000-4000-8000-000000000003'),'subscribed','explicit consent is stored as subscribed');
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
update public.newsletter_consents
set provider_contact_id='provider-contact-old',provider_topic_id='topic-44',sync_status='synced',sync_claimed_at=now()
where user_id='e4400000-0000-4000-8000-000000000003';
reset role;
update auth.users set email='email-other-new@example.test' where id='e4400000-0000-4000-8000-000000000003';
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select is((select count(*)::integer from public.newsletter_contact_retirements where user_id='e4400000-0000-4000-8000-000000000003' and email_normalized='email-other@example.test' and sync_status='pending'),1,'account email change queues the old provider Contact for retirement');
select is((select email_normalized from public.newsletter_consents where user_id='e4400000-0000-4000-8000-000000000003'),'email-other-new@example.test','newsletter synchronization follows the securely changed account address');
select is((select provider_contact_id is null and provider_topic_id is null from public.newsletter_consents where user_id='e4400000-0000-4000-8000-000000000003'),true,'replacement address cannot reuse the old provider Contact identity');
select is((select status from public.newsletter_consents where user_id='e4400000-0000-4000-8000-000000000003'),'subscribed','account email change preserves the existing explicit account consent');
select is((select sync_claimed_at is not null from public.newsletter_consents where user_id='e4400000-0000-4000-8000-000000000003'),true,'email rotation preserves an in-flight old-Contact claim so retirement cannot overtake it');
reset role;
update auth.users set email='email-member-new@example.test' where id='e4400000-0000-4000-8000-000000000001';
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select is(
  (select count(*)::integer from (
    select user_id from public.newsletter_consents where user_id='e4400000-0000-4000-8000-000000000001'
    union all
    select user_id from public.newsletter_contact_retirements where user_id='e4400000-0000-4000-8000-000000000001'
  ) inferred_newsletter_rows),
  0,
  'account email change never infers newsletter consent for a non-subscriber'
);
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','e4400000-0000-4000-8000-000000000001',true);
select is((select count(*)::integer from public.newsletter_consents where user_id='e4400000-0000-4000-8000-000000000003'),0,'another member cannot read newsletter consent');
select throws_ok(
  $$select * from public.newsletter_contact_retirements$$,
  '42501','permission denied for table newsletter_contact_retirements','browser roles cannot inspect retired newsletter addresses'
);
select throws_ok($$select public.queue_application_email('forged','welcome',1,null,'victim@example.test','account',null,'{}')$$,'42501',null,'browser roles cannot queue arbitrary email');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select lives_ok($$select public.apply_newsletter_provider_unsubscribe('email-other-new@example.test','provider-contact-44')$$,'signed provider unsubscribe revokes local consent');
select lives_ok($$select public.apply_newsletter_provider_unsubscribe('email-other-new@example.test','provider-contact-44')$$,'duplicate provider unsubscribe is idempotent');
select is((select status from public.newsletter_consents where user_id='e4400000-0000-4000-8000-000000000003'),'unsubscribed','provider opt-out is authoritative for revocation');
select is((select count(*)::integer from public.newsletter_consent_events where user_id='e4400000-0000-4000-8000-000000000003' and action='provider_unsubscribed'),1,'duplicate provider delivery records one revocation transition');
select lives_ok($$select public.create_support_case('e4400000-0000-4000-8000-000000000003','email-other@example.test','Need help','A durable support request.')$$,'enabled signed-in support intake creates a case');
select is((select count(*)::integer from public.support_case_events where event_type='opened'),1,'support case records append-only opening history');
do $$
begin
  perform public.create_support_case('e4400000-0000-4000-8000-000000000003','email-other@example.test','Need help two','A second durable support request.');
  perform public.create_support_case('e4400000-0000-4000-8000-000000000003','email-other@example.test','Need help three','A third durable support request.');
  perform public.create_support_case('e4400000-0000-4000-8000-000000000003','email-other@example.test','Need help four','A fourth durable support request.');
  perform public.create_support_case('e4400000-0000-4000-8000-000000000003','email-other@example.test','Need help five','A fifth durable support request.');
end;
$$;
select throws_ok(
  $$select public.create_support_case('e4400000-0000-4000-8000-000000000003','email-other@example.test','Need help six','A sixth support request inside one hour.')$$,
  '55000','Support request rate limit exceeded.','support intake enforces a per-account hourly ceiling'
);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','e4400000-0000-4000-8000-000000000003',true);
select throws_ok(
  $$select public.record_support_reply((select id from public.support_cases where subject='Need help'),'A forged reply.')$$,
  '42501','Administrator access required.','members cannot record support replies'
);
select set_config('request.jwt.claim.sub','e4400000-0000-4000-8000-000000000002',true);
select throws_ok(
  $$select public.record_support_reply((select id from public.support_cases where subject='Need help'),'Reply before ownership.')$$,
  '55000','Claim reply ownership before recording a human reply.','admin must claim reply ownership'
);
select lives_ok(
  $$select public.update_support_case((select id from public.support_cases where subject='Need help'),'open','e4400000-0000-4000-8000-000000000002','e4400000-0000-4000-8000-000000000002','Claimed for reply.')$$,
  'admin can claim assignment and reply ownership'
);
select lives_ok(
  $$select public.record_support_reply((select id from public.support_cases where subject='Need help'),'The reply sent from the monitored mailbox.')$$,
  'reply owner can append a human reply'
);
select is((select status from public.support_cases where subject='Need help'),'waiting_on_requester','recorded reply advances the case state');
select is((select count(*)::integer from public.support_case_events where event_type='support_reply'),1,'human reply is preserved once in append-only history');
select throws_ok(
  $$update public.support_case_events set body='rewritten' where event_type='support_reply'$$,
  '42501','permission denied for table support_case_events','browser admin cannot update support reply history'
);
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select throws_ok(
  $$update public.support_case_events set body='rewritten' where event_type='support_reply'$$,
  '55000','Email evidence is append-only.','append-only trigger also rejects privileged history rewrites'
);

select * from finish();
rollback;
