# 44OS Foundation

This document is the architectural and operational source of truth for 44OS. It describes how the live system works now. It is not a project diary.

The complete repository handoff is intentionally limited to four files in `Other/`:

- `44OS_FOUNDATION.md` — product, architecture, data, security, providers, and operations.
- `44OS_UI.md` — web-application visual, interaction, responsive, and accessibility rules.
- `44OS_IOS.md` — native iOS product, SwiftUI architecture, design translation, and device acceptance rules.
- `44OS_MILESTONES.md` — only current work and its completion criteria.

Read Foundation, then UI, then iOS, then Milestones before making production-facing or native-application changes. Web-only work may use UI without treating iOS rules as web implementation requirements. Read `content/team/44OS_HANDBOOK.md` when work touches company identity, language, Team practices, Support, or developer presentation. The Handbook remains the authenticated Team source used by the live application; it is not an `Other/` handoff file. When a decision changes, update every affected source in the same change. Do not recreate other retired proposal, research, setup, or runbook documents.

## Current production baseline

Recorded August 7, 2026:

- `https://44os.com` is the permanent light editorial front door, `https://www.44os.com` permanently redirects to it, and `https://app.44os.com` is the canonical application origin. All three hosts use the same GitHub-backed Vercel project and release.
- Legacy apex application paths permanently redirect to the identical path and query on `app.44os.com`. Apex `/api/*` remains a non-public compatibility surface for delayed provider delivery and rollback; it is never redirected. Both host health checks pass against Supabase.
- The app is Next.js 16.2.11 App Router with React 19 and strict TypeScript. Supabase owns authentication and application data; Vercel hosts the app. Deterministic PostCSS `8.5.26`, DOMPurify `3.4.13`, Undici `7.29.0`, and Sharp `0.35.3` overrides keep the production dependency tree free of known npm advisories without raising the supported Node boundary.
- Linked Supabase history contains the reviewed forward migration chain through `20260722020000_expand_home_featured_to_eight.sql`, including Admin content sorting and the Team workspace foundation immediately before it. Never rewrite an applied migration; add a reviewed forward migration.
- The private Team workspace is production truth. Admins inherit access, `@spiiriit` retains a Creator role with an additional Team grant, and `@ojdagod` retains a Member role with an additional Team grant. Both grants have immutable reasons and queued email plus in-app notices.
- The latest recorded full database gate passed clean replay, linked lint, and 33 pgTAP files with 709 assertions. Lint, strict typecheck, dependency audit, production build, launch smoke, UI cleanup, mobile safe-area, analytics, commerce, email, hardening, Team, domain, and experience contracts plus `git diff --check` also passed for the recorded release.
- Public Member signup and eligible purchase presentation are enabled. Creator promotion, paid-sale eligibility, fulfillment confirmation, and payout eligibility remain server-authoritative.
- Two controlled low-value digital orders completed the live payment/refund path. The latest Admin reconciliation checked both orders with zero mismatches. Refunded access was revoked without deleting order or Library history.
- All eight launch Merch Items are synchronized, imaged, reviewed, and published: 44 T-Shirt, Sweatshirt, Hoodie, Windbreaker, Beanie, Hat, Bag, and Satchel. Legacy 44 Tote was removed after dependency checks.
- Printful catalog import, quotes, and non-charging draft creation are enabled. Signed webhooks are configured. 44OS has no provider-confirmation action; the owner confirms manufacturing only inside Printful.
- Hosted Supabase Auth mail and application transactional mail are live through Resend. `support@44os.com` is the monitored iCloud mailbox. Support web intake, newsletter synchronization, and newsletter delivery remain off.
- Consent-gated analytics code is deployed but inert because no production Google measurement ID is configured.
- Signed-out Account renders the same progressive email-first authentication experience as `/login` directly inside `/you`; no intermediate Log In action is required. The shared component owns account discovery, password login, magic link, recovery, signup, confirmation, and resend behavior.
- New signup sessions and confirmation links enter `/welcome`, an editorial first-run guide that selects concise Member or Creator content from server-readable account state. Requesting Creator setup does not promote the account or bypass review: the profile can be prepared immediately, while Studio publishing remains locked behind the existing server-authoritative Creator approval boundary.
- Repeated catalog cards receive explicit ownership from one parent-level Library query. Search and related-item grids never issue per-card ownership requests, and Discover auxiliary capability/type/tag queries are limited to the bounded catalog IDs being hydrated.
- The Mac and Windows Tauri 2 remote-shell foundation exists under `src-tauri/` with the exact production origin `https://app.44os.com/`, a locked Rust graph, generated desktop icons, and security contracts. Its only native capability is an origin-bound notification bridge limited to checking/requesting permission and displaying new activity while the application is running; filesystem, shell, process, updater, and background-service access remain absent. macOS uses a slim transparent title bar over the 44OS background with a hidden redundant title and native traffic-light controls. The editorial Download page publishes the accepted versioned DMG and NSIS artifacts directly from `44os.com`, while optional server-only URL overrides allow a later move to an external release host without changing the page.
- The internal sanitized operational-error sink and Admin Errors view are active. Proven external alert delivery and distinct primary/backup responders are not yet assigned.
- Wise payout infrastructure exists but batching, operator recording, reconciliation, and payout execution remain disabled; the payout emergency stop remains on.
- Standard single-owner non-exclusive Beat licensing is part of the 1.2 launch boundary. Split or exclusive Beat sales, creator Merch, international physical shipping, automated Printful confirmation, and newsletters remain disabled or deferred. MASK by ØLSTEN is the first enabled desktop interactive Item; additional game publication remains Admin-managed.
- Production releases flow through GitHub `main` into the linked Vercel project. Direct Vercel rebuilds may apply a reviewed environment revision to the same GitHub commit, but source changes must still be committed and pushed through GitHub.
- A fully native 44OS iOS application is the active product build. Its Xcode project exists under `ios/44OS/`, targets iPhone on iOS 18 or later with bundle identifier `com.fortyfour.os44`, and has a SwiftUI five-destination shell plus unit/UI test targets. Its shared-platform boundary pins Supabase Swift `2.53.0`, isolates Auth, own-profile, published-catalog and public Item details, user-scoped Library, public Radio reads, Community reads/user-scoped actions, read-only platform Search, and conditional Account order visibility behind typed services, stores sessions in a namespaced Keychain entry, and forces automated UI runs onto offline test doubles. Native Home preserves Discover identity, canonical categories and shelves, public catalog ordering, artwork ratios, native loading/error states, full native Item-detail navigation, and a Music-only Recently Added rail; a bounded public live-catalog acceptance rendered production titles and artwork without a write. Native Item details preserve permanent identity, bounded public tracks and external links, same-creator related Items, native Share, and experience-specific informational states while omitting ownership, protected assets, pricing, and commerce until their separate gates are accepted. Native Library preserves signed-out and signed-in states, canonical grouping, Merch exclusion, title/creator search, category filters, saved/purchased/unlocked relationship meaning, and native Library Item previews without treating a Library row as current protected access. Native Radio establishes a shell-owned player state and single foreground `AVPlayer` engine, synchronized station position, and native Now Playing/Play/Stop composition; server-authoritative play events and advanced media lifecycle behavior remain unimplemented. Native Community preserves stable intent categories, canonical thread pages, Item references, hidden public Like totals, independent actions, native post/reply/report surfaces, and server-authoritative moderation boundaries; live authorization acceptance and the remaining advanced Community actions are still open. Native Account preserves the member identity hub, stable common destinations, conditional server-verifiable Orders visibility, Support safety language, country and appearance meaning, and Log Out without guessing Team access or activating deferred Studio. It shares the existing 44OS backend and permanent domain identity and treats the accepted mobile web UI as its product reference while using Apple-native layout and accessibility conventions. Live owner-account acceptance remains deferred; device archive, TestFlight, and App Store submission do not exist yet.
- Native Account Profile is a read-only owner utility behind a typed repository. It selects only the matching profile's bounded identity, bio, role/creator, publication, country, and external-link fields, rejects mismatched identity, uses native Share and localized country presentation, and has no profile, storage, or external-link write path. Editing, username validation, avatar upload, and link mutation remain separate live-acceptance work.
- Native in-app Notifications is an owner-scoped utility behind a typed repository. It synthesizes bounded activity from owner-visible achievement events and immutable creator seller notices, resolves only bounded achievements and actor avatars, and persists only the owner's seen and hidden notification IDs. Its SwiftUI surface uses native category filters, relative dates, pull-to-refresh, explicit and swipe dismissal, clear-all confirmation, Dynamic Type adaptation, canonical Community thread navigation, and accepted native Message-thread routing. Library, Studio, and Team destinations remain non-navigating until their native slices or capability authority are accepted; realtime delivery and APNs are separate gates.
- Native Messages is participant-private behind a typed repository. It reads bounded owner memberships, conversations, sent messages, and profiles through reviewed participant RLS; creates or opens direct threads and sends through the canonical RPCs; and updates only the owner's matching `last_read_at`. The native inbox, participant search, direct thread, keyboard-aware composer, 4,000-character limit, unread presentation, Dynamic Type adaptation, and Notification deep links preserve the complete display-name and username identity gate. Realtime and push delivery, pagination acceptance, archival, deletion, blocking, and reporting remain separate work.
- Native Search is a read-only aggregate behind a typed repository for bounded published Items, public profiles, visible Community posts, and canonical Support links. It provides ranked suggestions, submitted results, case/diacritic-insensitive matching, and native Item, creator-profile, and Community-thread routing without exposing a mutation path or placing table access in SwiftUI. Its explicit anonymous acceptance environment uses empty Auth storage, disables token refresh and owner repositories, denies every Community mutation, and has loaded the complete live public aggregate successfully. Full Support metadata parity and larger-index pagination remain separate work.

Open work, including the detailed desktop-application implementation tracker, belongs in `44OS_MILESTONES.md`. Do not repeat an accepted production journey unless relevant code, configuration, provider state, or evidence changed.

## Product model

`forty four` is the parent creative company. `44OS` is its first software product. Final public legal copy still requires the exact registered entity spelling/type and public business address.

44OS is a web-first creative operating system for fans, creators, collaborators, and clients. It should feel like a durable creative library and operating environment rather than an ad-driven social network.

Primary applications:

- **Home** — the application front door at `https://app.44os.com/`; signed-out Featured is `Discover`, signed-in Featured is `Welcome, [name]`, and category tabs change the title to the corresponding `Browse …` destination without leaving the route.
- **Store** — public discovery and acquisition at `/store`.
- **Library** — the signed-in user’s saved, owned, purchased, and unlocked Items.
- **Community** — posts, questions, collaboration, replies, follows, and creator/fan connection.
- **Radio** — public live listening through the shared player. Playable tracks automatically append to the canonical playlist when their Music Item becomes published; draft, non-Music, and streaming-disabled Items never enter rotation.
- **Studio** — creator publishing and catalog management under `/studio`.
- **Calendar** — creator Events and upcoming published releases.
- **Admin** — server-authoritative Discover-banner curation, People, Content, Errors, Payments, Email, and Fulfillment operations. Home curation selects one published Music Item and records an immutable reason; automatic Discover shelves remain code/data ordered.
- **Team** — a staged private workspace for Admins and explicitly granted Members or Creators. Team is an additional audited permission, never a fourth profile role.
- **Settings, Search, Support, Inbox, Orders, and profiles** — account and platform utilities.

Product language:

- `Item` is the permanent domain noun. The canonical table is `catalog_items`, the application type is `Item`, and the universal key is `item_id`.
- User-facing copy says Discover, Store, Library, Item, release, Music, Book, Game, Sample Pack, Merch, Update, earnings, and orders.
- Do not present “Collection” as the Library model.
- Resources and the old Services/Projects workflow are not part of the active application.
- Store is discovery; Library is the durable record of a person’s relationship with an Item.

Core principles:

- Creator-first and fan-respecting: no ad-first design, dark patterns, or algorithmic addiction loops.
- Technology stays hidden while useful capability remains visible.
- Catalog, identity, access, payments, and history use permanent internal IDs.
- Provider state never becomes platform identity or silently overwrites 44OS history.
- Advanced or unaccepted features fail closed and remain hidden.

## Stack and code ownership

- Framework: Next.js App Router, React 19, strict TypeScript.
- Styling: `src/app/globals.css` plus `src/styles/44-ui/canonical-system.css`, using `--os-*` tokens. A predev/prebuild step combines these accepted sources into the ignored application-only `public/_surface/44os-app.css` artifact.
- Backend: Supabase via `@supabase/supabase-js`.
- Deployment: one Vercel project with explicit origins `https://44os.com` (marketing) and `https://app.44os.com` (application).
- Host routing: `src/proxy.ts` owns marketing/app selection, permanent legacy redirects, API exemptions, reserved routes, and the server-only `MARKETING_SITE_ENABLED` rollback switch.
- Root layout: `src/app/layout.tsx` selects an isolated marketing or application composition from the trusted host-routing header. The marketing branch never loads the application stylesheet, shell, player, authentication state, push prompt, or commerce UI. It intentionally retains only the shared lightweight analytics-consent boundary so the consent cookie and future consented acquisition measurement remain consistent across both first-party origins.
- App/navigation registry: `src/lib/osApps.ts`.
- Store routes: `src/lib/experience.ts` and `src/lib/storeRoutes.ts`.
- Library routes: `src/lib/libraryRoutes.ts`.
- Platform data access: typed services in `src/lib/domain` or narrowly scoped server/infrastructure modules. Pages, cards, and forms should not introduce direct table/RPC access.
- Public catalog ordering: `comparePublicCatalogItems`.

The two canonical application stylesheets remain the only application cascade sources. `scripts/prepare-surface-css.mjs` concatenates them in that order for the application shell; the marketing response does not link the generated artifact. `/44OS_UI` is the living component/token/class reference. Do not restore retired proposal stylesheets, legacy component trees, or a second visual system.

## Shell, navigation, and playback

44OS is one persistent operating-system shell. Navigation changes the workspace; it does not rebuild the surrounding environment.

Shell ownership:

- `SystemShell` owns global shell behavior.
- `Sidebar` renders desktop navigation from `osApps.ts`, including the persisted compact mode and bounded resizable width.
- `Topbar` and `TopbarContext` own back navigation, Search, Cart, Notifications, and account menus.
- `MusicPlayer` owns the only audio element and persistent queue/player UI.
- `ContextMenu` is the shared right-click primitive.

Navigation rules:

- Desktop signed in: Library, Home, Radio, Community, Support, and an avatar-backed Account destination, plus approved pinned Items. Settings remains available from Account rather than occupying its own Sidebar slot, and the duplicate signed-in Topbar account menu is omitted.
- Desktop signed out: Home, Radio, Community, Support, Log In.
- Mobile: Home, Library, Radio, Community, Account.
- Studio opens from the owner profile or account menu and is not a Sidebar app.
- Notifications are a Topbar control. Account contains Profile, conditional Studio and Orders, Inbox, and Settings; Support remains in primary navigation and Log Out sits separately beneath the Account menu.
- Settings is in the mobile account menu rather than primary mobile navigation.
- Every route maps to exactly one owning app through `getActiveOSAppId`.

Playback rules:

- The shared DOM audio element is the only playback engine. Never introduce a second player for previews or Radio.
- Normalize media URLs before deciding to reload; avoid competing `load()`/`play()` paths.
- Standard queues persist after storage hydration. Live Radio queues do not persist and resynchronize from the canonical playlist.
- Visibility, BFCache restore, and reconnect may trigger one bounded refresh without duplicating listeners or requests.
- Repeated cards must not independently fetch the same session or ownership state.
- Audio and Supabase responses must never be blindly cached by a service worker.

## Canonical routes

Public application routes below are canonical on `https://app.44os.com`:

- `/` — Home front door; Featured is `Discover` when signed out and `Welcome, [name]` when signed in. Music, Beats, Samples, Merch, Books, and Games use an open underline-tab rail below the title that docks into the global Topbar while scrolling, plus matching `Browse …` titles without redirecting the route. Community uses the same dockable rail, while signed-in Library shows All plus only populated content categories. `New Releases` contains one latest non-featured release per creator; `Browse Music` contains the next nonduplicated releases.
- `/store` and `/store/[category]` — Store and Music, Books, Sample Packs, or Merch categories.
- `/store/item/[identifier]` — public Item detail, resolving slug first with ID fallback.
- `/cart`, `/checkout` — acquisition flow.
- `/community`, `/community/questions`, `/community/collaboration`, `/community/thread/[id]` — Community.
- `/radio`, `/calendar`, `/support`, `/support/[slug]`, `/search`, `/login`.

Signed in:

- `/library`, `/library/[category]`, `/library/item/[id]`.
- `/profile`, `/profile/[username]`, `/profile/edit`.
- `/inbox`, `/conversation/[id]`, `/notifications`, `/orders`, `/settings`.
- `/studio` and its Music, Book, Sample Pack, Beat, Event, Update, earnings, payout, and order routes.
- `/reader/[itemId]` for entitled Books.
- `/launch/[itemId]` for an enabled interactive build.
- `/admin` and its bounded operational routes for administrators.

Path-level compatibility redirects are centralized in `next.config.ts` and must go directly to one canonical destination. Host-level compatibility belongs in `src/proxy.ts`: apex application pages preserve path/query while moving to the app origin, `www` moves to the apex, `/api/*` stays executable on both hosts, and marketing `/download` owns the editorial desktop release page. Production installer actions require explicit accepted HTTPS artifact URLs; fixed local artifact routes are development-only and return not found in production. Current path compatibility includes Browse to Store, Collection to Library, Product to Store Item, Dashboard to Studio, Assets to Sample Packs, and old category routes to their Store equivalents. Removed Resources and Services/Projects routes intentionally return not found.

Private routes, previews, Admin, Studio, Library, Checkout, Orders, launch sessions, and protected asset URLs must not become search results.

## Data and authorization model

Permanent Item identity is shared across Store, Library, Community, Studio, commerce, and future interactive experiences.

Item lifecycle is `draft` → `published` → `archived`:

- Creator removal is archival, not hard deletion.
- Archival hides active Store/Studio presentation while preserving IDs, assets, Library relationships, entitlements, achievements, orders, and audit history.
- Direct anonymous/authenticated Item deletion is revoked.
- Service-role hard deletion is emergency maintenance only.
- During trusted testing, approved creators save directly; server validation decides whether a valid Item is published. Creators do not receive Draft/Published switches.
- The submission-review schema exists but creator-facing review remains disabled until explicitly activated.

Core data roles:

- `catalog_items`, `item_categories`, capabilities, members, Tags, tracks, assets, external links, videos, and Events describe Items and creators.
- `library_entries` owns Library visibility and organization.
- `catalog_offers` describes acquisition options; `offer_entitlements` declares rights.
- `entitlements` is access authority; `entitlement_events` is the immutable grant/revoke audit.
- Commerce orders, items, addresses, attempts, events, terms, grants, adjustments, and earnings are server-authoritative ledgers.
- `content_entries` and typed detail tables own Community posts, questions, collaboration, reviews, Creator Updates, replies, reactions, and moderation evidence.
- `item_play_events` is the append-only creator analytics source for validated playback starts across Store, Library, and Radio.
- `home_shelf_entries` and `admin_home_shelf_events` preserve the former audited Home-curation record. Current Discover shelves are derived from published catalog release and creation chronology rather than Admin slot assignment.
- Admin role, Home shelf, Item lifecycle, offer lifecycle, email, payout, and provider operations append immutable audit records.
- The staged `team_access_grants` table owns current Team permission and `team_access_events` owns immutable grant/revoke history. Admins inherit Team access. Grants never promote a Creator, change seller setup, or affect payouts.
- The production Team Creator and release RPCs return published public facts only. Account email, country, Auth metadata, drafts, archives, private files, sales, payouts, moderation, Support, and Admin activity remain outside this boundary.
- The production `team-brand` bucket is private. Service-role/Admin operations register versioned ZIP metadata and Team downloads receive only a short-lived signed URL after bearer authentication and server-authoritative access verification.

RLS and reviewed RPCs remain the browser boundary. Service-role credentials, provider credentials, private tax forms, payout destinations, raw Auth data, and signing secrets never enter browser code.

## Team workspace and brand governance

The private Team workspace is deployed at `/team`, `/team/brand`, `/team/creators`, and `/team/releases`. The feature flag is server-only, and production authorization fails closed at the database and authenticated API boundaries. Admins inherit access; Members and Creators require an explicit audited grant.

`content/team/44OS_HANDBOOK.md` is the canonical Handbook. The file is packaged for one authenticated no-store API route and is not embedded in the public client bundle. The client renders a restricted Markdown subset without raw HTML or scripts. `/team` is noindex, nofollow, noarchive, disallowed by robots, and absent from the sitemap.

An Admin grant requires a 3–500 character reason, preserves the target Member or Creator role, creates immutable history, and queues one idempotent in-app notification and transactional email. Revocation is immediate and does not send a revocation email. Delivery failure never rolls back authorization.

The Brand Kit build is private and versioned. Approved version 1.0 contains black/white marks, white-on-black 44OS application icons, self-hosted Inter and the SIL Open Font License, palette/type tokens, logo-use guidance, and a SHA-256 manifest. The production registry points to the checksum-verified private object `brand-kits/1.0/forty-four-brand-kit-1.0.zip`; authorized downloads receive only a 60-second signed URL. Local Team review may download the same repository-built version without adding a service-role credential to the developer environment.

## Store, Library, Community, and Studio behavior

Acquisition is capability-based:

- Public listening does not require a purchase or Library entry.
- `Add to Library` is a free save backed by a zero-cost offer and server-issued entitlement.
- `Buy Download` is a separate paid offer and never changes whether public listening is allowed.
- Physical Merch uses `Add to Cart` and is not placed in Library as though it were digital content.
- Library `All` groups visible Items under Music, Books, Games, and Sample Packs in that order, omitting empty groups. Category Library routes show only their selected format without a redundant group heading.
- Browser prices are display hints. Checkout recalculates active offers and eligibility on the server.
- Account Country determines display currency. Global USD prices use cached daily exchange rates for display; an eligible creator-local offer uses its independently stored local amount and currency. Missing rates fall back to showing USD rather than relabeling an unconverted number.
- Paid Download actions appear only while the current buyer has the matching visible Library entry and active file entitlement. Refund/revocation removes access without deleting history.

Format behavior:

- Music uses the shared player, tracks, optional downloads, eight v1 achievements, named YouTube embeds, and an optional Overachiever Item unlock.
- Books are PDF-only for this release. Reading and Library collection are always free; creators may optionally sell the protected PDF as a paid download. The protected full PDF powers the Library reader. Store does not expose a separate sample-reader surface. Page, progress, appearance, and bookmarks synchronize server-side.
- Sample Packs are paid downloadable products with a required positive price. They use a protected full ZIP plus optional public audio previews and protected individual samples. Preview audio uses the shared player.
- Studio add/edit forms use versioned account-and-Item-scoped device-local recovery. Save, Cancel, or removal clears recovered data.
- Forms expose one canonical Description for Books and Sample Packs. Music descriptions are preserved but not edited in the current Music form.
- Community uses canonical thread pages, server-backed loading/error states, reporting/moderation audit, Item Questions, reviews, and Creator Updates.
- Profiles connect identity, posts, Items, Events, follows, messaging, and approved external destinations.
- Usernames preserve the capitalization selected at registration or in Edit Profile. Identity, availability, mentions, and `/profile/[username]` resolution remain case-insensitive, so capitalization variants can never create separate accounts and existing links continue to resolve.

The v1 music achievements are Front to Back, No Skips, Nightbird, Heavy Rotation, Joined the Orbit, Left Your Mark, Signal Boost, and Overachiever. Clients submit bounded evidence; server evaluation grants achievements and reward Items. Book achievements and generic speculative bonus-feature editors remain hidden.

## Events, external reach, and interactive content

Creator external links use validated platform registries and atomic owner sync RPCs. Only approved HTTPS destinations are accepted. Item and profile links remain ordered and owner-managed.

Creator Events are source-owned records with format, timezone-aware start/end, venue/destination fields, and cancellation state. Times are stored as UTC instants plus an IANA timezone. Calendar is a read model over visible creator Events and optional upcoming published releases; it is not a separately writable content source and does not control publication.

Interactive infrastructure uses one `interactive_builds` manifest per canonical Item:

- Only an Admin-reviewed build on an approved exact HTTPS origin may launch.
- Entitled launches use expiring opaque sessions whose tokens are stored only as hashes.
- The isolated build runs in a sandboxed iframe and receives no 44OS credentials or signing secret.
- Browser progress is bounded and untrusted. Only signed server events can issue achievements.
- Replay protection uses signed event IDs, timestamps, nonces, and constant-time HMAC verification.
- Mobile/narrow devices do not request a session in the current phase.

MASK by ØLSTEN is the first accepted Unity/WebGL runtime. Its compiled export is deployed outside Git on the isolated `https://44os-mask.vercel.app` origin with exact gzip, WebAssembly, cache, CSP, and frame-ancestor headers. The published canonical Item is free to add to Library, launches only on desktop through the session boundary above, and uses an explicit Play gesture before requesting pointer lock. The Unity project, debug output, and large compiled artifacts remain outside the application repository. Additional interactive Items still require individual Admin review and activation.

## Authentication and email

Supabase Auth sends branded account mail through Resend:

- Visible sender: `44OS <accounts@44os.com>`.
- Authorization/link domain: `auth.44os.com`.
- Canonical Site URL: `https://app.44os.com`.
- Allowed redirects: localhost development, exact application root/Settings/recovery destinations, and temporary legacy apex/`www` compatibility destinations.
- Email confirmation and secure two-address email change are enabled.
- Custom SMTP uses `smtp.resend.com:465`; Auth is limited to 30 emails/hour.
- OTPs are eight digits and expire after 3,600 seconds.
- Repository-controlled templates cover confirmation, invitation, magic link, email change, recovery, reauthentication, password changed, and email changed.
- Password-changed and email-address-changed notices are enabled; unrelated phone/sign-in/MFA notices are off.
- Open/click tracking and Resend Receiving remain off.

The recorded production acceptance passed confirmation, explicit resend, magic link, recovery/password replacement, direct password change, secure email change, and the related security notices using an owner-controlled real inbox. Passwords, links, codes, and full headers are never recorded.

Application email uses a separate durable outbox and Resend adapter as `support@44os.com`:

- Templates are Welcome, verified purchase, refund/cancellation, verified fulfillment/tracking, and support acknowledgement.
- Signed Stripe or Printful evidence—not browser redirects—queues commerce mail.
- Stable event keys and provider idempotency prevent duplicate delivery.
- Signed webhook events are idempotent and out-of-order safe; bounce/complaint suppression is durable.
- Ambiguous delivery outside the provider idempotency window freezes for Admin reconciliation rather than blind retry.
- Transactional delivery is enabled and accepted for the recorded purchase/refund messages.
- `support@44os.com` is the human support channel. The in-app support intake remains disabled and must not be presented as active.
- Newsletter consent is explicit, independently revocable, and locally authoritative. Newsletter synchronization and delivery remain disabled.
- Newly generated application and Admin email actions use `https://app.44os.com`. Previously generated links remain valid through permanent apex deep-link redirects.

## Buyer payments and physical fulfillment

Stripe receives all customer money. Checkout is authenticated, Stripe-hosted, and webhook-authoritative:

- Before provider creation, 44OS snapshots Item, offer, seller, price, terms, tax, shipping, customer, and expected entitlement facts.
- Signed Stripe webhooks own payment, refund, dispute, entitlement, Library, fee, earnings, and reconciliation state.
- Success redirects remain pending until signed evidence arrives.
- Duplicate, delayed, and reordered events are idempotent.
- Runtime database controls, active terms, seller eligibility, active offer, server configuration, and the client presentation switch all fail closed independently.
- U.S. physical shipping uses the approved `$14.99 USD` Standard Shipping rate and estimated 5–10 business-day window.
- Automatic tax uses separate configured product tax codes for Books, Music, Sample Packs, clothing, hats, and bags.
- Digital refunds revoke current file access while retaining order, accounting, and Library history.
- Checkout success/cancellation returns use the app origin. The canonical Stripe webhook is registered on `app.44os.com` with the previous apex signing secret retained during the compatibility overlap; the signed handler accepts the bounded current/previous secret set.

Stripe Dashboard Products/Prices are not catalog authority. The server sends verified dynamic price data from the 44OS order snapshot.

Printful is inventory and fulfillment authority for Merch owned by **forty four**:

- Printful controls product presence, name, retail price, SKU, size, color, availability, and production cost.
- 44OS controls customer imagery, featured image, publication, orders, support, and immutable history.
- One complete paginated Sync operation creates unseen products as permanent drafts, updates provider facts, stages new colors without imagery, safely activates new sizes under already-imaged colors, archives products absent from a complete snapshot, and restores reappearing provider IDs as drafts.
- Partial or failed provider reads never archive local rows.
- Customer imagery accepts PNG/JPEG/WebP/AVIF up to 12 MB; SVG is excluded. Each current color has one image, Items may have ordered bonus images, and exactly one current image is featured.
- Content hashes prevent duplicate stored artwork. Replacement swaps the database assignment before deleting the final old reference. Failed deletions enter a bounded, audited, prefix-safe cleanup queue under `uploads/merch/{itemId}/...`.
- Provider thumbnails and mockups never become customer imagery.
- After verified payment, Admin obtains a current address/cart-specific quote and creates or reuses one deterministic `confirm=false` draft.
- The owner alone confirms manufacturing inside Printful. 44OS contains no confirmation API operation.
- Signed Printful events record production, charge/cost, shipment, tracking, delivery, cancellation, return, or failure without rewriting Stripe payment facts.

The first real owner-funded physical lifecycle remains open in Milestones.

## Creator eligibility and Wise payouts

44OS has Member and Creator account roles. Country is collected at Member signup. Creator promotion is Admin-authoritative and does not itself prove tax, payout, or sale eligibility.

The approved existing Creator cohort may sell ordinary digital Items during a manual 30-calendar-day paperwork grace period beginning only when the owner executes the final public-launch re-base. Closed testing does not consume the period. Admin records follow-up evidence and manually pauses or restores paid offers with a reason; no browser timer or automated suspension decides eligibility. Earnings remain pending until tax and payout requirements pass.

Creator Merch, split Beat sales, and exclusive Beat sales are excluded from this boundary. Standard single-owner non-exclusive Beat licenses use their separate seller, publication, runtime-control, immutable-license, and protected-file gates.

Wise Business is the only selected creator-payout provider:

- Stripe Connect payouts, Stripe Global Payouts, PayPal, and Wise transfer APIs are not used.
- Launch payout is owner-operated Wise email-to-claim. Wise collects bank details; 44OS stores an encrypted versioned email and masked display only.
- 44OS has no bank account, routing, IBAN, SWIFT, or branch fields.
- A creator country is not eligible from a static list. An operator must verify the exact business-to-individual country/currency/email-to-claim route in Wise, record dated evidence and revalidation, and fail closed when it expires or changes.
- Natural-person sellers only. Entity sellers are waitlisted.
- U.S. individuals use a current W-9; foreign individuals use a current W-8BEN. Entity and ambiguous forms stop for professional review.
- Tax PDFs and payout addresses use AES-256-GCM with server-only versioned keys and never appear in ordinary tables, logs, email, analytics, support history, or browser persistence.
- A qualified tax professional must approve classification, source, treaty/withholding, deposits, reporting, electronic certification, retention, reviewer access, and creator terms before payouts.
- Earnings states remain distinct: accrued, pending tax, pending destination, eligible, approved, processing, failed/returned, and paid.
- Monthly batches use immutable cutoffs and membership, advisory locks, human approval, provider evidence, independent reconciliation, and append-only payout debits. Only independently reconciled Wise evidence may produce `paid`.

All payout execution controls remain off with emergency stop on.

## Beat Store boundary

Beats are canonical Music Items identified by assigned Type/capability, never title text. The implemented review workflow includes a tagged public preview, controlled musical metadata, private sale files, Basic/Premium/Trackout offers, offer-to-file grants, immutable buyer licenses, and the existing creator earnings path. Exclusive licensing is not part of the product.

Public Beat detail presents **Buy License**, then the stable **Preview**, **Licenses**, and **Product Details** sequence. Product Details owns the Beat's musical metadata. Aligned license rows present **License Info** before the rightmost Cart action; complete terms open in a centered shared accessible dialog above a full-window dark scrim. Beat detail has no Reviews, never offers Add to Library, and limits same-creator recommendations to other Beats. Standard non-exclusive Beat Checkout is enabled for 1.2 only when the public Beat surface, seller, exact offer/template/files, Beat runtime, general commerce runtime, tax, and Stripe configuration all pass; every layer fails closed independently.

The standard licenses are original 44OS terms for one non-exclusive New Song. All three tiers grant the same broad recording, distribution, monetization, performance, and New-Song promotional-video rights; Basic delivers an untagged MP3, Premium adds WAV, and Trackout adds stems. The buyer may not redistribute the Beat, claim exclusivity, place it in automated content-identification systems without separate creator consent, or use it for third-party synchronization without a separate creator license. The license is directly between the recorded creator and buyer. 44OS records the exact terms digest, seller, collaborators, price, and file manifest, delivers the files, and reflects payment/refund/dispute status; it does not own the Beat or promise to enforce either party's rights.

Draft creation remains independent from public sales. When an eligible complete Beat becomes published, its approved standard non-exclusive offers are activated in the same database boundary; drafts and incomplete or ineligible offers remain dormant. Beat catalog visibility, Checkout, splits, and all general commerce dependencies remain separate fail-closed controls; 1.2 enables only the standardized non-exclusive path and leaves splits/exclusive off. Checkout revalidates the selected offer and accepted terms digest before opening Stripe, snapshots the exact license and files into the durable order, and mints the immutable license only from the signed payment webhook. This follows Stripe's webhook-authoritative fulfillment model. An attorney is not a technical runtime dependency. Independent legal review remains recommended before broad public launch, particularly when the company identity, governing terms, jurisdictions, tax treatment, or licensing scope changes.

## Security, release, and recovery

Required code gates are proportional to the change:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run audit:ui-cleanup` for UI-system changes
4. Relevant contracts: smoke, hardening, observability, analytics, commerce, Printful, email, and mobile safe-area
5. `npm run test:security` against local Supabase only
6. `npm run test:schema-replay` against disposable local Supabase only
7. `npm run build`
8. `git diff --check`

Migration releases additionally require a fresh backup, linked dry run, strict linked lint, migration-history comparison, reviewed repository SQL, post-apply history verification, and preservation probes. Never paste untracked production SQL or repair migration history casually.

`supabase/migrations/20260712010000_44os_item_baseline.sql` is the canonical replayable starting point and must not be edited after adoption. Every later database change is a timestamped forward migration. `supabase/seed.sql` intentionally contains no production accounts or content; local replay verifies structure and security without copying live user data.

After deployment, run the marketing host matrix against `https://44os.com`, launch smoke against `https://app.44os.com`, and manually verify only the journeys affected by the change. Do not repeat every historical journey for unrelated UI work.

Operational rules:

- `/api/health` is the bounded application/Supabase readiness endpoint and remains available on both origins during the compatibility period.
- Origin-local login state, service workers, PWA installation, push subscriptions, Studio draft recovery, Cart, player queue, and preferences do not transfer across the apex-to-app move. Existing PWA users reinstall from `app.44os.com` and re-enable notifications; server-backed accounts, content, Library entries, purchases, messages, and entitlements are unaffected.
- `src/instrumentation.ts` and the service-only error sink record sanitized release/runtime/route/error identity. Never record headers, query values, request bodies, user content, credentials, or tokens.
- Authentication incidents start with Supabase Auth health, redirects, rate limits, SMTP, and recovery. Never request passwords, OTPs, or session links.
- Publishing/storage incidents preserve permanent Items and protected access. Never repair by hard-deleting an Item or making private files public.
- Abuse response preserves reports and moderation audit. Credible threats, child-safety reports, and legal notices escalate immediately.
- Recovery uses reviewed forward repair by default. A separate disposable project restore must compare permanent IDs, row counts, audit rows, and storage references before acceptance.
- Secrets live only in approved local/Vercel/Supabase/provider secret storage. Missing provider configuration fails closed.
- Presentation rollback never deletes orders, entitlements, audit, provider, terms, or ledger evidence.

Generated caches and local QA renders do not belong in Git. Migrations, templates, source fixtures, and production assets are not caches. Database backups are short-lived: create one immediately before an authorized write, retain only a fixture explicitly used by a recovery test, and move or remove obsolete local dumps after the change is verified. `npm run test:data-restore` currently depends on the ignored fixture `supabase/backups/20260713_before_m17_interactive_foundation_data.sql`.

## Maintenance rules

- Keep exactly the four handoff documents named at the top of this file in `Other/`.
- Foundation, web UI, and iOS state accepted product and implementation truth; Milestones states only current work; `content/team/44OS_HANDBOOK.md` states current Team guidance.
- Local exports, design references, source artwork, and retired working notes belong in the ignored `.local-artifacts/` archive, not `Other/` or Git.
- Do not restore retired setup guides, research dumps, proposal documents, execution diaries, or completed milestone ledgers.
- Record durable architectural or provider decisions here, not step-by-step dashboard history.
- Record visual and interaction decisions in UI.
- Record only open work, blockers, acceptance criteria, and the minimal accepted baseline in Milestones.
- Preserve permanent IDs, immutable history, provider evidence, and fail-closed controls across every change.
