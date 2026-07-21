# 44OS Current Milestones

This file contains only current work. It deliberately does not preserve retired milestone numbering, the implementation diary, deployment chronology, or completed checkbox history.

Current system behavior belongs in `44OS_FOUNDATION.md`. Current visual behavior belongs in `44OS_UI.md`. Git history retains implementation detail. Do not repeat accepted work unless relevant code, configuration, provider state, or production evidence changed.

## Current position

Recorded July 20, 2026:

- 44OS is live and healthy.
- `44os.com` is now the editorial front door, `app.44os.com` is the canonical application and PWA origin, `www` redirects to the apex, and legacy application links preserve their paths and queries on the app host.
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
- Permanent two-origin architecture: isolated light marketing layout, canonical app shell/PWA, exact host routing, legacy deep-link and API compatibility, app-origin Auth/Checkout/email links, paired desktop/mobile product screenshots, and the server-only rollback switch.
- Recorded release gates: schema replay, pgTAP security, linked lint/history, lint, typecheck, UI cleanup audit, hardening/observability/provider contracts, safe-area checks, production build, launch smoke, and diff integrity.

## Open milestones

Work through this single list. User-facing breakage comes before optional launch expansion. Record only the outcome and changed current truth; do not rebuild a step-by-step historical ledger here.

### 1. Team workspace and Brand system

**Status: Private production workspace deployed; owner copy/asset review, Brand Kit registration, and first Team grant remain open**

- Team access is implemented as a separate audited permission for Admins and explicitly granted Members or Creators. It does not alter Creator publishing, seller setup, payouts, or public profile behavior.
- The private `/team` hub, cream editorial Brand Guide, published Creator directory, published release directory, conditional account navigation, Admin People badges/filter, and reasoned grant/revoke controls are implemented.
- `Other/44OS_BRANDING.md` is the private canonical source. The provisional Brand Kit builder packages black/white marks, white-on-black 44OS icons, self-hosted Inter/OFL, tokens, editable SVG social templates, usage guidance, and a checksum manifest.
- Acid green is retired from the logo identity. Current local app icons, favicon, and 1200×630 Open Graph artwork use the owner-supplied white mark on black.
- Local schema replay and database lint pass. The focused Team suite passes 33 assertions, and the complete security suite passes all 705 assertions across 32 files. Lint, strict typecheck, Team, email, domain, and hardening contracts, UI cleanup audit, production build, and diff integrity all pass.
- The additive Team migration is applied to production and the private routes are deployed behind server-authoritative access. The current kit remains explicitly provisional, no production download is registered, and no Member or Creator should receive a grant until the owner approves the guide and final assets.

**Complete when:** the owner approves the guide copy and logo masters, the approved kit is uploaded and checksummed, Admin/unauthorized/granted probes pass, and the first grant delivers email and in-app notice without changing the recipient’s base role.

### 2. Desktop Mac and Windows Application

**Status: Website-shell plan complete; implementation has not started**

- Build a minimal Tauri 2 shell that displays the canonical website at `https://app.44os.com` rather than creating a separate desktop frontend or bundling the server-rendered Next.js application.
- Produce a universal Mac DMG and Windows x64 NSIS installer with the approved 44OS icon. Ordinary website updates continue through GitHub/Vercel and therefore require no native updater.
- V1 intentionally excludes Apple Developer enrollment, Apple notarization, paid Windows code signing, app stores, native auto-update, native push, offline mode, tray/background services, and broad native computer access.
- Because the installers are not publicly code-signed, the Download page must accurately explain macOS Gatekeeper and Windows SmartScreen unidentified-publisher warnings without telling users to disable system security.
- Validate login, playback, Radio, Community, Library, uploads over 50 MiB, protected downloads, Checkout, Studio, Admin, external links, in-app notifications, window behavior, and uninstall on real supported Mac and Windows devices.
- The complete phased implementation tracker, evidence gates, time estimate, release order, rollback, references, and cross-session progress log live in `44OS_DESKTOP_APPLICATIONS.md`. Expected effort is 4–8 focused hours, with a second short session only if Windows CI or real-device WebView behavior exposes a problem.

**Complete when:** anonymous users can download the tested Mac or Windows installer from `44os.com/download`, understand the unsigned-publisher warning, install the shell, sign in, and use the live application without a critical wrapper-specific regression.

### 3. Creator mobile upload and experience reliability

**Status: Implementation and automated gates complete; awaiting owner visual/device verification**

- The shared uploader now uses resumable transfer for larger files, explicit iOS-compatible audio types, and lightweight non-blocking duration metadata after the uploaded value is safely retained.
- Music Release Date, Item Type, and Track Count are required for creation and editing; Item Tags remain optional. All 31 published production Music Items already have a Release Date, and Admin can correct approximate historical dates through an audited control that synchronizes year. Standard release creation offers Album, EP, Single, and Mixtape only, leaving Beat in its dedicated workflow and omitting Live Set. New Sample Packs hide their inferred Item Type plus irrelevant Release Date and Item Tags controls.
- The requested account-menu, Admin/Support navigation, Store/Library details, Tracklist, and URL-only release-video changes are implemented. Releases support up to ten videos.
- Home uses `Discover`/`Browse` page identities, a four-slot Admin-curated `New Releases` shelf, and an eight-item `Recently Added` shelf ordered by stable creation time with New Releases Items excluded. Recently Added intentionally allows multiple releases from the same creator. The revision also includes the followed-creator shelf, complete Browse sort controls, explicit Browse shelves for smaller catalogs, and aligned header/section actions.
- The current Studio/Radio revision makes free Music streaming and Library collection explicit, makes Book reading and Library collection free, replaces Music and Book Availability dropdowns with optional paid-download checkboxes, requires Sample Packs to have a paid download price, requires release-sort metadata for new Music publication, adds audited Admin corrections for historical release dates, and automatically appends playable tracks to Radio only after their Music Item is published. Forward migrations `20260719020000_auto_radio_and_music_download_controls.sql`, `20260719021000_book_access_and_sample_pack_pricing.sql`, `20260719022000_required_music_release_metadata.sql`, and `20260719023000_admin_release_date_corrections.sql` were promoted to production on July 19, 2026.
- The focused experience contract, lint, typecheck, UI cleanup audit, local schema replay, local database lint, all 24 pgTAP files with 573 assertions, production build, and launch smoke checks pass.
- Remaining acceptance is the owner’s signed-in mobile and desktop review, including a real mobile audio selection/upload and the requested UI surfaces.

**Complete when:** the owner confirms the affected real mobile Creator journey and the requested desktop/mobile UI behavior.

### 4. Production account and repository hygiene

**Status: Repository pass complete; production account deletion remains open and requires exact target verification**

- Repository hygiene is complete: obsolete generated caches, QA residue, unreferenced backups, empty route shells, unused assets, unreachable source modules, and unused/shadowed CSS were removed. Migrations, security tests, seed data, required local configuration, production assets, and the single recovery-test fixture were retained. A clean production build, production smoke test, UI cleanup audit, and diff-integrity check pass.
- Verify the exact live identities and dependencies for the owner-named usernames `Adrian` and `Test`; distinguish usernames from content or track titles.
- Back up current data, delete only the approved accounts through the Auth Admin boundary, and compare preservation of unrelated Items, Community content, messages, Library, entitlements, orders, achievements, Events, and playback.

**Complete when:** the two approved accounts are absent, unrelated production evidence is preserved, only safe reproducible caches are removed, and the repository passes its proportional quality gates.

### 5. Legal and operating facts

**Status: Waiting on owner facts/approval**

- Record the exact registered entity spelling/type and public business address.
- Approve final Terms, Privacy, Copyright, refund/return, cancellation, shipping, and account-recovery wording.
- Decide whether a current U.S. Copyright Office designated-agent registration exists. Do not claim DMCA safe-harbor designation without it.
- Confirm Stripe/settlement ownership, statement descriptor, tax registration/remittance ownership, receipts/invoices, Printful billing/Wallet owner, return address, manual-confirmation operator, shipping promises, and support escalation.

**Complete when:** the published legal and operating facts are accurate, owner-approved, internally consistent, and contain no unsupported designation or placeholder business detail.

### 6. External alerts and operational ownership

**Status: Open**

- Name one primary responder and one genuinely separate backup responder.
- Assign external notification channels and approve either an applicable Vercel monitoring upgrade or a separately reviewed external monitor.
- Prove safe external delivery without generating a burst of production failures.
- Assign content moderation, abuse escalation, privacy-request, customer-support, and release-rollback owners.

**Complete when:** a real production-critical alert reaches the assigned external channel and every operational responsibility has a named owner and backup/escalation path.

### 7. Manual accessibility and device acceptance

**Status: Partially complete**

The public foundation and available Admin/Creator structure/contrast checks passed. Remaining work:

- Re-authenticate existing owner-controlled Member, Creator, and Admin sessions.
- Test focus order/visibility, menus/dialogs, error announcements, touch/keyboard operation, and VoiceOver names/order.
- Cover 390, 430, 1280, and 1440px, Safari, and an installed iOS/PWA launch.
- Do not create disposable production identities solely for this matrix.

**Complete when:** the role/device matrix passes without a launch-blocking accessibility, layout, or input failure and any narrow repairs are verified on affected surfaces.

### 8. Recovery and storage safety

**Status: Open**

- Restore current production database and referenced storage into a separate disposable project/environment.
- Compare permanent IDs, row counts, audit rows, entitlements, orders, provider references, and storage references.
- Resolve the recorded 69 unverified public-storage candidates across product, profile, resource, and track namespaces.
- Delete nothing outside the dedicated Merch prefix until current, historical, submission, and protected-access dependencies are mapped.

**Complete when:** the separate-project restore is proven and every candidate object is classified as referenced, intentionally retained, or safely removable with recorded evidence.

### 9. Analytics, search, and Merchant discoverability

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

### 10. Final public-launch decision

**Status: Owner action; do not execute early**

- Confirm the preceding legal, monitoring, accessibility, recovery/storage, ownership, and discoverability gates are accepted or explicitly deferred by the owner.
- Use the audited Admin control to re-base each approved existing Creator’s 30-calendar-day paperwork follow-up exactly once.
- Record explicit owner approval before expanding physical-commerce scope or enabling any provider/payout capability beyond the current boundary.

**Complete when:** the owner gives the terminal launch instruction, the Creator dates are correctly recorded, and rollback ownership is documented. This action starts the clock and must not be used for closed testing.

### 11. One real physical-commerce lifecycle

**Status: Waiting for owner-approved funds and timing**

- Run one owner-funded U.S. Hoodie or Windbreaker purchase with a known tester.
- Prove exact Stripe payment, current Printful quote, idempotent `confirm=false` draft, and explicit owner confirmation inside Printful. 44OS must never confirm through its API.
- Preserve signed production/status/tracking evidence.
- Prove the applicable cancellation/refund path and payment/fulfillment reconciliation without duplicate drafts, charges, or provider facts.

**Complete when:** the lifecycle ends with zero unexplained payment or fulfillment mismatch and all immutable order/provider evidence is preserved.

### 12. Optional inactive capabilities

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
