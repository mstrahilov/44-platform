# 44OS Operations Runbook

This is an operational companion referenced by the three active handoff documents, not a replacement handoff. Review it before production deployment, incident response, database migration, restoration, or launch approval.

## Release gate

1. Confirm `git status` is clean and the intended commit is on `main`.
2. Run `npm run lint`, `npm run typecheck`, `npm run test:security`, `npm run test:observability`, `npm run test:hardening-contract`, and `npm run build`.
3. Start the production build locally and run `npm run test:smoke`. The executable gate checks readiness shape, security headers, document accessibility basics, bounded response/HTML budgets, hidden-surface isolation, and one-hop canonical redirects.
4. Run `npm run test:schema-replay` against the disposable local Supabase stack, then run `supabase db push --linked --dry-run` and `supabase db lint --linked --level error`.
5. Back up linked data before every migration. Apply only reviewed repository migrations.
6. After deployment, run `SMOKE_BASE_URL=https://44os.com npm run test:smoke` and manually verify anonymous, fan, creator, and admin journeys at required widths.
7. Reviewed-but-hidden surfaces are tested only in a review environment with `NEXT_PUBLIC_ENABLE_M13_REVIEWED_SURFACES=true` and `SMOKE_REVIEWED_SURFACES=1`; never enable that flag in tester/production deployment before UI approval.

## Health and triage

- `/api/health` checks application configuration and a bounded Supabase read. HTTP 200 means ready; HTTP 503 means configuration or Supabase is unavailable.
- Health output includes the deployment release and region so an incident can be tied to an exact build. Unhandled server request errors emit the `request_error` JSON contract with release, runtime, method, route, framework context, and sanitized error identity. It deliberately excludes request headers, query values, user content, and tokens. Vercel logs retain the baseline events until an approved external aggregation/alert destination is connected.
- Record UTC time, user role, route, Item/account identifier, browser/device, error reference, and reproduction steps.
- Determine whether the problem affects anonymous browsing, authentication, publishing, Library/entitlements, protected files, Community, or payment infrastructure.
- Do not “repair” Item, entitlement, or audit data through dashboard-only SQL. Capture evidence, back up, and use a reviewed forward migration.

## Authentication incident

1. Check Supabase Auth health, redirect allow-list, rate limits, and SMTP delivery.
2. Confirm `/account/recovery` loads and the newest recovery link returns to that exact route.
3. Never request a password, OTP, recovery token, session token, or service-role key from a user.
4. For suspected compromise, revoke sessions through approved Supabase administration, preserve audit evidence, and rotate affected secrets.

## Publishing or storage incident

1. Confirm the account remains an approved creator/admin and owns the Item.
2. Check catalog-health findings and the exact RPC/storage error.
3. Never hard-delete an Item to fix publishing. Removal is archival and permanent IDs/history remain intact.
4. For protected content, confirm the private bucket path and entitlement-authorized signed-manifest flow. Never replace it with a public URL.

## Community abuse incident

1. Preserve the report and moderation audit record.
2. Hide harmful content through the administrator moderation operation.
3. Do not overwrite the author, report, or original content record.
4. Escalate credible threats, child-safety reports, or legal notices immediately to 44 leadership and appropriate authorities/advisers.

## Database rollback and restoration

- Prefer forward repair after a deployed migration. A down migration is allowed only when reviewed and proven not to destroy newer user data.
- Restoration rehearsals use a separate project/database. Never restore a dump over staging or production as a test.
- Validate row counts and permanent identifiers for profiles, Items, tracks, Library entries, entitlements, entitlement events, Community content, and storage object references before accepting a restore.
- After restoration, regenerate types, run schema lint/security checks, and exercise signed-in journeys before changing traffic.
- Per the July 12 launch sequence decision, the production-data backup restoration rehearsal remains grouped with payment-era final operational gates. Migration-chain replay remains mandatory during current non-payment work.

## Submission-review foundation rehearsal

- Keep `publishing_runtime_controls.review_required=false` during trusted testing.
- Verify pending submissions preserve the live Item and every existing child identity before any review activation.
- Verify `item_submission_decisions`, `item_submission_child_tombstones`, `item_child_archives`, and `item_submission_notification_events` are append-only/audit-safe; notification events are outbox metadata only and must not be delivered by this foundation.
- Verify retrying the same creator idempotency key returns the original submission and retrying a decision fails closed.
- Verify active review blocks legacy direct Item/child mutation paths while the administrator decision RPC can apply the approved snapshot atomically.
- The local hardening contract checks private storage buckets, entitlement-authorized reads, creator ownership on uploads, community rate-event enforcement, typed review tombstones/audit/outbox fences, sanitized request errors, and dormant submission domain boundaries. The application-page/component fan-out audit must continue to show zero direct Supabase table/RPC calls; bounded parallel service reads remain the expected pattern.
- `npm run test:data-restore` restores the repository’s current data backup into a disposable database cloned from the local schema and verifies non-empty profile, Item, and storage-object counts. This local data restore passed during the M13 slice; it does not replace a separate linked-production project restore with storage and permanent-ID comparison.
- `npm run test:m13-rollback` performs a destructive-only-in-a-disposable-database simulation: it clones the local schema, removes the M13-added tables/functions/triggers, and verifies the pre-existing catalog, asset, and runtime-control relations survive. This is rollback evidence for the additive boundary, not a production down migration; any real rollback still requires reviewed forward repair or an explicitly reviewed down migration.
- The separate-project production-data restoration rehearsal and a reviewed migration rollback rehearsal remain open operational gates; local schema replay is not a substitute for either.
- A local schema dump was produced and restored successfully into a disposable PostgreSQL database using the Supabase Docker container; the new M13 tables were verified there. The host does not provide `pg_dump`/`psql` directly, and the separate production-data restoration gate remains open until a disposable project can be restored with permanent identifiers, storage references, and audit rows compared.

## Secrets and providers

- Public Supabase URL/anon keys may be present in the client. Service-role, SMTP, Stripe, PayPal, webhook, and monitoring credentials must remain server-only environment secrets.
- Rotate secrets after staff departure, accidental exposure, suspected compromise, or provider recommendation.
- Payment runtime controls remain false until M11/M12 acceptance and reconciliation tests pass.

## Launch-specific open gates

- Production SMTP, sender-domain authentication, delivery/bounce monitoring, and recovery-email rehearsal.
- Error aggregation/alert destination and on-call ownership.
- Submission review queue and notifications before public creator onboarding.
- Payment reconciliation, refund/dispute, entitlement revocation, and payout failure testing.
- Full accessibility and installed-iOS journey matrix.
