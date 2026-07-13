# 44OS Operations Runbook

This is an operational companion referenced by the three active handoff documents, not a replacement handoff. Review it before production deployment, incident response, database migration, restoration, or launch approval.

## Release gate

1. Confirm `git status` is clean and the intended commit is on `main`.
2. Run `npm run lint`, `npm run typecheck`, and `npm run build`.
3. Start the production build locally and run `npm run test:smoke`.
4. Run `supabase db push --linked --dry-run` and `supabase db lint --linked --level error`.
5. Back up linked data before every migration. Apply only reviewed repository migrations.
6. After deployment, run `SMOKE_BASE_URL=https://44os.com npm run test:smoke` and manually verify anonymous, fan, creator, and admin journeys at required widths.
7. Reviewed-but-hidden surfaces are tested only in a review environment with `NEXT_PUBLIC_ENABLE_M13_REVIEWED_SURFACES=true` and `SMOKE_REVIEWED_SURFACES=1`; never enable that flag in tester/production deployment before UI approval.

## Health and triage

- `/api/health` checks application configuration and a bounded Supabase read. HTTP 200 means ready; HTTP 503 means configuration or Supabase is unavailable.
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
