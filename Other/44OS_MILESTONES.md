# 44OS Current Milestones

This file contains only current work. It deliberately does not preserve retired milestone numbering, the implementation diary, deployment chronology, or completed checkbox history.

Current system behavior belongs in `44OS_FOUNDATION.md`. Current visual behavior belongs in `44OS_UI.md`. Git history retains implementation detail. Do not repeat accepted work unless relevant code, configuration, provider state, or production evidence changed.

## Current position

Recorded July 18, 2026:

- 44OS is live and healthy.
- The architectural, UI, catalog, digital-commerce, Auth-email, transactional-email, Help Center, metadata, structured-data, and consent foundations described in Foundation/UI are implemented.
- Public Member signup and eligible digital/physical purchase presentation are active.
- Eight launch Merch products are live.
- Two controlled digital orders completed purchase, refund, access revocation, email, and reconciliation with zero unexplained mismatch.
- The broad-launch audit was paused by the owner to preserve time and credits for user-facing improvements.
- No milestone below authorizes destructive cleanup, a Creator-clock re-base, a paid physical test, provider expansion, payout activation, or optional feature activation without its stated approval.

## Completed baseline — do not re-audit by default

The following areas are represented as current system truth in Foundation and UI and do not need their former milestone histories:

- Canonical Item/data spine, typed domain services, RLS/RPC boundaries, permanent IDs, archival, entitlements, and immutable audit.
- Persistent shell, canonical routes/redirects, Store, Library, Community, profiles, Inbox, Search, Radio, Studio, Admin, Support, Settings, Orders, and Calendar.
- Canonical UI materials/tokens/components, responsive shell/safe areas, shared player, page identity, and completed CSS/component cleanup baseline.
- Music achievements, named YouTube embeds, Overachiever Item unlocks, protected downloads, PDF Books, Sample Packs, form recovery, external links, Events, and Calendar.
- Interactive and Beat infrastructure kept safely disabled pending their separate optional acceptance.
- Printful-owned catalog synchronization, eight-product Merch launch catalog, Admin image workflow, featured/color/bonus imagery, safe replacement/orphan queue, signed provider webhook, quotes, and non-charging drafts.
- Stripe-hosted Checkout, signed webhook authority, immutable terms/order evidence, refund/dispute/access/accounting behavior, Admin offer pause/restore, and zero-mismatch reconciliation.
- Public Member signup, manual Creator paperwork-grace controls, branded Supabase Auth email, Resend transactional outbox/worker/webhook, monitored support mailbox, and production Help Center.
- Public metadata, published-only sitemap, structured-data foundation, indexability guards, and inert consent-gated analytics foundation.
- Recorded release gates: schema replay, pgTAP security, linked lint/history, lint, typecheck, UI cleanup audit, hardening/observability/provider contracts, safe-area checks, production build, launch smoke, and diff integrity.

## Open milestones

Work through this single list. User-facing breakage comes before optional launch expansion. Record only the outcome and changed current truth; do not rebuild a step-by-step historical ledger here.

### 1. Creator mobile upload and experience reliability

**Status: Implementation and automated gates complete; awaiting owner visual/device verification**

- The shared uploader now uses resumable transfer for larger files, explicit iOS-compatible audio types, and lightweight non-blocking duration metadata after the uploaded value is safely retained.
- Release date is optional for create/update, accepts valid past dates, and is contained by the mobile form grid.
- The requested account-menu, Admin/Support navigation, Store/Library details, Tracklist, and URL-only release-video changes are implemented. Releases support up to ten videos.
- The focused experience contract, lint, typecheck, UI cleanup audit, schema replay, security suite, production build, and launch smoke checks pass.
- Remaining acceptance is the owner’s signed-in mobile and desktop review, including a real mobile audio selection/upload and the requested UI surfaces.

**Complete when:** the owner confirms the affected real mobile Creator journey and the requested desktop/mobile UI behavior.

### 2. Production account and repository hygiene

**Status: Repository pass complete; production account deletion remains open and requires exact target verification**

- Repository hygiene is complete: obsolete generated caches, QA residue, unreferenced backups, empty route shells, unused assets, unreachable source modules, and unused/shadowed CSS were removed. Migrations, security tests, seed data, required local configuration, production assets, and the single recovery-test fixture were retained. A clean production build, production smoke test, UI cleanup audit, and diff-integrity check pass.
- Verify the exact live identities and dependencies for the owner-named usernames `Adrian` and `Test`; distinguish usernames from content or track titles.
- Back up current data, delete only the approved accounts through the Auth Admin boundary, and compare preservation of unrelated Items, Community content, messages, Library, entitlements, orders, achievements, Events, and playback.

**Complete when:** the two approved accounts are absent, unrelated production evidence is preserved, only safe reproducible caches are removed, and the repository passes its proportional quality gates.

### 3. Legal and operating facts

**Status: Waiting on owner facts/approval**

- Record the exact registered entity spelling/type and public business address.
- Approve final Terms, Privacy, Copyright, refund/return, cancellation, shipping, and account-recovery wording.
- Decide whether a current U.S. Copyright Office designated-agent registration exists. Do not claim DMCA safe-harbor designation without it.
- Confirm Stripe/settlement ownership, statement descriptor, tax registration/remittance ownership, receipts/invoices, Printful billing/Wallet owner, return address, manual-confirmation operator, shipping promises, and support escalation.

**Complete when:** the published legal and operating facts are accurate, owner-approved, internally consistent, and contain no unsupported designation or placeholder business detail.

### 4. External alerts and operational ownership

**Status: Open**

- Name one primary responder and one genuinely separate backup responder.
- Assign external notification channels and approve either an applicable Vercel monitoring upgrade or a separately reviewed external monitor.
- Prove safe external delivery without generating a burst of production failures.
- Assign content moderation, abuse escalation, privacy-request, customer-support, and release-rollback owners.

**Complete when:** a real production-critical alert reaches the assigned external channel and every operational responsibility has a named owner and backup/escalation path.

### 5. Manual accessibility and device acceptance

**Status: Partially complete**

The public foundation and available Admin/Creator structure/contrast checks passed. Remaining work:

- Re-authenticate existing owner-controlled Member, Creator, and Admin sessions.
- Test focus order/visibility, menus/dialogs, error announcements, touch/keyboard operation, and VoiceOver names/order.
- Cover 390, 430, 1280, and 1440px, Safari, and an installed iOS/PWA launch.
- Do not create disposable production identities solely for this matrix.

**Complete when:** the role/device matrix passes without a launch-blocking accessibility, layout, or input failure and any narrow repairs are verified on affected surfaces.

### 6. Recovery and storage safety

**Status: Open**

- Restore current production database and referenced storage into a separate disposable project/environment.
- Compare permanent IDs, row counts, audit rows, entitlements, orders, provider references, and storage references.
- Resolve the recorded 69 unverified public-storage candidates across product, profile, resource, and track namespaces.
- Delete nothing outside the dedicated Merch prefix until current, historical, submission, and protected-access dependencies are mapped.

**Complete when:** the separate-project restore is proven and every candidate object is classified as referenced, intentionally retained, or safely removable with recorded evidence.

### 7. Analytics, search, and Merchant discoverability

**Status: Foundation deployed; external acceptance open**

- Establish owner and backup-owner access for GA4, Search Console Domain property, and Merchant Center; record only non-secret identifiers and recovery ownership.
- Approve analytics privacy/cookie behavior, retention, deletion, internal traffic, and staff/test filtering.
- Instrument representative discovery/content/Cart/Checkout surfaces. Purchase and refund events must come from durable server-authoritative, deduplicated evidence rather than redirects.
- Add the reviewed production Google measurement ID only after consent/privacy ownership is approved.
- Verify Search Console ownership, submit the canonical sitemap, inspect representative root/Store/Item routes, and clear critical crawl/index/mobile/security/structured-data errors.
- Complete a Bing Webmaster Tools or equivalent secondary-engine check using the same canonical sitemap.
- Publish a deterministic Merchant feed/API derived only from published, image-complete, available, margin-safe Merch; pass shipping, tax, returns, variant, price, availability, and image diagnostics.
- Set measurable Core Web Vitals, crawlability, index coverage, rich-result, Merchant, organic-acquisition, and verified-conversion budgets with owners and review cadence.

**Complete when:** consented production analytics records representative journeys without direct personal data or duplicate transactions; intended public routes are accepted by search engines; private routes stay excluded; eligible Merch passes Merchant diagnostics; and monitoring/rollback ownership is recorded.

### 8. Final public-launch decision

**Status: Owner action; do not execute early**

- Confirm the preceding legal, monitoring, accessibility, recovery/storage, ownership, and discoverability gates are accepted or explicitly deferred by the owner.
- Use the audited Admin control to re-base each approved existing Creator’s 30-calendar-day paperwork follow-up exactly once.
- Record explicit owner approval before expanding physical-commerce scope or enabling any provider/payout capability beyond the current boundary.

**Complete when:** the owner gives the terminal launch instruction, the Creator dates are correctly recorded, and rollback ownership is documented. This action starts the clock and must not be used for closed testing.

### 9. One real physical-commerce lifecycle

**Status: Waiting for owner-approved funds and timing**

- Run one owner-funded U.S. Hoodie or Windbreaker purchase with a known tester.
- Prove exact Stripe payment, current Printful quote, idempotent `confirm=false` draft, and explicit owner confirmation inside Printful. 44OS must never confirm through its API.
- Preserve signed production/status/tracking evidence.
- Prove the applicable cancellation/refund path and payment/fulfillment reconciliation without duplicate drafts, charges, or provider facts.

**Complete when:** the lifecycle ends with zero unexplained payment or fulfillment mismatch and all immutable order/provider evidence is preserved.

### 10. Optional inactive capabilities

**Status: Deferred; not required while disabled**

- Interactive: accept one real Unity/WebGL export across headers, loading, bridge, memory/download size, inputs, fullscreen, browsers, network failure, expiry/replay, and a signed achievement.
- Beat Store: perform review-environment upload/edit/recovery/Store/Cart/Library/device acceptance; obtain counsel-approved license templates; then separately approve non-exclusive single-owner pilot, splits, and exclusivity.
- Radio programming, newsletters, creator Merch, international physical shipping, Wise payout execution, desktop packaging, Services, and other ecosystem expansion require separate owner promotion into this open list.

**Complete when:** each capability receives its own explicit activation decision and required legal, provider, security, failure, accessibility, and rollback acceptance. Until then it remains hidden and fail-closed.

## Maintenance

- Keep this as one ordered list with plain names. Do not reintroduce P/M numbering.
- Remove completed items from the open list after their durable behavior is captured in Foundation/UI and retain only a short baseline summary above.
- Do not paste deployment IDs, command transcripts, provider object IDs, test card journeys, or long rollback diaries here. Git history and immutable application/provider records retain that evidence.
- When work changes architecture or UI, update Foundation/UI in the same change.
- Completion requires authoritative evidence for the stated criterion, not UI presence or an unchecked error search.
