# 44OS Cross-Platform Functionality Plan

This is the active work list for 44OS across the iOS application, mobile web,
desktop browser, and later the Mac/Windows Tauri shells. Completed work is
removed from this document; Git history remains the implementation record.

## Baseline and priority

- iOS is the behavioral reference for consumer functionality.
- Mobile web and desktop browser must expose the same capabilities through the
  shared responsive web system.
- Browser desktop is the first desktop target. Tauri shell acceptance follows.
- Consumer functionality comes before visual polish, Admin/Team, Studio,
  commerce, and advanced native capabilities.
- Any mobile shell regression that blocks normal use is treated as a parity
  blocker, but broad UI refinement waits until functional parity is accepted.

## Verified audit snapshot — 2026-11-16

The read-only audit covered the signed-in iOS simulator, the local uncommitted
web build at phone width, the live web build at phone width, and the live web
build in a desktop-width browser viewport. The desktop-browser inspection used
the Codex in-app browser; it was not a physical Safari/Chrome installation.
The Tauri app is a separate shell around the live origin and remains in M6.
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

## Code audit in progress — 2026-11-16

This second pass is active. Do not interpret the earlier visual-pass completion
as completion of this code audit. The source baseline is iOS HEAD
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

## M1 — Functional parity audit and desktop/mobile coexistence

The three-platform surface inventory is recorded above. The current remaining
work is to close the verified gaps and finish deep checks of stateful flows.
Do not infer that a route is fully accepted from its presence in a menu.

Retain these coverage areas for the remaining checks:

- Home and release details.
- Library and saved content.
- Playlists.
- Radio.
- Community.
- Profiles and profile posts.
- Search.
- Account, authentication, messages, and notifications.
- Calendar, event detail, and Add to Calendar.
- Studio catalog publishing, video/event tools, seller setup, earnings,
  payouts, creator orders, updates, and Radio tools.
- Cart, checkout, customer Orders/downloads, merch, beat licenses, and
  interactive game launch.
- Reader/sample preview, Support/legal, Admin, Team, and Community moderation.
- Role/capability gates, loading/empty/error/retry states, mobile toolbar,
  desktop sidebar/context rails, breakpoint-only controls, and Tauri shell.

Code-confirmed mobile-web deltas to resolve:

- Discover: local source now exposes Videos in the responsive category rail and
  links to a public browse/detail path. Eligible Beats is conditional on the
  reviewed web capability flag and matching published catalog items. The
  signed-out localhost Videos route loaded 33 cards and showed the responsive
  category rail at both 390×844 and 1280×800; its grid changed from two to four
  columns and no console errors were reported. Authenticated behavior, video
  playback, and eligible Beats remain unverified.
- Creator videos and authored Posts: local profile source now queries creator
  videos and the native Community post type set, creates the Videos tab when
  data exists, and routes cards to existing playback pages. Load failures have
  an explicit retry state. In the existing signed-in owner session on the
  localhost frontend, Posts loaded and Videos showed two cards. One video
  detail route showed its embedded player, title, and Community section at
  390×844 and 1280×800, with no console errors. These reads used the existing
  hosted Supabase connection; no post or account state was changed. Playback,
  retry recovery, empty/not-found distinction, and acceptance against local
  Supabase remain open.
- Inbox: local source now pages conversation summaries (40 per request) and
  thread history (50 per request), reads/writes `conversation_members.last_read_at`,
  and exposes per-member archive. Existing schema includes `last_read_at` and
  `archived_at`; its update policy scopes writes to `auth.uid()`, matching the
  native repository contract. Local database runtime acceptance is blocked
  until Docker/local Supabase is available; recipient/send failure and large
  inbox behavior still need authenticated checks.
- Notifications: opening the menu or history no longer marks everything read;
  individual rows and an explicit “Mark all read” action persist to the existing
  user-scoped state table. Settings now has a Messages activity toggle and
  clarifies that Web Push controls device alerts separately. The signed-in
  Settings page displayed the Messages toggle and separate device-notification
  copy; no preference was changed. Cross-device persistence and read-error
  recovery still need runtime acceptance.
- Account deletion: Settings now calls the existing
  `/api/native/v1/account/delete` endpoint after the member types `DELETE`,
  reports `deleted` versus `deletion_scheduled`, and signs out after a successful
  result. On the signed-in Settings page, opening the confirmation showed the
  required typed `DELETE` gate and a disabled submit button; it was cancelled
  without entering the phrase. The irreversible endpoint was not submitted.
  Response handling remains unverified without a safe local backend.

For every remaining capability, record whether it is present, missing, broken,
or behaviorally different on iOS, mobile web, and desktop browser. Keep live
production observations separate from the uncommitted localhost build.

### M1 implementation status — 2026-11-16

- The specific web source gaps above have local implementations. No Supabase
  migration was added: Inbox fields and member-scoped update RLS already exist,
  notification state already has a user-scoped table, and account deletion
  already has a first-party route.
- Focused verification passed: TypeScript `tsc --noEmit`, ESLint on the changed
  M1 files, and `git diff --check`. `npm run audit:ui-cleanup` also completed
  without writing files; its inventory still reports 212 production-unused
  CSS rules repository-wide, so it is not a clean bill for every stylesheet.
  `npm run test:mobile-safe-area` and `npm run test:surface-isolation` passed;
  these are source-contract checks, separate from browser/device acceptance.
- The running `localhost:3000` process has its working directory in this
  platform repository. At `http://localhost:3000/videos`, a signed-out browser
  loaded 33 published video cards and the Discover category rail. Responsive
  browser checks at 390×844 showed a two-column grid; 1280×800 showed a
  four-column grid. The document stayed within the viewport width and the
  browser reported no console errors. In the existing signed-in browser
  session, the local Library rendered nine saved Music cards and the Community
  feed rendered 49 posts. Those reads used the existing hosted Supabase
  connection and did not mutate production data; they are not local Supabase
  acceptance.
- The shared Home, Community, and Library surfaces were swept in the browser at
  phone widths 320, 360, 375, 390, 412, and 430px and desktop/breakpoint widths
  768, 769, 1024, and 1280px. At every width, document/body width matched the
  viewport. The tab rails began at y=70 through 768px and y=171 from 769px.
  Content remained aligned to the rail/page edges (14px inset through 412px,
  18px at 430px; at desktop the rail and main content share the app-column
  left edge). At 390×844 each first content section began 24px below the rail;
  at 1280×800 it began 48px below. This exposed a 24px-too-small desktop gap on
  Community, which now uses the shared `--os-section-gap` token. Its mobile feed
  wrapper remains transparent and borderless, with individual cards aligned to
  the page inset. No browser console errors were reported.
- This browser pass did not verify authenticated video behavior, playback,
  other route surfaces, or stateful mutations.
- The signed-in read-only browser opened the public `ABYSS` release detail,
  which showed its single track, Save Release, Add Release to Queue, Add to
  Playlist, and Community controls at 390px and 1280px viewport widths. No
  action was invoked. This used the existing hosted Supabase connection; it
  does not accept queue/save/playlist mutations, playback, downloads, or local
  database behavior.
- The Calendar route showed November and December 2026 as real empty months
  with month-navigation controls at both phone and desktop widths. The
  30-cell grid stayed within the viewport and no browser errors were reported.
  No event was available for detail/Add to Calendar checks; those event actions
  remain in M4 per the Plan. This was a read-only localhost frontend check over
  the existing hosted Supabase connection.
- A read-only `/search?q=ABYSS` check returned the published `ABYSS` Item at
  both 390px and 1280px, with no horizontal overflow or browser console errors.
  No result action was used. This verifies only a successful Item query; member,
  post, help, failure, and broader Search parity remain in M4.
- The current `localhost:3000` checkout uses the hosted Supabase project in
  `.env.local`; its pages are localhost source evidence over hosted data, not
  local-database browser acceptance. Read-only checks this pass confirmed the
  Inbox list loads and the Notifications page loads and filters to Messages.
  The All filter was restored. No message thread was opened, no notification
  was marked read, and no account or production data was changed.
- On 2026-11-17, the mobile browser showed Home/Discover, Community, and Library
  titles and their top-level actions in the shared toolbar. Notifications now
  uses the same toolbar title and places its filter at the trailing action
  slot; the Messages filter was selected and then restored to All without
  changing notification read state. Its first content gap was tightened to
  14px and visually rechecked. The related mobile Account destinations were
  checked read-only: Studio has its Add menu in the toolbar with no description
  or divider; Messages has a toolbar New Message action and no duplicate body
  heading; Orders, Admin, and Settings show their page title with no empty
  trailing placeholder. Body content starts below the toolbar. No message was
  sent, order action invoked, or admin/settings control changed. TypeScript,
  targeted ESLint, mobile-safe-area and surface-isolation contract checks, and
  `git diff --check` passed afterward.
- Docker access is denied in the ordinary sandbox, but the Docker Engine and
  local Supabase database are available through approved local-only access;
  `supabase status` reports only the optional image proxy and pooler stopped.
  The CLI telemetry writer was disabled for these checks. Seven pending local
  migrations were reviewed and applied with `supabase migration up --local`.
  The first migration required its referenced approver UUID to exist locally;
  a `.test` auth/profile fixture was added to the isolated local database only
  (no password or live identity), matching the repo's pgTAP fixture pattern.
  No migration was added by this M1 pass.
- Local pgTAP acceptance passed for saved music, playlist catalog parity,
  notification state, and email-system security (4 files, 142 tests). The
  creator-signup/admin-notification test had one failure: it expects exactly
  four rows across the global `admin-signup/%` prefix, while this already-used
  local database had two such fixture rows before the test's own inserts. Its
  other 21 assertions passed. The test transaction rolled back; existing local
  rows were preserved. This test needs an isolated fixture or an assertion
  scoped to the four test users before it can be treated as a clean pass.
- Current source checks passed: `npx tsc --noEmit`, targeted ESLint for the M1
  files, `npm run test:mobile-safe-area`, `npm run test:surface-isolation`,
  `npm run test:music-library-contract`, `npm run test:playlist-contract`,
  and the iOS syntax checker. The existing web dev server remains running on
  port 3000; no build or server restart was attempted.
- The iOS source comparison remained read-only. A simulator acceptance check
  could not start because CoreSimulatorService became invalid and could not
  connect to its device set; no simulator binary was matched to iOS HEAD.
  The iOS repository's `bash scripts/swift_syntax_check.sh` passed for all 200
  Swift source files. This syntax check does not replace the unit scheme or
  device/simulator acceptance.
- M1 remains open. Complete authenticated browser acceptance against local
  Supabase, compare runtime behavior with iOS, and finish deep checks for the
  retained coverage areas above. The localhost browser checks still use the
  hosted connection and remain read-only. Re-run the signup-notification test
  against an isolated database or correct its global-count assumption, and
  restore simulator service/device acceptance. Keep hosted production data
  untouched. The System records only the verified responsive tab-spacing
  contract; unaccepted authentication, message mutation, notification
  persistence, account-deletion, playback, and device flows remain open here.

### M1 verification update — 2026-11-17

- Local Supabase is available at `127.0.0.1:54321`; only the optional image
  proxy and pooler are stopped. The M23 signup-notification test was corrected
  to count its four fixed fixture event keys instead of every historical
  `admin-signup/%` row. Its local pgTAP run passed all 22 assertions. No
  migration or hosted database was changed by this correction.
- The full local SQL suite ran 36 files / 770 assertions. All passed except two
  expectations in the out-of-scope `m21_book_access_and_sample_pack_pricing`
  test (free Sample Pack publish rejection, assertions 4 and 7). This is
  recorded for M21 triage and was not changed as part of M1.
- Current web contracts passed: Music Library, Playlist, mobile-safe-area,
  surface-isolation, and the read-only native iOS capability contract. The
  first `test:native-ios-contract` invocation was blocked by the sandbox's
  local IPC restriction; the same read-only check passed with approved local
  access. Earlier TypeScript, targeted ESLint, and CSS generation checks remain
  valid for the unchanged source.
- The iOS simulator is an iPhone 17 / iOS 26.5 booted from the Xcode project.
  The fixture-only `44OS-UI` primary-navigation smoke passed. Three outdated
  `PlatformContractFixtureTests` source assertions were updated to reflect the
  current Support email link, Library active-filter treatment, and Studio row
  status. The full `44OS-Unit` scheme then passed all 424 tests. The focused
  Library UI test now opens the active Books submenu before returning to All;
  that fixture-only `44OS-UI` test passed as well. No iOS app implementation
  source was changed in this verification pass.
- `localhost:3000` had stopped and was restarted from this checkout. A local
  read-only request returned HTTP 200 for `/library`; the server is left running.
  Its `.env.local` points to the hosted Supabase project, so this verifies the
  web source against live data read-only, not authenticated local-database
  browser acceptance. The simulator test schemes used offline fixtures, not
  the signed-in account.
- During that localhost page load, the existing auth bootstrap made one
  automatic POST /api/email/welcome request; the route returned HTTP 400.
  Source tracing shows the request is the current best-effort welcome queue
  call. It was not manually retried, and no successful queue response or email
  send was observed. The hosted queue was not inspected; include this failure
  state in local-auth acceptance rather than assuming the flow succeeded.
- A separate copy of the current web source, with `.env*` excluded, is running
  at `http://localhost:3001` against local Supabase. `/api/health` returned
  healthy with a local Supabase 200 response, and the M1 route inventory
  (Home, Videos, Community, Radio, Library, Inbox, Notifications, Calendar,
  Studio, Orders, Settings, Admin, Store, Search) returned HTTP 200. A random
  local `.test` account completed a confirmed-signup, password-sign-in, and
  owner-scoped profile-read round trip, then was deleted. These checks verify
  local configuration and route availability. The existing launch smoke also
  passed against this preview: home, login/recovery, support/legal, sample-pack
  browse, health, compatibility redirects, and the hidden Community moderation
  route. Visual browser interaction and authenticated client-side route
  acceptance on this local preview remain open.
- Account role navigation now exposes Admin and Team independently: Admin is
  gated by the admin role, while Team is gated by the existing team capability
  and opens the Team workspace at `/team`. The team hub route exists; focused
  ESLint and `git diff --check` passed. The static experience-polish contract
  still contains earlier tab-markup assumptions and is not accepted as a
  current runtime check.
- M1 remains open. Still required: authenticated responsive-browser acceptance
  against local Supabase; broader stateful/error/retry checks across the
  retained M1 surface inventory; and confirmation that web and iOS runtime
  behavior agrees for those surfaces. Keep all hosted data untouched and leave
  later-milestone failures in their owning Plan sections.

Acceptance:

- Desktop browser and mobile web use the same underlying functionality without
  desktop changes regressing mobile.
- **Mobile Community feed layer — local web fix:** the 2026-11-16 screenshot
  reproduced a glass border/background around the complete feed behind the
  individual post cards. The mobile feed wrapper is now transparent and has no
  border, shadow, clipping, or extra horizontal inset; each post retains its
  own card outline and the existing gap. Verified in localhost at 390×844.
  This source fix is not deployed; production appearance needs a later approved
  release check.
- **Shared tab spacing — local web fix:** Home, Community, and Library use the
  same 24px tab-to-content gap on mobile and 48px desktop gap at 1280px. The
  Community desktop page now uses `--os-section-gap`, matching Home and
  Library. Verified in the localhost browser at 390×844 and 1280×800; no
  horizontal overflow or console errors were observed. This source fix is not
  deployed.
- No capability is marked complete without acceptance on iOS, mobile web, and
  desktop browser.

## M2 — Playlist and Radio parity

### Current delivery order

Prioritize mobile and desktop web implementation. Use iOS source and the
simulator as read-only behavioral references; defer iOS code changes until the
web behavior is implemented and accepted. Add each confirmed mismatch to the
native follow-up list below so the iOS pass can mirror the accepted web
behavior. Do not treat a shared System contract as proof that all clients
already implement it.

Align playlist functionality across all three clients:

- **Catalog-wide Add Track — web implementation updated locally; iOS follow-up
  open:** the mobile and desktop web pickers show a search field first and do
  not load catalog rows until a non-empty query is entered. The local PostgreSQL
  regression passed all 17 assertions; the forward migration is applied to the
  local database only; no production migration was applied. On 2026-11-16, the
  localhost build was confirmed to use the hosted Supabase project and the
  signed-in owner account. On both mobile and desktop web, a fresh picker showed
  the empty search prompt, matching catalog results, access-state labels, and
  enabled Add controls. Adding `.223` (shown as `No Library access`) succeeded;
  it became a disabled already-added/check state and appeared in the temporary
  playlist. Desktop live results returned 30 rows for the tested queries but no
  continuation cursor, so live pagination was not available to exercise in
  that catalog response. The revised toolbar X/check controls and full-width
  search were verified in the mobile viewport and desktop accessibility tree.
  On 2026-11-16, both mobile toolbar controls were tapped on an existing
  playlist and returned to its detail without changing playlist data.
  Native source remains unchanged and currently uses its catalog-first picker;
  align it with the accepted web search-first behavior in a later iOS slice.
  A temporary offline UI-test attempt stopped before reaching the picker
  because its test flow could not expose the playlist Add Track control; the
  temporary test and offline fixture edits have been removed. No production
  migration or deployment has been performed. Keep the later Library redesign
  and individual track saves out of this slice.

- **Radio Add to Playlist target — web source updated locally:** the mobile
  overflow action and desktop hero action target the synchronized Radio track
  shown on the page and are omitted when no synchronized track exists. Both
  are disabled while signed out. Topbar actions refresh their callback when
  the target changes. Offline fixture checks are regression evidence only, not
  live acceptance. In the live localhost owner session on 2026-11-16, desktop
  Radio showed synchronized `Aero` while stopped; Add to Playlist selected the
  temporary test playlist and `Aero` appeared there. With Radio playing, the
  same track stayed displayed and the action remained available. A separate
  on-demand `ABYSS` track was then actively playing while desktop Radio showed
  synchronized release `EVERYTHING AFTER` / track `reveal`; using Radio's action
  added `reveal`, not `ABYSS`, to the temporary playlist. These desktop live
  checks did not alter the Radio rotation. Mobile Radio then showed
  `evntura, 'KHILE - Faux Trails`; More Radio actions exposed Add to Playlist,
  and selecting the temporary playlist added that displayed track. The
  temporary playlist was deleted from its More actions menu; a fresh Library
  load no longer listed it. No ordinary playlist was modified. No schema
  changes or deployment.

- **Native follow-up list (deferred until web behavior is accepted):**
  - Change the iOS Add Track picker from catalog-first to search-first, while
    retaining published-only results, access labels, Add controls, and
    pagination. Use the accepted web interaction pattern: a leading close X,
    trailing check action, full-width search below the toolbar, and added/check
    state on each result instead of a bottom floating action.
  - Accept iOS Radio Add to Playlist for stopped and active Radio when an
    unrelated on-demand track is active; hide it when Radio has no synchronized
    track. Keep the currently synchronized Radio item as its target.
  - Re-run native playlist UI acceptance with a reliable signed-in test route
    after the Xcode/simulator environment is stable; the previous offline test
    did not reach the Add Track picker. Keep native account operations
    read-only during this web implementation slice.
  - Keep iOS changes deferred until the web workflow is accepted; the web
    toolbar close/check interaction is now part of the native parity followup.

- **Library navigation — web:** the standalone `/library/playlists` index
  duplicates playlist cards already shown in `/library` and had no remaining
  product entry point. Playlist detail back and delete destinations now lead
  directly to `/library`; the legacy index path redirects there, verified in
  the signed-in mobile browser. Playlist
  create, detail, edit, Add Track, and Radio picker routes remain in use.

- **Radio no-synchronized-track state:** source conditionals and the offline
  regression fixture hide the action when the synchronized target is absent.
  The live Radio rotation always had a synchronized track during this
  acceptance, and changing production rotation was out of scope, so the
  no-track state was not induced in live data.

- Create playlists.
- Upload and display playlist artwork.
- Add tracks from release pages, Library, and Radio.
- Create a playlist while adding a track.
- Rename, edit artwork, delete, share, and view playlists.
- Add, remove, reorder, and play tracks.
- Display playlists alongside Library items with correct artwork and ordering.
- Add an artwork picker to existing playlist editing on web; the current detail
  edit mode only adds tracks and renames the playlist, even though playlist
  creation supports artwork.
- Replace or remove the visible `•••` on normal web playlist track rows: it is
  rendered as non-interactive text, while edit mode has the actual remove and
  reorder controls. Verify the final affordance at phone and desktop widths.

Align Radio behavior:

- Add the currently synchronized Radio track to an existing or new playlist.
- Support the action whether Radio is actively playing or only displaying the
  current track.
- Verify the Radio Add to Playlist action targets the displayed synchronized
  track when playback is stopped or active; an unrelated on-demand player track
  must not change its target, and no action appears when Radio has no track.
- Match signed-out, loading, empty, duplicate, and error states.
- Verify the iOS menu, mobile toolbar, and desktop browser controls.

Additional native source findings (browser comparison pending):

- **Playlist sharing — iOS:** `44OS/Features/Library/PlaylistDetailView.swift`
  has edit/delete menu actions but no Share action. Any earlier assumption that
  native playlist sharing was demonstrated is withdrawn. Decide the share
  audience and URL authorization contract before adding parity. Acceptance:
  intended recipients can open a shared playlist without exposing private
  owner data; invalid/private/deleted links have explicit states on all clients.
- **Library track queue — iOS:** the music-track Add to Queue closure in
  `LibraryItemDetailView.swift:703` sets the protected-action notice; the public
  Item equivalent invokes `playerStore.enqueue`. Implement the appropriate
  authorized source or label/disable the unsupported operation. Acceptance:
  the action queues exactly the selected playable track, or explains the
  specific unavailable access; it must not falsely imply entitlement is missing
  for a public track. Compare mobile and desktop Library menus.
- **Radio schedule — iOS:** `RadioView.swift:339` opens a Coming Soon screen.
  Define whether Schedule is an accepted capability or remove the exposed
  placeholder. Acceptance: the visible entry has the approved useful behavior;
  do not count this as an implemented schedule based on navigation alone.
- **Playlist partial saves — iOS verification:** title/order are saved in
  sequence, while artwork and Add Track can save immediately. Verify failure,
  dismissal and retry semantics in a designated test account; preserve committed
  changes and explain partial success. No mutation was performed by this audit.
- **Web playlist rows — mobile and desktop:** `src/components/PlaylistApp.tsx:178-179`
  renders normal rows as noninteractive elements with `•••` text and no play,
  queue or row-menu handlers. Edit mode (`:182-186`) has removal and move
  buttons; “Drag to reorder” has no drag handler. Implement reachable playback
  and editing affordances or remove unsupported ones. Acceptance: tracks play,
  controls work by touch/pointer/keyboard, and failed saves restore server state.
- **Web playlist sharing:** `PlaylistDetailApp` copies the current URL and
  exposes Share although `getPlaylist(userId,playlistId)` filters by current
  owner (`src/lib/domain/playlists.ts:35-39`, `PlaylistApp.tsx:119-129`). iOS
  currently has no Share menu. Choose private-owner clipboard semantics or
  intentionally shareable playlists with server-enforced visibility.
  Acceptance: a copied link has a useful authorized-recipient experience and
  exposes no private playlist data.
- **Web playlist failed save:** removal/reorder changes local state before
  `replacePlaylistTracks` succeeds and does not restore it on failure
  (`src/components/PlaylistApp.tsx:149-157`, `:182-186`). Reconcile displayed
  state after failure and serialize rapid saves. Acceptance: UI matches server
  state and retry is safe.
- **Radio Add to Playlist — web (implementation updated):** the previous
  `currentTrack` target mismatch is fixed by using `syncedTrack`; a desktop
  hero action now complements the mobile overflow control, which has no desktop
  renderer. Native uses the synchronized context whether playback is stopped
  or active (`44OS/Features/Radio/RadioView.swift:80`). Runtime target and
  playback-state acceptance remains open above.

## Next prioritized slice — Music Library, saved tracks, and release actions

This is the active consumer implementation slice. The shared backend contract
and responsive mobile/desktop web behavior are implemented and accepted as
recorded below. Keep iOS source unchanged in this slice and track native parity
as follow-up work; use its current behavior only as a reference.

### Research and current source baseline

- Apple Music exposes distinct Songs, Albums, and Playlists Library views and
  a Favorite Songs playlist. Its settings can couple favoriting and Library
  membership. See [Apple Music Library categories](https://support.apple.com/guide/iphone/play-music-iph0138fb328/27/ios)
  and [Apple Music Favorites](https://support.apple.com/en-us/111118).
- Spotify places saved songs in Liked Songs and documents that saving an album
  does not save all its songs, and saving a song does not save its album. See
  [Spotify Your Library](https://support.spotify.com/us/article/your-library/).
- Community reports are anecdotal, not representative: users describe album
  clutter when individual songs surface parent albums and confusion when album
  saves populate liked-song collections. Examples: [Apple Music discussion](https://www.reddit.com/r/AppleMusic/comments/1pi4zmc/how_do_you_use_your_library/)
  and [Spotify Community discussion](https://community.spotify.com/forum/en/discussion/5322820/liked-songs-should-not-include-saved-albums/).
- Current web and iOS Library models save catalog Items through
  `library_entries`; no user-to-track Library relationship exists. Web
  `save_item_to_library` also grants the Item's `library_access` entitlement.
  Track menus expose queue and playlist actions, but not save-to-Library.
- Web release-level Add to Playlist currently targets the selected track or
  first track, not the complete release. Track-level playlist addition is
  idempotent for a track already in the playlist. No web release-wide queue
  action exists.
- Existing access state is split across `library_access` and `download`
  entitlements. Track saves must not be implemented by calling the whole-Item
  save path or granting a paid download entitlement.
- Library's current topbar has a New Playlist plus on the left and a category
  filter on the right. There is no Library-only search or collection sort
  control. `/library/playlists/new` already creates a playlist, and the
  Add-to-Playlist picker can create a playlist and add its selected track in
  the same flow.

### Agreed product contract

- Music and Playlists are separate top-level Library categories. Music remains
  artwork-card based; there is no separate Tracks row or Tracks list in this
  milestone.
- Saving one track saves only that track. Its parent album appears as an
  artwork card in Music while at least one track is saved. Opening that album
  from the Library shows only its saved tracks. The public catalog album page
  continues to show the full published tracklist.
- Saving an album saves all its currently published tracks. Removing one track
  leaves the album visible as a partial collection while any saved tracks
  remain. Removing the album removes all of its saved tracks.
- Saving and in-app streaming of published, playable music do not require a
  purchase. Music download remains gated by the applicable active purchase
  entitlement. Books, games, sample packs, and other non-music Library rules
  are unchanged.
- Adding a release to a playlist adds its tracks in release order and skips
  tracks already present. Adding it to the queue inserts playable tracks
  immediately after the current track, in release order, matching the existing
  web track Add to Queue behavior.

### Library navigation and presentation

- Organize Library into Music, Playlists, Books, Games, and Assets categories.
  Show a category only when it contains saved content; show the tab rail only
  when more than one category is available. An empty Library has no category
  tabs.
- Order available categories as Music, Playlists, Books, Games, Assets.
  Opening `/library`
  selects the first available category; if the selected category becomes
  empty, select the first remaining category. Assets groups Beats, Sample
  Packs, and other asset products.
- Music opens directly to an Albums artwork grid. Each card represents a
  release with at least one saved track. Opening a release from the Library
  shows only tracks saved to that member's Library; the release's public
  catalog detail continues to show all published tracks.
- Playlists is its own top-level category and shows playlist artwork cards.
  Do not add a separate Tracks row, Tracks tab, or Tracks list in this
  milestone. A future milestone may add an all-saved-tracks list if user needs
  demonstrate it is valuable.
- Books, Games, and Assets use artwork card grids. Asset cards show their type
  so Beats, Sample Packs, and later asset kinds remain distinguishable.
- Use `/library/music` for the Music album-card view and `/library/playlists`
  for the Playlists category. Keep the same destinations and behavior on mobile
  web and desktop browser. Maintain stable selected-category navigation and
  browser Back behavior.
- This structure follows the separate Library categories documented by
  [Apple Music](https://support.apple.com/guide/iphone/play-music-iph0138fb328/27/ios)
  and [YouTube Music](https://support.google.com/youtubemusic/answer/6313542?hl=en-it),
  while retaining the filterable Library collection pattern documented by
  [Spotify](https://support.spotify.com/us/article/your-library/). These are
  reference patterns; the category visibility and Music landing behavior above
  are the 44OS product decisions.
- On Library category views, use a Library Search action on the left. It opens
  a dedicated `/library/search?q=...`
  destination styled like global search but scoped only to the signed-in
  member's saved tracks, albums, playlists, books, games, and assets; it must
  not return unsaved catalog results, creators, Community posts, or help
  articles. Search results use relevance order and no separate sort action.
- Music, Books, Games, and Assets category views have Sort on the right.
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
- Playlists has a right-side plus instead of Sort. It opens the existing New
  Playlist flow. Do not add a New Playlist artwork card. Playlist cards use the
  current Recently Updated order. Canceling playlist creation returns to the
  Playlists category; successful creation opens the new playlist detail. Keep
  creating a playlist inside the Add-to-Playlist picker, including Radio,
  where it can be created and receive the selected track in one operation.

### Implementation and acceptance

- Add a server-authorized, user-scoped saved-track relationship and atomic
  single-track and whole-release save/remove operations. Make music Library
  queries return saved tracks and group their parent releases. Backfill current
  saved music releases into track membership while preserving
  `library_entries`, purchase history, and existing entitlements; retain the
  current non-music path.
- Ensure playlist additions use the existing published-track and playlist-owner
  checks, preserve release order, and do not duplicate existing membership.
  Add whole-release queue insertion that preserves order and the agreed
  immediate-next position, including the no-current-queue state.
- Acceptance on mobile web and desktop browser: save one track and confirm its
  parent album appears with only that track in Library album detail; save an
  album and confirm every published track appears in Library album detail;
  remove one track and then the whole album;
  add an album to a playlist with existing duplicates; queue an album while
  another track is active and with an empty queue; verify free music save and
  streaming alongside purchase-gated downloads.
- Verify Library presentation with no saved content, exactly one populated
  category, and multiple populated categories. Confirm tabs are hidden in the
  first two cases; with multiple categories, verify ordering, first-available
  landing, and fallback when the active category becomes empty. Verify Music
  album cards, saved-track-only Library album detail, full-track public album
  detail, Playlists category, asset type labels, and matching mobile/desktop
  layouts.
- Verify the Library Search action from category/main-collection views opens
  the scoped search destination, searches saved content across all categories,
  returns no global-only results, and restores Library navigation on Back.
  Verify Recently Added defaults, Creator alphabetical ordering, and Release
  Date ordering on supported collections; Playlists has the plus instead of
  Sort, remains Recently Updated, and has no creation card. Verify cancel and successful playlist
  creation return to the expected destinations and Add-to-Playlist picker
  creation still adds the selected track.
- Verify authenticated owner-only writes, rejection of unavailable tracks,
  migration/backfill behavior, and that non-music Library and purchased
  download access remain intact. Update the System with these contracts only
  after implementation and acceptance.
- **Deferred iOS parity:** add the Music, Playlists, Books, Games, and Assets
  categories; individual-track and release save/remove; Library album details
  filtered to saved tracks; whole-release playlist and queue actions; matching
  queue placement; Library-only search in place of the Library filter; Sort on
  Music/Books/Games/Assets; and a Playlists plus action instead of Sort. Accept
  native behavior after the web contract is implemented; do not count current
  native source as parity.

### M0 implementation status — 2026-11-16

- Web implementation is present in the existing worktree. A compatibility path
  keeps existing `library_entries` and playlists readable when the configured
  Supabase schema does not yet include `saved_music_tracks`; dedicated Music
  saves activate after the additive migration is installed. The live-configured
  localhost server uses the hosted Supabase project and has not received the
  M0 migration or any SQL writes.
- M0 database acceptance ran on a disposable local Supabase project. The M0
  migration and remaining migrations applied there; one unrelated older
  migration, `20260911070000_activate_free_beat_license.sql`, was excluded
  because it fails against both the existing and clean local migration chain.
  The Music Library and playlist security suites passed 34 pgTAP checks. The
  existing project-local stack remains blocked at that historical migration;
  no production database was changed.
- Mobile and desktop browser acceptance on the disposable local data covered
  saved-track and release behavior, public versus Library tracklists, playlist
  ordering/deduplication, queue placement, search scope, categories, and sort
  order. On 2026-11-16, the signed-in owner account at hosted-config
  `localhost:3000` also verified playlist creation cancel and success: Cancel
  returned to `/library/playlists`, and Save opened the new playlist detail.
  The user authorized account-level test data creation; the playlist
  “M0 Acceptance Check — 2026-11-16” remains in the account. No Library tracks
  were changed in this final check.
- Home/Discover, Community, and Library share `SectionTabs`/`SectionTab` and
  the same opening layout. Browser geometry was checked after each route and
  shell layout settled: at 380×751 all three rails start at x=0, y=70, span
  380px, and sit 14px below the 56px toolbar; at 1440px desktop all three use
  x=259.36px, y=171px, width 1117.28px, below the same 93px header. Home now
  withholds its Discover rail (including its docked topbar tabs) while auth or
  content is loading and after load failure, so the spinner is not paired with
  a partial Featured tab. The localhost browser showed `Loading...` with zero
  section rails/topbar tabs immediately after Home navigation, then showed all
  five loaded categories and content. The visual spacing and search/filter
  presentation were accepted by the product owner.
- Docker was checked again during final follow-up and its socket returned
  `permission denied`; no local database operations were run in that check.
  The earlier disposable-project database acceptance and 34 pgTAP results
  above remain the database evidence. The hosted-config account was used only
  for the owner-authorized playlist UI check; no production SQL or migration
  was run.
- Final focused checks passed: TypeScript `tsc --noEmit`, ESLint on the changed
  Home component and Music Library contract script, both Music Library and
  playlist contract scripts, and `git diff --check`. The production build also
  passed after the final tab spacing/loading refinements; it ran with the dev
  server stopped, which was restarted afterward.
- The web server is already running at `http://localhost:3000` from the 44OS
  repository. No production data, deployment, or publish action was performed.
- iOS remains unchanged in this slice. The native parity work listed above is
  still deferred. The hosted Supabase project has not received the additive M0
  migration; production SQL and deployment remain outside this slice and need
  a separate approved release step before these saved-track writes are enabled
  for live members. Local M0 implementation and acceptance evidence are retained;
  native parity and live schema activation are follow-ups.

### Hosted Library compatibility decision — 2026-11-17

- The owner chose to defer individual-track Library saving until the saved-track
  backend and iOS parity can be released together. The hosted-config localhost
  server uses the older schema; its `Could Not Check Library` menus came from
  reading `saved_music_tracks`, which is not installed there. A client query
  change cannot supply the missing database contract.
- The web release detail now uses the existing whole-release Library entry for
  Add/Remove from Library. Its top menu keeps Add to Playlist, Add to Queue,
  and Share; track overflow omits save/remove and offers Add to Playlist,
  Add to Queue, and Share. The top playlist picker uses its existing selected
  or first-track operation until the release playlist RPC is activated.
- Library search and direct saved-music detail links fall back to existing
  Library entries when the new table is absent. The prepared migration and
  local acceptance remain in the worktree and are not part of the hosted UI
  activation. Before any later activation, review hosted migration history,
  test the legacy iOS whole-release save/remove transition, and verify that
  web deployment does not automatically apply pending migrations.
- Focused ESLint completed with no errors, TypeScript and the updated Music
  Library contract passed, and `git diff --check` passed in both repositories.
  The already-running `localhost:3000` returned HTTP 200 for the public release
  and Library search routes. The inspected Vercel config, package scripts, and
  sole GitHub workflow contain no automatic database migration step. Authenticated
  menu actions were not exercised against hosted data; no account content,
  production schema, or deployment was changed.

## M3 — Community and profile media parity

Align Community posting and profile-post behavior:

- Create posts with text, image attachments, post tags, and release mentions.
- Support portrait, landscape, and square images.
- Render contained, consistent image media on mobile web and desktop browser.
- Apply the same image treatment to public profile post feeds.
- Display tappable release mention cards with artwork, title, type, and
  navigation.
- Preserve author links, likes, replies, edit/delete controls, reporting, and
  permissions.
- Confirm the dedicated `/community/new` route is the only supported composer
  entry, or wire the dormant inline composer. Remove or connect its static photo
  control; do not count unreachable composer markup as a working capability.
- Match release-mention rules to the iOS behavior.
- Match the native tag choices: offer Update, Question, Showcase, and
  Collaboration; keep General as the untagged default and do not offer
  Assistance for new posts while preserving historical posts. The audited web
  composer exposed both General and Assistance.
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
- **Composer entry points — web:** the reachable Community plus action routes
  to `/community/new`; root `composerOpen` initializes false and no code sets it
  true, leaving the separate inline composer dormant. The route supports photo
  upload/removal; the old inline photo button has no handler. Keep one supported
  path or wire both. Acceptance: each visible composer action opens a usable
  flow and every photo control works or is absent.
- **Community mentions/media — web:** the dedicated form's release picker
  searches its loaded published catalog list and permits one formal Item
  reference; inline `@member` suggestions are absent there, while iOS supports
  inline member suggestions. The root inline composer's photo button is static
  (`src/app/community/page.tsx:570-572`); the dedicated route uploads through
  `uploadPublicFile` (`src/app/community/new/page.tsx:76-85`). Route visible
  controls to the working path and align Item/member mention rules across clients.
- **Community partial success — web:**
  `src/lib/domain/community.ts:339-408` creates an entry, separately updates
  image media, then reads it back. A later failure can be reported as a failed
  post although the entry exists, so retry may duplicate it. Align idempotency
  and partial-success handling with iOS. Acceptance: later-step failure cannot
  duplicate posts on retry and orphaned uploads are accounted for.
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
- Add a Videos entry to web Discover categories to match the native category
  rail. Confirm whether Beats remains intentionally feature-gated and align its
  discoverability with the accepted native behavior.
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
  sharing and Community behavior are usable on phone and desktop.
- **Event Community content — web:** event detail hardcodes the empty-state
  panel even when matching visible posts may exist. Load matching posts and
  their normal actions or make the panel explicitly a new-post invitation.
  Acceptance: an event with published matching posts displays them.
- **Image-fit decision — all clients:** native
  `CommunityPostPresentation.swift:173` crops to a fixed 4:3 frame; local web
  mobile contains intrinsic image dimensions (`src/app/globals.css:9698-9710`)
  and desktop caps contained media at 720px
  (`src/styles/44-ui/canonical-system.css:4404-4424`). Decide the accepted
  treatment, then check portraits, landscapes and square images in feed, thread
  and profile. This is a code-confirmed difference, not a reported visual defect.
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
  (`44OS/Features/Home/HomeContent.swift:74-80`). Web's static categories omit
  Videos and Beats (`src/components/StoreApp.tsx:94-104`). Confirm eligible
  Beats in the same signed-in state and distinguish content gating from absent
  browse navigation; then accept category parity at both widths.
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
  game experience and native Library routes the generic Open action to the
  desktop download page. Define supported desktop browser/Tauri/iOS execution
  and acquired-game handoff. Acceptance: incompatible devices get a clear
  reason, compatible launch is server-authorized, and no platform advertises a
  runnable game it cannot open.
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

## M5 — Responsive UI and shell pass

After M1–M4 functionality is accepted:

- Remove mobile regressions introduced by desktop changes.
- Normalize the shared app shell, toolbar, navigation, spacing, panels, and
  responsive breakpoints.
- Verify Community, Library, Playlist, Radio, Profile, and release pages at
  mobile and desktop widths.
- Keep desktop browser and mobile web as one responsive product system.
- Review desktop/mobile behavior at the same signed-in role and data state. The
  audit found a desktop Community contextual New Members rail and a mobile
  bottom navigation; do not treat role/session differences between browser
  tabs as layout differences.

Desktop source comparison against shared web components:

- `useTopbarOverflow` actions render only inside `MobileToolbar` at
  `src/components/Topbar.tsx:561`; the toolbar is hidden outside the mobile
  breakpoint (`src/app/globals.css:3237`). Desktop has no other renderer for
  those action arrays. Radio Share/Add to Playlist (`src/app/radio/page.tsx:80-83`),
  playlist Share/Edit/Delete (`src/components/PlaylistApp.tsx:125-129`), and
  Store Item Add/Remove Library, Add to Playlist and Share
  (`src/app/store/item/[identifier]/page.tsx:351-355`) are therefore missing
  from their desktop topbar. Add keyboard reachable desktop controls. Acceptance:
  actions exist at both widths and target the same item.
- Playlist detail's desktop edit entry is only the hidden mobile overflow
  action; normal rows are noninteractive with static dots at all widths
  (`src/components/PlaylistApp.tsx:125-129`, `:172-179`). Acceptance: desktop
  can enter editing, reorder/remove/add tracks, play tracks and receive save
  errors.
- **Library root actions — desktop:** Filter Library and New Playlist are
  emitted only by `mobileTrailingAction` in `src/components/Topbar.tsx:465-489`.
  `LibraryApp` has no in-page trigger for its filter event and no create link;
  `PlaylistCreateApp` listens for a save event but has no submit button in its
  content (`src/components/LibraryApp.tsx:90-91`, `:185-194`,
  `src/components/PlaylistApp.tsx:69-100`). Desktop therefore cannot reach
  these controls from the Library surface. Add visible desktop filter and
  create controls. Acceptance: members can filter all categories and create
  playlists without manually entering a URL, by mouse and keyboard.
- **New Playlist save — desktop:** the only submit control is the mobile
  toolbar event button (`src/components/Topbar.tsx:473-476`); the page body
  contains artwork and title inputs but no save button. Add a desktop submit
  action and explicit disabled/upload/error state. Acceptance: create succeeds
  by either layout and prevents saving during artwork upload.
- Radio Schedule is a mobile-toolbar leading link only, and its native target
  currently says Coming Soon. Decide whether to implement a schedule across
  clients or remove the entry. Acceptance: no desktop dead end or mobile
  placeholder counts as parity.
- Store Item per-track menus live in page content, unlike release-level overflow
  actions. Verify that the track menu and Add-to-Playlist picker work at both
  breakpoints; this remains a runtime acceptance item, not a confirmed desktop
  failure.
- CSS switches responsive navigation at 768px and desktop Community image
  treatment above 768px. Compare 768/769 boundaries, content rails, menu/dialog
  placement, artwork and playback-player clearance. Previous visual inspection
  sampled phone and desktop sizes, not every boundary or route.

Build provenance limits:

- The local source checkout is dirty and includes pre-existing changes,
  notably `src/components/ContextMenu.tsx` and
  `scripts/printful-contract.mjs`. Do not attribute local behavior to the live
  app without a matched commit or artifact identity.
- Prior runtime inspection separately observed localhost and live pages, but
  this pass has no deployed source/commit identity and has not matched the
  running simulator binary to iOS HEAD. Keep runtime observations distinct
  from source findings and repeat acceptance on identified artifacts.
- Tauri configuration points `frontendDist` to `https://app.44os.com/`; native
  notification plugin paths use an `isTauri()` guard. The Mac shell is not the
  desktop-browser build. Run a separate shell acceptance pass after browser
  behavior is accepted.

## M6 — iOS and mobile web typography parity

Make mobile web text match the iOS app's default Dynamic Type hierarchy. This
milestone is documentation-led: use the measurements below instead of
repeating the native audit. Do not change iOS code in this web pass. Keep the
desktop typography scale intact, and defer Android implementation while
making the resulting shared scale usable as its future reference.

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
- Verify mobile web at the 768 px breakpoint and a representative phone width;
  ensure desktop computed typography is unchanged.
- Verify increased iOS Dynamic Type and browser text zoom do not clip essential
  labels, actions, card content, or form controls. Review any fixed-size text
  exceptions separately from decorative/icon glyphs.
- Run the standard web typecheck, lint, production build, and `git diff --check`.
  Update the System only after these checks and visual acceptance pass.

## M7 — Tauri and coordinated release

After browser parity and UI acceptance:

- Verify Mac and Windows Tauri shells consume the accepted web behavior.
- Test shell navigation, refresh, authentication, uploads, playback, downloads,
  and failure states.
- Complete the iOS release-candidate checks.
- Review paired iOS/platform changes.
- Obtain explicit approval before Vercel, Supabase, or App Store release.

## Test and acceptance requirements

Each milestone requires:

- Feature checks on iOS, mobile web, and desktop browser.
- Relevant web contract tests, lint, typecheck, production build, and
  `git diff --check`.
- iOS syntax, unit, and focused UI checks.
- Regression checks for image uploads, release mentions, playlist mutations,
  Radio-to-playlist flow, and mobile shell integrity.

## Assumptions

- iOS is the behavioral reference.
- Desktop browser is the first desktop target; Tauri follows later.
- Consumer functionality is prioritized before Admin, Team, Studio, commerce,
  and advanced native features.
- UI polish is deferred except where a shell or layout regression blocks
  functional use.
- Completed work is removed from the active Plan rather than retained in a
  completed-work section.
