# 44OS Change Log

Internal, detailed product history for the 44OS 1.1 cycle and later work.

This is the working source for editorial summaries. It is intentionally more
complete than the public release notes at `src/lib/releases.ts`: public notes
should contain only customer-facing highlights, while this document records
the implementation scope, evidence, and follow-up decisions that help us
prepare the next release.

## How to use this log

- Add entries here when a user-visible change is accepted or a meaningful
  server/platform change affects the product.
- Keep web and iOS entries together when they are one product change, but link
  each repository's commit separately.
- Label evidence precisely. A commit is **source-confirmed**; it is not proof
  that a build shipped. A simulator/device observation is **locally verified**;
  a production/App Store check requires **deployed and identity-matched**.
- Summarize this document into `src/lib/releases.ts` only when the product
  owner assigns the work to a public release.

## Product-release boundary

### 44OS 1.1 — working scope

The native repository identifies the app as marketing version **1.1**, build
**7** in the current Xcode project. This confirms the intended product
version/build in source, not an App Store submission or approval. The exact
Apple-submitted build still needs to be recorded from App Store Connect before
1.1 is called shipped.

The 1.1 working scope is the cross-platform alignment work completed after the
1.0 public baseline, including the native iOS surface pass and the web changes
that support it. The 1.1 list below is therefore a source-and-acceptance log,
not a claim that every item has already shipped to Apple.

## 1.1 customer-visible change summary

### Navigation, shell, and design language

- Unified the iOS toolbar, navigation, panel materials, rounded rows, spacing,
  and action controls across Home, Library, Account, Studio, Admin, Messages,
  Notifications, profiles, and detail pages.
- Matched mobile web toolbar behavior to the iOS navigation model while keeping
  browser navigation and native navigation platform-appropriate.
- Reworked shared action rows so related account/message/admin rows can sit in
  one connected list with clear hairline separators and consistent top/bottom
  rounding.
- Reworked the iOS account hub, settings surfaces, cards, and profile header.
- Added the layered application icon and refreshed share-sheet titles/thumbnails.

### Home, Discover, and Library

- Added and reordered Discover tabs for Featured, Music, Videos, Books, Assets,
  Games, and Events/Merch where content exists.
- Added category-aware filters and sort choices, including recently added,
  creator, format, and release-date behavior where supported.
- Added Library search and aligned Library cards, playlist cards, artwork
  treatment, and category ordering with the web experience.
- Added Saved Tracks and unified playlist/release track-list behavior.
- Added playlist creation, editing, artwork, ordering, track counts, and the
  full-screen Add to Playlist picker with already-in-playlist state.
- Added release-date display in Calendar and expanded Library filters.
- Added the Events and Calendar experience, including Studio event management,
  public-profile events, event artwork, and calendar alignment.

### Studio, music, and publishing

- Reworked Studio shelves and the Add Music/Edit Music flow.
- Added track-count selection, streamlined track rows, upload-audio states,
  and aligned External Links, Visuals, Achievements, and Paid Download
  sections.
- Reordered Studio categories to Music, Videos, Books, Assets, Games, and
  Events; combined Beats and Sample Packs into the Assets experience where
  appropriate.
- Updated Studio summary cards to use Library Saves and Total Plays.
- Added creator-owned video management, including Add New/Edit flows,
  release attachment, YouTube title/thumbnail metadata, upload-date sorting,
  and lazy-loaded embeds in Home, Library, and release pages.
- Added shared video attach/selection UI with real thumbnails and release
  artwork.

### Profiles, Community, Messages, and Notifications

- Reordered public-profile tabs so Posts leads the profile, followed by the
  remaining content categories in the shared order.
- Added photo and link attachments to Community posts and improved draft
  cleanup and hit-testing.
- Reworked Community mentions and moved Members/Posts filtering into Search.
- Unified Messages and Notifications row presentation while preserving the
  intentionally separate Community lists.
- Added durable notification history, push-token registration, achievement
  notifications, and improved notification/achievement icon treatment.
- Added the unified Achievements destination, fixed achievement ordering, level
  progress, Trophy naming, and clearer achievement copy.

### Playback, commerce, and account lifecycle

- Redesigned Radio playback and aligned Add to Playlist and Share actions.
- Added live currency conversion, Studio shelves, Orders downloads, and
  infinite-scroll notifications.
- Moved Add to Library into the Downloads section and aligned protected-file
  access with server capabilities.
- Made the iOS storefront digital-only for the 1.1 scope and gated external
  checkout to the supported storefront.
- Added account deletion handling, including login disablement, profile
  anonymization where protected transaction history prevents a hard delete,
  and public/admin directory exclusion.
- Added server-side visibility rules so deleted/anonymized profiles cannot be
  returned to public or authenticated client queries or used as message
  recipients.

## Web/platform follow-up after the 1.1 native pass

These changes support the current web experience and should be considered for
the first synchronized post-1.1 release rather than silently folded into the
Apple build:

- Web playlist picker and saved-track parity with iOS.
- Web video embeds, YouTube metadata lookup, lazy loading, and release/page
  attachment parity.
- Public and admin exclusion of accounts marked for deletion.
- Supabase RLS/RPC guard that makes deleted profiles behave as not-found to
  anon/authenticated clients and blocks new direct conversations.

## Audit findings

### Likely missing from the earlier summary

The repository audit found these user-visible changes that deserve explicit
entries in the internal record:

- Mentioned people and Items can resolve into tappable profile/Item cards
  instead of remaining plain `@` text, with the same destination behavior from
  Community and Search.
- Public profile navigation was simplified to lead with Posts, remove the
  Games tab where it was not part of the profile contract, and keep creator
  content tabs in a deliberate order.
- The Home/Library category model was clarified: Beats and Sample Packs can be
  presented as Assets, while Studio preserves the publishing categories needed
  by creators.
- Games were intentionally hidden from selected iOS Home/Library surfaces while
  desktop-open behavior and Library access remained supported.
- Sign-up now includes age confirmation, region selection is constrained to
  real countries, and the app privacy/disclosure work was recorded for the
  Apple submission path.
- The app icon was replaced with a layered Icon Composer treatment, and
  orientation was locked to portrait except for the book reader.
- Checkout was moved to the browser flow, external checkout was gated to the
  supported storefront, and the 1.1 native scope was made digital-only.
- Native account deletion was wired with a protected-history fallback: the
  login is disabled and the public identity is anonymized when a hard delete
  would damage order, payout, or moderation history.
- Home, Library, and detail surfaces received image-cache and artwork-sizing
  hardening, including smaller decoded images for grid/row contexts.
- Push-token registration, durable notification history, and achievement push
  notifications were added as separate pieces of the notification experience.
- Universal-link routing and Xcode 27 concurrency compatibility are present in
  the current iOS working branch, but their release assignment is not yet
  confirmed.

### Uncertain or unverified release-history items

- The public web release archive still contains only 1.0. No 1.1 public entry
  should be added until the owner confirms that the Apple 1.1 build shipped.
- Local Xcode source says marketing version 1.1/build 7, while history also
  contains a build-2 resubmission change. The actual App Store Connect build,
  submission date, review result, and release date are not present in the
  repositories.
- The iOS working checkout is on `codex/universal-links-health-ios` with many
  uncommitted files. Those changes must not be presented as the submitted 1.1
  artifact without a clean commit/build identity.
- Web commits after the native 1.1 pass (including video embeds, playlist
  parity, and deleted-account filtering) are source-confirmed but their exact
  production deployment identity is not recorded here.
- User-accepted simulator screenshots establish visual acceptance for several
  surfaces, but they do not establish that the same revision shipped through
  Apple review.
- The editorial site could not be fetched from the current environment, so its
  live page structure was not independently verified. The repository’s
  `src/lib/releases.ts` remains the authoritative local source for public-note
  formatting.

## Suggested public-facing 1.1 summary

**44OS 1.1 brings the iPhone experience into closer alignment with the web:**
new Studio and Library workflows, playlists and Saved Tracks, richer profiles
and Community interactions, video embeds with YouTube metadata, Calendar and
Events, improved notifications and achievements, a refreshed Account and
navigation system, and a more reliable digital checkout and deletion flow.

## Documentation gaps to resolve

1. Record the exact App Store Connect version/build, submitted commit, review
   result, and release date for 1.1.
2. Record the web deployment commit/URL identity used for each paired release.
3. Add simulator/device evidence to the 1.1 acceptance checklist for each
   major surface and state (loading, empty, signed-out, error/retry, and role
   permissions where applicable).
4. Confirm whether the current universal-link and Xcode-compatibility commits
   belong to 1.1 or a later maintenance release.
5. Re-fetch the live 44 West editorial page when network access is available
   and compare its actual section/tone conventions with this internal log.
6. Add screenshots or short clips for the most editorially useful changes:
   playlist picker, video embed/lazy loading, mention cards, Assets category,
   Account/Studio rows, and Calendar.

## Evidence and release status

| Area | Evidence | Status |
| --- | --- | --- |
| iOS marketing version | `44OS.xcodeproj/project.pbxproj` sets `MARKETING_VERSION = 1.1` and `CURRENT_PROJECT_VERSION = 7` for the app target. | Source-confirmed; App Store submission still needs identity confirmation. |
| iOS feature work | Main-line commits from 2026-09-02 through 2026-09-12 cover the Studio, Library, video, profile, account, notification, achievements, Calendar, and commerce scope above. | Source-confirmed. |
| Web 1.1 support | `4f636b08`, `66272f7f`, `c8efb834`, `3c439da9`, and related commits cover playlist, video, parity, and deleted-account work. | Source-confirmed; deployment identity should be recorded per production release. |
| YouTube metadata | The deployed `youtube-video-lookup` function now stores title, thumbnail, and published date when available. | User-accepted in local testing; production identity should be recorded with the deployment. |
| Deleted-account containment | RLS/RPC migration `20261123010000_block_deleted_profiles_publicly.sql`. | Local source added; apply to Supabase and verify with an authenticated/anonymous query. |

## Source ledger

These are the most relevant source references behind the summary. They are
grouped by product area so a future editor can trace a public sentence without
turning the public notes into a commit dump.

### Native iOS

| Area | Representative commits |
| --- | --- |
| Account, Messages, Notifications, shared rows | `1ca5d8e`, `0fa5f0c`, `c037285`, `8c7fa4e`, `6b3b6c3` |
| Home, Library, categories, Assets, artwork | `f2933ee`, `bff804d`, `c976be4`, `3336513`, `6b3b6c3` |
| Playlists and Saved Tracks | `0af50da`, `1673a2c`, `2652b51`, `d57cd75` |
| Studio, videos, YouTube metadata | `367cd18`, `e2c3377`, `a13d43f`, `a1d1138`, `ec6684a`, `facede6` |
| Profiles, Community, mentions, attachments | `40c195b`, `81f1e33`, `4ceabda`, `a13258c`, `7a48c78` |
| Achievements and notification presentation | `743bb94`, `402207c`, `9e91e5e`, `73223b1`, `5b9686f`, `bc31991` |
| Calendar and Events | `c0200b2`, `0c0551b`, `3336513`, `facede6` |
| Commerce, deletion, App Store readiness | `1955a86`, `b464fe1`, `b2e9d11`, `cb2efd8`, `e834733`, `8663032`, `86fb009` |

### Web/platform

| Area | Representative commits |
| --- | --- |
| Public 1.0 release-note baseline | `5cd03526` |
| Playlist and Saved Tracks parity | `ed027b42`, `0048f375`, `92640223`, `66272f7f`, `f884da8a` |
| Video library, embeds, metadata, and attach flows | `b7e19982`, `8b7a7337`, `58e3bfd6`, `c8efb834` |
| Home/item/profile/community parity | `cf773825`, `655a8d55`, `13a5d93f`, `690af789`, `21062935` |
| Assets, beat licensing, and catalog categories | `bbfe57b6`, `ec2f9e1`, `13d924ea`, `5967c9df` |
| Account deletion and public/admin exclusion | `f82ce88e`, `81c8b75e`, `3c439da9` |
| Native app contract and deployment support | `80d44554`, `12c20d43`, `ea4adef9`, `ce5b3c01` |

## Editorial workflow

When preparing a public 44 West/44OS update:

1. Choose only changes that are actually shipped for the public release.
2. Group them into a few plain-language sections rather than listing every
   implementation commit.
3. Keep this internal log as the complete record and link the relevant commit
   or verification evidence.
4. Add the public summary to `src/lib/releases.ts` only after the product
   owner confirms the web/iOS release boundary.

## Next review order

1. Apply and verify the deleted-account Supabase guard.
2. Start the page-by-page iOS simulator review with Profile/Search and
   Messages, then Account, Studio, Admin, Library, and Home.
3. Record each accepted simulator result here with the build, device, role,
   and data state.
4. Close the 1.1 checklist only after the Apple-submitted build and the web
   deployment identity are known.
