# 44OS Milestones

This is the execution roadmap for evolving the current staging application into the durable 44OS architecture. Read it after `44OS_FOUNDATION.md` and `44OS_UI.md` before beginning platform work.

The active handoff set is:

- `Other/44OS_FOUNDATION.md` — approved product and technical architecture.
- `Other/44OS_UI.md` — visual system, interaction principles, and quality bar.
- `Other/44OS_MILESTONES.md` — sequencing, current status, dependencies, and completion criteria.

The milestone document is a checklist, not blanket permission to begin the next milestone. Each milestone is discussed and approved before implementation. Update its status and evidence when work changes the platform.

Status vocabulary: `Not started`, `In discussion`, `Approved`, `In progress`, `Blocked`, `Complete`.

---

## Architectural Destination

`catalog_items.id` is the permanent 44OS equivalent of a Steam App ID. The domain noun is **Item** and the universal foreign key is `item_id`. Store, Library, and Community are three faces of the same item identity. An Item may be free, paid, granted, physical, downloadable, streamable, readable, or interactive; acquisition is deliberately not part of its name.

- **Store** discovers and acquires Items through transparent filters and curated editorial shelves.
- **Library** records entitlement, access, progress, achievements, updates, bonus content, and launch actions.
- **Community** hosts general conversation plus typed content anchored to an Item where appropriate.

Capabilities attach to the Item without changing its identity. Shared content mechanics use a typed spine with explicit extension tables rather than an unconstrained JSON container. Commerce, entitlements, and Library state remain separate concepts so a payment provider can be selected later without redesigning ownership.

Existing users, uploads, Item IDs, Library relationships, achievements, posts, questions, collaborations, reviews, and updates must be preserved through additive migrations and verified cutovers.

---

## Current Baseline

**Status: Complete**

The staging system provides the persistent Next.js shell, canonical `catalog_items` catalog, Store, Library, Community, profiles, Studio publishing, Radio, messaging, music playback, music achievements, bonus assets, theme preferences, and canonical route redirects. The repository and linked staging migration histories are aligned through `20260712010000`.

Baseline quality gates pass: ESLint, TypeScript, and the production Next.js build. This is a migration of a working system, not a restart.

Known foundation gaps to resolve before public launch:

- Community mechanisms are split across unrelated table families without a shared Item/content identity.
- Library rows currently mix presentation state with acquisition proof.
- Paid checkout can create purchase rows without a verified payment processor and must not be considered production commerce.
- Achievement and protected-asset grants need server-authoritative enforcement before they carry economic value.
- Supabase queries and legacy route implementations remain more distributed than the long-term architecture should allow.

---

## Pre-launch Milestones

Execution-order update (July 12, 2026): M8, M9, and M10 are complete. While production payment accounts are pending, continue non-payment M13 hardening and build only fail-closed M12 foundations. Stripe payment collection and PayPal creator payouts are provisional; checkout and payouts remain disabled until M11 approval and M12 sandbox/failure testing are complete.

### M1 — Architecture Contract And Handoff

**Status: Complete**

Approve the Item spine, typed content model, entitlement separation, curated-creator launch policy, launch feature boundary, and documentation ownership.

Completion criteria:

- Foundation, UI, and Milestones describe one non-contradictory destination.
- The old proposal is retired after all approved ideas are captured here.
- `catalog_items` becomes the permanent canonical table, `Item` the application/domain type, and `item_id` the universal foreign key. Format-specific user-facing nouns remain preferred where known.

### M2 — Data Safety, Types, And Environment Foundation

**Status: Complete**

Establish the safe workflow used by every later database milestone.

Deliverables:

- Fresh linked-database backup before each write, reviewed repo migration, dry run, and post-apply probes.
- Generated Supabase database types and typed domain boundaries for new foundation tables.
- Repeatable clean migration replay plus RLS and data-preservation checks.
- Dated verification evidence; volatile row counts are never treated as architecture.

Completion criteria:

- Staging can be restored and a clean database can replay the ordered migrations.
- Schema changes never depend on untracked SQL or destructive manual edits.

Completion evidence (July 11, 2026): a linked schema/data backup, dry run, generated `Database` types, full data-clone rehearsal, post-apply probes, and deployed smoke tests are complete. The historical chain was consolidated into the canonical `20260712010000_44os_item_baseline.sql`; it rebuilds a clean local database including auth and storage integration, produces no public-schema difference from staging, and is the sole aligned local/remote migration-history entry. Future changes begin as new timestamped migrations after this baseline.

### M3 — Canonical Item And Capability Spine

**Status: Complete**

Keep every existing UUID while migrating the current `products` domain to `catalog_items` and making Items the anchor for future capabilities and collaborators. Rename the user relationship from `library_items` to `library_entries`; it owns Library display state rather than acquisition authority.

Deliverables:

- Versioned `item_capabilities` registry with unique Item/capability pairs; feature payloads remain in typed feature-owned tables.
- `item_members` roles for owner/editor/contributor, initially backfilled from the current Item author.
- Structured Item/profile external links.
- Existing tracks, assets, achievements, Radio entries, and Library relationships continue to reference the same Item IDs.

Completion criteria:

- Store, Library, Studio, Community attachments, Radio, and release features resolve through one stable Item identity.
- Existing creators retain ownership and existing uploads remain addressable.

Completion evidence (July 11, 2026): the canonical Item foundation is applied to staging and captured in `20260712010000_44os_item_baseline.sql`; 49 Items, 32 Library entries, 248 tracks, and 14 profiles were preserved. It backfilled 49 Item owners and 213 capability registrations, applied the approved one-admin/five-creator/eight-member mapping, and deployed successfully to `https://44os.com`. Public Item, Store, Community, Questions, Radio, Login, and signed-out Library smoke tests passed at desktop, 390px, and 430px with no application error or horizontal overflow.

### M4 — Typed Community Content Spine

**Status: Complete**

Unify shared identity, Item anchoring, replies, and reactions while retaining purpose-built data constraints.

Deliverables:

- `content_entries`, `content_replies`, `content_entry_reactions`, and `content_reply_reactions` for shared mechanics.
- Typed detail tables for questions, collaborations, reviews, and creator updates; events and videos remain later additive detail types.
- Nullable `item_id`: null means platform-wide Community content; set means content associated with one canonical Item.
- Deterministic backfill from posts, questions, collaborations, reviews, and updates with authorship and timestamps preserved.
- Application cutover followed by a verification period before legacy table retirement.

Completion criteria:

- General discussions/questions/collaborations render in Community.
- Reviews, updates, and future scoped questions attach to the correct Store/Library Item.
- No user-visible behavior or current staging content is lost.

Completion evidence (July 11, 2026): migration `20260712020000_typed_community_content_spine.sql` established canonical `content_entries`, shared replies/reactions, and constrained question, collaboration, review, and creator-update detail tables. The app now reads and writes through canonical Community contracts rather than the legacy table families. A full linked-data rehearsal preserved every existing content and reply UUID with zero missing IDs, including 24 discussions, 2 questions, 2 collaborations, 2 reviews, 63 discussion replies, 3 answers, 1 collaboration response, and their reactions. Anonymous writes and forged creator updates were denied; authenticated discussion, reply, question, vote, and review creation passed. Feed, Questions, Collaboration, thread, and Item-review UI checks passed locally against the cloned data with no application or console errors. The linked migration history is aligned through `20260712020000`; legacy tables remain only as temporary verification-period compatibility sources before retirement.

### M5 — Entitlements And Provider-neutral Commerce Core

**Status: Complete**

Separate catalog offers, money movement, access rights, and Library presentation before choosing a payment provider.

Deliverables:

- Offers/prices, orders/order items, payment attempts/events, entitlements, and auditable grant/revoke operations.
- Free adds, purchases, manual grants, and achievement rewards use server-authoritative operations.
- `library_entries` represents the visible per-user Library state; it is not proof of payment by itself.
- Public paid checkout remains disabled until verified payments are complete.

Completion criteria:

- A client-authored row cannot forge a purchase, entitlement, achievement, or protected-asset unlock.
- The commerce domain can accept a later processor adapter without changing Item or Library identity.

Completion evidence (July 12, 2026): `20260712030000_m5_provider_neutral_commerce.sql` establishes `catalog_offers`, typed offer grants, provider-neutral commerce orders and line snapshots, addresses, payment attempts/events, entitlements, and an immutable entitlement event ledger. Existing Library relationships are preserved as `legacy_library` entitlements without claiming processor verification. Active zero-cost Library offers preserve the tester experience; downloadable and physical offers are draft-only. `save_item_to_library` is server-authoritative, direct Library insertion is revoked, paid placeholder checkout is disabled, and repeated free saves are idempotent. The linked-data rehearsal preserved all 32 Library entries with 32 matching Library entitlements.

`20260712040000_m5_trusted_achievements_and_assets.sql` completes the trust boundary. Playback evidence is recorded through validated server operations; achievement evaluation and reward entitlements are server-authoritative; clients cannot directly write unlock, event, or progress records. Protected asset manifests reveal file locations only to an entitled user or Item manager, public track/Item download URLs are prohibited, and legacy client-authored merchandise orders are disabled. Rehearsals preserved all 12 existing achievement unlocks. Denial-path tests confirmed that direct unlock writes fail and locked assets withhold their URLs, while a valid download entitlement reveals the protected asset. The approved music contract is free listening, free Library saves, optional `Buy Download`, and separate `Buy Physical` actions.

### M6 — Application And Route Consolidation

**Status: Complete**

Move catalog, Library, Community, Studio, profile, and acquisition queries behind typed domain services. Remove duplicate Dashboard implementations while preserving intentional redirects.

Completion criteria:

- Each canonical route has one implementation.
- Compatibility routes contain redirects only.
- Repeated cards and pages do not produce session or row-by-row request fan-out.

Completion evidence (July 12, 2026): Studio is the single creator-management implementation; the former 13-page `/dashboard` copy is one permanent redirect preserving paths and query parameters. Typed domain services own catalog, Library, Item details, entitlements/acquisition, profiles, search, preferences, Community, messaging, Studio publishing, protected assets, and current commerce-history access. There are zero direct database table or RPC calls in application pages or UI components; authentication SDK calls remain intentionally at the login/settings boundary. Store/Library detail bundles and Community/profile engagement data load through bounded parallel service queries rather than card-level or row-level request loops. Specialized music and book UI remains distinct for playback/achievement and reader behavior while sharing its data orchestration. `/product`, typed legacy Library paths, and Dashboard paths are permanent compatibility redirects to canonical Store, Library, and Studio routes. Typecheck, lint, production build, redirect probes, and signed-out production smoke tests passed.

### M7 — Store And Discovery Launch Loop

**Status: Complete**

Ship one transparent catalog engine behind `/store` and `/store/[category]`, presented publicly as Browse, with curated editorial shelves and explicit category, price, category-relevant tag, and feature filters. `/browse` remains compatibility-only.

Completion criteria:

- The full catalog is discoverable without bespoke category implementations or opaque popularity ranking.
- Profiles and Items expose structured external-platform links.

Completion evidence (July 12, 2026): `/store` and every category route use one `loadStoreDiscoveryCatalog` contract over all 49 published Items and their capability registrations, while the page, sidebar, topbar, metadata, and navigation label the surface Browse. The five system Categories are Music, Books, Games, Merch, and Assets. Discovery exposes Category, Type, Tags, Features, Price, and text filtering; unused Categories, Types, and Tags stay hidden. The public Features filter currently exposes Achievements alone while the backend capability registry remains extensible. Editorial surfaces are deterministic and explainable: `Featured` is explicitly curated and capped at four, `Creators You Follow` is personalized and omitted when empty, and each nonempty Category has a release-ordered eight-Item shelf whose `View All` action applies the existing Category filter—no engagement/popularity score is used. `20260712050000_m7_catalog_discovery_truth.sql` removed inherited false capability claims: streaming now covers only 28 music Items, and downloads cover 28 music plus 2 books rather than 19 physical merch Items with no downloadable asset/offer. Item and profile pages render ordered `item_external_links` and `profile_external_links` when populated; both live tables are currently empty, so no fake outbound links were invented. `/browse` remains permanent compatibility-only. Typecheck, lint, production build, local filter markup, clean schema replay, linked migration alignment, and public capability probes passed.

Post-completion foundation refinement (July 12, 2026): the permanent public hierarchy is Category → Type → Tags: Music → Album → Electronic and Merch → Apparel → Hoodies are representative paths. `item_categories` is immutable application-owned vocabulary; administrators manage `item_types` and the approved `item_tags` allow-list in Supabase. `item_type_assignments` and `item_tag_assignments` are the canonical Item relationships read by both Studio and Browse. Creators select one Item Type and any number of available approved Item Tags, never arbitrary public text. The superseded combined taxonomy tables are deleted, Browse/Studio no longer use free-form Item tags, and the 49 existing Items have Category-consistent Type assignments; two ambiguous music backfills were corrected to Single. Music begins with 32 controlled Apple Music-aligned genre Tags shared across every Music Type. Front-facing Store/Home labels are Browse while `/store` remains the stable internal route/domain. Music and Assets use square catalog artwork, Books use 2:3 covers, and physical Merch uses 3:4 product artwork in Store grids and detail pages. `New in Merch` temporarily prioritizes Apparel, then Accessories, without changing global catalog ordering. This taxonomy foundation is applied through `20260712052300_m7_seed_music_genre_tags.sql`.

Interface-foundation completion evidence (July 12, 2026): 44OS now has one desktop and mobile component language for theme-through workspace materials, opaque paper dropdowns/player surfaces, system radii, safe spacing, neutral borders, elevation, input focus, buttons, navigation pills, and shared Community post mechanics. The app environment, themes, shell, and Dock glass remain unchanged. Store, Library, Community, Search, profiles, Reviews, Settings, Studio forms and metrics, Notifications, achievements, and the music player were migrated away from conflicting page-level material overrides. Shared filters close on outside interaction; their triggers and paper popovers remain inside one mobile safe-margin contract. Store filters remain open for multi-step refinement and expose wrapping, removable state pills below the header divider. Search and profile posts use canonical Community counts and interaction routing. Profile headers were retired in favor of identity-first profiles whose mobile identity row separates compact avatar/name/handle from a full-width bio. Desktop Dock order is Home, Radio, Library, Community, with the first divider reserved for pinned Items. Library is one filterable destination with Music, Books, and Assets rendered as separate ordered grid bands so portrait Books start below square Music. Radio is a fixed titleless Now Playing panel with Stream/Stop behavior, text-only creator navigation, and a reliable Radio return path from releases and creator profiles. Mobile Browse shelf actions use backgroundless trailing chevrons to preserve long editorial titles. Studio presents Saves, Plays, Sold, and Earned as its four overview signals; `item_play_events` and `record_item_play` provide creator-authorized totals for every validated Store, Library, Radio, creator-owned, or other-user playback start, with historical completed-track evidence backfilled. Profile header storage is retired and existing music achievements are enabled without restoring the former bonus-content save requirement. Lint, TypeScript, production build, responsive signed-in visual review, migration dry-run, and route probes are the release gates for this pass.

### M8 — Library, Achievements, And Item Memory

**Status: Complete**

Make Library the durable view of entitlements, progress, achievements, creator updates, bonus content, downloads, and launch actions.

Completion criteria:

- The eight launch music achievements and Overachiever bonus content use trusted grant rules.
- Protected downloads and bonus assets cannot be accessed by bypassing the client UI.

Completion evidence (July 12, 2026): `20260712054000_m8_private_item_files_foundation.sql` establishes the private `item-files` bucket with entitlement-aware object reads. The two live book PDFs were copied to deterministic private paths, downloaded back, and matched against their source SHA-256 hashes and byte counts before `20260712054100_m8_private_book_asset_cutover.sql` removed public catalog locations and granted the existing Library owner explicit audited download entitlements. The verified legacy public copies were then removed; old public and anonymous private URLs return HTTP 400. An entitled real-user session received one unlocked manifest row and downloaded a five-minute signed URL matching the original 43,711,872-byte PDF hash, while another authenticated user received zero manifest rows and could not sign the known path.

`20260712054200_m8_trusted_achievement_edges.sql` closes direct execution of internal grant helpers, replaces client-authored Signal Boost rows with one idempotent authenticated non-self visitor RPC, and enforces private storage for every future downloadable or bonus asset. Studio book, asset, and optional Overachiever uploads now write private paths; Library resolves authorized paths to short-lived signed URLs and shows included files, achievements, bonus state, creator updates, and configured actions. The canonical Library music surface evaluates Front to Back, No Skips, Nightbird, and Heavy Rotation from validated playback evidence; creator follow, published review, and distinct share-visitor evidence drive Joined the Orbit, Left Your Mark, and Signal Boost; Overachiever remains server-derived from all enabled non-final achievements and grants bonus entitlement through the immutable ledger.

`20260712054300_m8_achievement_evaluator_cast.sql` removes the final schema-lint warning in the trusted evaluator. Direct anonymous manifest, internal grant, share-RPC, and share-table calls return HTTP 401; an attempted public protected-asset insert returns HTTP 400. Final preservation probes show 49 published Items, 248 tracks, 33 Library entries, 12 existing achievement unlocks, and zero protected assets with public locations. TypeScript, zero-warning lint, production build, migration alignment/dry-run, and schema lint all pass. M8 is complete.

### M9 — Community And Item Hubs

**Status: Complete**

Complete general discussions, questions, collaboration, follows, reviews, creator updates, and Item-scoped questions on the typed content spine. Add reporting, moderation state, rate limits, and admin handling.

Completion criteria:

- Every content type has intentional loading, empty, error, ownership, moderation, and signed-out behavior.
- General and Item-scoped content appear on the correct Community, Store, or Library surface.

Preflight release-edit correction (July 12, 2026): the existing Studio price input reformatted every keystroke as cents, and music edits deleted/recreated achievement rows even when only changing price. `20260712054400_safe_studio_release_edits.sql` replaces destructive achievement replacement with an ID-preserving server sync; earned achievement rows cannot be removed. Price fields now accept ordinary decimals. A real owner acceptance test changed one healthy published release from 499¢ to 500¢ through the same RLS/publication path, verified the published value, then restored the exact original 499¢ published state.

Completion evidence (July 12, 2026): `20260712055000_m9_moderation_reporting_rate_limits.sql` establishes `content_reports`, an administrator resolution queue, author-immutable moderation state, public hiding/removal behavior, and database-triggered hourly limits for entries, replies, and reactions. Report controls cover discussions/replies, questions/answers, collaborations/responses, reviews, and Creator Updates. A disposable-user rehearsal proved report creation, HTTP 403 author moderation denial, administrator resolution, audit status, and immediate anonymous hiding. The eleventh entry in one hour returned HTTP 400 while exactly ten valid entries persisted; all disposable content/accounts were removed afterward.

`20260712055100_m9_creator_updates.sql` adds atomic ownership-checked Creator Update creation for active Items, exposed beneath the Studio Item editor and read on Store/Library hubs. A regular member's forged update returned HTTP 403; an actual Item owner created a published update successfully in the acceptance rehearsal. Store and Library now expose Item-scoped Questions; a real typed creation appeared with its permanent `item_id` while a direct malformed Question row returned HTTP 400. `20260712055200_m9_typed_content_integrity.sql` enforces required detail rows, published Item scope, reply types/parents, and content lengths at the database boundary.

Final preservation probes retained 24 discussions, 2 questions, 2 collaborations, 2 reviews, 66 shared replies, and all 14 profiles; temporary reports/content were removed. Rendered signed-in checks passed Community, Questions, an Item hub, Studio release editing/Creator Updates, and non-admin moderation denial. Community Questions and Item hubs have no horizontal overflow at 390px. TypeScript, zero-warning lint, production build, migration alignment/dry-run, and clean schema lint pass. M9 is complete.

### M10 — Studio And Curated Creator Launch

**Status: Complete**

Keep fan registration public while publishing remains invite/approval based. Move Studio publishing onto the Item/capability services with validation, previews, upload policies, and catalog-health checks.

Lifecycle slice complete (July 12, 2026): `20260712052700_m10_permanent_item_lifecycle.sql` replaces creator hard deletion with the ownership-checked `archive_owned_item` operation. `catalog_items.id` remains permanent; removal archives every offer and hides the Item from Store and active Studio views while preserving existing Library access, entitlements, immutable `entitlement_events`, tracks, achievements, assets, and creator updates for authorized users. Direct anonymous/authenticated deletion is revoked, archived Items cannot be republished through normal creator updates, migration history is aligned, linked schema lint completes with only the pre-existing `evaluate_item_achievements` cast warning, and the anonymous RPC denial path returns HTTP 401. The owner acceptance path is ready to retry in signed-in Studio.

Curated publishing boundary complete (July 12, 2026): `20260712053000_m10_curated_publishing_boundary.sql` prevents self-service role escalation, provides admin-only role assignment, limits Item creation/mutation to approved creators/admins, and makes publication an authenticated ownership-checked RPC with server-side taxonomy, artwork, year, track, book, and asset validation. Studio edits save dependent rows in draft before the final publication request. Catalog-health findings are available without modifying Items, and upload update/delete access is owner-scoped; creator media roots require an approved publisher. All 14 approved roles were verified, all 49 published Items remain public, anonymous publication and role escalation return HTTP 401, migration history is aligned, TypeScript/lint/build pass, and schema lint retains only the pre-existing achievement cast warning.

Completion evidence (July 12, 2026): migrations `20260712053100_m10_catalog_health_reporting.sql`, `20260712053200_m10_studio_child_write_boundary.sql`, and `20260712053300_m10_rpc_execute_boundary.sql` complete the launch boundary. Studio loads one bounded catalog-health result set and shows issue counts without row fan-out. Approval revocation consistently removes mutation access across Item rows, tracks, assets, taxonomy, capabilities, collaborators, offers, links, and achievement configuration. Upload mutation is object-owner scoped, catalog upload roots require creator/admin approval, protected asset locations remain entitlement-gated through the M5 manifest, and existing public upload URLs are preserved rather than destructively relocated. Supabase's default direct anonymous function grants are explicitly removed from role, publication, approval, and health RPCs.

Final live verification preserved 49 published Items, 248 public tracks, 14 profiles, the approved one-admin/five-creator/eight-member mapping, permanent Item IDs, Library/Community/entitlement history, and all existing uploads. Anonymous health, publication, and role RPC calls return HTTP 401. Linked migrations are aligned through `20260712053300`; dry-run is clean; TypeScript, zero-warning lint, and production build pass. M10 is complete. The protected-file cutover and clean schema lint were subsequently completed in M8.

Approved staging role mapping:

- Admin: `44corp`.
- Creators: `olsten44`, `asagittariusspeaks1`, `callmetellali`, `spiiriit`, `lvminvs247`.
- Members: `sam_bridges`, `rainy_day`, `g_fraz_2020`, `bigboss`, `ajhardin3`, `smenick`, `quiet_strike`, `mstrahilov`.

All accounts and their Library, achievement, messaging, and Community history are preserved. Role changes do not delete uploads or authorship.

### M11 — Payment Operating Model Decision

**Status: In discussion**

Compare Stripe Connect, 44 acting as seller, and other viable models with legal/accounting input. Decide platform fees, tax responsibility, payouts, refunds, disputes, physical fulfillment, supported countries/currencies, and provider.

Completion criteria: an approved decision record leaves no payment-policy choices to implementation.

Progress evidence (July 12, 2026): `Other/M11_PROVISIONAL_PAYMENT_MODEL.md` records Stripe customer collection plus PayPal creator payouts as the working direction and lists the legal, tax, fee, refund, dispute, fulfillment, country, currency, KYC, reserve, and fallback decisions still requiring approval. The milestone is intentionally not Complete.

### M12 — Verified Payments And Earnings

**Status: In progress (infrastructure only; commerce disabled)**

Implement the selected provider behind the commerce boundary using signed webhooks, idempotency, immutable transaction records, refund/revocation handling, and reconciled creator earnings.

Completion criteria: sandbox and failure testing prove money, orders, entitlements, payouts, and Library access cannot diverge.

Progress evidence (July 12, 2026): deployed migration `20260712056000_m12_disabled_payment_operations_foundation.sql` adds fail-closed runtime controls, private creator payout eligibility, append-only earnings entries, idempotent PayPal payout batches/items, verified Stripe/PayPal webhook records, and reconciliation runs. It activates no offer, grants no entitlement, and moves no money. Backup, dry-run, migration alignment, schema lint, generated types, lint, typecheck, and production build passed.

### M13 — Launch Hardening

**Status: In progress**

Finish transactional email, recovery flows, observability, storage security, abuse controls, privacy/legal surfaces, accessibility, performance budgets, automated end-to-end tests, and operational runbooks.

Execution note: complete and verify the non-payment work first. Payment reconciliation and provider-dependent launch checks remain the final M13 gate after M11 and M12.

Progress evidence (July 12, 2026): deployed migration `20260712057000_m13_publishing_rights_attestation.sql` adds immutable, versioned Item-rights attestations and makes the ownership-checked publication RPC reject publication without the current acknowledgement. Studio creation and publication require the plain-language confirmation and explicitly avoid claiming independent verification by 44. Existing published Items and history were not rewritten; enforcement applies on the next creator-requested publication. Backup, dry-run, linked schema lint, generated types, lint, typecheck, and production build passed.

Required review workflow: creators never control publication lifecycle states directly. A creator submits a new release or proposed changes and sees only `Pending Review`; 44 admins privately approve or reject the submission. Public Item pages continue showing the last approved version while edits are pending. Approval must be server-authoritative and audited with reviewer, submitter, timestamps, policy version, and decision reason. Removal remains archival rather than hard deletion. This review queue is a later M13 slice; Draft is not a creator-facing state or action.

Trusted-testing exception: until the review package exists, approved invited creators can add, edit, and archive their own releases without approval latency. This does not relax account approval, ownership checks, RLS, storage protection, permanent IDs, or audit preservation. `publishing_runtime_controls` records the phase as `trusted_testing` with review disabled; it must not be switched to `review_required` until pending revisions, admin review, notifications, and acceptance tests are complete.

M13 UI Activation Review gate: backend foundations may be completed and tested without appearing on tester-facing pages. Questions, reporting, Bonus Content attachments, account-recovery/legal navigation, moderation, creator submission review, payments, and other new surfaces require a documented UI review before activation. Review covers route ownership, hierarchy, copy, desktop/mobile layout, loading/empty/error/success states, accessibility, and consistency with the established visual system. During trusted testing, Item Questions and all Report actions are hidden; the unfinished Bonus Content attachment editor is hidden while existing protected bonus assets and reward metadata remain preserved.

Non-payment hardening package (July 12, 2026): account-recovery, Terms, Privacy, and Copyright foundations exist behind the UI activation gate. A global route error boundary, dependency-aware `/api/health`, HSTS/frame/base/object/referrer/permissions headers, executable `test:smoke`, and `Other/44OS_OPERATIONS.md` establish baseline failure handling, readiness, deployment, incident, restoration, and secret-rotation operations. Production SMTP/domain authentication, bounce/delivery monitoring, external error-alert routing, and UI activation remain open gates.

Canonical-route cleanup (July 12, 2026): the app route graph was reduced from 64 routes to 33. The duplicate `/studio/products` list, abandoned `/studio/44os*` and `/home` concepts, unreachable `/product` implementation, duplicate typed Music/Books/Assets Library implementations, and legacy redirect/404 components were removed. Current Item and Library implementations live only at `/store/item/[identifier]` and `/library/item/[id]`; Studio saves return directly to `/studio#music|books|assets|merch`. Compatibility URLs redirect once from `next.config.ts` to canonical destinations.

Verification evidence: zero front-facing call sites remain for Item Questions, Report actions, or Bonus Content attachments. Reviewed recovery/legal/moderation URLs return 404 with the activation flag off. Lint, clean route type generation, strict TypeScript, production build, linked migration dry-run, schema lint, anonymous health/security smoke, canonical Karen Item load, and one-hop compatibility redirect probes passed.

Trusted-testing edit correction (July 12, 2026): deployed migration `20260712057100_m13_reliable_studio_item_edits.sql` replaces the fragile published-to-draft direct table update with an ownership-checked, field-whitelisted RPC that preserves the live publication state and permanent child history. Studio no longer exposes Draft/Published pills or toggles; approved testers use Publish Release, Save Changes, and Remove. Mobile text-entry controls render at least 16px to prevent iOS Safari focus zoom while retaining pinch-to-zoom accessibility. Karen and every existing Item were preserved unchanged during deployment. Backup, dry-run, migration alignment, schema lint, generated types, lint, typecheck, and production build passed.

Executable launch-gate expansion (July 12, 2026): `test:smoke` now proves the bounded health response contract, core security headers, English/title/main/zoom-safe document basics, configurable response and HTML budgets, reviewed-surface 404 isolation, and direct one-hop resolution for the highest-risk legacy routes. A production build passed the expanded gate locally and the same suite passed against `https://44os.com`. `test:schema-replay` now owns the disposable no-seed database rebuild command; a clean local database replayed every repository migration through `20260712057100`, the linked project remained migration-aligned, and linked schema lint returned zero errors. This closes the migration-chain schema replay gate, not the separate production-data backup restoration rehearsal.

Role-security and observability foundation (July 12, 2026): a rollback-only pgTAP suite now exercises the database as anonymous, member, creator, and admin. Twelve assertions prove anonymous RPC denial, public fan registration without publishing authority, member Item-creation/foreign-edit/self-promotion denial, approved creator editing with price and publication-state preservation, lifecycle-field rejection, and admin-only role approval. Provider-neutral request-error instrumentation emits sanitized structured events with release/runtime/route context but no headers, query values, user content, or tokens; health output now identifies deployment release and region. The production-data restoration rehearsal is deliberately deferred alongside the final payment-era operational gates; external alert routing still requires provider/on-call selection.

Public responsive acceptance (July 12, 2026): Home, Karen Item detail, Community, Support, Login, and Radio were exercised in production at 390px, 430px, 1280px, and 1440px. All 24 combinations retained the English document contract, main landmark, exact viewport width, and zero horizontal overflow; every visible mobile input remained at least 16px. The audit caught and corrected the root metadata regression so `/` identifies itself as 44OS while `/store` remains Store. This closes the automated/public responsive subset, not signed-in screen-reader/keyboard or installed-iOS acceptance.

Completion criteria:

- Anonymous, fan, creator, and admin journeys pass at 1440px, 1280px, 430px, 390px, and installed iOS PWA.
- Lint, typecheck, build, schema replay, RLS/security tests, backup restoration, migration rollback, payment reconciliation, and launch smoke tests pass.

---

## Post-launch Milestones

### M14 — Creator Media

**Status: In progress (Cross-Platform Reach deployed; remaining Creator Media slices pending)**

Cross-Platform Reach is the first M14 slice: add creator-facing editors for structured profile links (Spotify, Apple Music, Bandcamp, YouTube, Instagram, X, creator website, and extensible approved platforms) and release-level Spotify/Apple Music/Bandcamp/YouTube links. Validate canonical HTTPS hosts, allow ordering/removal, render accessible outbound actions on profiles and Item pages, and preserve 44OS as a creator-owned hub rather than treating external platforms as competitors. The schema and public rendering foundations already exist in `profile_external_links` and `item_external_links`; do not create parallel URL columns.

Cross-Platform Reach completed (July 12, 2026): migration `20260712057200_m14_cross_platform_reach.sql` is applied to the linked project and adds the extensible approved-platform registry and atomic owner-managed profile/Item sync operations without parallel URL columns. It enforces creator approval, Item ownership, HTTPS, canonical Spotify/Apple Music/Bandcamp/YouTube/Instagram/X hosts, secure general websites, scope eligibility, one link per platform, maximum counts, fixed approved ordering, removal, and direct-write revocation. Profile and Studio editors show every approved destination as a labeled empty field; public profiles render left-aligned monochrome icons beneath Bio and Item pages render descriptive listening-platform actions. The real `olsten44` profile editor and KΛREN release editor passed linked-schema review at 1280px/362px with no horizontal overflow, matching field styles, 16px fields, and no URL placeholder. Clean replay, 17 M14 pgTAP assertions covering all seven profile and all four Item platforms (29 total suite assertions), zero-error local schema lint, linked dry-run/migration-history verification, anonymous live-RPC denial, lint, strict TypeScript, and production build pass. The Cross-Platform Reach slice is complete; commentary audio/text, behind-the-scenes video, and richer creator updates remain later M14 work.

Then add commentary audio/text, behind-the-scenes YouTube video, general creator video, and richer creator updates.

### M15 — Native Content Experiences

**Status: Complete (deployed July 13, 2026)**

- [x] Define the native PDF reader content model and keep EPUB as a later additive format.
- [x] Build entitlement-aware protected book retrieval and separate public sample-PDF foundations.
- [x] Build server-derived reading progress, last-page restoration, appearance synchronization, and page bookmarks.
- [x] Deliver full-viewport mobile portrait/landscape reading plus desktop fit, zoom, appearance, keyboard, and screen-reader behavior.
- [x] Keep browser pinch zoom available and define explicit offline/expired-access recovery without caching protected PDFs.
- [x] Define Sample Pack/file contracts with ordered preview metadata, waveform peaks, optional individual source assets, and protected full ZIP assets.
- [x] Authorize individual and full-pack downloads through active download entitlements and short-lived signed URLs.
- [x] Save clamped sample-preview playback position while routing previews through the existing global music player.
- [x] Deliver Store and Library Book/Sample Pack experiences plus PDF/ZIP-aware Studio create/edit flows and canonical Description fields.
- [x] Preserve existing users, Item IDs, uploads, Library relationships, Community data, entitlements, and entitlement audit history.

Deployment evidence: migrations `20260712058000_m15_native_books_and_sample_packs.sql`, `20260712059000_m15_reader_bookmarks.sql`, and `20260712060000_m15_native_description_edits.sql` are aligned locally and remotely. Clean no-seed schema replay, zero-error schema lint, 25 M15 pgTAP assertions (54 across the full security suite), lint, strict TypeScript, and production build passed. Signed-in local QA covered Store, Library, Studio, sample-limit enforcement, shared-player routing, protected ZIP/PDF manifests, reading restoration, bookmarks, and 390px portrait/844×390 landscape/1280px reader geometry. The linked “Drum Loops” Item and its uploaded ZIP were preserved; its optional preview rows can now be added through Studio. Payment activation, backups/restoration rehearsal, EPUB, and protected offline storage remain separate later work.

Reliability follow-up (July 13, 2026): Studio add/edit recovery is device-local and scoped by account plus new section or permanent Item ID, so auth refresh, window focus changes, browser refresh, and mobile app switching do not erase unsaved inputs. It remains distinct from the removed publication Draft lifecycle and clears on Save, Cancel, or removal. Sample-preview storage now commits before optional audio analysis, and functional merges prevent waveform metadata from erasing the uploaded path. Books use the legacy-compatible PDF.js client and worker with Safari Map-upsert support, resolving the `getOrInsertComputed` reader failure without changing protected access. Strict TypeScript, lint, production build, and all 54 security assertions passed.

### M16 — Events And Programming

Creator events, calendar aggregation, release dates, and scheduled Radio programming. Calendar remains an aggregate view, not an independent data source.

### M17 — Interactive Platform

WebGL/Unity launches, interactive progress and achievement bridges, desktop-experience guidance, and the later Tauri wrapper.

### M18 — Ecosystem Expansion

Livestream status, guides/showcases, contributor organizations, services represented through the Item spine, points/rewards, and other capabilities validated by real creator demand.

---

## Milestone Maintenance

- A milestone is discussed before it moves to `Approved` or `In progress`.
- A milestone is not `Complete` because its UI exists; schema, RLS, migration, failure states, and acceptance journeys must pass.
- Record meaningful completion evidence in the milestone section without turning this file into a daily changelog.
- When a decision changes architecture, update Foundation, UI where relevant, and this roadmap in the same change.
