# 44OS Cross-Platform Functionality Plan

This is the active work list for 44OS iOS and mobile web. Desktop browser and
Mac/Windows Tauri work are deferred below. Completed work is removed from this
document; Git history remains the implementation record.

## Baseline and priority

- iOS is the behavioral reference for consumer functionality.
- iOS and mobile web are the active parity scope. Desktop browser and Tauri
  work are deferred until the mobile/iOS pass is accepted.
- Consumer functionality comes before visual polish, Admin/Team, Studio,
  commerce, and advanced native capabilities.
- Any mobile shell regression that blocks normal use is treated as a parity
  blocker, but broad UI refinement waits until functional parity is accepted.

## Verified audit snapshot — 2026-11-16

The read-only audit covered the signed-in iOS simulator, the local uncommitted
web build at phone width, the live web build at phone width, and the live web
build in a desktop-width browser viewport. The desktop-browser inspection used
the Codex in-app browser; it was not a physical Safari/Chrome installation.
The Tauri app is a separate shell around the live origin; current Tauri work is
deferred below.
No application code, database, migration, production data, or user content was
changed. Posts/messages were not submitted, no likes or follows were changed,
and no purchases, downloads, uploads, moderation, or account deletion were
performed. Test suites were not run.

| Surface | Verified behavior and open result |
| --- | --- |
| Home / Discover | iOS exposes Featured, Music, Videos, Books, Samples, and Games in its horizontally scrolling category rail. Web mobile and desktop expose Featured, Music, Books, Samples, and Games; the web home has Music, Samples, Merch, Books, and Games shelves. The web category rail has no Videos entry and no Beats entry. |
| Item details | iOS release detail shows artwork, creator, external listening links, track actions, and a Community section. Web routes cover catalog and video details. Protected playback, commerce, and content-specific success/error states were not submitted or exhaustively exercised. |
| Library | iOS and web show saved items and playlists together and provide search/category filters. Web mobile used a compact two-column grid; desktop used a wider multi-column grid. Playlist detail editing has the gaps listed under M2. |
| Radio | iOS shows the synchronized current item and can open Add to Playlist while Radio is stopped. The local web Radio action did not open a playlist picker when only the synchronized track was shown and playback was stopped. |
| Community | Feed filters, author links, attached release links, like/reply controls, and a new-post composer are present. The sampled mobile web view showed one bottom dock; no duplicate Community shell was reproduced. Desktop web adds a contextual New Members rail. The web composer exposes General and Assistance as tag choices; native iOS uses untagged General and does not offer Assistance. |
| Profiles | The localhost owner profile showed authored posts at phone width, and the live owner profile showed authored posts at desktop width. The earlier native empty-state observation is not a confirmed missing-posts defect: the owner reports seeing posts, and source tracing confirms the Account profile loads authored posts through the shared public-profile implementation. The cause of the earlier observation is unknown. |
| Account / settings | Web Account exposes Profile, Studio, Orders, Messages, Admin, and Settings. iOS exposes Profile, Inbox, Studio, optional Orders, Achievements, and Support, with Notifications and Settings in its toolbar. iOS has a confirmed Delete Account flow; web Settings has no equivalent control. |
| Search, Inbox, Notifications, Calendar, Orders, Studio, Support | iOS surfaces were opened read-only. Search scope choices and Calendar month/list views were observed. Web routes and primary entry points exist, but cross-platform result, failure, and mutation flows remain to be checked under M4. |
| Admin / Team | Live web Admin provides overview metrics, editorial, creator requests, people/content and operational work areas, plus Team Handbook and Brand Kit. The current iOS Account destinations do not expose Admin or Team; the native Admin helper is a small user/profile capture flow rather than that workspace. |

The mobile and desktop web shell preserve the same route model. Desktop uses a
left sidebar and may add contextual rails; mobile uses the five-item bottom
dock, with Support reachable through Account. The localhost and live builds
must remain separately identified in future comparisons.

## Dated source audit snapshot — 2026-11-16

This section records a dated source comparison, not the current task list or
current deployed behavior. The source baseline was iOS HEAD
`dda73933903e3322b4f0797f9223b9cb561f0767` and platform HEAD
`e51cedc641fd39a2ec473463f81c1eda4739805d`, including the pre-existing dirty
worktrees. No deployed commit or running simulator binary has been matched to
these hashes; local source cannot establish which code is deployed live.

Read-only source review now covers the named iOS feature areas and the web
route/component inventory at mobile and desktop breakpoints, including
Community moderation, creator finance/setup, responsive action placement,
Admin/Team, reader, game launch, and the Tauri origin boundary. Source
inspection is separate from runtime acceptance: no deployed source identity
matches the live web artifact, and the running simulator binary has not been
matched to iOS HEAD. The remaining work below concerns verified source gaps,
unresolved scope, and runtime/build acceptance; do not mark code presence as
feature acceptance.

Source-confirmed correction: `AccountDestinationHost.swift:35` opens
`AccountProfileView`; its `loadedContent` at line 70 constructs
`PublicProfileView` with empty initial items/posts. `PublicProfileView.swift:383`
loads content asynchronously and assigns `content.posts`. The live repository
at `PublicProfileRepository.swift:35` calls
`CommunityRepository.posts(authorID:viewerID:limit:)`; its Supabase implementation
at `CommunityRepository.swift:178` queries published, visible authored entries,
newest first, up to 60. The Posts tab is implemented and the user confirms it
works. Earlier visual evidence is insufficient to claim a missing-posts defect.

Pending native auth follow-up: `AuthCallbackValidator.swift` defines a strict
callback validator, but no application call site was found. The observed
`AppShellView.swift:245` URL handler only parses public content links through
`UniversalLinkRoute`; it has no confirmation/recovery route. Trace the intended
browser/native recovery return and SDK integration before claiming native
callback completion. Reset email and password-recovery state/UI already exist;
this is not a claim that browser recovery fails.

Code comparison status matrix (current local source; code presence is not
acceptance):

| Surface | iOS source | Local web source: mobile / desktop | Live web artifact |
| --- | --- | --- | --- |
| Discover / Items | Native category RPCs, video feed and native Item detail actions traced; protected/game/merch acceptance pending. | One responsive Store and Item route. Local source now links Videos to `/videos` and exposes Beats when eligible published items exist; desktop overflow actions and item-type behavior remain open. | Prior visual observations are in the audit snapshot; no deployed source commit matched. |
| Library / playlists | Owner relationship, filters, play, create/edit/artwork and protected boundaries traced; track queue and beat download unavailable. | One responsive Library/Playlist implementation; playlist rows/menu/edit entry, saves and sharing differ. Desktop filter/create/save actions are absent. | Prior visual inspection only; source identity unknown. |
| Radio / player | Synchronized station, one foreground player, queue restrictions and schedule placeholder traced. | Shared player and synchronized track UI; Add to Playlist reads current on-demand player track. Schedule/toolbar action placement differs. | Prior visual inspection only; source identity unknown. |
| Community | Feed/thread posts can be reported; reply menu has no report action. Composer, mentions, media, post/reply mutations and post report repository traced; partial-write state needs acceptance. | Dedicated route uploads photos and supports Item mention; dormant inline composer/static photo remain; thread supports reporting posts and replies. Admin queue is behind an environment flag. Tag/member mention rules differ. | Prior visual inspection only; source identity unknown, moderation gate unverified. |
| Profiles | Owner and public tabs/actions, async posts, videos/events/follow/message traced. | Local source queries all authored Community post types, loads creator videos into a profile tab, and exposes retry on load failure. Authenticated empty/error/playback acceptance remains open. | Owner Posts were visually observed; source identity unknown. |
| Search | Query result scopes, ranked types, cache and state presentation traced. | Shared index/client filtering, narrower result limits and no failed-load state; details in M4. | Prior visual inspection only; source identity unknown. |
| Account / auth | Session/recovery UI, deletion, optional Orders, achievements and gates traced; callback return unresolved. | Settings now exposes the existing first-party account deletion endpoint behind typed confirmation and reports its returned outcome. Recovery and full signed-in acceptance remain open. | Prior visual inspection only; source identity unknown. |
| Inbox / notifications | Cursor-based messaging, server read/archive, activity, local alert preferences and APNs registration traced. | Local Inbox pages conversation summaries and thread messages, stores read state in the member row, and archives per member. Notification history now has explicit item/all read actions and a Messages activity preference. Runtime persistence acceptance remains open. | Prior visual inspection only; source identity unknown. |
| Calendar / events | Month/list calendar and EventKit/share/Community details traced; repository masks calendar errors as empty. | Month calendar only; static event Community empty state, no calendar add/share. | Prior visual inspection only; source identity unknown. |
| Studio | Approved-creator native live editors and guarded writes traced; payout history/setup tool view is unreachable, and the reachable summary opens a sales ledger. | Route set includes catalog, videos/events, seller onboarding, earnings/payouts, updates and Radio; earnings/orders/payouts lack overview links, while Radio and payouts have external entry links. Per-route gates need acceptance. | Prior visual inspection only; source identity unknown. |
| Orders / commerce | Native digital external checkout, Orders paging and web download handoff; no physical checkout. | Responsive cart/checkout, merch variants, Orders/download routes and seller operations. Compare every offer and region gate. | Prior visual inspection only; source identity unknown. |
| Admin / Team | No Account destination; small Admin person-capture view only; no Team. | Role-checked Admin workspace; Team boundary is server verified. | Prior visual inspection only; source identity unknown. |
| Responsive shell / Tauri | Native navigation and authority gate traced; physical-device acceptance pending. | Shared route source; desktop has specific controls unavailable outside mobile toolbar. | Mac app is a Tauri shell loading the live origin, not desktop browser code. Its runtime acceptance remains open. |

Previous live and localhost page observations remain valid for the states
actually seen. They do not identify the deployed commit or prove that a
currently running simulator was built from the listed iOS source HEAD.

## M1 — Functional parity audit and mobile coexistence

The earlier audit snapshots above describe their dated source/runtime states;
they are not the current task list. Continue verifying iOS and mobile web
against the same account, content, and capability state. A route existing in a
menu or source file is not acceptance.

- Complete authenticated mobile-web and iOS checks for Home, item detail,
  Library, playlists, Radio, Community, profiles, Search, Account, auth,
  Inbox, notifications, Calendar/events, Studio, Orders, Support, and legal.
- For each active surface, verify loading, successful empty, offline, access
  denied, failure, retry, and successful action states where applicable.
- Record whether each check is source-only, locally tested, visually accepted,
  or verified on a deployed artifact. The local worktrees are dirty and the
  checked-in source has not been matched to production web or an App Store
  binary; do not claim a local change is deployed.
- Verify role/capability restrictions and owner-scoped writes using a safe
  non-production account. Keep production content, payment state, and account
  data untouched.

## M2 — Playlist and Radio parity

Keep playlist track membership (adding/removing/reordering tracks in playlists)
in scope.

- Complete iOS Add Track picker parity: search-first results, published-only
  rows, access state, add/check feedback, pagination, and reliable close/done
  behavior. Verify with the native UI and a designated test account.
- Complete playlist edit behavior: add tracks, remove/reorder tracks, rename,
  create, delete, and upload artwork. Add artwork editing to an existing
  playlist if that remains part of the accepted product behavior.
- Reconcile optimistic playlist edits after failed saves and serialize rapid
  changes so the UI returns to server state on retry/failure.
- Decide playlist sharing semantics. Web currently copies an owner-scoped URL;
  iOS has no matching Share action. Define whether sharing is private to the
  owner or intentionally available to recipients, then verify authorization
  and invalid/private/deleted link states before adding parity.
- Verify web playlist controls by touch and keyboard, including playback,
  Add to Playlist, Add to Queue, Share, and the contextual menu. The shared
  interactive track-row component and three actions are present locally; the
  earlier plan claim that rows are static is stale. Failed-save recovery still
  needs acceptance.
- Verify iOS Library track Add to Queue behavior for public and protected
  playable tracks. It must queue the selected track or explain the specific
  restriction, not falsely report missing entitlement.
- Confirm Radio Add to Playlist always targets the synchronized item, both
  while Radio is playing and while stopped, and is unavailable without a
  synchronized track. Web target behavior was previously exercised locally;
  finish iOS acceptance and signed-out/loading/error cases.
- Decide whether Radio Schedule is a supported feature or remove the
  “Coming Soon” entry.
- Verify playlist and Radio operations do not duplicate tracks and preserve
  expected ordering. Do not use production data for mutation checks.

## Next prioritized slice — Music Library, saved tracks, and release actions

This slice covers whole-release Library behavior, the Saved Tracks collection,
and the Library presentation.

### Agreed product contract

- Music is the Library landing collection. At the top of its music content,
  show the system Saved Tracks playlist, custom playlist cards, and New
  Playlist card; show saved release cards below. Playlists is not a separate
  top-level tab.
- Saving or removing music in the Library is whole-release only. A saved
  release opens with its published release tracklist; removing that release
  removes the release from the Library.
- Saved Tracks is a system playlist populated from the tracks in the member's
  saved music releases. It is presented like other playlists and supports
  track playback and playlist actions. Its web implementation exists locally;
  matching iOS behavior is not present in the current source and remains open.
- Saving and in-app streaming of published, playable music do not require a
  purchase. Music download remains gated by the applicable active purchase
  entitlement. Books, games, sample packs, and other non-music Library rules
  are unchanged.
- Adding a release to a playlist adds its tracks in release order and skips
  tracks already present. Adding it to the queue inserts playable tracks
  immediately after the current track, in release order, matching the existing
  web track Add to Queue behavior.

### Library navigation and presentation

- Organize Library into Music, Books, Games, and Assets categories.
  Show a category only when it contains saved content; show the tab rail only
  when more than one category is available. An empty Library has no category
  tabs.
- Order available categories as Music, Books, Games, Assets.
  Opening `/library`
  selects the first available category; if the selected category becomes
  empty, select the first remaining category. Assets groups Beats, Sample
  Packs, and other asset products.
- Music shows Saved Tracks and custom playlists before the saved-release
  artwork grid. Whole releases remain the Library membership unit.
- Books, Games, and Assets use artwork card grids. Asset cards show their type
  so Beats, Sample Packs, and later asset kinds remain distinguishable.
- Keep stable selected-category navigation and browser Back behavior on mobile
  web. The legacy playlist index is not a separate Library category.
- This structure follows the separate Library categories documented by
  [Apple Music](https://support.apple.com/guide/iphone/play-music-iph0138fb328/27/ios)
  and [YouTube Music](https://support.google.com/youtubemusic/answer/6313542?hl=en-it),
  while retaining the filterable Library collection pattern documented by
  [Spotify](https://support.spotify.com/us/article/your-library/). These are
  reference patterns; the category visibility and Music landing behavior above
  are the 44OS product decisions.
- On Library views, use a Library Search action on the left. It opens
  a dedicated `/library/search?q=...`
  destination styled like global search but scoped only to the signed-in
  member's saved tracks, albums, playlists, books, games, and assets; it must
  not return unsaved catalog results, creators, Community posts, or help
  articles. Search results use relevance order and no separate sort action.
- Music, Books, Games, and Assets views have Sort on the right.
  Offer exactly Recently Added (default), Creator (alphabetical), and Release
  Date (newest first, only when the collection has release-date metadata;
  missing dates sort last). Do not add Artist grouping or a standalone Tracks
  list in this milestone.
- Use the existing Library toolbar search and sort icons. Library Search reuses
  the Home search presentation while staying scoped to saved Library content.
  Sort opens the existing compact option-list pattern directly below the sort
  icon; the selected option uses the accent treatment. Offer Recently Added,
  Creator (A–Z), and (when release dates are available) Release Date. Render
  category tabs with the shared Home/Community section tab component and its
  existing visual treatment.
- The Music playlist shelf uses Recently Updated order. The New Playlist card
  is the final card and opens the existing creation flow. Keep playlist
  creation available from Add-to-Playlist pickers, including Radio.

### Implementation and acceptance

- Verify whole-release save/remove and the derived Saved Tracks collection on
  iOS and mobile web.
- Ensure playlist additions use the existing published-track and playlist-owner
  checks, preserve release order, and do not duplicate existing membership.
  Add whole-release queue insertion that preserves order and the agreed
  immediate-next position, including the no-current-queue state.
- Acceptance on iOS and mobile web: save a release, open it from Library,
  remove it, and confirm the whole-release behavior; verify Saved Tracks
  derives its rows from saved music releases; add a release to a playlist with
  existing duplicates; queue a release with an active track and with an empty
  queue; verify free music save/streaming alongside purchase-gated downloads.
- Verify Library presentation with no saved content, exactly one populated
  category, and multiple populated categories. Confirm tabs are hidden in the
  first two cases; with multiple categories, verify ordering, first-available
landing, and fallback when the active category becomes empty. Verify the
Music playlist shelf (Saved Tracks, custom playlists, New Playlist), saved
release cards, full release detail, asset type labels, and mobile layouts.
- Verify the Library Search action from category/main-collection views opens
  the scoped search destination, searches saved content across all categories,
  returns no global-only results, and restores Library navigation on Back.
  Verify Recently Added defaults, Creator alphabetical ordering, and Release
  Date ordering on supported collections. Verify cancel and successful
  playlist creation, picker-created playlists, authenticated owner-only
  whole-release writes, rejection of unavailable releases, and preservation of
  non-music Library and paid-download access. Update the System only after
  implementation and acceptance.

### Prior implementation and acceptance evidence — 2026-11-16/17

- The M0 migration and Music Library/playlist security suites were exercised on
  a disposable local Supabase project; 34 pgTAP checks passed. An unrelated
  historical migration failed on the local chain and was excluded. No
  production SQL, migration, or deployment was performed.
- The existing hosted-config localhost server has not received the M0
  migration. Its deployment/schema compatibility and whole-release save/remove
  transition still require a separately approved release and acceptance pass.
- Playlist creation cancel/success was checked in the owner-authorized
  localhost session; the test playlist “M0 Acceptance Check — 2026-11-16”
  remains in that account. No production data was changed.
- Earlier browser checks covered Library categories, sort/search, playlist
  ordering, tracklists, and queue placement on disposable local data. Those
  checks predate the latest UI work and do not establish current deployed
  acceptance.
- Home, Community, and Library shared the web section-tab component and passed
  the recorded mobile geometry/loading checks. The user later accepted the
  Home/Community/Profile tab styling and Home section spacing; those completed
  visual tasks have been removed from the active checklist.
- Earlier focused typecheck, lint, contract checks, production build, and
  `git diff --check` passed for the work at that time. They do not validate the
  current dirty worktrees or deployed artifact.
- Localhost was available during the earlier work. No production publish,
  database change, or application-code change is authorized by this plan audit.

## M3 — Community and profile media parity

Align Community posting and profile-post behavior:

- Complete cross-client acceptance for posts with text, image attachments,
  post tags, and release mentions. The composer fields/tag UI and mention color
  were updated in this work; confirm the full iOS/mobile-web behavior before
  closing parity.
- Confirm the accepted treatment for portrait, landscape, and square images;
  verify it in feed, thread, and profile. Native currently crops to a fixed 4:3
  frame while web uses intrinsic/contained media in some views.
- Display tappable release mention cards with artwork, title, type, and
  navigation.
- Preserve author links, likes, replies, edit/delete controls, reporting, and
  permissions.
- Match release-mention rules to the iOS behavior.
- Verify the accepted tag choices on both clients: Update, Question, Showcase,
  Collaboration; General is the untagged default and Assistance is not offered
  for new posts. Preserve historical posts.
- Verify profile loading/failed-state presentation on iOS. `PublicProfileView.swift:330` shows loading or failure status but still renders `selectedContent`; `postsContent` at line 692 shows “No posts yet” whenever its array is empty. Suppress that empty-state assertion until a successful load. This is a source-confirmed state-presentation issue, not evidence that authored posts are missing. Acceptance: initial load and failed refresh cannot claim that the member has never posted; successful nonempty and empty results render correctly.
- **Image-fit decision — iOS and web:** native
  `44OS/Features/Community/CommunityPostPresentation.swift:173` renders attached
  images with fill and a clipped 4:3 frame. Therefore contained portrait/landscape
  rendering above is a requested outcome, not an already verified native
  contract. Confirm the accepted treatment, then check the same portrait,
  landscape and square fixtures in feed, thread and profile on each client.
- **Post partial-success verification — iOS:**
  `CommunityRepository.swift:324` uploads, creates through an RPC, then updates
  media and reads the resulting thread separately. A later failure can occur
  after creation. Verify retries do not create duplicate posts and uploaded
  orphan cleanup/partial-success messaging is defined. This is a code-observed
  multi-step failure window, not a reproduced duplicate-post incident.
- **Community mentions/media — web:** the dedicated form's release picker
  searches its loaded published catalog list and permits one formal Item
  reference; inline `@member` suggestions are absent there, while iOS supports
  inline member suggestions. The root inline composer's photo button is static
  (`src/app/community/page.tsx:570-572`); the dedicated route uploads through
  `uploadPublicFile` (`src/app/community/new/page.tsx:76-85`). Route visible
  controls to the working path and align Item/member mention rules across clients.
- **Community partial success — web:** post creation, media updates, and
  readback are separate steps. Define retry/partial-success behavior so a
  later failure cannot duplicate a post and orphaned uploads are accounted
  for.
- Reply submission idempotency was added locally on iOS and web after five
  distinct reply events were found for one repeated-text incident. Verify the
  focused native regression test actually runs (the last selected invocation
  executed zero tests), then verify the fix in a safe non-production flow.
  Historical production events were not modified.
- **Moderation target parity and reachability:** native Community exposes
  `CommunityReportView` for feed/thread posts and calls `report_content` with
  `target_reply_id: nil` (`44OS/Features/Community/CommunityView.swift:101-103`,
  `:1642-1645`; `CommunityRepository.swift:625-635`). Native reply overflow
  offers share/copy and owner edit/delete only (`CommunityView.swift:2157-2295`).
  Web thread rows expose reports for both posts and replies and pass the
  selected target to the same RPC (`src/app/community/thread/[id]/page.tsx:579`,
  `:630`, `:827-878`; `src/lib/domain/moderation.ts:5-18`). The web moderation
  queue route returns not-found unless
  `NEXT_PUBLIC_ENABLE_M13_REVIEWED_SURFACES === 'true'`, then checks the
  profile role and offers Dismiss/Hide/Remove through the server RPC
  (`src/app/community/moderation/page.tsx:13-48`). Do not infer that the route
  is enabled in live or localhost without checking each build's environment;
  source search found no product-navigation link to the queue. Decide whether
  iOS should report replies and whether the gated web queue is an accepted
  Admin destination; acceptance covers both report target types, privacy,
  server-side authorization, and enabled/disabled route reachability.

## M4 — Remaining consumer parity

Audit and close functional gaps for:

- Home/release playback, track actions, Library actions, and related content.
- Protected Library access and saved-content behavior.
- Profile tabs, following, messaging, and profile editing.
- Search results for members, creators, releases, and navigation targets.
- Notifications and Inbox behavior.
- Authentication, email confirmation, recovery, logout, and account deletion.
- Add or explicitly reject web account-deletion parity: iOS Settings currently
  offers deletion behind a confirmation, while web Settings does not. Preserve
  the existing server-authoritative deletion endpoint and require a clear
  irreversible-action confirmation.
- Finish cross-client read-only checks for Search results and filters, Inbox
  and message composition, notification categories/read states, Calendar and
  event details, Orders/downloads, and Studio states. Then verify write paths
  only in a designated non-production/test account.
- Loading, empty, offline, authorization, and failure states.

Additional source-confirmed native gaps and verification needs:

- **Calendar failure versus empty:**
  `44OS/Features/Calendar/CalendarRepository.swift:40` catches non-cancellation
  errors and returns `[]`, preventing `CalendarStore` from presenting its load
  failure state. Propagate/classify failure and expose retry for both month and
  list. Acceptance: failed RPC is not presented as no events; a successful empty
  response remains a real empty state. Compare web behavior before implementation.
- **Calendar coverage:** `CalendarStore.swift:100` supplements a month from only
  the first 200 published Items, while List pages all catalog results. Check
  older-release month completeness and duplicate release IDs when RPC and
  supplement both return a release. Acceptance: list and month agree for the
  same date without duplicates. The differing query strategies are confirmed;
  a production omission/duplicate has not been reproduced.
- **Protected Library actions:** `LibraryItemDetailView.swift:455` opens the
  sample browser for allowed View Files, but the beat Download path always
  presents an unavailable notice. The sample browser receives no package
  resources and only plays public previews. Native Orders Download separately
  opens web Orders (`OrdersView.swift:164`). Define and implement/label the
  accepted native download/handoff boundary consistently; verify authorized,
  expired and denied cases without weakening server entitlement checks.
- **Library playback unavailable sources:**
  `LibraryItemDetailView.swift:559` silently returns when a track has no usable
  public audio URL. Playlist playback has the same public-source boundary.
  Acceptance: an enabled play control either starts authorized playback or
  shows a specific unavailable state; protected-only tracks are not represented
  as successful playback. Audit web source resolution for parity.
- **Studio secondary-load states:**
  `CreatorStudioView.swift:214`/`:217` convert video/event fetch failure to empty
  arrays; `StudioPayoutsCards.load` also converts earnings failure to empty and
  hides the cards. Preserve an error/retry distinction instead of claiming no
  videos/events/sales. Acceptance: failed optional loads do not erase the
  otherwise usable Studio catalog or misstate the user's data.
- **Studio reachability:** live create routes use
  `StudioLiveItemEditorView`, `StudioVideoEditorView` and `StudioEventEditorView`.
  `StudioToolView` has no construction call site, and its `visibleCases` list
  is not referenced. Native `StudioPayoutsView` (actual payout rows) and its
  Creator Setup link are therefore not reached by the current navigation. The
  reachable `StudioPayoutsCards` appears only when sale entries exist and opens
  an earnings ledger filtered to sales; it is not payout history. Native
  `StudioOnboardingView` only reads status/saves classification, while its UI
  explicitly says encrypted tax-document and payout-destination submission is
  pending an approved endpoint (`CreatorStudioView.swift:179`, `:1849`,
  `:2712-2768`; `StudioSupportingViews.swift:342-461`). Web has pages for
  earnings, payouts, merch orders, Radio and seller onboarding, but the Studio
  overview source has no links to earnings/orders/payouts; `/studio/radio` is
  linked from Radio, `/studio/payouts` from a Support article, and onboarding
  from payouts (`src/app/studio/page.tsx:185-280`,
  `src/app/studio/earnings/page.tsx`, `payouts/page.tsx`, `orders/page.tsx`,
  `radio/page.tsx`, `onboarding/page.tsx`). Compare role gates and identify a
  visible entry point for every supported route. Acceptance names which finance
  and setup actions are available, reachable and safe on each client; direct
  route existence alone does not satisfy reachability.
- **Checkout interruption/retry verification:** `CheckoutStore.swift:99` creates
  a handoff then polls on foreground return; its create-error branch resets the
  idempotency key. Verify ambiguous network responses, app termination, cart
  changes, cancellation and delayed webhook confirmation in a test environment.
  A thrown response is not proof the server created no order. Acceptance: retries
  cannot duplicate paid orders and pending payment remains recoverable. No
  purchase or payment-state mutation was attempted in this audit.
- **Web calendar/event actions:** browser `/calendar` (`src/app/calendar/page.tsx`)
  is month-only. `/events/[id]` renders a static empty Community panel and has
  no sharing or Add to Calendar control; it exposes creator, online and new-post
  links (`src/app/events/[id]/page.tsx`). Native EventDetail has sharing,
  EventKit and matching Community posts. Add accepted web equivalents or record
  the deliberate boundary. Acceptance: month/list, event detail, external links,
  sharing and Community behavior are usable on iOS and mobile web.
- **Event Community content — web:** event detail hardcodes the empty-state
  panel even when matching visible posts may exist. Load matching posts and
  their normal actions or make the panel explicitly a new-post invitation.
  Acceptance: an event with published matching posts displays them.
- **Image-fit decision — all clients:** native
  `CommunityPostPresentation.swift:173` crops to a fixed 4:3 frame; local mobile web
  contains intrinsic image dimensions (`src/app/globals.css:9698-9710`). Decide
  the accepted treatment, then check portraits, landscapes and square images in
  feed, thread and profile on iOS and mobile web. This is a code-confirmed difference, not a reported visual defect.
- **Web profile load and content:** source comparison tasks above remain open;
  current owner Posts evidence in the earlier visual audit is consistent with
  authored discussions and is not evidence of full video or all-content-type
  parity. Keep the distinction between the functioning Posts tab and incomplete
  source coverage.
- **Search — web parity and failed load:** native returns ranked query results
  for Items, profiles, posts and help, with result scopes and explicit failure/
empty states. Browser search loads a shared index and filters client-side;
  ordinary search limits products to 12, posts to 8 and profiles to 8, while
  `scope=members` raises profiles to 100 and excludes profiles without avatars
  (`src/app/search/page.tsx:49-126`). The rejected-index path has no catch and
  leaves Loading. Decide whether browser result limits/scopes are intended;
  add retryable failure state. Acceptance: same queries have declared scope,
  ranking/limits, navigable result types and distinct empty versus failed states.
- **Native capability gates:** `NativeCapabilitiesStore.isEnabled` exists but
  no feature call site uses it; AppShell gates authenticated content globally
  on ready/maintenance/minimum-version status. Identify server capability names
  and whether any individual screens/actions must be hidden or disabled by them.
  Acceptance: every advertised gate has a consumer or is removed from the
  contract; unsupported native actions fail closed and show their state.
- **Auth return — iOS:** `AuthCallbackValidator` has no call site and
  `AppShellView.onOpenURL` handles public content routes only. Reset-email
  recovery state/UI exists, but the native return from browser email
  confirmation/recovery is unverified. Trace SDK support, registered URL scheme
  and server redirects; implement or explicitly document browser-only return.
  Acceptance: confirmation and password recovery have identified end-to-end
  entry, return, errors and cancellation on the supported native build.
- **iOS Videos/Beats/category coverage:** Home source always exposes Videos,
  while other categories appear only when eligible storefront Items exist
  (`44OS/Features/Home/HomeContent.swift:74-80`). Web now exposes Videos and
  conditionally exposes eligible Beats. Confirm Beats visibility against the same
  signed-in content state on both clients; keep Videos parity closed based on the
  current implementation.
- **Admin/Team boundary:** native Account destination list excludes Admin and
  Team. Its `AdminView` only lists people for marketing capture, while web has
  role-gated Admin operations and an additional server-verified Team workspace.
  Confirm the intended iOS boundary and whether web Admin requires any native
  companion action. Acceptance: explicitly web-only or approved native
  destinations/workflows; never infer Admin access from a hidden client menu.
- **Commerce surface boundary:** native Cart checkout rejects physical
  merchandise and uses external digital checkout only on the allowed StoreKit
  storefront. Web has Store merch/variant and server-backed cart/checkout paths.
  Decide the intended iOS physical-commerce and regional parity; acceptance
  names supported fulfillment types and storefront states for each platform.
- **Game/interactive delivery:** web exposes an authenticated `/launch/[itemId]`
  flow backed by `begin_interactive_launch` and progress/end RPCs, but its
  compatibility check marks mobile devices unsupported
  (`src/app/launch/[itemId]/page.tsx`). Native public Item detail renders no
  game experience and native Library routes the generic Open action to an
  external handoff. Define supported iOS/mobile-web game availability and the
  acquired-game handoff. Desktop browser/Tauri execution is deferred below.
  Acceptance: incompatible mobile devices get a clear reason, supported launch
  is server-authorized, and no platform advertises a runnable game it cannot
  open.
- **Merch detail on iOS:** `ItemDetailView.swift` renders `.merch` as `EmptyView`;
  web has variant/color selection, gallery, pricing and cart/checkout. Include
  merch in the native scope decision above with item detail itself, not only
  physical fulfillment. Acceptance defines whether native can view/purchase or
  routes to a useful web handoff.
- **Account achievements — web parity:** native Account has an aggregate,
  sortable achievement view over acquired releases and can hide an achievement
  without removing the Library item. Web exposes achievement state in product
  details/toasts but the Account navigation has no aggregate view. Decide
  parity; acceptance covers hidden achievements, sorting, loading, empty and
  failure state across signed-in devices.
- **Team/Admin scope:** source has server-verified Team grants and a web Admin
  workspace with operational actions. Native has no Team destination and only
  a read-only user/marketing capture helper under a currently hidden Admin
  destination. Keep this explicit scope decision separate from consumer parity.

Admin and Team parity is a gated product-scope decision. First define the
native Admin/Team boundary and role-gating requirements; then either keep the
surfaces explicitly web-only or add the approved iOS destinations and workflows.
The current native Admin helper is not equivalent to the live web Admin
workspace.

## M5 — Mobile shell and responsive acceptance

The user has accepted the recent mobile visual work for shared tabs, Library
alignment, home shelves/cards, profile details, playlist details, release
backgrounds/tracklists, Radio, composer spacing, and achievement notifications.
Those visual adjustments are complete and are not active checklist items.

- Finish mobile-only regression acceptance across Home, Community, Library,
  Playlist, Radio, Profile, Search, Account, and item detail at supported phone
  widths. Verify dock/player clearance, toolbar actions, scrolling, and menus.
- Verify overlays and contextual menus remain anchored to their trigger and
  within the viewport on touch and keyboard; this includes playlist and track
  row menus, filters, and composer dropdowns.
- Keep the responsive mobile web layout consistent with accepted shared
  components. Do not include desktop-browser or Tauri acceptance in this
  milestone.
- Record the tested source revision and distinguish local acceptance from the
  live artifact. Existing worktrees are dirty and deployed source identity is
  not established.

## M6 — iOS and mobile web typography parity

Make mobile web text match the iOS app's default Dynamic Type hierarchy. This
milestone is documentation-led: use the measurements below instead of
repeating the native audit. Do not change iOS code in this web pass. The active
scope is mobile web; desktop parity is deferred. Android may use the accepted
scale as a future reference.

### Source audit and baseline

- The iOS SwiftUI app uses the system font and standard Dynamic Type styles.
  The app does not override the user's production Dynamic Type setting;
  `AppShellView` only substitutes larger sizes for UI-test launch arguments.
  Compare at the standard iOS text setting (`.large`). Default SF text-style
  point sizes are: Large Title 34, Title 28, Title 2 22, Title 3 20,
  Headline 17, Body 17, Callout 16, Subheadline 15, Footnote 13, Caption 12,
  and Caption 2 11.
- The source also has intentional explicit text sizes in Studio forms:
  section heading 22 pt bold and field label 15 pt semibold. Other explicit
  `.system(size:)` uses include icon/SF Symbol glyphs and feature artwork
  placeholders; preserve those as icon sizing exceptions, not text-scale roles.
- Additional fixed text exceptions found in the app menu are member name
  16 pt semibold, destination title 16 pt medium, username 13 pt regular, and
  destination subtitle 12 pt regular. Profile-edit initials use 42 pt bold as
  decorative avatar content. Creator Studio section headings use 22 pt bold.
  Keep these visible as identified exceptions when mapping the equivalent web
  role; do not mistake decorative initials, glyphs, or logo marks for body
  typography.
- Production CSS currently assigns the following compact mobile values in
  `canonical-system.css`: page 26, section 22, subsection 17, headline 13,
  body 13, callout 12, subheadline 11, meta 10, caption 10, field label 12,
  and control 13 px. The parallel `os-type-*` roles use display/page 26,
  panel 22, card 13, field 12, body 13, body-small 12, meta 10, and button 13
  px. The `.ui-audit-page-mobile` specimen uses larger mobile values, but is
  not the production scale. Use the iOS-style-role mapping below as the target;
  production mobile roots currently resolve to the compact values.

### Mobile web change list

Use the iOS point values as CSS px at the standard browser text setting. Keep
the system UI font stack. Update production mobile semantic tokens and direct
mobile text rules so common roles resolve as follows; do not apply these mobile
values to desktop:

| Text role | Current production mobile CSS | Target from iOS default |
| --- | ---: | ---: |
| Display / large screen title | 26 px | 34 px, Large Title |
| Page title | 26 px | 28 px, Title |
| Section title | 22 px | 22 px, Title 2 |
| Panel / detail section title | 22 px | 22 px, Title 2 |
| Subsection title | 17 px | 20 px, Title 3 |
| Card and primary row title | 13 px | 17 px, Headline, semibold |
| Body / primary description | 13 px | 17 px, Body, regular |
| Callout / emphasized secondary copy | 12 px | 16 px, Callout |
| Subheadline / field label | 11–12 px | 15 px, Subheadline; semibold for labels |
| Metadata / footnote | 10 px | 13 px, Footnote |
| Caption | 10 px | 12 px, Caption |
| Compact eyebrow / smallest label | 11 px | 11 px, Caption 2 |
| Primary control text | 13 px | 17 px, Body, semibold when actionable |

- Preserve intentional bold and semibold emphasis from iOS (`.bold()`,
  `.weight(.semibold)`); do not make all headings or body text heavier.
- Artwork-card titles remain one line at the standard text setting and end in
  an ellipsis when space runs out. Do not wrap a card title onto a second row.
  Respect browser zoom and larger text settings; allow surrounding layout to
  reflow rather than clip essential text.
- Match text color roles: primary and secondary copy remain neutral; links,
  selected tabs, and active text actions use the configured accent. This is a
  text-role rule only, not a broader palette redesign.
- Centralize the mobile values in the existing semantic type tokens, then
  update mobile-only rules that override those roles with incompatible sizes.
  Leave icon/SF Symbol sizing, artwork glyphs, desktop type, spacing, and card
  layout outside this milestone.
- Map App Menu and creator-form typography to the explicit iOS exceptions
  above. Treat the 42 pt profile initials as a decorative avatar size, not as
  the target size for regular text.
- Keep the accepted sizes and native style mapping in this Plan for the work
  pass. After mobile acceptance, transfer the stable scale and text-role rules
  into the System for future iOS and Android work.

### Acceptance

- Compare iOS and mobile web at the same phone viewport, standard text setting,
  theme, and content. Cover Home, Community/feed and thread, Library cards and
  details, playlist, Radio/player, Search, Profile, Account/settings, and
  forms/Studio. Verify heading/body/meta hierarchy, weights, accent text, and
  single-line artwork-card titles.
- Verify mobile web at supported phone widths and text zoom levels.
- Verify increased iOS Dynamic Type and browser text zoom do not clip essential
  labels, actions, card content, or form controls. Review any fixed-size text
  exceptions separately from decorative/icon glyphs.
- Run the standard web typecheck, lint, production build, and `git diff --check`.
  Update the System only after these checks and visual acceptance pass.

## M7 — iOS and mobile web release coordination

- Complete the iOS release-candidate checks for the approved paired changes.
- Review the identified iOS and mobile-web source revisions and their acceptance
  evidence before release.
- Obtain explicit approval before Vercel, Supabase, or App Store release.

### Deferred — desktop browser and Tauri

Resume after mobile/iOS parity is accepted:

- Audit desktop browser routes, toolbar/action placement, keyboard access,
  playlist editing, Library filtering/creation, responsive breakpoints, and
  desktop-specific rails and layouts.
- Verify the desktop browser at representative widths, including the 768/769 px
  navigation boundary, overlay placement, artwork, and playback-player clearance.
- Test Mac and Windows Tauri shells separately for navigation, refresh,
  authentication, uploads, playback, downloads, notifications, and failure
  states. Tauri is a shell loading the live origin, not a desktop-browser build.

## Test and acceptance requirements

Each milestone requires:

- Feature checks on iOS and mobile web.
- Relevant web contract tests, lint, typecheck, production build, and
  `git diff --check`.
- iOS syntax, unit, and focused UI checks.
- Regression checks for image uploads, release mentions, playlist mutations,
  Radio-to-playlist flow, and mobile shell integrity.

## Assumptions

- iOS is the behavioral reference.
- Desktop browser and Tauri work are deferred until mobile/iOS parity is accepted.
- Consumer functionality is prioritized before Admin, Team, Studio, commerce,
  and advanced native features.
- UI polish is deferred except where a shell or layout regression blocks
  functional use.
- Completed work is removed from the active Plan rather than retained in a
  completed-work section.
