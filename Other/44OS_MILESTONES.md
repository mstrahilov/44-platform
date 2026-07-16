# 44OS Milestones

This is the execution and launch-readiness source of truth. Read it after `44OS_FOUNDATION.md` and `44OS_UI.md`.

The only active handoff documents are:

- `44OS_FOUNDATION.md` — product, architecture, data, operations, payments, and interactive contracts.
- `44OS_UI.md` — approved visual and interaction system.
- `44OS_MILESTONES.md` — completed work, open gates, sequencing, and acceptance.

Status vocabulary: `Not started`, `In discussion`, `Approved`, `In progress`, `Blocked`, `Complete`, and `Deferred`.

---

## Current System Check — July 16, 2026

The application is live at `https://44os.com`. The July 16 Admin release serves repository `main` commit `02d65f24b1a7850a7409ed852b71688b500281cf`; `/api/health` returned healthy after deployment.

Current passing evidence:

- Clean Git worktree before documentation consolidation.
- Zero-warning `npm run lint`.
- `npm run typecheck` with generated Next.js route types and strict TypeScript.
- `npm run audit:ui-cleanup`: zero unreachable components, dead exports, all-source CSS orphans, and exact-shadowed declarations.
- `npm run test:observability` and `npm run test:hardening-contract`.
- Optimized Next.js production build across the current application, including the Admin overview, People, Content, detail, and Errors routes.
- Local production launch smoke, including health, security headers, accessibility document basics, hidden-surface isolation, budgets, and canonical redirects.
- Production launch smoke against `https://44os.com`.
- All 243 local pgTAP security assertions, including Beat Store isolation and Admin Control Center authorization/lifecycle coverage.
- Local data restoration rehearsal: 14 profiles, 51 Items, and 401 storage objects restored into a disposable database.
- Disposable M13 rollback and two-session concurrency rehearsals.
- Local migration history and disposable replay include every repository migration through `20260716010000_m13_admin_control_center.sql`.
- Linked production history is aligned through `20260716010000_m13_admin_control_center.sql`, linked schema lint returns zero errors, and the post-deploy dry-run reports the remote database is up to date.
- Live Admin probes return 17 approved accounts, 5 creators, 51 Items, bounded eight-row People/Content pages, and working person/content detail documents. Ten owner-approved obsolete accounts were removed through the Auth Admin boundary after a fresh backup; before/after preservation checks matched across Items, Community content, messages, reviews, Library records, entitlements, orders, achievements, events, and playback. Anonymous Admin RPC calls remain denied with SQL `42501`; payments and Beat Store remain off.

Current verification debt:

- Strict empty schema replay still stops at `20260714010000_grant_olsten_admin_role.sql`, which asserts a real production profile exists. The approved temporary evidence path is a disposable local profile fixture followed by the remaining migrations and full security suite. The permanent fix is a reviewed baseline reconsolidation, not editing the deployed migration.

Readiness conclusion:

- **UI system:** complete and owner-approved.
- **Core product foundation:** complete for trusted testing and a free beta.
- **Current production:** healthy and matched to `main` at audit time.
- **Paid commerce launch:** not ready; M11/M12 remain open and all payment switches must remain off.
- **Unrestricted public creator onboarding:** not ready; submission review, notification delivery, recovery/legal activation, and operational ownership remain open.
- **Interactive Unity launch:** infrastructure is ready, but a real export has not passed runtime acceptance.

### Two Valid Release Boundaries

**Free/trusted-testing release candidate:** may ship with checkout, payouts, public creator onboarding, reviewed M13 surfaces, and interactive runtime disabled. It still requires the non-payment launch gates under M13.

**Paid public launch:** additionally requires every M11/M12 payment, legal, tax, provider, webhook, refund/dispute, reconciliation, payout, and fulfillment gate. Opening a bank or Stripe account is necessary setup, not acceptance by itself.

---

## Completed Foundation

### M1 — Architecture Contract And Handoff

**Status: Complete**

Established the permanent Item noun/identity, typed content direction, entitlement separation, curated creator launch policy, and three-document handoff system.

### M2 — Data Safety, Types, And Environment

**Status: Complete, with replay debt tracked in M13**

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

**Status: In discussion**

Working direction: Stripe collects customer payments, PayPal Payouts pays eligible creators, and 44 provisionally acts as seller. This is not approved legal/accounting architecture.

Required decisions:

- Seller/merchant-of-record and marketplace or money-transmission obligations.
- Taxes, invoices, remittance, creator tax reporting, supported countries, and currencies.
- Platform/processor fees, reserves, payout timing/minimums, currency conversion, negative balances, and unclaimed funds.
- Refunds, disputes, entitlement revocation, physical fulfillment, shipping, returns, inventory, and support ownership.
- Creator KYC/sanctions checks, PayPal eligibility, and fallback payout paths.

Completion criterion: an approved operating decision leaves no policy choices to implementation.

### M12 — Verified Payments And Earnings

**Status: In progress — infrastructure only; commerce disabled**

Complete foundation:

- Fail-closed runtime controls.
- Provider-neutral orders and payment evidence.
- Append-only creator earnings, payout batches/items, webhook records, and reconciliation runs.
- Security tests proving disabled checkout/Stripe/PayPal paths remain closed.

Still required:

- Stripe test-mode checkout, signed webhook replay, duplicate/out-of-order delivery, delayed success, failure, refunds, partial refunds, and disputes.
- PayPal sandbox approval, signed webhook validation, duplicate delivery, reconciliation, blocked/held/failed/returned/refunded/unclaimed payouts, and insufficient-funds behavior.
- End-to-end reconciliation proving provider totals, orders, entitlements, earnings, and payouts cannot diverge silently.
- Explicit reviewed production activation; adding credentials alone must not enable commerce.

### M13 — Launch Hardening

**Status: In progress**

Complete evidence:

- Health endpoint, global error boundary, production security headers, sanitized error contract, hardening contract, launch smoke, and route budgets.
- Account recovery, Terms, Privacy, Copyright, and moderation foundations exist behind a review flag. The administrator-only Admin Control Center is implemented as an active operating surface.
- Creator submission snapshots, audited decisions, child tombstones/archives, mutation fences, and dormant notification outbox exist behind fail-closed runtime controls.
- Admin People, Content, Errors, and system-status surfaces; creator review foundations; release-video validation; storage/entitlement controls; Beat license file isolation; rate limits; data restoration; rollback; and concurrency pass locally. The security suite now includes dedicated Admin role, lifecycle, visibility, audit, pagination, and sanitization assertions.
- Public responsive checks and the owner-approved UI system cover the primary application at 390px, 430px, 1280px, and 1440px.

Open non-payment gates before a free public release:

- Configure production SMTP, sender-domain authentication, bounce/delivery monitoring, and rehearse signup confirmation plus password recovery.
- Review and activate final Terms, Privacy, Copyright, and account-recovery navigation; obtain legal review where appropriate.
- Choose external error aggregation/alert delivery and assign on-call ownership.
- Decide whether launch remains invite-only. Before unrestricted public creator onboarding, finish/approve creator submission controls and notification delivery, then rehearse the implemented Admin operating workflow against the production-ready migration.
- Add the deferred Admin email phase: a server-only Auth Admin boundary, invitations, official domain sender, confirmation/recovery templates, delivery monitoring, and provider approval. Account suspension/deletion, password administration, admin-role assignment, Community moderation, creator-event moderation, entitlement grants, interactive-build approval, taxonomy, Radio programming, and payment reconciliation remain separate reviewed modules.
- Complete signed-in fan/creator/admin keyboard, screen-reader, contrast, 390/430/1280/1440, normal Safari, and installed-iOS/PWA journeys.
- Refresh linked database credentials and re-prove migration history/dry-run. Resolve or formally rehearse the strict replay exception.
- Perform a separate-project production-data and storage restoration rehearsal with permanent-ID/audit comparison.
- Review production content, support ownership, abuse escalation, privacy requests, and release rollback responsibility.

Payment reconciliation and provider failure paths remain additional M13 gates for a paid launch.

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

1. Keep the current free/trusted-testing production behavior stable while final tweaks are reviewed.
2. Refresh the linked database password and close migration verification debt.
3. Complete SMTP/recovery, legal activation, alerting/on-call, restoration, and signed-in accessibility/PWA acceptance.
4. Decide invite-only versus public creator onboarding and activate the review workflow only if public onboarding is required.
5. Complete M11 operating decisions, then connect Stripe/PayPal in test mode and finish M12 failure/reconciliation acceptance.
6. Run M18 Beat review acceptance in an isolated environment while every public/commerce switch remains off; obtain counsel-approved standard license versions.
7. Review payment/earnings UI only after server-authoritative provider states are proven, then pilot non-exclusive single-owner Beats before splits or exclusivity.
8. Run the full release gate in Foundation section 9, deploy the approved commit, and repeat production smoke/manual journeys.

---

## Milestone Maintenance

- A milestone must be discussed before moving to `Approved` or `In progress`.
- UI presence alone never makes a milestone complete; schema, permissions, failure states, preservation, and acceptance journeys must pass.
- Keep evidence concise and current. Git history retains the detailed implementation chronology.
- Update Foundation, UI, and Milestones together when a decision affects more than one contract.
