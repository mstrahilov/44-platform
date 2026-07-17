# 44OS Milestones

This is the execution and launch-readiness source of truth. Read it after `44OS_FOUNDATION.md` and `44OS_UI.md`.

The only active handoff documents are:

- `44OS_FOUNDATION.md` — product, architecture, data, operations, payments, and interactive contracts.
- `44OS_UI.md` — approved visual and interaction system.
- `44OS_MILESTONES.md` — completed work, open gates, sequencing, and acceptance.

Status vocabulary: `Not started`, `In discussion`, `Approved`, `In progress`, `Blocked`, `Complete`, and `Deferred`.

---

## Current System Check — July 17, 2026

**Planning handoff status: documented; implementation has not started.**

**Next-chat starting point:** begin with the first unchecked P0 item below. Do not repeat the production, provider, schema, or storage research recorded here.

The application is live and healthy at `https://44os.com`. Vercel production deployment `dpl_9ppAmGu9NsvbGeoSoLHRpCNniRfN` is `Ready`; the apex and `www` aliases point to it, `/api/health` reports healthy with Supabase HTTP 200, and Privacy/Terms return HTTP 200.

Audited production facts:

- Linked Supabase migration history is aligned through `20260717022000_m12_launch_commerce_activation.sql`; clean disposable replay and all 19 pgTAP files/494 assertions passed.
- Production Checkout and Stripe payment controls are enabled with immutable launch terms and U.S.-only shipping. Production has zero commerce orders.
- Public paid UI remains hidden because `NEXT_PUBLIC_PUBLIC_PURCHASES_AVAILABLE=false`. This presentation switch—not a login gate—is why products say `Purchasing coming soon`.
- Stripe live read-only preflight passed charging/settlement, Tax evidence, the active USD shipping rate, and the signed production webhook event set.
- Printful connection, import, quote, and non-charging draft controls are enabled; confirmation remains disabled. Eight provider products are mapped: five reviewed, two draft, and one blocked.
- Only 44 Hoodie and 44 Windbreaker are published with active physical offers. The current provider-owned launch set ends with mapped 44 Satchel; hidden legacy 44 Tote is unmapped and is not a launch product.
- Production has five referenced Merch image objects and five image rows, with zero current Merch orphans or broken references. All five are approved for a controlled reset before new imagery is uploaded.
- The broader public upload bucket has 69 unverified orphan candidates across product, profile, resource, and track namespaces. Nothing outside the dedicated Merch prefix may be deleted until every current, historical, and submission reference is mapped.
- Hosted branded Supabase Auth mail and the iCloud support mailbox are live. The Resend application webhook and application-email worker are not configured or active.
- `PRINTFUL_WEBHOOK_SECRET` is absent and signed Printful webhook acceptance is incomplete.
- Strict linked database lint reports one error in `process_stripe_webhook_event`: the unsupported-event return references nonexistent `order_id` instead of the resolved order variable. A new forward migration is required.
- `src/lib/database.types.ts` is stale against the linked schema and omits newer email, payout, image, and Printful interfaces.
- Production package audit reports two moderate findings through Next.js's nested PostCSS `<8.5.10`; a tested patched override or upstream fix is required.
- `/` currently renders `Store` instead of the contracted `44OS` page identity, and Admin Printful fulfillment renders its connection guard twice.
- Wise payout execution, licensed Beats, creator Merch, international Merch, newsletters, and interactive runtime remain off/deferred.
- The working tree is intentionally dirty with the existing release. Do not reset, clean, or discard it; preserve a checkpoint before implementation.

Release boundaries:

- **Closed/trusted paid testing:** keep account creation invite-only, complete the P0-P4 gates, and enable purchasing only for the controlled cohort.
- **Broad public launch:** additionally requires P5-P6, zero unexplained reconciliation mismatches, all eight current Printful products ready, critical transactional email evidence, and explicit owner approval.

## Next Chat Execution Queue

This is the only active execution plan. Work in order, check an item only after its acceptance evidence is recorded, and append implementation/rollback evidence to the historical record below. Foundation and UI define contracts; they do not duplicate this queue.

### P0 — Preserve and repair the release baseline

- [ ] Record the current working-tree state and preserve it without reset or cleanup.
- [ ] Create an owner-approved checkpoint before new implementation.
- [ ] Add a forward migration fixing the Stripe unsupported-event database lint error.
- [ ] Add its pgTAP regression test.
- [ ] Regenerate linked Supabase types.
- [ ] Make database lint fail when errors are reported.
- [ ] Resolve the PostCSS audit through a tested patched override or upstream release.
- [ ] Fix `/` to render `44OS` and remove the duplicate Printful connection guard.
- [ ] Pass schema replay, security tests, linked lint, lint, typecheck, build, package audit, smoke, and `git diff --check`.

**Completion gate:** the preserved baseline is recoverable, all release-integrity findings are fixed, and every P0 verification passes.

### P1 — Build Printful-owned catalog synchronization

- [ ] Add one complete, paginated, fail-closed **Sync with Printful** operation for the verified store.
- [ ] Create unseen provider products automatically as permanent draft 44OS Items.
- [ ] Update existing names, retail prices, variants, costs, SKUs, and availability automatically.
- [ ] Activate new sizes under an already-imaged color automatically when available and margin-safe.
- [ ] Stage only newly introduced colors that lack imagery.
- [ ] Keep existing reviewed variants live while new colors are staged.
- [ ] Archive products missing from a successfully completed provider snapshot; never archive from a partial or failed fetch.
- [ ] Archive removed/ignored variants while preserving order history and permanent Item IDs.
- [ ] Restore a reappearing archived provider ID as draft and require publication again.
- [ ] Add idempotent/concurrent sync evidence and an Admin created/updated/staged/archived result summary.
- [ ] Remove all manual product-destination mapping controls.

**Completion gate:** repeated and concurrent complete-store syncs converge on one provider-authoritative catalog without deleting history or interrupting existing sellable variants unnecessarily.

### P2 — Rebuild Merch Admin and image storage

- [ ] Build Active/Archived product rows with Active selected by default; Active includes current draft, published, needs-image, and blocked rows.
- [ ] Link each row to its own Admin product detail page.
- [ ] Show Printful-controlled name, price, variants, availability, and margin as read-only provider facts.
- [ ] Add one upload slot per current Printful color.
- [ ] Add unlimited replaceable and reorderable bonus images.
- [ ] Add atomic featured-image selection from any color or bonus image.
- [ ] Remove the separate main-image role.
- [ ] Add content hashes, file metadata, and duplicate prevention within each product.
- [ ] Make same-file uploads idempotent and atomically replace a field when new bytes are uploaded.
- [ ] Delete replaced objects after the database swap when their final reference is removed.
- [ ] Queue failed storage deletions and add a bounded, prefix-safe daily orphan reconciler with a grace period and audit record.
- [ ] Block deletion of a published featured image until a replacement is selected.
- [ ] Ensure Printful sync never clears the featured cover and public galleries exclude archived-color imagery.

**Completion gate:** each product has a clear row/detail workflow, exactly one featured image, exactly one image per sellable color, no duplicate stored artwork, and a safe retryable cleanup path.

### P3 — Reset and rebuild the launch catalog

- [ ] Back up and manifest the exact current five Merch image rows and five storage objects.
- [ ] Return Hoodie and Windbreaker and their physical offers to draft.
- [ ] Clear all current Merch image rows, Item covers, and variant image URLs.
- [ ] Delete the exact five current `uploads/merch/...` objects.
- [ ] Verify zero remaining Merch image rows, objects, or broken references.
- [ ] Prove legacy 44 Tote has no orders, submissions, assets, or community dependencies and permanently remove it; stop instead of cascading if any dependency exists.
- [ ] Assign 44 Satchel sort order 80.
- [ ] Sync the eight products currently returned by Printful.
- [ ] Upload new color and bonus images and choose one featured image per product.
- [ ] Publish all eight image-complete, available, margin-safe products.

**Completion gate:** the launch catalog contains the current eight Printful products—T-Shirt, Sweatshirt, Hoodie, Windbreaker, Beanie, Hat, Bag, and Satchel—with no legacy Tote or old Merch images.

### P4 — Controlled commerce acceptance

- [ ] Configure and prove the signed Printful webhook without exposing its secret.
- [ ] Create a low-value 44-owned non-Beat digital acceptance Item for one named tester.
- [ ] Prove one live purchase creates exactly one order, payment event, entitlement, Library entry, ledger allocation, receipt event, and accepted-terms snapshot.
- [ ] Prove refund, entitlement revoke/restore, duplicate/reordered webhook, and zero-mismatch reconciliation behavior.
- [ ] Archive the digital acceptance Item after evidence is retained.
- [ ] Run one controlled U.S. Hoodie or Windbreaker purchase.
- [ ] Prove Stripe payment, current Printful quote, idempotent non-charging draft, explicit owner confirmation in Printful, signed provider status/tracking, cancellation/refund, and reconciliation.
- [ ] Require zero unexplained payment or fulfillment mismatches before activation.

**Completion gate:** verified provider evidence—not redirects—proves the complete digital and physical lifecycle without duplicate charges, grants, drafts, or fulfillment facts.

### P5 — Closed paid-testing activation

- [ ] Restore invite-only/closed-testing account creation before exposing production purchase UI.
- [ ] Configure the signed Resend webhook and application-email worker.
- [ ] Prove purchase, refund, fulfillment, and tracking messages with provider-observable idempotency.
- [ ] Verify all eight current Printful products are ready.
- [ ] Set `NEXT_PUBLIC_PUBLIC_PURCHASES_AVAILABLE=true` and redeploy the production client.
- [ ] Test signed-out, invited buyer, Cart, Checkout, Orders, Library, Admin Payments, and Admin Fulfillment journeys.
- [ ] Rehearse rollback: disable the public switch, redeploy, and return affected offers to draft without deleting order/provider evidence.

**Completion gate:** the invited cohort can purchase and receive operational messages, while signup, provider confirmation, per-Item eligibility, and rollback remain fail-closed.

### P6 — Broad public-launch gates

- [ ] Complete Auth confirmation, resend, magic-link, recovery, password-change, and secure-email-change real-inbox journeys.
- [ ] Complete final Terms, Privacy, Copyright, refund/return, shipping, support, and account-recovery review.
- [ ] Assign external error-alert delivery and primary/backup on-call ownership.
- [ ] Complete signed-in fan/creator/admin keyboard, screen-reader, contrast, 390/430/1280/1440, Safari, and installed-PWA testing.
- [ ] Complete a separate-project database and storage restoration rehearsal with permanent-ID and audit comparison.
- [ ] Resolve the broader 69-object public-storage audit before deleting anything outside the dedicated Merch prefix.
- [ ] Review production content, abuse escalation, privacy requests, support ownership, and release rollback responsibility.
- [ ] Complete M21 Analytics, Search, And Merchant Discoverability and record its production acceptance evidence.
- [ ] Obtain explicit owner approval before opening account creation or commerce beyond the closed cohort.

**Completion gate:** every legal, operational, access, recovery, monitoring, restoration, analytics, search, and merchant-discovery owner is named and the broad-launch decision is explicitly recorded.

## Historical Implementation And Rollback Record

Keep this record current as part of every phase. Repository history remains the exact source diff; this section explains intent, external state, and safe restoration without storing credentials.

Entries below are dated historical evidence. Statements such as `local-only`, `unapplied`, or `no production change` describe that dated phase only; the Current System Check above is authoritative for present state.

**Restoration policy**

- Every implementation phase must append: the exact files and migrations changed, external dashboard/DNS state changed, feature flags and kill switches, verification evidence, and the safe rollback or forward-repair path. A phase is not complete while this record is incomplete.
- Repository rollback restores code and versioned configuration only. It does **not** restore linked Supabase rows deleted or transformed by a migration, Stripe/Printful objects, Resend configuration, Supabase Dashboard settings, DNS records, or provider-side orders. Those require the captured external-state record and, for database data, the pre-write backup.
- Before any linked database write, capture a dated schema/data backup, record the linked project reference and current migration list, and run the migration against the local replay fixture plus pgTAP first. Record backup locations and provider identifiers here without copying credentials, API keys, SMTP passwords, customer addresses, or webhook payload PII.
- Production database repair is forward-only by default. Do not hand-edit migration history or reverse a destructive migration ad hoc. Restore from the approved backup when rows must be recovered; otherwise ship a reviewed compensating migration. Presentation flags stay off throughout restoration.
- The minimum repository acceptance sequence after a restoration is Supabase config parsing, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:commerce-contract`, `npm run test:smoke`, and the relevant local schema replay/pgTAP suites. Provider-specific contract tests join this sequence when their adapters land.

**July 16 — authentication email and temporary global commerce lock**

- Email configuration/templates: `supabase/config.toml`, `supabase/templates/`, the repository-root `templates` compatibility link required by Supabase CLI 2.109.1, `.env.example`, and Foundation section 11.
- Recovery/auth UI: `src/app/account/recovery/page.tsx`, `src/app/login/page.tsx`, and the Account password minimum in `src/app/settings/page.tsx`.
- Temporary presentation authority: `src/lib/commerceAvailability.ts`. `NEXT_PUBLIC_PUBLIC_PURCHASES_AVAILABLE` is now the reversible platform-wide emergency presentation switch and defaults false. The former creator-wide pricing constant has been removed; creator pricing and purchase presentation now consume the audited per-creator eligibility state. The database order gate remains authoritative even when the presentation switch is true.
- Purchase-entry presentation: `src/components/Ui.tsx`, `src/components/LibraryDetailPrimitives.tsx`, `src/app/store/item/[identifier]/page.tsx`, `src/components/Topbar.tsx`, `src/app/cart/page.tsx`, and `src/app/checkout/page.tsx`.
- Public policy/help activation: `src/app/legal/terms/page.tsx`, `src/app/legal/privacy/page.tsx`, `src/app/legal/copyright/page.tsx`, and `src/app/support/page.tsx`.
- Safe repository rollback: revert only the reviewed phase diff or its eventual dedicated commit, then rerun Supabase config parsing, typecheck, lint, build, launch smoke, and the commerce reachability matrix. Never restore purchase buttons without also proving the server and per-creator controls remain fail-closed.
- Safe hosted-email rollback: before changing Supabase Auth, export or capture the current Site URL, redirect allow-list, confirmation, SMTP, rate-limit, subject, template, and security-notification settings. Before changing DNS, record the exact existing records and TTLs. Add only the exact Resend-provided sending records for root `44os.com`; do not overwrite existing inbound MX or unrelated root-domain mail records. If delivery fails, disable custom SMTP or restore the recorded prior hosted values and the captured `auth.44os.com` Resend domain while keeping public signup closed until the rehearsal passes.
- Deferred release evidence to attach later: real-inbox provider matrix, delivery/bounce result, and accepted application release identifier. Root-domain Resend status, sanitized DNS record names/types, and the hosted Supabase setting summary are already recorded; never add private keys or credentials.

**July 16 — owner-approved root email and hosted Auth cutover (no application deployment)**

- External state changed: iCloud owns root inbound mail through its two priority-10 MX records; `support@44os.com` is monitored by the sole owner with catch-all off and the display name `44OS Support`. Resend Free now contains only verified root domain `44os.com` in `us-east-1`; Sending is on, Receiving is off, tracking is unconfigured/disabled, and TLS is `Opportunistic`. Old `.auth` DNS records remain for rollback.
- Hosted Auth changed: Supabase custom SMTP uses a separate Resend sending-only/domain-restricted credential and sends as `44OS <accounts@44os.com>` through `smtp.resend.com:465`. The email limit is 30/hour. Six Auth templates and the password/email-change Security templates exactly match `supabase/templates/`; only those two Security notifications are enabled. Site URL, three redirects, confirmation requirement, secure email change, and the 8-digit/3,600-second OTP policy were re-read and preserved.
- Provider/application staging changed: Resend contains public/default-opt-out Topic `44OS News` and two separated API credentials—full-access application server and sending-only Auth SMTP. Vercel Production stores `RESEND_API_KEY`, `RESEND_NEWSLETTER_TOPIC_ID`, and `EMAIL_CRON_SECRET`; Vercel reports that a new deployment is required before they take effect. No deployment was started. Resend has no webhook, `RESEND_WEBHOOK_SECRET` is absent, no Supabase Cron/Vault job exists, and no Contact, Broadcast, or unattended real-inbox Auth message was created.
- Linked database and activation state: unchanged. Migrations `20260716022000`–`20260716034000` remain local-only; no linked push, repair, ad-hoc SQL, or database control activation occurred. Public commerce and unrelated production switches remain off.
- Safe rollback: keep public signup/application delivery under review; set hosted Supabase back to the captured built-in-mail state and 2/hour limit, restore the eight captured generic subjects/bodies and both Security-notification switches off, and verify the preserved Site URL/redirect/security settings. If root Resend must be abandoned, remove only the root Resend DKIM/`send` return-path records, recreate `auth.44os.com` from the protected provider capture, and leave iCloud root MX/SPF/DKIM, website/NS, and DMARC untouched. Vercel variables can be removed independently because no release currently consumes them.

**July 16 — 44-owned Merch boundary and database guard (repository only; linked write not yet accepted)**

- Creator-facing Merch removal/guard: `src/lib/osApps.ts`, `src/app/studio/page.tsx`, `src/app/studio/products/new/page.tsx`, and `src/app/studio/products/[id]/page.tsx`. Admin remains the only app role allowed to manage 44-owned Merch; creators retain digital publishing only.
- Ordered migration set: `20260716020000_m20_merch_catalog_cleanup.sql` removes the reviewed test-content footprint, establishes Merch tags, and adds the published gallery policy; `20260716021000_m20_launch_merch_eight.sql` reduces and orders the launch catalog to eight reviewed 44 Items; `20260716022000_m12_stripe_verified_payments.sql` adds the fail-closed verified-payment foundation; `20260716023000_m20_platform_only_merch.sql` adds the database trigger that rejects creator Merch even through direct API or security-definer editor calls. Preserve this order.
- Security evidence source: `supabase/tests/m20_merch_catalog_security.sql` now includes creator-direct-insert rejection and admin Merch acceptance; `supabase/tests/m12_stripe_verified_payments_security.sql` covers the verified-payment controls. These tests must pass after a clean local replay before any linked write.
- Destructive-data warning: the `20000` and `21000` migrations delete specifically allow-listed catalog/community rows. Reverting their SQL files, UI code, or a deployment cannot restore those rows. Before applying them to the linked project, create and verify a dated data backup and record its protected location plus the pre-write row-count evidence here. If rollback is required, keep commerce/public purchase controls off and restore the allow-listed rows and dependent records from that backup or an approved compensating migration.
- Guard rollback: disabling/removing `catalog_items_platform_only_merch` would reopen a direct creator Merch path and is not an acceptable standalone rollback. If the trigger causes an incident, first keep creator publishing and public purchases disabled, then ship a reviewed forward migration that repairs the trigger while preserving the platform-only Merch invariant.
- Current verification evidence: Supabase CLI 2.109.1 parses `supabase/config.toml` with the documented root `templates` compatibility link; `npm run typecheck`, `npm run lint`, and `git diff --check` passed after the email/free-launch/UI changes. Local migration replay required the documented ØLSTEN admin fixture because the clean replay does not contain the real platform profile. After adding that local-only fixture, migrations through `20260716025000` applied; the M12 verified-payment/fee, M12 creator-eligibility, and M20 Merch suites passed all 81 assertions. Linked-project application and the destructive-migration backup gate remain pending.
- Restoration completion evidence to attach before deployment: pre-write backup identifier/location, linked migration-list capture, local replay result, pgTAP totals, linked dry-run/review, post-write row counts for the eight Merch Items, creator rejection/admin acceptance evidence, and the deployed release identifier.

**Provider restoration records reserved for the next phases**

- Printful: record Store ID, reviewed Sync Product/Sync Variant mapping export, adapter/runtime-control version, draft-order IDs, webhook endpoint/version, Wallet/auto-recharge owner and thresholds, and the no-confirmation kill switch. Never record the API token, card data, recipient addresses, or unsanitized provider responses here.
- Stripe: record test/live mode explicitly, account ID, webhook endpoint ID and subscribed event list, product/price/shipping/tax configuration identifiers, runtime-control snapshot, test order/payment/event IDs, and reconciliation evidence. Never record secret keys, webhook signing secrets, card data, or unsanitized payloads here.
- Resend/Supabase/DNS: record sanitized domain status and record names/types/TTLs, hosted Auth setting values, template revision, sender identity, real-inbox results, and prior-setting screenshots/export locations. Never record SMTP credentials or provider verification secrets here.

**July 16 — Stripe sandbox acceptance preflight (repository only; lifecycle blocked before provider access)**

- Files changed for this continuation: `scripts/stripe-sandbox-preflight.mjs`, `scripts/stripe-commerce-contract.mjs`, `package.json`, `.env.example`, and this milestone record. The preflight loads local environment files without echoing values, requires an `sk_test_…` secret and `whsec_…` signing secret, rejects remote Supabase targeting unless explicitly allowed, validates the named buyer/Item and active digital offer/entitlements read-only, requires active reviewed terms/runtime controls, and refuses to start while the public presentation switch is true.
- External state changed: none. No Stripe endpoint/account request succeeded, no Stripe object was created, no Supabase row or runtime control was changed, no card was charged, and no production or linked-project write was attempted.
- July 16 evidence: `npm run test:commerce-contract` passes all 20 lifecycle boundaries and seven server configuration names; the targeted verified-payment and creator-eligibility pgTAP files pass all 67 assertions; `npm run typecheck`, zero-warning `npm run lint`, the optimized production build, and `git diff --check` pass. The preflight itself stopped with the expected nonzero result and named only absent prerequisites: site URL, service-role secret, Stripe test secret, webhook signing secret, automatic-tax approval, digital tax code, named acceptance buyer/Item, explicit permission for the currently configured remote Supabase target, and Stripe CLI availability.
- Feature flags and kill switches: `NEXT_PUBLIC_PUBLIC_PURCHASES_AVAILABLE` remains false; database Stripe and Checkout controls were not touched. Before the next run, install/authenticate Stripe CLI, supply the approved test-only inputs through local secret storage, identify the authorized buyer/Item, and either target the disposable local database or explicitly approve the intended non-production remote target. Runtime activation still requires reviewed terms and operating approval; the preflight does not seed or activate them.
- Safe rollback: remove the added package script, preflight file, three acceptance-only environment names, corresponding commerce-contract assertions, and this record. This rollback changes no provider or database state. Do not roll back or weaken the verified-payment migration, webhook authority, seller eligibility, or public/database kill switches merely to bypass a failed preflight.

**July 16 — M12 distinct-Event idempotency and provider acceptance verifier**

- Files changed for this continuation: `supabase/migrations/20260716030000_m12_stripe_acceptance_reconciliation.sql`, `supabase/tests/m12_stripe_verified_payments_security.sql`, `src/app/api/admin/commerce/diagnostics/route.ts`, `scripts/stripe-commerce-contract.mjs`, `scripts/stripe-sandbox-environment.mjs`, `scripts/stripe-sandbox-preflight.mjs`, `scripts/stripe-sandbox-verify.mjs`, `scripts/stripe-sandbox-dev.mjs`, `scripts/stripe-sandbox-fixture.mjs`, `package.json`, `.env.example`, `.gitignore`, and this milestone record.
- Accounting correction: Stripe documents that distinct Event objects can represent the same underlying provider object. Processor-fee ledger identity now uses the immutable Stripe Charge rather than the Event ID, preventing a second successful Event object from double-debiting the seller. The security suite proves the second signed-success object cannot duplicate the Charge fee, grant, or purchase Library entry.
- Reconciliation expansion: the 24-hour Admin run now retrieves the Charge balance transaction and compares Stripe's fee with the exact ledger allocation. It also requires processed successful-payment event evidence and exactly one purchase Library entry for each entitlement-bearing paid line, in addition to the existing provider totals, attempts, earnings, grants, refunds, and disputes.
- Acceptance tooling: Stripe CLI 1.43.8 was installed from Stripe's official Homebrew tap but was not authenticated and received no account access. `.env.stripe-sandbox.local` is the first secret source; the commands derive Supabase URL/keys directly from the running local CLI stack and refuse non-local targets by default. `npm run stripe:sandbox:fixture -- --confirm-local-only` is inert without its explicit flag and prepares a local-only $1 44OS digital Item, confirmed test buyer, active sandbox terms/offer/entitlement, and database controls while recording only non-secret IDs in an ignored mode-0600 state file. `npm run dev:stripe-sandbox` enables the presentation switch only in its isolated local process. `npm run test:stripe-sandbox-verify` reads the completed test Session and proves the named buyer/Item, exact durable order, terms snapshot, grants, Library identity, payment event, sale/refund accounting, and processor fee without printing provider/customer values.
- External/database state changed: the new forward migration was applied only to the disposable local Supabase database. No Stripe login, API request, webhook endpoint, Checkout Session, card operation, linked Supabase write, production control, or public presentation switch was created or enabled.
- Verification: the commerce contract passes 24 lifecycle boundaries and seven server configuration names; the targeted verified-payment and creator-eligibility pgTAP files pass all 71 assertions; strict type checking, zero-warning lint, optimized production build, and `git diff --check` pass. A no-flag fixture rehearsal refuses all writes as designed. Preflight now proves the local site/database target and Stripe CLI availability, then stops only on absent Stripe secret/webhook/tax configuration and the not-yet-created local buyer/Item fixture.
- Safe rollback: keep public and database payment switches off; revert the verifier/reconciliation route changes and ship a reviewed forward migration restoring the prior fee function only if Charge-keyed accounting is proven incompatible. Removing the CLI is independent of repository rollback. Never restore Event-keyed processor fees without an equivalent underlying-Charge idempotency boundary.

**July 16 — M12 sandbox connection and first provider request**

- Files changed for this continuation: `scripts/stripe-sandbox-fixture.mjs`, `scripts/stripe-sandbox-preflight.mjs`, `scripts/stripe-sandbox-dev.mjs`, `src/lib/server/commerce.ts`, `src/app/api/checkout/config/route.ts`, `src/app/api/checkout/session/route.ts`, `src/app/checkout/page.tsx`, and this milestone record.
- Local acceptance state: the explicit local-only fixture command created/updated the confirmed test buyer and platform seller, one published $1 non-Beat digital music Item, one active download offer and entitlement, active local-only terms, and local database commerce controls. Only non-secret IDs are stored in the ignored mode-0600 state file. The fixture no longer depends on Auth's list-all-users endpoint, which is broken by older test rows containing nullable legacy token fields.
- Provider connection: the supplied `sk_test_…` credential was accepted by Stripe without being printed. Stripe CLI forwarding is connected to the local signed webhook route, and `npm run dev:stripe-sandbox` now obtains the CLI signing secret ephemerally and injects it only into the child app process. Sandbox Tax is active with its head-office address and the approved permanent-download digital-audio code `txcd_10401100`; a live tax registration was not added or required for this test. Payout/bank readiness is not a dependency for this buyer-payment acceptance.
- Acceptance defects found before any card operation: digital-only Checkout incorrectly required physical shipping-rate and Merch-tax configuration; readiness is now scoped to the actual cart while physical carts remain fail-closed. Checkout Session expiry used the exact provider 30-minute minimum and now includes a five-minute transit buffer. The redundant Stripe-hosted terms checkbox was removed because 44OS already requires and immutably snapshots the active versioned terms, and Stripe rejected the duplicate consent setting without a Dashboard Terms URL. Development-only provider diagnostics redact keys, signing secrets, URLs, and email addresses.
- External/database state changed: read-only Stripe account and Tax-settings requests succeeded; signed sandbox account events reached the local webhook; rejected Session-creation attempts created no Stripe Checkout Session and no card interaction. Each corresponding local pending order was safely marked failed, with no entitlement or Library grant. No linked Supabase, live Stripe, production control, payout, or public-switch write occurred.
- Current evidence: the owner completed the sandbox Tax head-office setting without adding a live registration requirement; preflight passes every gate. Browser Session `cs_test_a1FiXePskszRjTyTW2w6ye4qiBWAet6X86efTrzCtviL2rLpULhWzy9Qtu` paid $1.00 with Stripe's standard test card and returned to 44OS. The first signed `checkout.session.completed` delivery correctly returned a retryable 500 while the Charge balance-transaction fee was not yet available; replaying the same Event `evt_1Ttvui0kljvJWdNtVf5r7YXy` then returned 200, created no second payment, and finalized the single order. Stripe displays a $0.33 test processing fee and $0.67 net; the 44OS ledger matches exactly. The Order Confirmed page and buyer Library both visibly contain the purchase, and the full post-purchase verifier passes.
- M12 digital provider gate accepted: synchronous and delayed success, duplicate/reordered delivery, decline, expiration, partial/full-refund, dispute open/loss/win, pre-provider Item rejection, exact provider/database verification, and the 24-hour Admin reconciliation all pass in the disposable sandbox. No creator payout or transfer was required or initiated for these buyer-payment cases. Keep the public switch false until the separate linked-deployment and controlled-activation gates are approved.
- Refund acceptance: two 50¢ test refunds (`re_3Ttvuh0kljvJWdNt0OFcyfzh` and `re_3Ttvuh0kljvJWdNt0Cl7YQ1x`) exercised partial then full refund on the same Charge. Partial refund preserved active access and reconciled 50¢. Full refund revoked access and exposed that Charge-keyed refund earnings collapsed the second increment. Forward migration `20260716031000_m12_incremental_refund_accounting.sql` now keys refund earnings to cumulative refund progress, backfills any order-level shortfall, and preserves replay idempotency. The real sandbox order and expanded 53-assertion verified-payment suite both reconcile the full $1.00 refund exactly; the combined targeted M12 files now pass 73 assertions.
- Duplicate-delivery acceptance: the same paid Event was delivered a third time after success. The webhook returned 200 and the database remained at exactly one matching Event row, payment attempt, entitlement grant, purchase Library entry, and processor-fee entry. This is provider-backed evidence in addition to the distinct-Event/Charge pgTAP boundary.
- Failure/expiration acceptance: Session `cs_test_a1P2DeV7TjtDDcC2X4fDLRfODQERwT3zYUk8SgwRiighbtvONesECD3yXd` used Stripe's documented generic-decline test card. Stripe remained unpaid, the signed `payment_intent.payment_failed` webhook returned 200, the durable order became `failed` with a sanitized failure code, and no grant or earnings entry was created. Fresh unpaid Session `cs_test_a1YFJTGdSK8XgtjK5i7HnKywFz4bI7ZhZxcWE1JVZeMpkZAEDQIk7NVcCm` was expired through Stripe's test API; the signed `checkout.session.expired` event returned 200, the order became `canceled` with durable cancellation time, and again no grant or earnings entry existed.
- Dispute and reordered-Event acceptance: a product-not-received test payment created Stripe Session `cs_test_a1Gd2gzeC4mmu4pHmZn9eCSCkQ7SxvG2EB4ADmRmD4GKvkeIEo9S1xKYTW`. Stripe delivered success and dispute events before Charge fee evidence was ready; the webhook failed safely, then processed the signed success and dispute Events in sequence without duplicate fees, grants, or purchases. The open dispute changed the order to `disputed` and revoked access; submitted winning evidence closed it as `won`, restored the paid order and entitlement, and passed the provider/database verifier. A separate product-not-received payment, Session `cs_test_a1FHMj50xwWLlQud538WGiTowkohaZ2ZyCtWSAlGzw44GBGIf7NyZ0H5z7`, repeated the safe retry/replay path, verified the open disputed state, then submitted losing evidence. Stripe closed dispute `du_1TtwFO0kljvJWdNtNPjHTL6p` as `lost`; 44OS recorded `dispute_lost`, kept that order's grant inactive, and reconciled provider totals, sale/fee/refund accounting, attempt, successful-event evidence, and the single purchase history entry.
- Delayed-payment acceptance: ACH Direct Debit was enabled only on Stripe's default sandbox payment-method configuration `pmc_1TsX5E0kljvJWdNtaiTaLY1B`; live mode was untouched. Two earlier bank-labelled Checkout attempts resolved to instant Link payments and were not counted as delayed-payment evidence. True `us_bank_account` Session `cs_test_a19dc3Te5abdF9D1VymHtFZPyb24Hm5sZzzRGb9BZofIGTdpZigTLLCdyO` used Stripe's indefinitely-processing test account; after microdeposit verification the PaymentIntent remained `processing`, the durable order remained `pending_payment`, and no entitlement grant or earnings entry existed. Separate success Session `cs_test_a1D7dFs3XLm5KywzgZgi5lXobArJd9l4ce6ZxodKhaTNcDgGqpbDm35Lyw` first returned to 44OS as unpaid/confirming, then finalized only when signed Event `evt_1TtwYW0kljvJWdNtYF0ASFaJ` delivered `checkout.session.async_payment_succeeded`. The resulting single paid order, attempt, entitlement, purchase Library entry, sale/refund accounting, and exact Stripe fee evidence pass all 16 provider/database verifier checks.
- Unapproved-Item boundary acceptance: the local fixture Item was temporarily changed from `published` to `draft` while its exact active offer remained in the authenticated request. 44OS returned a sanitized `checkout_failed` response, created no durable order for idempotency key `m12_unapproved_guard_20260716`, and Stripe's sandbox Checkout Session count remained exactly nine before and after the attempt. The fixture Item was then restored to `published`, and the generated default paid offer that the publish trigger reactivated was restored to its prior `draft` state; the full sandbox preflight passes again. This was a disposable local database write only; no linked database or live Stripe state changed.
- Admin reconciliation acceptance: authenticated Admin run `caee5760-a386-4965-aa3c-f368bf38e495` checked the complete prior-24-hour sandbox window. It retrieved Stripe Session, Charge, refund, and balance-transaction evidence and reconciled all 13 durable orders against payment attempts, processed success Events, line totals, exact processor fees, refund/dispute earnings, entitlement states, and purchase Library identity. The durable run completed as `matched` with 13 checked and zero mismatches.
- Refunded-customer repurchase correction: `src/lib/domain/itemDetails.ts` and `src/app/store/item/[identifier]/page.tsx` now distinguish a historical purchase Library row from an active download entitlement. Full-refund history remains visible in Library, while the Store correctly restores `Buy Download` after access is revoked. This also provides the next isolated acceptance Session without deleting purchase history.

**July 16 — M20 Printful draft-only provider boundary (repository and disposable local database only)**

- Foundation section 11 captures current official pricing, Manual order/API store, private-token, Sync Product/Variant, signed-webhook/draft flow, dynamic shipping-rate, Wallet/billing, owner setup, acceptance, and rollback evidence. Current public docs expose the real `api.printful.com` origin and do not document a separate sandbox origin, so provider calls are real and permit only Printful's documented non-charging draft state before owner confirmation.
- Files changed: `supabase/migrations/20260716032000_m20_printful_draft_fulfillment.sql`, `supabase/migrations/20260716033000_m20_merch_variant_commerce.sql`, `supabase/tests/m20_printful_draft_fulfillment_security.sql`, `src/lib/server/printful.ts`, `src/lib/domain/merchVariants.ts`, `src/lib/cart.ts`, the Store/Cart/Checkout surfaces, `src/app/api/admin/printful/`, `src/app/api/printful/webhook/route.ts`, `src/app/admin/fulfillment/page.tsx`, `scripts/printful-contract.mjs`, `scripts/printful-preflight.mjs`, `scripts/printful-sandbox-acceptance.ts`, `.env.example`, `package.json`, the Printful runbook, and this milestone record.
- Data and authority: canonical `merch_variants` remain 44-owned presentation/order truth and now carry generic option JSON, optional variant retail price/image, display order, and one default choice. Service-only product/variant mappings hold provider IDs, availability, base cost, and sanitized snapshots. Cart and Checkout carry only the local variant UUID; the server requires a currently active reviewed provider mapping and snapshots the local choice onto the immutable order line before Stripe. Quote rows retain a recipient fingerprint rather than a second plaintext address copy. Fulfillment rows are one-per-commerce-order, use deterministic external IDs, and can represent only `draft`, `failed`, or `canceled` with zero charge and no confirmation request.
- Safety implementation: import accepts an Admin-selected Sync Product ID only as a lookup key, then re-fetches the exact product, every Sync Variant, and every Catalog Variant server-side. Catalog `in_stock=false` overrides a stale active Sync Variant. Review re-fetches again and approves only individual variants with current availability, price, and configured base-cost margin; unsafe variants remain blocked/private and a product with no eligible variants remains blocked. Quote and draft operations recheck current provider stock/cost and the current/order-line margin before proceeding. Quote calls accept only reviewed mappings and snapshot exact request/rate content. Draft creation accepts only a paid physical 44 order with an exact reviewed variant per line, a current selected provider quote, and a verified address; it first retrieves by deterministic external ID and only then creates with `confirm=false`.
- External/database state changed: the forward migrations, canonical eight-item acceptance fixture, runtime connection controls, and sanitized provider mappings were written only to disposable local Supabase. A single-store private token was created in Printful and stored only in ignored local secret storage; Store ID `18475939` is the sanitized provider identifier. Hosted Supabase received no write because its visible launch catalog already matched the approved eight exactly. The controlled acceptance created one real Printful draft (`167197700`) with `confirm=false`; a repeat reused it, its charge is zero, and it never entered manufacturing. No webhook, billing-method, Wallet, or live/public control changed.
- Verification: clean local migration replay now succeeds without requiring the real hosted ØLSTEN profile to exist before seed data. The Printful contract passes 30 guarded boundaries, the targeted M20 suite passes 23 pgTAP assertions, and type checking, zero-warning lint, optimized build, and final diff verification pass. Provider acceptance proves the exact hosted eight, idempotent 12-variant T-Shirt and five-variant Hoodie imports, provider availability/cost capture, fail-closed margin/stock behavior, a reproducible $4.75 shipping quote, one idempotently reused zero-charge provider draft, and confirmation false without printing secrets or customer values. Browser acceptance verifies a clean two-column Merch detail layout inside the app shell, left-aligned intrinsic-ratio Printful artwork, color-linked gallery images/dots, all T-shirt color/size combinations, visible disabled Hoodie stock states, exact variant replacement in Cart, and the standard full-width Description section below. The local provider preview is development-only; production still requires canonical reviewed 44OS variants.
- Safe rollback: keep public purchases and all Printful controls off; revoke the private token/webhook in Printful separately if they are later created; cancel/delete provider drafts only after verifying zero charge and no production; remove routes/UI only after disabling their database controls; preserve provider/order/webhook evidence; and use a reviewed forward database migration rather than destructive history edits.

**July 16 — payment activation direction and implemented eligibility/Stripe boundary**

- The owner rejected a permanent all-creators/global UI shutdown. The selected model is a platform emergency kill switch plus an audited per-creator `Paid sales approved` decision combined with provider-verified payout capability. This change preserves the existing Cart, Checkout, price, order, earnings, and payout UI rather than removing it.
- Historical July 16 assumption, superseded July 17: this phase allowed creators who could not yet be paid to retain free publishing. The final account model has no free Creator state—Members browse/buy, while Admin-promoted Creators must complete country, tax, and Wise email-to-claim onboarding before Item creation. The earlier Stripe eligibility tables and evidence remain preserved but no longer determine the active Creator gate.
- Eligibility migration: `supabase/migrations/20260716024000_m12_creator_paid_sales_eligibility.sql`. It adds audited Admin decisions, immutable decision/provider events, service-only payout capability synchronization, safe public status lookup, digital-offer activation/revocation, and an order-line trigger that limits physical Checkout to the platform seller and digital Checkout to eligible creators. It activates no creator and changes no runtime commerce switch.
- Eligibility application/UI: `src/lib/domain/adminOperations.ts`, `src/lib/domain/creatorCommerce.ts`, `src/lib/domain/paidSalesStatus.ts`, `src/components/admin/AdminPersonDetailApp.tsx`, `src/app/studio/products/new/page.tsx`, `src/app/studio/products/[id]/page.tsx`, `src/app/studio/earnings/page.tsx`, `src/app/studio/payouts/page.tsx`, `src/lib/domain/catalog.ts`, `src/lib/domain/itemDetails.ts`, `src/lib/products.ts`, `src/components/Ui.tsx`, and `src/app/store/item/[identifier]/page.tsx`. Admin approval alone does not enable sales; Studio pricing and public purchase actions require the derived provider-verified state.
- Stripe Checkout expansion: `src/lib/server/commerce.ts`, `src/app/api/checkout/session/route.ts`, `src/app/checkout/page.tsx`, `.env.example`, and `scripts/stripe-commerce-contract.mjs`. Checkout now resolves active `physical_purchase` and `digital_download` offers, revalidates Item/offer identity, uses server prices, requests shipping only for carts containing physical Items, assigns separate approved tax codes, and leaves payment-method presentation to Stripe Dashboard dynamic methods.
- Exact processing-fee accounting: `supabase/migrations/20260716025000_m12_stripe_processor_fee_allocation.sql` and `src/app/api/stripe/webhook/route.ts`. The signed successful-payment path retrieves Stripe's charge balance transaction and idempotently allocates the provider-reported processing fee across seller lines. This changes creator payable accounting only; it does not create a Stripe transfer or payout. Refund history preserves the processing fee unless later provider evidence explicitly reports a fee adjustment.
- Historical Stripe Connect onboarding implementation: `src/lib/server/creatorPayouts.ts`, `src/app/api/stripe/connect/onboarding/route.ts`, `src/app/api/stripe/webhook/route.ts`, and `src/app/studio/payouts/page.tsx`. It remains preserved evidence but is superseded by the July 17 Wise-only payout decision and must stay dormant. The Wise task must replace its active UI/domain assumptions with a reviewed forward migration rather than deleting connected-account references or history.
- Emergency switch: `NEXT_PUBLIC_PUBLIC_PURCHASES_AVAILABLE=false` remains the default in `.env.example`. Database `commerce_runtime_controls` also remain off. No creator has been approved, no Stripe connected account has been created, no card has been charged, no transfer has been submitted, and no production or linked-project state changed during this phase.
- Local verification: `supabase/tests/m12_stripe_verified_payments_security.sql`, `supabase/tests/m12_creator_paid_sales_eligibility_security.sql`, and `supabase/tests/m20_merch_catalog_security.sql` passed all 81 assertions after the local-only ØLSTEN fixture; `npm run typecheck`, zero-warning `npm run lint`, optimized `npm run build`, `npm run test:commerce-contract` (20 lifecycle boundaries and seven server configuration names), updated launch smoke (including recovery and public legal pages), and `git diff --check` passed. End-to-end Stripe sandbox acceptance remains blocked until secret/server configuration, an active reviewed terms version, runtime operating approval, webhook registration, and a named test creator are provided.
- Safe rollback: first leave `NEXT_PUBLIC_PUBLIC_PURCHASES_AVAILABLE=false` and both database payment switches false. Revoke a creator through the audited Admin decision rather than deleting rows. Repository rollback may remove the consumers/routes, but database restoration must use a reviewed forward migration and must preserve prices, decision/provider events, connected-account references, historical orders, entitlements, earnings, and payout evidence. In Stripe, disconnect or restrict the test connected account and disable the webhook endpoint separately; repository rollback cannot reverse provider objects.

---

## Completed Foundation

### M1 — Architecture Contract And Handoff

**Status: Complete**

Established the permanent Item noun/identity, typed content direction, entitlement separation, curated creator launch policy, and three-document handoff system.

### M2 — Data Safety, Types, And Environment

**Status: Complete; current linked-lint and generated-type repair is tracked in P0/M13**

Established reviewed migrations, backups before linked writes, generated database types, local security testing, preservation probes, and the canonical baseline migration.

### M3 — Canonical Item And Capability Spine

**Status: Complete**

`catalog_items.id` is the permanent Item ID shared by Store, Library, Community, Radio, Studio, capabilities, assets, and later interactive experiences. Existing IDs and relationships were preserved.

### M4 — Typed Community Content Spine

**Status: Complete**

Unified discussions, questions, collaboration, reviews, creator updates, replies, reactions, and optional Item scope behind typed records and domain services.

### M5 — Entitlements And Provider-neutral Commerce Core

**Status: Complete; payment activation intentionally excluded**

Separated catalog offers, orders, provider evidence, entitlements, audit events, and Library presentation. Free saves and trusted grants are server-authoritative; paid checkout remains fail-closed.

### M6 — Application And Route Consolidation

**Status: Complete**

Studio is the sole creator workspace, canonical routes have one implementation, compatibility routes redirect once, and application UI reads platform data through typed domain services rather than direct table calls.

### M7 — Store And Discovery Launch Loop

**Status: Complete**

One catalog engine powers Store/Browse discovery with Category → Type → approved Tags, transparent editorial shelves, category-correct artwork, and structured creator/Item external links.

### M8 — Library, Achievements, And Item Memory

**Status: Complete**

Library is the durable view of access, progress, eight trusted music achievements, Overachiever Item rewards, protected downloads, creator updates, and named release videos.

### M9 — Community And Item Hubs

**Status: Complete**

Community, Item questions/reviews, reporting, moderation records, rate limits, and Creator Updates use typed ownership and integrity boundaries. Some reviewed surfaces remain hidden pending M13 activation.

### M10 — Studio And Curated Creator Launch

**Status: Complete for trusted testing**

Approved creators can create, validate, edit, publish, and archive owned Items. Permanent IDs and history survive removal. Rights attestation, catalog health, safe child synchronization, form recovery, Events, and Creator Updates are implemented.

Approved role assignment remains server-authoritative. Public self-service creator publishing is not active.

---

## Launch-critical Work

### M11 — Payment Operating Model

**Status: In progress — operating model selected; external legal, tax, billing, and support facts remain**

The first physical boundary is 44-owned Merch sold by forty four through Stripe-hosted Checkout and fulfilled by Printful. Printful is the provider authority for product existence, names, retail prices, SKUs, sizes, colors, availability, and production costs. 44OS remains authority for customer-facing images, publication, customer orders, support, returns/refunds, disputes, tax treatment, and immutable history. Creator Merch is excluded.

The selected non-Beat digital boundary remains per-seller and fail-closed. A Creator Item cannot sell until Admin promotion, rights evidence, an approved country/tax route, and the selected Wise destination boundary pass. The first controlled live digital acceptance instead uses a low-value 44-owned Item so buyer-payment verification does not bypass Creator onboarding.

External facts still required:

- Confirm forty four's exact entity/TIN, Stripe and settlement ownership, statement descriptor, public business/support details, and owned-inventory obligations.
- Approve U.S. tax registration/remittance, Stripe Tax use, receipt/invoice handling, and category tax codes.
- Approve versioned Terms, Privacy, refund/return, cancellation, and shipping policy copy.
- Record Printful billing/Wallet ownership, return address, manual-confirmation operator, support escalation, and current shipping promises.
- Complete the controlled provider, refund/dispute, fulfillment, email, and reconciliation evidence in P4-P6.
- Keep Wise payout execution, Creator Merch, international physical routes, PayPal, Stripe Connect payouts, and Beat licensing off until their separate gates pass.

Completion criterion: the selected 44-owned physical and controlled digital boundaries have named legal, tax, billing, support, refund, shipping, provider, and rollback owners with no unresolved operating decision left to implementation.

### M12 — Verified Payments And Earnings

**Status: In progress — test-mode acceptance complete; production database controls active; public presentation off; controlled live acceptance pending**

Complete and deployed:

- Fail-closed runtime controls require operating approval, a platform seller, active immutable terms, allowed shipping countries, Stripe enablement, and Checkout enablement.
- Durable server-authoritative orders snapshot Item, offer, price, seller, customer, terms, entitlement, fee, tax, shipping, and fulfillment facts before Stripe is contacted.
- Signed Stripe webhooks—not success redirects—own payment, refund, dispute, entitlement, Library, earnings, and reconciliation state. Duplicate, delayed, and reordered events are idempotent.
- Stripe live read-only account/tax/shipping/webhook preflight passes. Production Checkout and Stripe controls are enabled, but `NEXT_PUBLIC_PUBLIC_PURCHASES_AVAILABLE=false` keeps purchase UI unavailable.
- Test-mode browser acceptance proves one payment, order, immutable terms snapshot, entitlement, Library entry, seller accounting, exact Stripe fee, and no duplicate charge/grant.
- Production still has zero commerce orders and therefore no accepted live digital purchase/refund or physical fulfillment lifecycle.

Open boundaries:

- P0 must repair the strict database lint defect with a forward migration and regenerate linked database types before any live acceptance.
- P4 must prove one controlled 44-owned digital purchase/refund and one controlled U.S. Merch purchase through Printful draft, owner confirmation, signed status/tracking, refund/cancellation, and zero-mismatch reconciliation.
- P5 may expose purchase UI only after the initial eight products, critical application email, invite-only access, and rollback rehearsal pass.
- Buyer-payment acceptance does not activate Creator payouts. Per-creator seller/tax/Wise eligibility and later Wise disbursement remain separate.

Completion criterion: controlled live digital and physical lifecycles reconcile exactly once from signed provider evidence, the public switch and rollback are proven, and no unapproved Item or seller can reach Stripe.

### M13 — Launch Hardening

**Status: In progress — core hardening is deployed; release-integrity, provider, access, recovery, legal, and operational gates remain**

Complete evidence includes the health endpoint, global error boundary, security headers, sanitized error contract, hardening/smoke contracts, route budgets, Admin Control Center, creator submission snapshots and mutation fences, storage/entitlement controls, rollback/concurrency rehearsals, responsive public UI checks, branded Auth templates, and the provider-neutral application-email implementation.

Open work is ordered in P0, P2, P5, and P6:

- Repair strict database lint, regenerate schema types, resolve the PostCSS audit, restore the `44OS` root identity, and remove the duplicate Printful Admin connection guard.
- Add Merch content deduplication, atomic replacement, failed-deletion retry, safe orphan reconciliation, and a separately reviewed audit for the 69 broader public-bucket candidates.
- Configure and prove signed Printful and Resend webhooks plus application-email processing.
- Restore the intended invite-only closed-testing boundary before paid UI activation.
- Complete real-inbox Auth journeys, final legal/support review, external error alerts and on-call ownership, signed-in accessibility/device coverage, and separate-project database/storage restoration.
- Obtain explicit owner approval before broad account creation or commerce.

Payment reconciliation and provider failure paths remain additional M13 gates for any paid launch. No P6 checkbox may be closed by UI presence alone.

### M21 — Analytics, Search, And Merchant Discoverability

**Status: Not started — scoped for P6 after controlled commerce acceptance and before broad public discoverability**

This milestone treats the requested “Google Store integration” as Google Merchant Center/Shopping for the web Merch catalog, not Android/Play Store distribution. It must improve discoverability and measurement without making Google, an analytics client, or a feed a catalog, price, inventory, payment, or order authority.

Required scope:

- Establish owner and backup-owner access for a Google Analytics 4 property/web stream, a Search Console Domain property verified through reviewed DNS, and a Merchant Center account. Record non-secret property/account identifiers and recovery ownership in the implementation record.
- Complete the privacy/cookie review before enabling measurement. Load optional analytics only under the approved consent policy, honor persisted consent changes, exclude secrets and direct personal data, and document retention, deletion, internal-traffic, and staff/test filtering rules.
- Define one typed analytics event contract for public discovery and commerce, including item views, list selection, Cart changes, Checkout start, verified purchase, refund, and key content engagement. Use permanent 44OS Item/order identifiers and consistent Category/Type/Tag fields; deduplicate purchase/refund events and never treat a Stripe redirect as transaction proof.
- Audit every public route for a unique useful title, description, heading, canonical URL, social preview, image alternative text, internal links, status code, and redirect behavior. Preserve `/` as the `44OS` identity and `/store` as `Store`.
- Create an explicit indexability matrix. Public catalog, Item, creator, Community, legal, and support pages may be indexed when their content is public; Login, account, Cart, Checkout, Orders, Library, Studio, Admin, preview/review, launch-session, and private asset URLs must not become search results.
- Verify production `robots.txt` and `sitemap.xml`, exclude private/draft/archived URLs, remove broken or redirecting sitemap entries, and validate canonical consistency across apex/`www`, compatibility redirects, filters, pagination, and shared Item URLs.
- Add accurate format-specific structured data where the public page supports it, including organization/site identity, breadcrumbs/lists, creator/content facts, and Product/Offer/variant facts for eligible Merch. Structured data must use current 44OS/Printful truth and must not advertise a draft, archived, unavailable, unpriced, or image-incomplete offer.
- Connect Merchant Center/Shopping through a deterministic feed or supported API derived only from published, image-complete, available, margin-safe 44OS Merch. Keep stable IDs, variant attributes, price, availability, landing URL, image, shipping, tax, return, and brand facts synchronized with the successful Printful-owned catalog snapshot; provider/feed failures must fail closed and surface diagnostics.
- Verify Search Console ownership, submit the canonical sitemap, inspect representative root/Store/Item routes, and clear critical crawl, indexing, mobile, security, structured-data, or Merchant policy errors. Add Bing Webmaster Tools or an equivalent standards-based secondary search-engine check using the same canonical sitemap rather than a second SEO truth.
- Set measurable production budgets for Core Web Vitals and public-route performance, crawlability, index coverage, rich-result validity, Merchant approvals, organic acquisition, and verified conversion reporting. Assign an owner and review cadence for regressions, disapprovals, feed drift, and search-console alerts.
- Document rollback separately for analytics tags/consent configuration, DNS verification, sitemap/indexing changes, structured data, and Merchant feed publication. Disabling measurement or a feed must never alter catalog Items, provider mappings, orders, entitlements, or ledger evidence.

Completion criterion: consent behavior is approved and proven; analytics records representative journeys without personal data or duplicate verified transactions; intended public routes are crawlable and private routes are excluded; Search Console and the secondary-engine check accept the canonical site/sitemap; structured data has no critical errors; all eligible launch Merch passes Merchant diagnostics with current facts; production performance budgets pass; and monitoring plus rollback ownership is recorded.

---

## Completed Expansion Foundations

### M14 — Cross-platform Creator Reach

**Status: Complete**

Validated, ordered, owner-managed external destinations connect creator profiles and Items to approved platforms without arbitrary unsafe URLs.

### M15 — Native Books And Sample Packs

**Status: Complete**

Protected PDF reading, synchronized progress/bookmarks, public samples, protected ZIP/sample downloads, shared preview playback, creator descriptions, Studio form recovery, Safari-compatible PDF.js, and Sample Packs naming are deployed.

### M16 — Creator Events And Community Calendar

**Status: Complete**

Creator-owned timezone-aware Events and the aggregate Calendar are deployed without coupling Calendar to publication state or Radio programming.

### M17 — Interactive Platform

**Status: Infrastructure complete; runtime acceptance pending**

Implemented manifests, exact origins, expiring sessions, sandboxed launch UI, bounded untrusted progress, signed trusted events, replay protection, and achievement issuance. The complete contract is in Foundation section 10.

Remaining acceptance: host a real Unity/WebGL export and test headers, bridge behavior, memory/download size, inputs, fullscreen, browsers/devices, network failure, expiry, replay, and a signed achievement.

M17 is not a blocker if interactive Items remain disabled for the initial release.

### M18 — Beat Store

**Status: In progress — hidden foundation and review implementation complete; activation blocked**

Foundation complete:

- Beats are canonical Music Items with an assigned Beat Type/capability, permanent URL, square artwork, tagged preview, controlled BPM/key/time-signature/sample metadata, Music genre/style Tags, and controlled mood/instrument attributes.
- Private untagged MP3, WAV, and stems assets use explicit offer-to-file grants; generic Library/download entitlements cannot reveal them.
- Versioned platform Basic, Premium, Trackout, and Exclusive templates are seeded as legally inactive drafts. Offers, immutable buyer grants, terms/price/seller/collaborator/file snapshots, license numbers, download history, split basis points, and exclusive reservations are implemented.
- Exclusive finalization is service-only, idempotent, reservation-aware, and archives the sold Beat/offers while preserving earlier non-exclusive grants.
- Beat metadata, files, offers, mappings, attributes, and splits participate in the dormant M13 submission-review snapshot and approval boundary.
- Every environment/database catalog, publishing, checkout, pilot, split, and exclusive switch defaults off.

Review implementation complete in source:

- Dedicated device-recoverable Add/Edit Beat Studio form and transactional save RPC.
- Separate Studio Beats section; Store `New in Beats` shelf; URL-backed `/store/music?type=beat`; Beat-specific filters; square Item cards; producer profile Beats tab.
- Beat Item metadata/preview/license review, offer-keyed Cart lines, and Library license/file/status presentation.
- Generated database types, schema lint, and M18 pgTAP file-boundary/runtime/immutability coverage.

Remaining review acceptance:

- Enable both review flags in a non-production environment and exercise real artwork, tagged MP3, private MP3/WAV/stems uploads, editing, recovery, Store filters, direct sharing, shared-player playback, profile tab, Cart tier replacement, and Library signed downloads.
- Complete keyboard, screen-reader, light/dark, 1440/1280/430/390, Safari, and installed-iOS rendered acceptance with the feature flag both off and on.

Activation stages:

- **Pilot sales: Blocked** until counsel approves new template versions and M11/M12 Stripe/webhook/refund/dispute/reconciliation/earnings/payout acceptance is complete. First activation is non-exclusive, single-owner only.
- **Splits: Deferred activation** until exact earnings allocation and reconciliation pass.
- **Exclusivity: Deferred activation** until two-session reservation/expiry/concurrency, duplicate webhook, simultaneous purchase, archival, and prior-license preservation acceptance passes.

No Beat switch may be enabled in production as part of the initial hidden-foundation deployment.

### Launch Merch Catalog

**Status: In progress — Printful-owned sync, Admin detail workflow, image reset, and eight-product publication pending**

The earlier taxonomy, public Merch presentation, permanent-ID ordering, and reviewed test-content cleanup remain complete. The launch milestone is reopened because production catalog authority and imagery must be rebuilt before paid activation.

Locked contract:

- **Sync with Printful** reconciles the complete verified provider store; Admin no longer maps provider products to existing Items.
- Printful controls product presence, name, retail price, SKU, colors, sizes, availability, and production cost. 44OS controls customer-facing images, featured image, publication, orders, fulfillment history, and support.
- Unseen products create permanent draft Items automatically. Existing name/price/provider facts update automatically.
- New sizes under an imaged color activate automatically when available and margin-safe. New colors remain staged until their image is uploaded and published; existing reviewed variants remain live.
- Products or variants absent from a successfully completed provider snapshot are archived, never hard-deleted. Active/Archived Admin filtering keeps historical rows and orders accessible without cluttering the default view.
- The Admin overview is a row list; each row opens an individual detail page with read-only provider facts, one upload slot per color, unlimited bonus images, and one featured image selected from either type.
- The separate main-image role is removed. Content hashes prevent duplicate artwork; replacements swap atomically; failed object deletions retry through a bounded, prefix-safe orphan reconciler.
- The current five Merch image rows/objects are deliberately cleared after backup and the two published offers return to draft before new imagery is uploaded.
- The initial provider-owned launch set is 44 T-Shirt, 44 Sweatshirt, 44 Hoodie, 44 Windbreaker, 44 Beanie, 44 Hat, 44 Bag, and 44 Satchel. Satchel receives sort order 80.
- Hidden unmapped 44 Tote is not a launch product and is removed only after a zero-dependency check; any dependency blocks cascading deletion.

Detailed implementation and acceptance are exclusively P1-P4 in the Next Chat Execution Queue.

---

## Deferred Work

### M19 — Radio Programming And Schedule

**Status: Deferred**

Keep current Radio behavior for launch. Later define creator program submission, media ingestion, 44 approval, scheduling, conflict/fallback behavior, and Calendar integration without changing `radio_playlist_entries` until a verified cutover exists.

### M20 — Ecosystem Expansion

**Status: Deferred**

Livestreams, guides/showcases, contributor organizations, services through the Item spine, points/rewards, desktop distribution, and other capabilities proceed only after real creator demand and separate approval.

---

## Next Recommended Sequence

The checkbox-driven **Next Chat Execution Queue** above is the sole working order. Start at the first unchecked P0 item, complete each phase's stated gate, and append sanitized implementation/rollback evidence before checking it off.

Do not create a parallel plan or repeat the July 17 production/provider/storage audit unless a recorded external fact has changed. P0-P3 repair and rebuild the release/catalog baseline; P4 proves controlled commerce; P5 opens closed paid testing; P6 governs broad public launch, including M21 analytics, search, and merchant discoverability.

Wise payout acceptance, Beat licensing, creator Merch, newsletters, non-U.S. physical routes, and other deferred work remain outside this sequence until explicitly promoted.

---

## Milestone Maintenance

- A milestone must be discussed before moving to `Approved` or `In progress`.
- UI presence alone never makes a milestone complete; schema, permissions, failure states, preservation, and acceptance journeys must pass.
- Keep evidence concise and current. Git history retains the detailed implementation chronology.
- Update Foundation, UI, and Milestones together when a decision affects more than one contract.
- The first unchecked item in the Next Chat Execution Queue is the canonical resume point. Do not start a second working plan.
- After each checked item, append the exact files/migrations changed, external state changed, verification evidence, and rollback or forward-repair path to the Implementation And Rollback Record.

**Planning handoff deployed to Milestones. No application, database, provider, storage, or production changes were made.**
