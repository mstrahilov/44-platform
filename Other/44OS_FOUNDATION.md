# 44OS Foundation

This is one of the three active handoff documents for 44OS. Read it before changing architecture, routes, authentication, Supabase, mobile/PWA behavior, desktop packaging, or deployment behavior.

The active handoff set is:

- `Other/44OS_FOUNDATION.md` - architecture, routes, data, auth, deployment, desktop stance.
- `Other/44OS_UI.md` - visual system, interaction principles, and quality bar.
- `Other/44OS_MILESTONES.md` - approved sequencing, current status, dependencies, and completion criteria.

Do not revive deleted proposal documents or old SQL notes as active references. If a decision changes, update the relevant active docs in the same change.

Current launch-readiness source of truth: July 13, 2026. Foundation changes must be evaluated as one system across browser, iOS home-screen installation, authentication, streaming audio, Supabase, metadata, and route ownership.

---

## 1. Product Definition

44 is the parent creative company. 44OS is a web-first creative operating system for fans, creators, collaborators, and clients. It ships first as a Next.js app on Vercel and will later be wrapped for macOS and Windows.

44OS exists to give underground creatives and their fans a home outside ad-driven, algorithm-driven platforms. The product should feel closer to a creator operating system than a social app: a place where people publish, collect, listen, read, explore, ask questions, follow each other, collaborate, sell work, and build cultural memory around releases.

The launch mental model is:

- **Store**: the user-facing discovery and acquisition app.
- **Library**: the signed-in user's owned, saved, purchased, or added items.
- **Community**: public posts, questions, collaboration, follows, and creator/fan connection.
- **Radio**: public listening surface with a live Now Playing hero.
- **Studio**: signed-in creator workspace for publishing and catalog health; canonical routes live under `/studio`.
- **Settings**: signed-in system, Dock, region, and account controls. On mobile, Settings is reached from the avatar/account menu rather than the Dock.
- **Support**: public help surface.
- **Search**: desktop topbar control and mobile Dock destination for global search.

Resources and the old Services/Projects workflow are removed. Inbox and standalone Profile remain account-level surfaces rather than v1 Dock destinations.

Language rules:

- User-facing copy says Browse, Library, Community, release, item, music, book, sample pack, apparel, merch, review, creator update, bonus content, earnings, and orders. Browse is the public discovery label; `/store` and the Store domain remain the internal route and architecture names.
- UI copy should not use "Collection" as the visible Library model.
- **Item** is the permanent domain noun. The canonical destination table is `catalog_items`, its application type is `Item`, and its universal foreign key is `item_id`. The current `products` name is migrated without changing UUIDs. User-facing copy should use "items" or format-specific nouns.
- Services are excluded from the v1 polished Browse surface.

---

## 2. North Star

The closest strategic reference is Steam/Valve, adapted for music, books, art, services, games, interactive releases, and local creative economies:

- 44 first uses 44OS to publish its own flagship work.
- The platform then opens outward so friends, collaborators, and other creatives can publish their own work.
- Over time, platform capabilities become creator tools, the way Steam grew from distribution into Workshop, achievements, communities, modding, and hardware/engine showcases.
- Flagship 44 releases should demonstrate what the system can do, then those capabilities should become simple tools other creators can use without needing to code.

Core doctrine:

- **Creator-first, fan-respecting**: no dark patterns, no algorithmic addiction loops, no ad-first design.
- **Technology hidden, power exposed**: creators should not need to understand achievement tracking, local/global pricing, Supabase events, file unlocks, or interactive-experience APIs.
- **Library as memory**: when a fan adds a release, unlocks an achievement, receives bonus content, or joins an experience, the Library becomes the durable record of that relationship.
- **Community as infrastructure**: posts, follows, questions, collaboration, profiles, and later messages exist so people can learn, find each other, support each other, and build creative scenes.
- **Global reach, local fairness**: creators can sell globally at a fair global price while optionally offering local pricing that respects their home community and currency.
- **Flagship experiences lead the system**: 44 should use major releases to prove new capabilities, then productize those capabilities for other creators.

Version 1.0 should establish the correct foundation: Store, Library, profiles, Community, Studio publishing, global/local pricing groundwork, music achievements, Overachiever Bonus Content, and a visual/technical system that can grow into future interactive releases.

---

## 3. Launch Journeys

Important launch journeys:

- **Fan journey**: discover work in Store, add it to Library, follow the creator, read creator updates, unlock achievements, discuss it in Community, and come back as the release evolves.
- **Early creator journey**: join Community, ask practical questions, learn how publishing works, find collaborators, build confidence, publish a first release, then use updates and Library features to keep improving it.
- **Working creator journey**: publish music/books/sample packs/merch, configure fair global/local pricing, add music achievements/bonus content where supported, post updates, interact with fans, and track catalog health in Studio.
- **Collaborator journey**: find people through Community questions/collaboration, profiles, posts, and eventually Services/Projects.
- **Flagship release journey**: experience a 44 release that demonstrates achievements, bonus content, behind-the-scenes material, Library memory, and eventually interactive 3D/Unity/WebGL unlocks.

Creator-fan distance should be low:

- Creator profiles connect posts, releases, Library items, updates, and future services.
- Creator profiles and Item pages should act as cross-platform hubs. Creators may link their Spotify, Apple Music, Bandcamp, YouTube, Instagram, X, website, and other approved destinations; releases may link directly to their corresponding listening pages. These links extend creator reach and must use the existing structured external-link tables.
- Store item pages explain the release and acquisition.
- Library item pages show the deeper relationship: owned status, play/read/download, achievements, updates, bonus content, and future Launch actions.
- Creator Updates are the 44OS version of patch notes, release notes, dev logs, and album/project updates.
- Community is where fans and creators talk, ask, answer, collaborate, and build scenes without algorithmic pressure.

---

## 4. Achievement Foundation

V1.0 ships music achievements only.

The v1 music achievement set is:

- Front to Back
- No Skips
- Nightbird
- Heavy Rotation
- Joined the Orbit
- Left Your Mark
- Signal Boost
- Overachiever

Rules:

- `First Wave` is removed from v1 because time-limited achievements can permanently block Overachiever for late listeners.
- Book achievements are removed/hidden until the reader experience and trigger model are real.
- Creators do not hand-edit achievement text or artwork during v1.
- Bonus Content is the only v1 release extra and can unlock from Overachiever.
- Existing user unlocks must be preserved during any migration.

Current code state:

- `src/lib/achievementCatalog.ts` filters Library display/tracking to the eight v1 music codes.
- `src/components/StudioReleaseFeatures.tsx` exposes a music-only Achievements section: one master switch, independently selectable v1 templates with no minimum count, plus optional Overachiever Bonus Content. `DashboardReleaseFeatures.tsx` remains only as a compatibility export.
- Bonus Content is optional during testing and launch preparation. Achievements save without a bonus upload; Overachiever records a final reward only when both a bonus title and file are present.
- Studio create/edit pages show release achievements only for music.
- Studio music create/edit pages do not collect release descriptions. M15 Books and Sample Packs use the canonical Item `long_description` field for creator-written Store context; no parallel description storage exists.
- The reviewed achievement and launch-foundation schema is captured in the canonical `supabase/migrations/20260712010000_44os_item_baseline.sql`.

The linked Supabase project backing the live tester deployment is aligned with the repository through migration `20260712061000_m15_sample_pack_category_language.sql`. Profile headers are retired, existing music achievements are enabled without requiring Bonus Content, `item_play_events` is the append-only creator analytics source for validated playback starts across Store, Library, and Radio, creator Item removal is server-authoritative archival rather than hard deletion, protected downloads use entitlement-authorized private storage with short-lived signed URLs, and creator/Item external links use validated owner-managed RPCs. Backups remain deliberately deferred with the payment-era operational package by product decision; migrations still require reviewed repository SQL, a linked dry-run, local replay/security gates, and post-apply history verification. Never make untracked dashboard-only schema changes.

M14 Cross-Platform Reach is deployed in migration `20260712057200_m14_cross_platform_reach.sql`. It extends the existing `profile_external_links` and `item_external_links` tables with a reviewed platform registry, official-host/HTTPS validation, one-link-per-platform uniqueness, ordered atomic owner sync RPCs, creator approval for profile management, and Item ownership for release management. The registry is migration/service extensible; creators can save only active approved destinations. Remote migration history and an anonymous live RPC probe confirm the migration is present and unauthenticated mutation is denied.

M15 Native Content Experiences is deployed in migrations `20260712058000_m15_native_books_and_sample_packs.sql`, `20260712059000_m15_reader_bookmarks.sql`, and `20260712060000_m15_native_description_edits.sql`. Books are PDF-only for this release: a protected full PDF asset powers the entitled Library reader and an optional separate public sample PDF powers Store preview. Reading page, progress percentage, appearance, and bookmarks synchronize server-side; read access, bookmark mutation, and protected retrieval require an active `read` entitlement or Item-management authority. Sample Packs retain a protected ZIP as the durable Library download and may expose ordered public audio previews with waveform metadata plus optional protected individual sample assets. Preview playback uses the one shared 44OS music player rather than a second audio engine. Free Library acquisition grants the required `read` or `download` entitlement while preserving existing Library rows, Item IDs, assets, and entitlement audit history. EPUB, protected offline caching, and archive extraction are not active formats.

M15 Studio reliability follow-up keeps in-progress add/edit form values in versioned, account-and-Item-scoped browser storage and restores them after a refresh or mobile app switch. This is device-local form recovery, not a catalog Draft/publication state; successful save, intentional Cancel, or Item removal clears it. Auth token refreshes are keyed by stable user ID so window focus cannot rehydrate stale server values over unsaved edits. Public sample audio paths commit immediately after storage succeeds, with later waveform analysis merged through functional state updates. The PDF reader pins the mature PDF.js 4.10 compatibility line and loads its legacy-compatible client and worker; PDF.js 6 is intentionally excluded because its newer runtime assumptions fail on current deployed Safari/iOS devices.

M15 closes with migration `20260712061000_m15_sample_pack_category_language.sql`. The former public Assets category is renamed in place to Sample Packs with canonical Store/Library URLs `/store/sample-packs` and `/library/sample-packs`; old Assets URLs are permanent compatibility redirects. Stable internal `experience_type = 'asset'`, generic `item_assets`, storage paths, Item/category UUIDs, Library rows, entitlements, and history remain unchanged. The reader toolbar uses the active 44OS opaque paper/ink theme, a read-only `current of total` count, circular bookmark/navigation/zoom controls, title-only desktop identity, and an explicit return path to the exact Library Item page that opened it.

M16 separates creator Events and the Community Calendar from later Radio programming. Creator events are source-owned records with a creator owner, title, short description, `in_person`/`online`/`hybrid` format, timezone-aware start and optional end, optional venue/address, optional online destination, optional ticket/information URL, and explicit cancellation state. Required fields vary by format and URLs are validated server-side. Creators manage only their own events; 44 admins retain moderation authority. Times are stored as UTC instants plus an IANA timezone so Calendar and profile displays survive daylight-saving and cross-region use.

Calendar is an aggregate read model, never an independently writable content source. Its first launch feed combines creator events with optional upcoming Item release dates while preserving each source record as the authority; adding a calendar date must not silently change Item publication state. Future approved Radio schedule entries may join the same read contract, but Radio submissions, review, media, programming blocks, and scheduling remain a separate later milestone. Do not create a writable polymorphic `calendar_entries` table or couple the current Radio player to an unfinished schedule workflow. The v1 Radio experience remains unchanged until that milestone is approved.

Trusted-testing Studio saves re-run the server publication validator after all Item children are synchronized. A valid Item caught in the internal creation state becomes public automatically; creators still never receive a Draft/Published control.

---

## 5. Stack And Workflow

- App: Next.js App Router, React 19, TypeScript strict mode.
- Styling: custom CSS in `src/app/globals.css` with `--os-*` tokens.
- Backend: Supabase via `@supabase/supabase-js`.
- Deployment: Vercel, canonical domain `https://44os.com`.
- Local scripts: `npm run dev`, `npm run lint`, `npm run build`, `npm run start`.
- Shell entry: `src/app/layout.tsx`.
- App registry: `src/lib/osApps.ts`.
- Store/category route helpers: `src/lib/experience.ts` and category helpers in `src/lib/storeRoutes.ts`.
- Library routes: `src/lib/libraryRoutes.ts`.

Quality gates for production-facing work:

- `npm run lint` must pass with zero errors and zero warnings.
- `npm run build` must pass.
- `npm run dev` should start without Turbopack root warnings.
- Route and auth changes require manual browser QA at desktop and mobile widths.
- Mobile launch QA targets 390px and 430px widths and must include normal Safari plus an iOS home-screen installation.
- Performance work must remove request fan-out before adding caches. Shared session state is subscribed once per app runtime; repeated cards must not independently call `getSession()` or query ownership one row at a time.
- `Other/44OS_OPERATIONS.md` owns deployment, health, incident, restoration, and secret-rotation runbooks. `npm run test:smoke` is the executable anonymous launch check and `/api/health` is the bounded application/Supabase readiness endpoint.
- `npm run test:schema-replay` rebuilds a disposable local Supabase database from repository migrations without seed data. It is the required migration-chain replay gate and must never target linked staging or production. The launch smoke also enforces one-hop canonical redirects, hidden reviewed-surface isolation, health response semantics, core security headers, English/title/main/zoom-safe document basics, a 5-second response ceiling, and a 2 MB HTML ceiling; thresholds may be tightened through environment variables as measured budgets mature.
- `npm run test:security` executes transactional pgTAP role and publishing journeys against local Supabase. Its anonymous, member, creator, and admin fixtures always roll back; linked execution is prohibited. `src/instrumentation.ts` is the provider-neutral server error contract: it records release/runtime/route context and sanitized error identity while excluding headers, query values, user content, and tokens.

---

## 6. Shell Architecture

44OS is a persistent operating-system shell. Only the workspace content changes between apps.

Core shell files:

- `src/app/layout.tsx`: providers, theme bootstrap, shell, Dock, Topbar, workspace, and music player.
- `src/components/Sidebar.tsx`: Dock rendering and app launch behavior.
- `src/components/Topbar.tsx` and `src/components/TopbarContext.tsx`: topbar tabs, back labels, cart, notifications, and account menu.
- `src/components/MusicPlayer.tsx`: persistent music player provider and bar.
- `src/components/SystemShell.tsx`: global shell behavior.
- `src/components/ContextMenu.tsx`: shared right-click menu primitive.

Playback reliability rules:

- The shared DOM audio element is the only playback engine. A user action must not start competing `load()`/`play()` paths.
- Media source comparisons normalize URLs before deciding to reload; WebKit-normalized public URLs must not create false source changes.
- Standard queues persist locally and restore only after storage hydration. Live Radio queues do not persist because they must be reloaded from the canonical playlist and resynchronized to the current live offset.
- Returning from a long background suspension, BFCache restore, or offline transition marks the source for a one-time refresh on the next play action. Recovery preserves the standard-track position where possible.
- Radio reloads its bundle when the app becomes visible and when the page is restored. Missing legacy track durations are inferred from audio metadata; new Studio audio uploads capture duration at upload time.
- iOS/PWA QA must cover first play, pause/resume, background/foreground, reopen after a terminated session, offline/reconnect, queue advance, last-track behavior, Radio stop/resume, and Media Session controls.

Mobile/PWA runtime rules:

- `/` is the branded 44OS public front door and PWA start URL. It renders the discovery catalog directly without redirecting or showing `Store` as the page identity.
- `/store` remains the explicit catalog route and may retain Store-specific title and metadata.
- The manifest uses standalone display, portrait orientation, maskable artwork, dark launch colors, and scope `/`.
- Audio and Supabase API responses must never be blindly cached by a service worker. Any offline/runtime cache must be allow-listed to app-shell static assets and versioned so a new deployment cannot strand an installed iOS app on stale code.
- Returning through `pageshow`, BFCache, visibility changes, or reconnect must revalidate time-sensitive state without duplicating listeners or requests.
- Safe areas, the mobile Topbar, player, and Dock are structural layout inputs; pages must not hardcode viewport offsets independently.

Navigation rules:

- `src/lib/osApps.ts` is the single source of truth for Dock apps.
- The Dock, Dock settings, route ownership, app labels, archived app descriptions, and app visibility derive from the registry.
- Dock child routes may define `iconClass`, but desktop and mobile dropdowns render text-only child rows aligned under the parent label axis.
- `getActiveOSAppId(pathname)` must map every route to exactly one owning app.
- Desktop Search is a topbar control immediately left of Notifications. Mobile Search is a fixed bottom-Dock destination and is the preferred mobile search entry point.
- Notifications are a topbar control, not a Dock app.
- Signed-out users see public destinations only.

Current Dock order:

- Signed in desktop: Library, divider, Home (`/`), Radio, Community, spacer, Support, divider, Settings.
- Signed out desktop: Home (`/`), Radio, Community, spacer, Support, Log In.
- Mobile: Home (`/`), Library, Radio, Community, Search.

Library and Settings are signed-in desktop Dock destinations. Library sits alone at the top of the signed-in desktop Dock. Studio does not appear in the Dock; creators enter through `Open Studio` on their own profile or the account menu. Inbox and Profile remain account-level surfaces. Support sits directly above the Settings divider on desktop. On mobile, Search replaces Settings in the Dock, and Settings is available from the avatar/account menu.

Current topbar/account behavior:

- Mobile top-left shows the 44 logo linking to `/`; contextual detail pages show a circular back button immediately beside it.
- Signed-out mobile top-right shows a default profile icon linking to `/login`.
- Signed-in account menu order is Profile, Inbox, Studio; mobile additionally shows Settings and hides Log Out.
- The user-facing account label is Inbox, not Messages.

---

## 7. Canonical Routes

Canonical public routes:

- `/` - branded 44OS discovery front door. It shares the catalog data and sections used by Store but presents 44OS—not Store—as the document/page identity.
- `/store` - Store front door.
- `/store/[category]` - Store category: music, books, sample-packs, merch.
- `/store/item/[identifier]` - Store item detail. Resolve by slug first where available; id fallback is supported.
- `/cart` and `/checkout` - acquisition flow.
- `/community` - Community front door.
- `/community` - Community posts with an All Posts / Following filter.
- `/community/questions` and `/community/collaboration` - dedicated Community views.
- `/radio` - Radio.
- `/support` - Support.
- `/search` - Search.
- `/login` - authentication.
- `/notifications` - signed-in notification center launched from the topbar.

Canonical signed-in routes:

- `/library` - Library front door.
- `/library/[category]` - Library category.
- `/library/item/[id]` - owned Library item detail using `library_entries.id`.
- `/profile` and `/profile/[username]` - profile surfaces.
- `/inbox` - signed-in direct-message inbox, surfaced through the account menu.
- `/studio` and Studio subroutes - creator workspace.
- `/settings` - Settings entry. The page is sectioned into Account, Notifications, Region, and Appearance; legacy `?tab=` links are compatibility anchors only.

Compatibility and legacy policy:

- `/` does not redirect. Links shared from the root stay at `https://44os.com/` and use branded 44OS metadata.
- `/browse`, `/browse/[category]`, and `/browse/item/[identifier]` redirect to Store equivalents.
- `/product/[id]` resolves as a compatibility hop to `/store/item/[identifier]`.
- `/collection` redirects to `/library`; `/collection/item/[kind]/[id]` redirects to `/library/item/[id]`.
- `/music`, `/books`, `/assets`, `/merch`, `/shop`, and old typed `/discover` paths redirect to Store categories.
- `/studio` is the canonical creator-management route tree. `/dashboard` and every nested Dashboard URL are permanent compatibility redirects to the corresponding Studio path; no Dashboard page implementation may be reintroduced.
- Application pages and UI components consume typed domain services for platform data. Direct Supabase table/RPC calls belong in `src/lib/domain` or a narrowly scoped infrastructure module, not in routes, cards, or forms.
- `/library/item/[kind]/[id]` remains as a legacy compatibility route and redirects to `/library/item/[id]`.
- `/dashboard` and dashboard subroutes redirect to Studio equivalents.
- `/community/following` redirects to `/community?filter=following`.
- `/community/thread/[id-or-slug]` is the canonical regular post detail page. Community feed rows and reply-count affordances should navigate there instead of expanding inline reply drawers on `/community`.
- Removed Resources and Services/Projects URLs intentionally return not found; they are not compatibility surfaces.
- Compatibility redirects are centralized in `next.config.ts` and resolve directly to one canonical destination. Obsolete React implementations under legacy Music, Books, Assets, Merch, Browse, Collection, Product, Community-profile, Home, and Studio-prototype trees were removed in M13. `/studio` is the only catalog list and post-save return surface; the two `/studio/products` editor routes remain canonical.
- Do not add vanity redirects unless there is a real public link to preserve.

---

## 8. Supabase Contract

Supabase is the staging source of auth, user, catalog, community, messaging, and commerce state until public launch. Treat it carefully, but optimize for settling the correct foundation before testers return.

The approved destination treats `catalog_items.id` as the permanent Item identity shared by Store, Library, and Community. Existing `products.id` values are preserved during the migration. The additive migration path, typed content spine, capability registry, entitlement separation, and retirement sequence are owned by `44OS_MILESTONES.md`. Current tables remain valid until their milestone cutover is verified; documentation of the destination does not authorize skipping preservation or rollback steps.

Item lifecycle is `draft` → `published` → `archived`. A creator may move an active Item between draft and published, but removal calls the authenticated `archive_owned_item` operation. Archival hides the Item and all offers from Store and active Studio views while retaining its permanent ID, Library relationships, entitlements, `entitlement_events`, tracks, achievements, protected assets, and creator updates for authorized Library users. Direct anonymous/authenticated deletion is revoked, and archived Items cannot be republished through normal creator updates. Service-role hard deletion is emergency maintenance only and must never be used as a creator workflow.

Current access and commerce stance:

- Public listening is a catalog capability, not a subscription entitlement. Music may remain fully streamable without being saved or purchased.
- `Listen` is free and requires neither a purchase nor a Library relationship.
- `Add to Library` is a free save for returning, organization, progress, achievements, and creator updates, backed by a zero-cost `library_access` offer and server-issued entitlement.
- A downloadable copy is a separate `digital_download` offer; physical editions use `physical_purchase`. Their prices and activation do not change whether an Item can be streamed or saved.
- `Buy Download` is an optional creator-supporting downloadable copy. `Buy Physical` covers vinyl, cassette, apparel, books, and other physical editions.
- Music discovery pages are price-neutral. Price belongs to the optional purchase step, where the user can understand exactly what they are buying; it never implies that listening or saving requires payment.
- Download and physical offers remain draft-only until M11 approves the seller, fee, tax, payout, refund, fulfillment, currency, and provider model. No placeholder card form may create a paid order or entitlement.
- The provisional M11 direction is Stripe for customer payment collection and PayPal for creator payouts, with 44 provisionally acting as seller. This is infrastructure guidance, not final legal/accounting approval; unresolved decisions are recorded in `Other/M11_PROVISIONAL_PAYMENT_MODEL.md`.
- Checkout and payouts remain disabled. Provider credentials alone must never activate commerce: `commerce_runtime_controls` requires explicit operating-model approval and keeps every switch false by default.
- Creator earnings, payout batches/items, signed provider events, and reconciliation runs use private server-authoritative ledgers. PayPal eligibility is verified per creator rather than inferred from a country list.

Current publishing phase is `trusted_testing`: only the approved creator/admin role list may create or mutate Items, but those trusted testers publish and edit their own releases directly so testing can cover pricing, tracks, achievements, artwork, files, and removal without an unattended approval queue. Studio does not expose Draft/Published toggles. The later submission-review launch gate must use pending revisions, preserve the last approved public version, notify 44 admins, and be explicitly enabled through reviewed runtime controls only after that workflow is complete.

Rules:

- For schema and content inspection, the linked live Supabase project is the source of truth. Future chats should query it read-only with the Supabase CLI or public API before making claims about tables, columns, policies, storage objects, or catalog rows.
- `supabase/migrations/20260712010000_44os_item_baseline.sql` is the canonical replayable starting point. Every later schema change must be a new timestamped migration; do not edit the baseline after it has been adopted.
- Do not add ad-hoc SQL probes, exports, or schema snapshots to the repository. Temporary read-only queries belong in the CLI, and disposable backups remain outside tracked source.
- Do not run Supabase schema or data changes without a current backup and a reviewed repo migration.
- Prefer normal Supabase migrations, dry runs, then `supabase db push` from the linked project.
- Never rename live tables casually.
- UI language can change without database table renames.
- Destructive migrations require backup, rollback notes, and explicit approval.

Current concept-to-table map:

- Canonical Items: `catalog_items`. `status` is the publication lifecycle and `experience_type` controls runtime behavior. The UI calls the acquisition surface Store; Library views point to the same canonical Item row.
- Item category lookup: `item_categories`, referenced by `catalog_items.item_category_id`.
- Creator profiles and public member profiles: `profiles`.
- Music tracks: `tracks`, attached by `item_id`.
- Files, galleries, and release feature unlocks: `item_assets`.
- User Library relationship: `library_entries` with `item_id`. Entitlements are the authority for access/acquisition; the Library entry owns display state.
- Offers and access: `catalog_offers` represents a free or paid option without changing Item identity; `offer_entitlements` declares the rights it grants. `entitlements` is the server-authoritative access record and `entitlement_events` is its immutable grant/revoke audit trail. `library_entries` owns only visibility and organization.
- Commerce ledger: `commerce_orders`, `commerce_order_items`, `commerce_order_addresses`, `payment_attempts`, and `payment_events`. Provider IDs are adapters around this ledger rather than platform identity. Pre-M5 client-authored merch history is explicitly `legacy_unverified`, never silently treated as verified payment.
- Reviews: canonical `content_entries` rows of type `review`, attached by `item_id`, with constrained payloads in `content_review_details`.
- Creator updates: canonical `content_entries` rows of type `creator_update`, attached by `item_id`, with constrained payloads in `content_update_details`.
- Achievements: `achievement_templates` 44-defined catalog plus `item_achievements`, `user_achievements`, `achievement_events`, `achievement_progress`, and validated `achievement_playback_signals`. Unlock evaluation and reward grants are server-authoritative; clients submit bounded evidence rather than writing achievement state.
- Item capabilities and collaborators: `item_capabilities` and `item_members`; structured outbound links use `item_external_links` and `profile_external_links`.
- Release features: achievements first, with optional `item_assets` unlocks such as `bonus_content`; future features include `commentary_audio` and `behind_the_scenes`.
- Points foundation: `user_points_ledger`.
- Community identity and lifecycle: `content_entries`, with shared `content_replies`, `content_entry_reactions`, and `content_reply_reactions`. Typed payloads use `content_question_details`, `content_collaboration_details`, `content_review_details`, and `content_update_details`. A nullable `content_entries.item_id` distinguishes platform-wide content from content attached to a canonical Item. UI-specific `community_*_content` views are stable read contracts over this spine. The former posts/questions/collaborations/reviews/updates tables are temporary compatibility sources during the post-cutover verification period, not foundations for new work.
- Messaging: `conversations`, `conversation_members`, `messages`.
- Direct conversation creation and message sending use authenticated security-definer RPCs so conversation rows, both memberships, the message, and thread timestamp are written atomically without an RLS ordering gap.
- Future services placeholder: `services` and `service_categories` are private and dormant. When services return, migrate them into canonical Item rows with service fulfillment instead of restoring a parallel commerce system.
- Resources were replaced by Community Questions. The old resource tables and app routes are removed.
- Radio queue: `radio_playlist_entries` references canonical Item `tracks` directly.
- Creator events: M16 adds creator-owned event records and exposes them through a server-authoritative aggregate Calendar read contract alongside optional Item release dates. Calendar is not a writable source table.
- Future Radio programming: use a separate submission/review/schedule lifecycle for pre-recorded programs; only approved scheduled entries may later appear in the aggregate Calendar. It must not reuse creator-event ownership or alter the v1 Radio queue prematurely.
- Theme mode and accent are stored only in the narrowly scoped `user_theme_preferences` table. Signed-out visitors always use dark mode with the Ocean accent; signed-in accounts load and save their theme through Supabase for cross-device consistency.
- Notification content is synthesized from `achievement_events`; per-account seen and dismissed IDs persist in `user_notification_state` so the notification dot and dismissals survive sign-out, PWA/browser restarts, and device changes.
- Removed speculative systems: generic categories, post categories, item/product components, product relations, generic unlockables, Library activity, unused Radio scheduling tables, and empty preference/icon registries.

Known Supabase state from the launch cleanup:

- Migration history is aligned locally and remotely through `20260712052700`.
- The typed Community spine is applied in `20260712020000_typed_community_content_spine.sql`; application queries no longer target the legacy Community content tables.
- `20260712025000_add_missing_tracks_to_radio.sql` brings Radio to one active entry for every existing track: 248 tracks, 248 entries, zero missing, zero duplicates.
- `20260712030000_m5_provider_neutral_commerce.sql` separates public access, offers, orders, payment processing, entitlements, and Library presentation. Current free Library behavior is active; download and physical offers remain drafts until the operating model and verified provider are approved.
- `20260712040000_m5_trusted_achievements_and_assets.sql` makes achievement evaluation and reward grants server-authoritative, protects asset locations behind entitlement-aware manifests, prohibits public download URLs, and disables legacy client-authored merchandise orders. M5 is complete; paid checkout remains deliberately disabled until M11.
- `20260712050000_m7_catalog_discovery_truth.sql` removes false inherited streaming capabilities from non-music Items and false download capabilities from physical merch without a downloadable asset or digital offer.
- `20260712051000_m7_normalized_browse_taxonomy.sql` makes Browse Types/Tags Supabase-managed, adds normalized Item assignments, seeds launch Types, and preserves existing Item relationships through backfill.
- `20260712052000_m7_category_type_tag_foundation.sql` establishes the permanent Category → Type → Tags model: immutable system Categories, admin-managed `item_types` and approved `item_tags`, one Type assignment per Item, and any number of approved Tag assignments. `20260712052100_m7_seed_asset_item_types.sql` completes the initial Assets Type seed after the legacy singular/plural vocabulary conversion.
- `20260712052200_m7_retire_legacy_taxonomy.sql` corrects two ambiguous Single backfills and deletes the superseded combined taxonomy tables. Browse and Studio no longer read or write the deprecated free-form Item `tags` metadata.
- `20260712052300_m7_seed_music_genre_tags.sql` seeds the controlled Music Tag vocabulary with 32 current Apple Music-aligned genre choices. These Tags apply across every Music Type and remain admin-editable.
- `20260712052700_m10_permanent_item_lifecycle.sql` revokes creator hard deletion, adds the ownership-checked archival operation, archives Item offers atomically, blocks stale republishing, and preserves entitlement-aware read access to archived Library Items and their content.
- `20260712053000_m10_curated_publishing_boundary.sql` makes profile roles approval-managed, limits Item creation and mutation to creator/admin accounts, moves publication to an ownership-checked validation RPC, exposes read-only catalog-health findings, and scopes upload mutation to the owning account. Fan registration, profile editing, and Community participation remain available as before.
- `20260712053100_m10_catalog_health_reporting.sql` provides one bounded authenticated Studio health result set across the caller's active Items; Studio shows issue counts without row-by-row request fan-out.
- `20260712053200_m10_studio_child_write_boundary.sql` makes approval revocation apply consistently to tracks, assets, taxonomy, capabilities, collaborators, offers, links, and achievement configuration. Achievement unlocks and entitlements remain server-issued.
- `20260712053300_m10_rpc_execute_boundary.sql` removes Supabase's direct default anonymous execute grants from M10 health, publication, role, and approval functions.
- `20260712054000_m8_private_item_files_foundation.sql` creates the private `item-files` bucket and binds object reads to the matching `item_assets` row plus server-issued download, bonus, Library, or manager authority.
- `20260712054100_m8_private_book_asset_cutover.sql` moves the two existing book assets to verified private paths and preserves their existing Library access as explicit audited download entitlements.
- `20260712054200_m8_trusted_achievement_edges.sql` removes direct execution of internal achievement grant helpers, makes Signal Boost require a distinct authenticated visitor, and rejects public locations for all future downloadable or bonus assets.
- `20260712054300_m8_achievement_evaluator_cast.sql` removes the evaluator's unsafe implicit UUID-array cast; linked schema lint is clean.
- `20260712054400_safe_studio_release_edits.sql` makes music feature edits preserve permanent achievement row IDs and every earned unlock; normal decimal price entry and existing-release price persistence are verified.
- `20260712055000_m9_moderation_reporting_rate_limits.sql` adds report/audit records, administrator moderation resolution, author-immutable moderation state, and database-triggered entry/reply/reaction rate limits.
- `20260712055100_m9_creator_updates.sql` adds atomic ownership-checked Creator Update publishing for active Items.
- `20260712055200_m9_typed_content_integrity.sql` enforces typed detail rows, reply-type/parent integrity, bounded content lengths, and published-Item scope at transaction commit.
- The prior incremental migration chain was consolidated into `20260712010000_44os_item_baseline.sql`. Its historical files remain available in Git history, but they are no longer active replay inputs.
- The baseline includes the complete public schema, RLS, functions, triggers, auth profile hook, public storage buckets and policies, Item vocabulary, capabilities, membership, external links, and curated role mapping.
- A clean local Supabase reset replays the baseline without a live snapshot, and a public-schema comparison against linked staging is empty.
- `supabase/backups/` is ignored and should contain only a deliberately created, short-lived safety backup for an imminent database write.
- The July 11 post-cutover probes verified 49 Items, 248 tracks, 32 Library entries, 14 profiles, 49 Item owners, 213 capability registrations, 5 Item categories, 24 posts, 248 Radio playlist entries, and 8 achievement templates.
- The canonical track ordering column is `tracks.number`; `tracks.track_number` is absent in the live schema and should not be selected by app code.
- Public Store discovery and creator-profile Music/Books tabs sort by release year descending, then creator profile name ascending. Studio release management is intentionally independent and sorts by `created_at` descending (order added).
- Browse discovery uses Category, Type, Tags, Features, Price, and text filters over the complete published catalog. Selecting a Category reveals its used Types and approved Tags; Tags can be selected without narrowing to a Type. Empty Categories, Types, and Tags do not appear in the filter.
- The system-owned Category rows in `item_categories` are Music, Books, Games, Merch, and Sample Packs; application migrations own them and administrators must not edit them. The Sample Packs row retains the former Assets category UUID while its canonical slug is `sample-packs`. `item_types` is the admin-managed list of Types scoped to a Category. `item_tags` is the admin-managed allow-list of Tags scoped to a Category and optionally a Type. `item_type_assignments` gives each Item one Type; `item_tag_assignments` gives it zero or more approved Tags. Studio and Browse both read this same model. The superseded `catalog_taxonomy_terms` and `item_taxonomy_terms` tables have been deleted.
- Browse shelves are transparent and rule-based: `Featured` contains at most four explicitly featured Items; `Creators You Follow` appears only when it has results; each nonempty Category receives a `New Releases in …` shelf of at most eight Items ordered by the documented public catalog order. `View All` applies that Category in the existing Browse filter instead of creating another page. Engagement is never an undisclosed ranking input.
- Initial Types are Music—Album, EP, Single, Mixtape, Live Set; Books—Novel, Artbook, Zine; Merch—Apparel, Accessories, Physical Music, Goods & Collectibles; Sample Packs—Sample Packs. The former Remix Packs and Game Assets rows are retained but inactive. Tags are the guarded third level for genre/style/use, such as Electronic or Hoodies, and creators cannot enter arbitrary public Tags.
- Music and Sample Packs use square catalog artwork, Books use 2:3 covers, and physical Merch uses 3:4 product artwork. Library keeps separate Music, Books, and Sample Packs grid bands so portrait Books begin below square Music.
- Anonymous access to the dormant `services` table returns zero rows; its data remains available only through admin/service-role access.
- `supabase db push --linked --dry-run` reports the remote database is up to date.

Auth redirect target:

- Production Site URL: `https://44os.com`.
- Local development: `http://localhost:3000` and `http://127.0.0.1:3000`.
- Vercel previews: controlled preview allow-list or wildcard pattern.
- Account creation collects display name, username, email, and password. The auth-user trigger persists the submitted public identity in `profiles`.
- New accounts with an immediate session go directly to `/profile`. When email confirmation is required, the confirmation and resend links return to `/profile`.
- Avatar and bio are optional profile enhancements; the retired profile-cover/header field is not part of the identity contract. Community identity requires only the display name and username collected at sign-up; incomplete legacy accounts redirect directly to `/profile` without an intermediate dialog.
- Desktop deep links: plan later with a `44os://` scheme if the Tauri shell needs native auth return.

---

## 9. Deployment And Desktop

Web excellence comes first. The current app should remain a full Next.js/Vercel application for v1.

Desktop strategy:

- Use Tauri remote shell first.
- Wrap the production web app rather than forcing a static export.
- Validate login, password reset, magic links, audio, downloads, uploads, external links, and native window sizing.
- Do not pursue offline/static desktop behavior until the web foundation is clean.

Vercel/domain target:

- `https://44os.com` serves the app.
- `https://www.44os.com` redirects to apex.
- `http://44os.com` redirects to HTTPS.
- Production route behavior must match the canonical route table above.

Search and sharing contract:

- Root metadata title is `44OS`; the description explains the whole platform rather than only Store.
- Canonicals and Open Graph URLs must match the requested canonical route. Root sharing must resolve to `/`, never `/store`.
- Public item and profile pages use their own server-generated metadata and real artwork where available.
- `robots.txt` and `sitemap.xml` are generated by the app. Private/account surfaces are not promoted as crawl targets.
- Metadata, icons, manifest, and launch artwork must be served without authentication or client-side redirects.

---

## 10. Maintenance Rules

- Keep the three active `/Other` handoff docs current: this Foundation document, `44OS_UI.md`, and `44OS_MILESTONES.md`.
- Keep Dock app behavior centralized in `src/lib/osApps.ts`.
- Keep Store category/detail behavior centralized in route helpers.
- Keep public catalog ordering centralized in `comparePublicCatalogItems`; the old `comparePublicCatalogProducts` export is temporary compatibility only.
- Keep Library ownership behavior centralized in Library primitives and route helpers.
- Add shared UI primitives before adding page-specific styling.
- Avoid one-off inline styles unless the value is genuinely dynamic.
- Glass is anchored by the unified `.app-shell`. Menus, popovers, filters, modals, and true cards remain solid/readable; reviewed desktop content lists may be theme-through and mobile uses its own flat full-width list treatment.
- Keep lint/build green before visual polish work is considered done.
