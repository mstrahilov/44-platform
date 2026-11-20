# 44OS Cross-Platform Baseline and Alignment Plan

**Status:** Active documentation and mobile/iOS alignment plan

**Documentation snapshot:** 2026-11-19

**Scope:** Shared Product Baseline 1.1, mobile web, and native iOS. Desktop browser and Mac/Windows Tauri are deferred.

This is the single active cross-client work plan. Stable product and architecture contracts live in [`44OS_SYSTEM.md`](44OS_SYSTEM.md). The detailed source inventory for typography remains in [`44OS iOS Typography.md`](44OS%20iOS%20Typography.md). Do not create parallel System, UI, audit, or roadmap documents.

## Product baseline and release language

- **Shared Product Baseline 1.1** means the documented product state against which mobile web and iOS are compared. It is not a technical app, package, build, or deployment version.
- **iOS 1.2 catch-up** is the planned App Store update that brings iOS into alignment with accepted 1.1 web/product changes. Its submission and approval are separate release gates.
- **Later 1.2 work** means product work begun after the 1.1 baseline delta is reviewed and the iOS catch-up is accepted. Track it separately from catch-up fixes so newly proposed behavior does not silently redefine 1.1.
- The inspected primary iOS app target declares marketing version 1.2/build 7. The web `package.json` declares 0.1.0. These values are implementation metadata, not the shared product-baseline label, and this documentation work does not change them.

## Research basis

Public guidance supports shared contracts with native platform expression; it does not reveal private company workflows:

- Apple’s HIG calls for consistent, learnable interactions and platform-appropriate experiences. Its WWDC25 design-system session recommends shared component anatomy and consistent core interactions across different platform forms. [HIG design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles) · [WWDC25 design system](https://developer.apple.com/videos/play/wwdc2025/356/)
- Spotify publicly describes Encore as connected design systems built on common foundations while allowing local systems to serve their audiences. [Spotify Engineering: Encore and local systems](https://engineering.atspotify.com/2024/02/applying-the-facade-pattern-on-spotify-for-artists) · [Spotify for Developers: Encore web design system](https://developer.spotify.com/blog/2023-03-27-introducing-the-new-spotify-for-developers)
- Google recommends mapping flows and platform differences when translating designs, and notes that platform-specific guidance can support a more user-centered system. [Android Developers: translating iOS designs](https://developer.android.com/design/ui/mobile/guides/foundations/translate-designs)
- USWDS connects shared tokens with components and publishes component-level accessibility guidance. [USWDS tokens](https://designsystem.digital.gov/design-tokens/) · [USWDS accessibility](https://designsystem.digital.gov/documentation/accessibility/)

Apply these practices as a lightweight 44OS method: define the product contract once, map each implementation, name intentional differences, and keep evidence attached to the specific revision and environment that was checked.

## Documentation model and evidence rules

- **System:** stable product semantics, architecture ownership, shared component contracts, design-token roles, accessibility expectations, and intentional platform differences. Update only when an accepted contract changes.
- **Plan:** active parity reviews, open questions/decisions, evidence, release gates, and deferred scope. Remove completed work from active queues only after evidence is recorded; retain prior plan history in the archive.
- **Feature source:** implementation details stay in their owning repository. Use repository-relative paths and component/route names as pointers; avoid copied code and large line-number inventories.
- **Evidence labels:** `source-confirmed` (present in named source revision); `user-accepted` (owner approved the observed contract); `locally verified` (exercised with build, device/viewport, role, and data state recorded); `deployed and identity-matched` (production artifact checked and tied to a source commit/build). A source reference or production URL by itself does not prove runtime behavior or deployment identity.
- **Parity record fields:** concept/scenario, expected contract, web source + commit, Swift source + commit, account/role/data prerequisites, states exercised, result per platform, intentional difference and rationale, evidence links/captures, reviewer/date, and follow-up decision. Mark unknowns explicitly; do not infer parity from matching screenshots or code presence alone.

## 1.1 baseline map

These rows capture product intent and verified source entry points for future page-by-page reviews. The repositories currently have pre-existing uncommitted changes. Paths below are source pointers, not claims about a clean revision, current runtime, App Store binary, or deployed website. Earlier owner feedback accepted many of the listed web presentations; fresh paired evidence is required before claiming current parity or deployment.

| Surface / intended contract | Web source | Swift source | Current documentation status / known difference |
| --- | --- | --- | --- |
| Home/Discover tabs and toolbar: same destination and action intent, consistent tab selection and content hierarchy | `src/components/Topbar.tsx`, `src/components/MobileToolbar.tsx` | `44OS/DesignSystem/OSAppHeader.swift`, `44OS/DesignSystem/OSDesignSystem.swift`, `44OS/Features/Home/HomeView.swift` | Owner accepted recent web tab spacing/color changes. Native tab/toolbar surfaces and Liquid Glass are intentional presentation differences; current paired artifact identity is unverified. |
| Artwork cards and item detail: consistent item identity, artwork, title/creator/type hierarchy, track actions, and Community placement | `src/components/PublicArtwork.tsx`, `src/app/store/item/[identifier]/page.tsx`, `src/components/LibraryItemDetail.tsx` | `44OS/Features/Home/HomeContent.swift`, `44OS/Features/Item/ItemDetailView.swift`, `44OS/Features/Library/LibraryItemDetailView.swift` | Owner accepted the web item-background and detail-layout work. Verify current artwork sizing, spacing, state behavior, and paired revision. |
| Track lists: consistent numbered rows, title plus artist, dividers, artist navigation, playback and row-menu outcomes | `src/components/PlaylistTrackList.tsx`, `src/app/store/item/[identifier]/page.tsx`, `src/components/PlaylistApp.tsx`, `src/components/SavedTracksLibrary.tsx` | `44OS/Features/Item/ItemDetailView.swift`, `44OS/Features/Library/LibraryExperienceViews.swift` | Owner accepted the web playlist track-row presentation and requested it as the system-wide contract. Verify native row treatment/action parity; native menus and web hover/focus are platform-specific affordances. |
| Library and playlists: saved items, Saved Tracks, custom playlists, playlist creation/editing, and supported sort/actions | `src/components/LibraryApp.tsx`, `src/components/PlaylistApp.tsx`, `src/components/SavedTracksLibrary.tsx` | `44OS/Features/Library/LibraryView.swift`, `44OS/Features/Library/LibraryExperienceViews.swift`, `44OS/Features/Library/LibraryItemDetailView.swift` | Owner accepted recent web Library/playlist presentation. Current native contract and runtime parity require a focused comparison; do not imply all playlist operations have been verified. |
| Community: feed filters, post composition/tagging, mentions, post/reply actions, and access/moderation rules | `src/app/community/page.tsx`, `src/app/community/thread/[id]/page.tsx` | `44OS/Features/Community/CommunityView.swift`, `44OS/Features/Community/ItemCommunitySection.swift` | Owner accepted recent web composer and toolbar changes. Verify current role permissions, mutation/error states, and filter behavior on both clients. |
| Public profiles: land on Posts; present profile tabs, authored content, follow/message/share actions according to viewer relationship | `src/app/profile/[username]/page.tsx` | `44OS/Features/Profile/PublicProfileView.swift` | Owner accepted recent web profile presentation; source and deployed revision identity are not established by that acceptance. Check own/other-user and loading/empty/error scenarios. |
| Notifications: one notification per event, meaningful title/description, related artwork/avatar, destination, read state | `src/app/notifications/page.tsx`, `src/lib/achievementNotifications.ts` | `44OS/Features/Notifications/NotificationView.swift`, `44OS/Features/Notifications/NotificationStore.swift` | Owner accepted the updated web row design and duplicate-notification fix in-session. Recheck deduplication/persistence against identified revisions; device push delivery remains platform-specific. |
| Radio: same station/now-playing content and playback intent with release-derived ambient treatment | `src/app/radio/page.tsx` | `44OS/Features/Radio/RadioView.swift` | Owner accepted the web Radio background/toolbar presentation. Native share/navigation and playback surface may use native controls; paired playback and failure-state acceptance remains to be recorded. |

## Page-by-page parity workflow

1. Review one user journey at a time using the same account role, entitlement, content, and network assumptions on both clients. Start with the surfaces above, then continue through Search, Account/auth, Inbox, Calendar/events, Studio, Orders/commerce, and Support/legal as they enter scope.
2. Record the intended contract and required states before comparing implementation: initial/loading, success, empty, signed-out, pending, disabled/unauthorized, error/retry, and successful mutation where applicable. Include accessibility inputs and text scaling where relevant.
3. Inspect the named web and Swift source revisions, then exercise local builds independently. Keep code/source findings separate from screenshots, runtime interaction evidence, and production evidence.
4. For a mismatch, record one decision with date, owner, expected behavior, rationale, affected platforms, and acceptance criteria. Update the System only after that shared rule is accepted; keep the implementation task and verification record in this Plan.
5. Close a check only when both platforms have evidence or the owner explicitly accepts a documented exception. Reopen it when the owning component/contract changes, not merely because another unrelated page is reviewed. Link earlier evidence instead of repeating the same scenario.
6. Pair implementation work by the same issue/milestone across repositories. Review each repository’s current status before editing; preserve unrelated changes. Use the existing release gates in the System. Do not merge, submit, or deploy without explicit release approval.

## Work stages

### A. Documentation migration — this task

- [x] Keep the platform repository’s existing System and Plan as the canonical shared documents.
- [x] Add the cross-platform contract/evidence model and concise source map to the System.
- [x] Reframe the active Plan around the Shared Product Baseline 1.1 and the parity workflow.
- [x] Preserve the previous active Plan as a dated archive before replacing it.
- [x] Keep detailed typography findings in their existing reference document and link to it.
- [x] Verify references, documentation diff, and that no application/version/deployment files changed.

### B. Record and review the 1.1 baseline

- [ ] Match current web and iOS source commits, local builds, simulator/device, viewport, account role, and data fixtures before making current-state claims.
- [ ] Review the example surface rows above. Add missing user journeys only when evidence or product scope requires them; record one parity result per contract rather than per CSS selector or Swift modifier.
- [ ] Separate web behavior already accepted by the owner from behavior actually present in iOS and from behavior available in production. Mark each status and unresolved difference explicitly.
- [ ] Keep the first iOS catch-up delta limited to accepted Shared Product Baseline 1.1 behavior. Desktop browser and Tauri remain deferred.

### C. iOS 1.2 catch-up and later 1.2 work

- [ ] Once the 1.1 delta is agreed, implement and verify the approved iOS catch-up in the iOS repository, with a paired web review only where contract changes require it.
- [ ] Record the submitted iOS commit/build, submission date, App Store decision, device acceptance, and the paired web production identity. Do not change version/build metadata as part of documenting the baseline.
- [ ] Start later 1.2 product work only after the catch-up delta and release gate are closed; record new proposals separately so they do not silently alter the 1.1 reference.

### Deferred — desktop browser and Tauri

Resume after mobile web and iOS baseline alignment. Audit desktop responsive behavior and the Mac/Windows shells separately; the Tauri app is a shell loading the web origin, not the desktop-browser build.

## Acceptance for this documentation pass

- System and Plan clearly define their separate jobs and point to the existing typography reference.
- Every example surface names current web and Swift implementation entry points plus its known native distinction or open verification status.
- Baseline terminology is unambiguous and no technical version/build metadata is edited.
- The previous Plan working copy is preserved before the active Plan is replaced.
- Local references resolve; Markdown changes pass `git diff --check`; changed files are documentation only in the platform repository.
