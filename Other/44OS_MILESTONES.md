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

**Status: Not started**

Make Library the durable view of entitlements, progress, achievements, creator updates, bonus content, downloads, and launch actions.

Completion criteria:

- The eight launch music achievements and Overachiever bonus content use trusted grant rules.
- Protected downloads and bonus assets cannot be accessed by bypassing the client UI.

### M9 — Community And Item Hubs

**Status: Not started**

Complete general discussions, questions, collaboration, follows, reviews, creator updates, and Item-scoped questions on the typed content spine. Add reporting, moderation state, rate limits, and admin handling.

Completion criteria:

- Every content type has intentional loading, empty, error, ownership, moderation, and signed-out behavior.
- General and Item-scoped content appear on the correct Community, Store, or Library surface.

### M10 — Studio And Curated Creator Launch

**Status: In progress**

Keep fan registration public while publishing remains invite/approval based. Move Studio publishing onto the Item/capability services with validation, previews, upload policies, and catalog-health checks.

Lifecycle slice complete (July 12, 2026): `20260712052700_m10_permanent_item_lifecycle.sql` replaces creator hard deletion with the ownership-checked `archive_owned_item` operation. `catalog_items.id` remains permanent; removal archives every offer and hides the Item from Store and active Studio views while preserving existing Library access, entitlements, immutable `entitlement_events`, tracks, achievements, assets, and creator updates for authorized users. Direct anonymous/authenticated deletion is revoked, archived Items cannot be republished through normal creator updates, migration history is aligned, linked schema lint completes with only the pre-existing `evaluate_item_achievements` cast warning, and the anonymous RPC denial path returns HTTP 401. The owner acceptance path is ready to retry in signed-in Studio.

Approved staging role mapping:

- Admin: `44corp`.
- Creators: `olsten44`, `asagittariusspeaks1`, `callmetellali`, `spiiriit`, `lvminvs247`.
- Members: `sam_bridges`, `rainy_day`, `g_fraz_2020`, `bigboss`, `ajhardin3`, `smenick`, `quiet_strike`, `mstrahilov`.

All accounts and their Library, achievement, messaging, and Community history are preserved. Role changes do not delete uploads or authorship.

### M11 — Payment Operating Model Decision

**Status: Not started**

Compare Stripe Connect, 44 acting as seller, and other viable models with legal/accounting input. Decide platform fees, tax responsibility, payouts, refunds, disputes, physical fulfillment, supported countries/currencies, and provider.

Completion criteria: an approved decision record leaves no payment-policy choices to implementation.

### M12 — Verified Payments And Earnings

**Status: Not started**

Implement the selected provider behind the commerce boundary using signed webhooks, idempotency, immutable transaction records, refund/revocation handling, and reconciled creator earnings.

Completion criteria: sandbox and failure testing prove money, orders, entitlements, payouts, and Library access cannot diverge.

### M13 — Launch Hardening

**Status: Not started**

Finish transactional email, recovery flows, observability, storage security, abuse controls, privacy/legal surfaces, accessibility, performance budgets, automated end-to-end tests, and operational runbooks.

Completion criteria:

- Anonymous, fan, creator, and admin journeys pass at 1440px, 1280px, 430px, 390px, and installed iOS PWA.
- Lint, typecheck, build, schema replay, RLS/security tests, backup restoration, migration rollback, payment reconciliation, and launch smoke tests pass.

---

## Post-launch Milestones

### M14 — Creator Media

Commentary audio/text, behind-the-scenes YouTube video, general creator video, and richer creator updates.

### M15 — Native Content Experiences

Typeset book reader, sample-pack waveform previews, individual/full-pack downloads, and saved progress.

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
