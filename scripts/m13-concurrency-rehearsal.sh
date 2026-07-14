#!/usr/bin/env bash
set -euo pipefail

container="${SUPABASE_DB_CONTAINER:-supabase_db_44-platform}"
creator_id='70000000-0000-0000-0000-000000000001'
admin_id='70000000-0000-0000-0000-000000000002'
item_id='70000000-0000-0000-0000-000000000010'
submission_key='m13-concurrent-key'
submission_id=''

psql() {
  docker exec -i "$container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"
}

cleanup() {
  docker exec "$container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "set session_replication_role=replica; delete from public.item_submission_notification_events where submission_id in (select id from public.item_submissions where idempotency_key='$submission_key'); delete from public.item_submission_decisions where submission_id in (select id from public.item_submissions where idempotency_key='$submission_key'); delete from public.item_submission_items where submission_id in (select id from public.item_submissions where idempotency_key='$submission_key'); delete from public.item_submissions where idempotency_key='$submission_key'; delete from public.catalog_items where id='$item_id'; delete from public.profiles where id in ('$creator_id','$admin_id'); delete from auth.users where id in ('$creator_id','$admin_id'); update public.publishing_runtime_controls set phase='trusted_testing',review_required=false,updated_at=now(); set session_replication_role=origin;" >/dev/null || true
}
trap cleanup EXIT

psql <<SQL
begin;
insert into auth.users (id,email,raw_user_meta_data) values ('$creator_id','m13-concurrent-creator@example.test','{"username":"m13_concurrent_creator"}'),('$admin_id','m13-concurrent-admin@example.test','{"username":"m13_concurrent_admin"}') on conflict do nothing;
set local session_replication_role=replica;
update public.profiles set role='creator' where id='$creator_id';
update public.profiles set role='admin' where id='$admin_id';
set local session_replication_role=origin;
insert into public.catalog_items(id,slug,title,creator,item_type,price_cents,is_free,featured,tags,status,author_id,experience_type,fulfillment_type) values ('$item_id','m13-concurrent-item','Concurrent Item','Creator','album',0,true,false,'{}','published','$creator_id','music','digital') on conflict do nothing;
update public.publishing_runtime_controls set phase='review_required',review_required=true,updated_at=now() where singleton;
commit;
begin;
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','$creator_id',true);
select public.submit_item_for_review('$item_id','$submission_key');
commit;
SQL

submission_id="$(docker exec "$container" psql -U postgres -d postgres -Atc "select id from public.item_submissions where idempotency_key='$submission_key'")"
if [[ -z "$submission_id" ]]; then
  echo 'Concurrency rehearsal failed: no submission was created.' >&2
  exit 1
fi

run_decision() {
  local reason="$1"
  docker exec "$container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "begin; set local role authenticated; select set_config('request.jwt.claim.role','authenticated',true); select set_config('request.jwt.claim.sub','$admin_id',true); select public.decide_item_submission('$submission_id','approved','$reason'); commit;"
}

set +e
run_decision 'concurrent decision one' >/tmp/m13-concurrency-one.log 2>&1 & first_pid=$!
run_decision 'concurrent decision two' >/tmp/m13-concurrency-two.log 2>&1 & second_pid=$!
wait "$first_pid"; first_status=$?
wait "$second_pid"; second_status=$?
set -e

successes=0
[[ "$first_status" -eq 0 ]] && successes=$((successes + 1))
[[ "$second_status" -eq 0 ]] && successes=$((successes + 1))
if [[ "$successes" -ne 1 ]] || ! rg -q 'Submission is not pending' /tmp/m13-concurrency-one.log /tmp/m13-concurrency-two.log; then
  echo 'Concurrency rehearsal failed.' >&2
  cat /tmp/m13-concurrency-one.log /tmp/m13-concurrency-two.log >&2
  exit 1
fi

result="$(docker exec "$container" psql -U postgres -d postgres -Atc "select status || ':' || (select count(*) from public.item_submission_decisions where submission_id='$submission_id') from public.item_submissions where id='$submission_id'")"
[[ "$result" == 'approved:1' ]] || { echo "Unexpected concurrent result: $result" >&2; exit 1; }
echo 'M13 concurrency rehearsal passed: one approval committed and the replaying decision failed closed.'
