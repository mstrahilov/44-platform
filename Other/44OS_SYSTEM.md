# 44OS System

This is the shared source of truth for 44OS product behavior, architecture,
UI language, repository ownership, and release rules. It is written for new
developers and agents. It records how the system works now, not the history of
how it was built.

The active work list is [`44OS_PLAN.md`](44OS_PLAN.md). Do not create another
foundation, UI, transition, audit, proposal, or roadmap document. Put stable
behavior here and current work in the Plan.

## Repository model

44OS intentionally uses two repositories:

| Repository | Owns |
| --- | --- |
| [`44-platform`](https://github.com/mstrahilov/44-platform) | Next.js web application, mobile web presentation, desktop Tauri shell, Supabase schema/RLS/RPC, server routes, email, payments, and production contracts |
| [`44ios`](https://github.com/mstrahilov/44ios) | Native SwiftUI iPhone application, native playback, iOS presentation, device tests, signing, and App Store release artifacts |

The local repositories are `/Users/miro/Developer/44OS` and
`/Users/miro/Developer/44OS-iOS`. They share one product and one
server-authoritative platform, but their Git histories and release pipelines
remain separate. Do not move the Xcode project into the web repository or put
SwiftUI implementation in the platform repository.

The platform repository is authoritative for Supabase schema, RLS,
authorization, business rules, protected assets, email, payments, and public
API contracts. The iOS repository is authoritative for SwiftUI implementation,
native playback, device behavior, and Apple submission details. When behavior
changes, update this document and the active Plan in the same paired work.

## Product model

44OS is a creative operating system for discovering, collecting, publishing,
listening to, reading, and discussing independent work. The parent company is
**forty four**; the software product is **44OS**.

Primary surfaces are Home/Discover, Store, Library, Community, Radio, Studio,
Calendar, Admin, Team, Search, Support, Inbox, Orders, Account, and public
profiles. `Item` is the permanent domain noun. The canonical database table is
`catalog_items`, and the universal identifier is `item_id`.

Store is discovery. Library is the durable record of a person’s relationship
with saved, owned, purchased, and unlocked Items. Provider state must never
replace 44OS identity or history. Unaccepted or advanced capabilities remain
hidden and fail closed.

Core product rules:

- Creator-first, fan-respecting, and free of ad-first or dark-pattern flows.
- Stable internal IDs for catalog, identity, access, payment, and history.
- Server-authoritative roles, entitlements, moderation, creator approval, and
  payment state.
- Explicit loading, empty, signed-out, pending, disabled, success, and error
  states.
- No private data, privileged credentials, or provider secrets in clients.

## Web and desktop platform

The web app is Next.js App Router with React, strict TypeScript, and Supabase.
Vercel hosts the application at `https://app.44os.com`; `https://44os.com` is
the light editorial front door. Production releases flow from GitHub `main`
into the linked Vercel project. The Mac and Windows apps are Tauri 2 shells
that load the canonical application origin; their native behavior is limited
to the accepted shell and notification bridge.

The web client has one responsive product system with desktop and mobile
presentations. Mobile follows the accepted iOS information hierarchy while
using web controls and navigation. Desktop uses the available width for
sidebar, content, and contextual rails without creating a second product
language.

Application styles are authored only in:

- `src/app/globals.css`
- `src/styles/44-ui/canonical-system.css`

`scripts/prepare-surface-css.mjs` combines them into an ignored build artifact.
Do not restore retired page-specific stylesheets, copied reference routes, or
another application visual system.

The visual system uses the system font stack, 4px spacing increments, shared
tokens, stable artwork ratios, visible focus, accessible names, practical
44px touch targets, and theme-aware contrast. Mobile retains safe-area and
edge-to-edge behavior. Desktop shell edges belong to the viewport or native
window rather than an extra nested frame.

### Verified responsive behavior

The browser app keeps one route and data model across mobile and desktop. At
phone width, the primary navigation is a five-destination bottom dock:
Home, Community, Radio, Library, and Account. Search and Notifications remain
available from the app toolbar; Community provides a Calendar entry, and
Support is reachable from Account. At desktop width, navigation moves to a
left sidebar, content uses the wider center column, and contextual panels may
occupy a right rail. The Community feed uses that rail for New Members. These
are responsive presentations of the same product, not separate products.

Keep deployment identities explicit during audits: `https://app.44os.com` is
the live web application; `http://localhost:3000` is the current uncommitted
platform build and is evidence about that checkout only. The Mac/Windows Tauri
application is a shell that loads the live application origin. It is not the
desktop-browser build and does not make local web changes live.

Responsive web uses shared routes and repositories. The mobile bottom dock is
rendered through the responsive Sidebar; desktop retains left navigation and
available contextual rails. A shared action must remain reachable in both
layouts: actions registered only through the mobile toolbar are not
automatically desktop controls. The current source audit found examples
tracked in the Plan. Do not infer deployed behavior from the local checkout;
record the deployed build identity when it can be matched.

Home/Discover, Community, and Library category navigation use the shared
`SectionTabs` and `SectionTab` components. Keep their docked rails on the same
content edges and opening rhythm: 14px below the mobile toolbar and 18px after
the canonical desktop page header. Start the first content section 24px below
the rail on mobile and `var(--os-section-gap)` below it on desktop; keep Home,
Community, and Library aligned. Do not register or render a Discover tab rail
while its authentication or catalog request is loading, or after that request
fails; show the loading/error state until the content is ready.

On mobile web, `MobileToolbar` owns the current page title and top-level
leading/trailing actions. `HubHero` registers its title with that shared
toolbar and its duplicate page heading is hidden on mobile; route actions that
belong in the toolbar must use the toolbar's existing action slots. Content
begins below the toolbar, with section tabs in their own shared row when the
route has tabs. Notifications uses its filter control in the toolbar. Studio
uses the toolbar's plus menu and has no mobile description block or divider;
Messages exposes its new-message action in the toolbar. Do not show an empty
trailing overflow control when a route has no registered actions. Keep desktop
page headers and their actions in the page content area.

## Native iOS client

The native app is Swift 6/SwiftUI for iOS 18+, bundle identifier
`com.fortyfour.os44`. It uses the existing Supabase platform through typed
repositories and services, namespaced Keychain session storage, offline test
doubles, native navigation, system materials, Dynamic Type, VoiceOver, safe
areas, reduced motion, and native controls.

The accepted native feature boundary includes Home/Discover and public Item
details, Library, Radio’s single foreground player, Community reads and
user-scoped actions, read-only Search, Account, public/owner profiles,
Messages, Notifications, and approved settings/support flows. Protected
content, owner writes, commerce, Team, Studio, and advanced media behavior
remain subject to the gates in `44OS_PLAN.md`.

The current iPhone navigation has Home, Community, Radio, Library, and Account
as its five primary destinations. Calendar opens from Community. Search scopes
include All Results, Items, Members, Posts, and Help. The Community composer
offers Update, Question, Showcase, and Collaboration; an untagged post is the
General case, and Assistance is retained for old posts without being offered
as a new tag. Settings offers account deletion behind a confirmation step.
These native controls preserve the product semantics while using native
presentation.

Artwork carries identity. Every native surface must preserve the intended
ratio, crop, loading state, contrast treatment, and accessibility label. Native
implementation should use shared design-system roles rather than screen-local
literals. It should follow the same semantics as the web client while using
Apple-native layout and interaction conventions instead of pixel-copying the
web.

### Native profile data contract

Account → Profile uses `AccountProfileView` to load owner identity and editable
profile data, then presents the shared `PublicProfileView`. That view loads
published items, authored posts, links, videos, events, and follow state through
`SupabasePublicProfileRepository`. Its initial empty post array is replaced by
the asynchronous result; it does not disable the Posts tab. Authored posts are
queried by profile ID with published/visible constraints and a limit of 60.
Owner editing uses the owner profile repository; other-member profiles expose
following and messaging when their identity/session requirements are met.

Source references in the iOS repository: `AccountDestinationHost.swift:35`,
`Features/Profile/AccountProfileView.swift:70`,
`Features/Profile/PublicProfileView.swift:383`,
`Features/Profile/PublicProfileRepository.swift:35`, and
`Features/Community/CommunityRepository.swift:178` (all under `44OS/`, with
`AccountDestinationHost.swift` under `Features/Account/`). Code presence proves
this implementation path; it does not establish deployed-binary identity or
successful network behavior in every state.

### Native interaction contracts traced in source

The following describes the current native source, not acceptance of every
network operation. Paths are relative to `/Users/miro/Developer/44OS-iOS/44OS`.
The Plan tracks incomplete actions and the pending browser comparisons.

| Surface | Implemented behavior and boundary | Source |
| --- | --- | --- |
| Discover | Landing content uses `get_home_landing_v1`; catalog categories use `browse_catalog_v1` with query, sort, type, tag, creator and cursor; Videos use the separate `browse_videos_v1` feed. Controls lead to Items, creator profiles and videos. | `Features/Home/HomeRepository.swift:92`; `HomeView.swift:463` |
| Item detail | Public music and sample previews use the shared player. Item and track sharing, Library relationship actions, creator/related-content navigation and Community mentions are distinct actions. Beat licenses have information and free-claim or paid-cart paths; free claims do not require the external-checkout storefront gate. | `Features/Item/ItemDetailView.swift:88`, `:455`, `:737` |
| Library relationships | Removing a free saved relationship differs from hiding an acquired entry; hiding does not revoke purchase history or entitlement. Public preview playback and protected authorization are separate. Books resolve an authorized reading URL or an available preview before opening the native reader. | `Features/Library/LibraryItemDetailView.swift:187`, `:225`; `LibraryRepository.swift` |
| Playlists | Owner-scoped create, rename, delete, track selection/removal/reorder and artwork upload are implemented. Create initially asks for a title; artwork belongs to later editing. Normal track rows play valid public audio. Editing is not a single transaction: artwork and track additions can persist before Done; Done saves ordered tracks and title separately. | `Features/Library/LibraryView.swift`; `PlaylistDetailView.swift`; `LibraryRepository.swift:563` |
| Radio and player | Radio's displayed synchronized track supplies Add to Playlist even while playback is stopped. Radio is one synchronized stream: seeking, queue navigation and shuffle are not its controls. On-demand tracks use the shared queue, seek, skip, shuffle and retry controls. Playback accepts public HTTPS sources in the current implementation. | `Features/Radio/RadioView.swift:80`; `Playback/PlayerStore.swift:534`; `Playback/PlaybackPresentationView.swift:255` |
| Community | General is untagged; current tag choices are Update, Question, Showcase and Collaboration. The composer has one image attachment and one formal Item reference. Inline member mentions are separate from that Item reference. A composer opened for a particular release locks its reference, submits General and omits photo attachment. Update creation requires an Item. Owner edits/deletes, likes, threaded replies and post reports invoke repositories. The native thread reply menu exposes share/copy and owner edit/delete; it has no report-reply action. | `Features/Community/CommunityView.swift:823`, `:1067`, `:1117`, `:1150`, `:1715`, `:2157-2295`; `CommunityRepository.swift:324`, `:474`, `:625` |
| Search | Debounced public search combines published Items, published profiles, visible Community posts and bundled help articles; scopes filter those results. Invalid/short, loading, failure, empty and scope-empty states differ. Account-scoped recent-result cache fallback is labelled in the UI. | `Features/Search/SearchRepository.swift:12`, `:187`; `SearchView.swift:81`, `:153` |
| Messages | Inbox/thread pagination, recipient lookup, direct-conversation creation, text sending, read marking and per-member archive are implemented. Text is bounded to 4,000 characters. Drafts are scoped to account/conversation. Archiving updates membership, not the other member's messages. Opening a thread can write its read timestamp. | `Features/Messages/MessageRepository.swift`; `MessageStore.swift:395`; `MessageView.swift` |
| Notifications | Activity history and seller notices have filters and destination routes. Read state is persisted separately. Device alert preferences are stored per account on the device and do not remove in-app history. Merely entering a read-marking route is not a mutation-free runtime check. | `Features/Notifications/NotificationRepository.swift`; `NotificationStore.swift:95`; `NotificationPreferences.swift:65` |
| Push and device alerts | iOS requests APNs permission on launch (except UI-test mode), registers the device token with the authenticated first-party device endpoint, and routes a tapped push to the Notifications page. Per-kind preferences suppress optional alert presentation; in-app activity remains. Token/network delivery and provider success still require runtime verification. | `_4OSApp.swift:70-174`; `App/AppShellView.swift:245-264`; `Platform/FirstPartyAPIClient.swift:359` |
| Achievements | Account shows a sortable summary across acquired releases, supports hiding an achievement while retaining Library history, and links into per-Item achievement details. Studio editors can configure supported music achievements; server RPCs evaluate playback/follow triggers. | `Features/Account/AccountAchievementsView.swift`; `AccountAchievementReleaseView.swift`; `Features/Studio/StudioAchievements.swift`; `Playback/PlayerStore.swift` |
| Calendar and events | Month and list presentations combine `calendar_feed` results with catalog release dates. Events have creator navigation, sharing, Community references, an EventKit editor, and format-dependent online/Maps/info actions. Calendar permission denial has an alert; the user confirms saving in the system editor. | `Features/Calendar/CalendarStore.swift:57`, `:125`; `EventDetailView.swift:176`, `:323`; `AddToCalendarSheet.swift` |
| Reader and sample browser | PDFKit presents book pages; progress and bookmarks use the progress repository. Bookmark failures are shown. Sample browsing filters files, plays available public previews, resumes recorded positions and saves progress. This sample browser does not itself download protected packages. | `Features/Library/LibraryExperienceViews.swift:4`, `:102`, `:153`, `:354` |
| Studio | Approved creators enter the live catalog. The create menu opens the shared release editor for music, books, beats and samples, and separate live video/event editors. Save coordinates owner-scoped data, uploads, related content and publication/review RPCs; archive preserves existing access/history. The reachable Studio screen shows sales summary cards only when sales exist; those cards open the sales ledger. `StudioToolView` has no construction call site, so its earnings, payout-history, creator-setup and legacy Events/Updates/Radio branches are unreachable from current navigation. | `Features/Studio/CreatorStudioView.swift:131`, `:179`, `:391`, `:427`, `:1849`, `:2712`; `Features/Studio/StudioSupportingViews.swift:342`, `:461`; `StudioLiveItemEditorView.swift:706`, `:2129`; `StudioRepository.swift` |
| Cart and Orders | Native checkout permits digital lines only, checks the StoreKit storefront and server checkout availability, requires terms, opens external HTTPS checkout after confirmation, and polls server status on return. An attempted checkout is not payment confirmation. Orders are a bearer-authenticated paginated first-party response; a paid order's Download button opens the live web Orders page. | `Features/Cart/CheckoutStore.swift:74`, `:99`, `:141`; `CartCheckoutSection.swift`; `Features/Account/OrdersRepository.swift:141`; `OrdersView.swift:164` |
| Support/legal | Bundled searchable help articles provide native destination links and article sharing; contacting Support opens email composition. Terms, privacy and copyright open their canonical live pages in a Safari view. | `Features/Utilities/MemberUtilityViews.swift:5`, `:151`, `:216` |

### Playlist catalog selection contract

The Add Track picker opens from its parent playlist with a close X at the left
of the toolbar and a check action at the right; either returns to the playlist
detail. It has no duplicate body-level Done control. A full-content-width
search field appears below the toolbar. The picker loads no catalog rows until
the member enters a non-empty query. It searches the published
catalog through `browse_all_tracks_v1`, using its versioned page and cursor
response. Matching tracks show an Add control and access status. The
`has_access` value reports the member's `library_access` entitlement; it does
not control whether a published track can be added to a playlist. Adding a
track does not grant Library or download access. The server checks that newly
added tracks are published and that the target playlist belongs to the caller.
An ordered playlist save may retain a track already in that playlist after its
catalog Item is archived, so reordering or removing that track remains
possible. This contract does not change playlist playback authorization or the
current public HTTPS playback-source behavior. On Radio, Add to Playlist
targets the synchronized track currently shown, regardless of whether an
on-demand track is active; hide the action when no synchronized track exists.
Mobile web exposes the action in the toolbar overflow; desktop web exposes it
beside the Radio playback control because toolbar overflow actions are mobile
only. Both web controls are disabled while signed out.

### Music Library and saved-track contract

The web Library separates Music and Playlists into top-level categories while
preserving existing Books, Games, and Assets behavior. On the hosted schema,
Music artwork cards and release actions use the established whole-release
`library_entries` relationship, as iOS does. The public catalog detail shows
all published tracks. Release-level Add to Library and Remove from Library use
the existing save and remove operations; individual track saving is not exposed.
Library search and legacy release links remain usable without the saved-track
schema. Saving or streaming playable music does not itself grant paid download
access.

An additive, locally verified saved-track contract is prepared in
`supabase/migrations/20261116130000_saved_music_library.sql`. Once the schema
and paired clients are activated, owner-scoped track relationships support
partial releases in Music, saved-track-only Library detail, and whole-release
save/remove. The migration backfills existing visible whole-release entries
without removing their `library_entries` or purchase entitlements. Release
playlist insertion in release order and duplicate skipping also depend on that
schema. Release queue insertion is client-side and keeps playable tracks in
order immediately after the current track, or starts the release when no
queue is active. The hosted-config local server has not been migrated or
deployed as part of this slice.

Source inspection does not establish delivery of APNs, successful writes,
payment fulfillment, or accessibility usability on a physical device. Those
require the acceptance evidence listed in the Plan.

## Identity, roles, and access

The authenticated owner profile opens the same public-profile content view
with owner edit controls. Its Posts content can be empty while the view loads;
only a successful empty repository response means there are no authored posts.
The native route and repository populate the Posts tab, and the owner confirms
seeing posts. The cause of the earlier visual “no posts” observation is unknown;
it is not a confirmed missing-posts finding.

Public preview playback, protected Library access, account writes and commerce
have separate authorization rules. Public preview playback uses public HTTPS
media; protected downloads and readers require an authorized resolver or an
explicit unavailable state. External checkout and free beat-license claims are
separate: native external checkout is storefront-gated, while a zero-price
license can be claimed directly. Web and native use shared platform contracts
but do not expose identical controls and state semantics in every area; current
confirmed differences and acceptance needs are in the Plan.

Supabase Auth owns sessions, confirmation, recovery, refresh, logout, and
revoked-session behavior. Profiles own display identity and role state. Member,
Creator, and Admin are profile roles. Team is an additional audited permission,
not a fourth role. Admins inherit Team access; explicitly granted Members or
Creators may also receive Team access.

Admin access exposes administration and Team resources. Team resources include
the Handbook and approved Brand Kit. Authorization is checked server-side and
must not be inferred from client state or hidden UI alone.

In the audited builds, the web Account surface exposes the role-gated Admin
workspace and its Team resources. The current iOS Account destination list does
not expose Admin or Team; a small native Admin helper exists in source but does
not provide the web administration workspace. This is an open scope/parity
decision tracked in the Plan. Web and native Settings expose account deletion
behind a confirmation. The web flow requires the member to type `DELETE` and
calls `/api/native/v1/account/delete`. The server hard-deletes an account when
no restrictive history remains; otherwise it anonymizes display identity,
records `deletion_requested_at`, and disables further sign-in. The response
distinguishes `deleted` from `deletion_scheduled`.

Web Inbox summaries are paged at 40 conversations and thread history at 50
messages per request (bounded to 100). Read timestamps and archive state belong
to each `conversation_members` row: a member can update only their own state,
and archiving hides that conversation only from that member without removing
the other member's messages. Direct-message bodies are limited to 4,000
characters and sending requires conversation membership.

Notification seen/hidden IDs are persisted in `user_notification_state`, keyed
by account and protected by owner-scoped row-level security. Read state is
available across signed-in sessions; opening notification history does not
itself mark notifications read. Device push preferences remain separate from
in-app history.

## Data, migrations, and providers

Supabase is the source of truth for application data, RLS, RPCs, storage,
Auth, and database history. Every production schema change is a reviewed,
timestamped forward migration in `supabase/migrations/`. Applied migrations
are immutable: never edit, delete, rename, or squash them. A new migration is
required for every later change.

The repository’s migration directory is therefore intentionally long. It is
not disposable project-planning material. Local backups, Supabase temporary
files, imported media, build output, and design references remain ignored and
must not be committed.

Hosted Supabase Auth mail and Resend provide application email. Notification
fan-out uses the durable outbox and tracked admin recipients. Payments use
Stripe only through server-authoritative flows. Printful remains a provider,
not the platform’s order history. Printful is inventory and fulfillment authority:
the platform reconciles the complete paginated Sync catalog, creates draft
orders with `confirm=false`, and the owner alone confirms manufacturing inside Printful.
Wise payout execution remains disabled until its explicit gates are accepted.

## Release and verification rules

Before a platform release, run the relevant lint, strict typecheck, production
build, contract tests, security/observability checks, smoke tests, and
`git diff --check`. Before an iOS release, run Swift syntax checks, unit tests,
focused UI tests, simulator acceptance, and the required physical-device pass.

Keep web and iOS work paired by milestone or issue. Do not deploy platform
changes, submit to Apple, merge release branches, or change production data
without an explicit owner release decision. Record the exact commit, build,
environment, and acceptance evidence in the active Plan.

## Maintenance rules

- Read this document before changing product architecture or cross-client
  behavior, then read the active Plan for current work.
- Update stable behavior here only after it is accepted and verified.
- Put unfinished work, priorities, owners, evidence, and gates in
  `Other/44OS_PLAN.md`.
- Preserve unrelated working-tree changes and local configuration.
- Do not create new plan, audit, transition, setup, or handoff documents.
