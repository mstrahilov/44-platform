# 44OS Product & Engineering Operating Plan

**Status:** Active
**Documentation snapshot:** 2026-11-19
**Owner:** 44OS product owner
**Scope:** Product and engineering operations for the web/platform and native iOS products, with a structure that can later include additional software platforms.

This is the single active operating plan for 44OS. It defines how we plan, document, review, verify, and release software. It is not a general business plan. Marketing, legal operations, and customer support operations are outside its scope.

The durable product and architecture reference is [44OS_SYSTEM.md](44OS_SYSTEM.md). Keep the detailed source audit in [44OS iOS Typography.md](44OS%20iOS%20Typography.md). This Plan owns active release stages, milestones, decisions, evidence, and deferred engineering work. Do not create parallel System, UI, audit, roadmap, or operating-plan documents.

## 1. Operating principles

1. **One product, native implementations.** Keep one shared product contract for meaning, access, actions, and user-visible outcomes. Let each platform use its native navigation, controls, accessibility APIs, and visual materials when those differences are intentional and recorded.
2. **One durable reference and one active plan.** Put stable behavior and architecture in the System. Put current work and evidence in this Plan. Code remains the authoritative implementation; document disagreements instead of quietly assuming the document or source is correct.
3. **Pair cross-platform work.** Give a shared product change one issue or milestone and linked work in each affected repository. A platform-only implementation detail can stay in its own repository when it does not change the shared contract.
4. **Preserve evidence and history.** Separate source presence, owner acceptance, local runtime checks, and deployed artifacts. Keep completed decisions and previous plans in Git history or the archive; do not repeat settled reviews without a meaningful change in code or contract.
5. **Release deliberately.** A merged change, GitHub check, deployment, or App Store draft is not by itself owner approval to release. Web deployment and Apple submission/release are separate gates.
6. **Protect existing work.** Before editing, review Git status in both repositories. Do not reset, clean, overwrite, or commit unrelated work. Preserve untracked files and local configuration.
7. **Keep scope small enough to verify.** Plan work by user journey or component contract, not by an unbounded rewrite. Accessibility, permissions, loading/error states, and data ownership are part of the contract, not later polish.

## 2. Product versions and current release state

### Version language

- **Product version** is the release name communicated to customers in the App Store and the 44OS public release notes. It is not a Git commit, build number, internal package version, or deployment ID.
- **1.0** is the released product baseline for this operating plan.
- **1.1** is the next planned product release. Its purpose is to bring the iOS experience up to the accepted 1.0 web/product state and ship the agreed iOS refinements. The precise 1.1 delta must be reviewed and approved before implementation is called complete.
- After 1.1 ships, later product work should be proposed as 1.2 or later. Do not silently move unreleased features into a release after its scope is accepted.
- The public 1.0 release notes should remain 1.0. Add public 1.1 notes after the 1.1 App Store release, using only customer-visible changes selected for that release.
- Xcode's marketing version and App Store Connect's app-version entry must identify the same iOS product release. The Apple build string distinguishes a particular uploaded artifact and is not the public product version.
- The web package manifest currently says 0.1.0 and is marked private. Do not present it as a customer release version. In a later implementation decision, determine whether it is internal package metadata or should be synchronized; do not change it as part of this documentation pass.
- For any release, record the exact source commit(s), platform build identifiers, public product version, environment, and release decision. If a repository uses a separate deployment ID, record it rather than treating it as a product version.

Apple distinguishes its user-visible version from the build string and says the version should match App Store Connect. App Store Connect presents its version as the customer-facing App Store version. Follow Apple's current constraints when preparing an archive; this Plan does not change any Xcode, package, App Store Connect, or release value.

### Snapshot observed on 2026-11-19

These facts are intentionally separated by source and evidence. They do not all describe a shipped artifact.

| Surface | Observed value | Evidence and limit |
| --- | --- | --- |
| Public 44OS Release Notes at https://44os.com/releases | One visible entry: 44OS 1.0, dated July 23, 2026 | The page was fetched after the release-note update and showed the 1.0 heading/date. The platform source is src/lib/releases.ts; the update is in commit 5cd0352. The page content was checked, but the deployed artifact’s full commit identity was not independently matched. |
| App Store current version | 1.0 Ready for Distribution | Owner-provided App Store Connect version-list screenshot, 2026-11-19. |
| App Store Connect next version | 1.1 Prepare for Submission; Build section showed no build attached | Owner-provided App Store Connect screenshot, 2026-11-19. This proves the visible draft state at that time, not a later upload. |
| Xcode app target in local iOS checkout | Marketing version 1.1, build 7 | Source-confirmed in 44OS.xcodeproj/project.pbxproj in the local iOS worktree. That file is modified and the repository has many pre-existing uncommitted changes; this is not evidence that build 7 was uploaded or that 1.1 shipped. |
| Web package manifest | 0.1.0, private package | Source-confirmed in platform package.json; it is internal package metadata, not the public 1.0 release label. |
| Platform repository | main at 2106293 at inspection | Web working tree was clean before this documentation change. |
| iOS repository | Branch codex/universal-links-health-ios, with many modified/untracked files | Inspection found pre-existing work, including source, tests, project settings, and deleted local documentation. Preserve it. The repository was not changed for this Plan. |

Treat this table as a dated snapshot. Update it when a version, draft, build, branch, or deployed identity changes; do not turn the snapshot into a permanent claim.

## 3. Public research basis

The recommendations below adapt public guidance to a small, multi-platform product. They describe what the cited material publicly says; they do not claim access to any company's private operating process.

- **Apple Human Interface Guidelines:** Apple's public guidance emphasizes designing for the strengths and conventions of each supported platform, familiar components, accessibility, and consistent user expectations. 44OS should align core actions and outcomes while allowing iOS and web to use native presentation. [HIG design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles) · [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- **Apple app versioning:** Apple's documentation distinguishes the user-visible version from the build string and says the bundle version should match the version entered in App Store Connect. [Version-number glossary](https://developer.apple.com/help/glossary/version-number/) · [Prepare an app for distribution](https://developer.apple.com/documentation/Xcode/preparing-your-app-for-distribution) · [App Store Connect version information](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/)
- **Google platform translation:** Google's design guidance recommends translating user flows into the destination platform's conventions, considering the platform and its users before final styling. This supports documenting task outcomes separately from native presentation. [Translate iOS designs to Android](https://developer.android.com/design/ui/mobile/guides/foundations/translate-designs)
- **Spotify Encore public material:** Spotify describes a shared design-system foundation with local systems that can serve different product areas. This supports a 44OS contract plus documented platform-specific implementations, not an assumption that Spotify's internal process should be copied. [Spotify Engineering: Applying the Facade Pattern](https://engineering.atspotify.com/2024/02/applying-the-facade-pattern-on-spotify-for-artists)
- **USWDS public guidance:** the U.S. Web Design System documents token roles and accessibility guidance as parts of a design system. This supports documenting purpose and accessible use with tokens/components rather than recording isolated values only. [USWDS design tokens](https://designsystem.digital.gov/design-tokens/) · [USWDS accessibility](https://designsystem.digital.gov/documentation/accessibility/)
- **GitHub collaboration guidance:** GitHub documents branches and pull requests as a way to isolate, discuss, review, and validate changes before they enter a base branch. Use a lightweight paired-branch/PR practice for shared 44OS changes. [GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow) · [About pull requests](https://docs.github.com/en/pull-requests/get-started/about-pull-requests)

## 4. Documentation and repository ownership

### Canonical documentation

| Artifact | Location | Owns |
| --- | --- | --- |
| Stable product and architecture reference | Platform repo: Other/44OS_SYSTEM.md | Product terms, shared behavior contracts, security/data authority, repository boundaries, stable design/accessibility rules, and intentional platform differences. |
| Active Product & Engineering Operating Plan | Platform repo: Other/44OS_PLAN.md | Current product version stage, engineering workflow, milestone status, parity records, decisions, evidence, release gates, and deferred work. |
| Detailed typography audit | Platform repo: Other/44OS iOS Typography.md | The prior source-level iOS/web typography inventory. Keep it as a linked specialist reference and refresh it only when a typography parity task calls for it. |
| Contributor instructions | AGENTS.md in each repository | Repository-specific safety, editing, test, branch, and release instructions. Keep each file pointed to the canonical System and Plan; do not copy the full product reference into each repository. |
| Implementation truth | Source files in the owning repository | What currently builds and runs. If source behavior differs from the accepted product contract, record a parity issue and resolve it; do not conceal the mismatch by editing only documentation. |
| Historical plans | Platform repo: Other/archive/ | Superseded planning context retained for reference. Archived material is not the current instruction. |

The stable System and active Plan remain in the platform repository because its contributor guidance names them as the canonical shared documents. The iOS AGENTS.md points contributors there. Update that ownership model only through a deliberate documentation change, not by creating a second iOS plan.

### Repository responsibilities

| Repository | Owns | Does not own |
| --- | --- | --- |
| 44-platform at /Users/miro/Developer/44OS | Next.js web and mobile web, the Tauri web shell, Supabase schema/RLS/RPC, server/API contracts, email, payments, and production web behavior | SwiftUI implementation or Apple signing/submission settings |
| 44ios at /Users/miro/Developer/44OS-iOS | Native SwiftUI iPhone implementation, native playback/device behavior, iOS tests, signing, and App Store artifacts | Supabase production policy/schema or web application implementation |
| Future Android repository | Native Android presentation and device behavior, using shared 44OS product contracts and backend APIs | A separate product meaning or independent business rules |
| Future desktop browser/Tauri work | Desktop responsive web and shell-specific window/integration behavior | A second web product or a divergent source of business rules |

The platform repository remains authoritative for server data, authorization, business rules, protected assets, payments, and public API contracts. Each client owns its presentation and device-specific behavior. Desktop browser, Tauri, and Android remain deferred in the current 1.1 mobile/iOS effort.

## 5. Shared product contract and platform expression

For each shared concept, document:

- User goal and entry points.
- Content/data meaning and authoritative source.
- Actions and expected outcomes.
- Access, role, entitlement, and permission rules.
- Loading, empty, signed-out, disabled, pending, success, failure, and retry states that apply.
- Accessibility: names, focus/VoiceOver behavior, Dynamic Type or browser zoom, contrast, target size, keyboard/switch access, and reduced-motion behavior as relevant.
- Shared design-token roles and constraints for color, typography, spacing, shape, motion, and layering.
- Web and Swift implementation entry points.
- Intentional platform differences and their rationale.
- Evidence and the specific revision/environment it applies to.

Describe component contracts by role, anatomy, inputs, actions, and states. Keep exact implementation details and code in source. Avoid duplicated screen-specific rules where a shared contract or component can express the same behavior, but do not force visually identical controls when the platform convention differs. A difference is intentional only when the task still works, the user-visible outcome remains coherent, and the rationale is documented.

### Current cross-platform source map

Paths below were checked to exist in the current checkouts on 2026-11-19. They identify likely entry points, not complete implementation inventories or proof of parity.

| Product concept | Web entry points | Swift entry points | Contract and known comparison |
| --- | --- | --- | --- |
| Toolbar and primary navigation | src/components/Topbar.tsx, src/components/MobileToolbar.tsx | 44OS/DesignSystem/OSAppHeader.swift, 44OS/DesignSystem/OSDesignSystem.swift, 44OS/Features/Home/HomeView.swift | Same destinations and action intent; responsive web controls versus native navigation/materials. |
| Artwork cards and item detail | src/components/PublicArtwork.tsx, src/app/store/item/[identifier]/page.tsx, src/components/LibraryItemDetail.tsx | 44OS/Features/Home/HomeContent.swift, 44OS/Features/Item/ItemDetailView.swift, 44OS/Features/Library/LibraryItemDetailView.swift | Same item identity, artwork intent, content hierarchy, and actions; compare actual crop, ambient treatment, metadata, states, and spacing. |
| Track lists and playlists | src/components/PlaylistTrackList.tsx, src/components/PlaylistApp.tsx, src/components/SavedTracksLibrary.tsx, item route above | 44OS/Features/Library/LibraryExperienceViews.swift, 44OS/Features/Library/LibraryView.swift, 44OS/Features/Item/ItemDetailView.swift | Same track identity, artist destination, playback, row-menu outcome, and playlist editing; native menus and web hover/focus affordances may differ. |
| Community | src/app/community/page.tsx, src/app/community/thread/[id]/page.tsx | 44OS/Features/Community/CommunityView.swift, 44OS/Features/Community/ItemCommunitySection.swift | Same feed meaning, tags, mentions, post/reply actions, permissions, and error outcomes. |
| Profiles | src/app/profile/[username]/page.tsx | 44OS/Features/Profile/PublicProfileView.swift | Same public identity and relationship intent; verify owner/visitor, loading, empty, and error states. |
| Notifications | src/app/notifications/page.tsx, src/lib/achievementNotifications.ts | 44OS/Features/Notifications/NotificationView.swift, 44OS/Features/Notifications/NotificationStore.swift | Same event meaning, deduplication, read state, artwork/avatar, and destination; push permission/delivery is device-specific. |
| Library | src/components/LibraryApp.tsx, src/components/PlaylistApp.tsx, src/components/SavedTracksLibrary.tsx | 44OS/Features/Library/LibraryView.swift, 44OS/Features/Library/LibraryExperienceViews.swift, 44OS/Features/Library/LibraryItemDetailView.swift | Same save/ownership/history meaning and supported actions; grid/list layout can follow platform conventions. |
| Radio | src/app/radio/page.tsx | 44OS/Features/Radio/RadioView.swift | Same station/now-playing meaning and playback intent; system media controls, toolbar presentation, and materials may be native. |

Recheck paths when a component moves. Add a new row only when it represents a durable shared concept worth tracking; do not expand this into a file-by-file inventory.

## 6. Evidence and parity review method

Use exactly these evidence labels in milestone records:

- **Source-confirmed:** named behavior or structure exists in a named repository revision. Does not prove runtime success.
- **User-accepted:** the product owner explicitly accepted the observed behavior or appearance. Record scenario/date if known. Does not prove parity or deployment.
- **Locally verified:** exercised on a named source revision/build, device or simulator, viewport, account role, data/entitlement state, and relevant success/failure path.
- **Deployed and identity-matched:** deployed behavior was checked and the live artifact was matched to a commit/build identifier. A URL, successful push, or screenshot alone is insufficient to prove that identity.

A parity record includes concept and journey, expected contract, account/role/data prerequisites, web revision and result, iOS revision and result, states exercised, evidence links/captures, intentional differences, reviewer/date, and outcome or follow-up. If proof is missing or incomplete, label it unverified rather than treating the lack of a reported bug as success.

### Page-by-page review loop

1. Choose one journey/surface and define the user outcome before comparing pixels.
2. Confirm both repository states, revisions, app/build identity, account role, entitlement, content, and network assumptions. Preserve dirty work; never treat another branch's uncommitted source as a release.
3. Read the shared contract and relevant web/Swift entry points.
4. Exercise corresponding local builds through loading, success, empty, signed-out, permission-denied, failure/retry, and mutation states that apply. Include accessibility and text-size checks for the control being reviewed.
5. Record matches, differences, evidence, and accepted native exceptions. If the shared contract changes, update the System and linked work items in this Plan.
6. Create linked implementation tasks for each affected repo. Verify each platform separately and rerun only the relevant checks.
7. Close the parity item only when evidence supports the contract on both clients or the owner approves a documented exception. Link prior evidence so unchanged surfaces do not need to be re-audited without cause.

## 7. Change, review, and release workflow

### From proposal to merged implementation

1. **Describe the change:** user problem, desired outcome, affected surfaces, permissions/data implications, and acceptance criteria.
2. **Classify it:** shared contract change, platform-specific presentation, or server/data change. Identify repository owners from the System.
3. **Review state:** inspect both repositories' branches, diffs, and untracked files before editing. Ask the owner when existing local work creates a conflict; do not reset or overwrite it.
4. **Plan it:** add one milestone/issue in this Plan and linked implementation issues for affected repositories. Record dependencies and out-of-scope work.
5. **Implement by repository:** use paired milestone branches such as codex/<milestone>-platform and codex/<milestone>-ios when both clients change. Keep commits focused. Do not put SwiftUI in the platform repo or server policy in the iOS repo.
6. **Review before merge:** open a pull request for each repository with summary, contract change, screenshots/runtime evidence where relevant, checks, and paired PR/issue link. GitHub review/checks inform the decision but do not themselves authorize production release.
7. **Verify:** run the repository-required checks that fit the change, then the focused local scenario and accessibility pass. Record results against the exact revision.
8. **Update docs:** update the System if a durable product contract changed; update this Plan with current status/evidence. Update release notes only for customer-visible changes assigned to the upcoming product release.
9. **Merge separately from release:** merge approval does not mean deploy, submit to Apple, or announce the release. Obtain the owner's explicit release decision for each production action.

### Quality gates

- **Web/platform:** relevant lint, strict typecheck, production build, contract/security checks, and a focused browser smoke/viewport review. Follow platform AGENTS.md and select checks appropriate to changed areas.
- **iOS:** bash scripts/swift_syntax_check.sh, the 44OS-Unit scheme, focused 44OS-UI smoke test on a representative iPhone, and physical-device acceptance for a release candidate. Follow iOS AGENTS.md.
- **Cross-platform behavior:** test matching account/content/network states on both implementations; record intentional platform differences.
- **Security/data:** server-side authorization and RLS/RPC contracts remain authoritative; never rely on hidden UI for access control. Run relevant database/security checks for backend changes.
- **Documentation-only work:** check links/references and git diff --check; do not edit application code or version settings as a side effect.
- **Release approval:** owner decides whether/when to deploy web or submit/release Apple artifacts. Record commit/build/version and outcome. For the current iOS sequence, respect the iOS repository gate: complete the device acceptance pass, record the submitted commit/build and App Store outcome, and do not deploy platform catch-up changes before the agreed Apple/device release gate.

## 8. Milestones

Statuses refer to this operating snapshot and are not claims that code work has shipped.

### M0 — Establish the operating model and reconcile documentation
**Status: Complete — 2026-11-19**

- [x] Update the canonical System to define stable ownership, version vocabulary, platform differences, and relationship to this Plan.
- [x] Replace the old parity-only Plan with this Product & Engineering Operating Plan at the canonical path.
- [x] Preserve the replaced Plan in Other/archive/ only after the replacement is complete and checked.
- [x] Record public research, repo ownership, current release/version evidence, source map, workflow, milestones, and deferred work.
- [x] Check all local document/source references, review the complete diff, and run git diff --check in the platform repo.
- [x] Confirm only documentation files changed; leave the dirty iOS checkout, app/package settings, database, code, and deployments untouched.

### M1 — Lock the 1.0 baseline and agree the 1.1 delta
**Status: Open**

- [ ] Confirm the customer-visible 1.0 baseline across the public release notes and current App Store release, and capture the source/build/deployment identities where available.
- [ ] Reconcile the 1.1 draft in App Store Connect with the Xcode marketing version and the build string intended for the first upload; do not infer upload status from local build settings.
- [ ] Decide whether web package.json 0.1.0 is purely private package metadata or should be updated in a later implementation task. It is not the customer-facing product version today.
- [ ] Build the 1.1 surface-by-surface scope from accepted web changes and confirmed iOS gaps. Mark every candidate with evidence and an owner decision. Do not label incomplete or speculative work as “already in 1.0” or “done in 1.1.”
- [ ] Record a 1.1 acceptance checklist with shared journeys, deliberate native differences, data/role states, and accessibility checks.

### M2 — Implement the approved iOS 1.1 alignment
**Status: Open; no code synchronization is part of M0**

- [ ] Implement only the accepted 1.1 delta in the iOS repository, preserving existing uncommitted work and following its contributor instructions.
- [ ] Work through navigation/toolbars, artwork/item details, shared track lists and playlists, Community, profiles, notifications, Library, and Radio using the source map as a starting point.
- [ ] Review the web Add to Playlist full-screen paper picker on mobile and desktop: verify the shared Studio-style rows, Library plus artwork for Create New Playlist, Your Playlists section, playlist artwork and single-line titles with track counts, selection, and create-name-then-add flow across shared entry points. Source: `src/components/PlaylistPicker.tsx`, `src/components/ui44/Spacing.tsx`, `src/lib/domain/playlists.ts`, and `src/styles/44-ui/canonical-system.css`. Type-check passed on 2026-11-19; visual and interaction acceptance remains pending.
- [ ] Verify the Radio toolbar on web and iOS: icon-only Add to Playlist at left opens the existing picker for the synchronized station track, and standalone Share is at right. Check signed-out/no-track disabled states and that the target remains the displayed Radio track if another on-demand track is active. Source references: `src/app/radio/page.tsx`, `src/components/Topbar.tsx`, `44OS/Features/Radio/RadioView.swift`. Local iOS build/install passed on 2026-11-19; visual and interaction acceptance remains pending.
- [ ] Verify Discover’s shared Books/Merch 3:4 portrait cards (with square cards for other categories) and deterministic Merch ordering on both web and iOS using the same representative catalog items.
- [ ] Verify the seven Discover tabs appear in the shared order and Browse Merch opens the complete Merch list on both clients.
- [ ] Keep iOS-specific navigation, Liquid Glass/materials, native controls, Dynamic Type, system menus, and permission prompts native when behavior and outcomes still match the shared contract.
- [ ] For each mismatch, create linked web/iOS work where both platforms change. Do not introduce new product scope during catch-up without recording and approving it separately.
- [ ] Update the System and this Plan when accepted contracts or evidence change.

### M3 — Verify and prepare the iOS 1.1 release candidate
**Status: Open**

- [ ] Complete the iOS syntax/unit/UI checks required by the iOS repo and a focused manual test on a representative iPhone plus a physical-device acceptance pass.
- [ ] Test key roles, saved/unsaved states, loading/empty/error paths, playback/permissions, and accessibility behavior affected by the 1.1 delta.
- [ ] Select the intended archive version/build in Xcode, confirm it matches the 1.1 App Store Connect draft, upload the build, and verify the build that ASC associates with the draft. This is an implementation/release task, not a documentation action.
- [ ] Confirm public release notes, version strings, commit/build identities, and App Store metadata describe the same approved release.
- [ ] Hold submission and release for the product owner's explicit decision.

### M4 — Release and close 1.1
**Status: Open**

- [ ] Record the exact iOS submitted commit/build, submission date, App Store review result, release date, and device-acceptance evidence.
- [ ] Deploy any paired web changes only at the agreed release gate; record platform commit and deployed artifact identity.
- [ ] Add 1.1 to the public editorial release page when it is actually released, with only customer-visible changes included.
- [ ] Mark the shared release complete only after web and iOS release identities and behavior have been checked; record accepted exceptions and any follow-up.
- [ ] Archive or resolve 1.1 parity records without deleting their evidence.

### M5 — Operate later releases and add platforms
**Status: Future**

- [ ] Start 1.2 work after 1.1 is released and its closeout is recorded.
- [ ] Use the same change, review, evidence, and release workflow for each new product release.
- [ ] When Android begins, create its implementation repository and contributor instructions that point to the shared System and Plan; add Android source references and platform differences to the same contract records.
- [ ] Revisit documentation layout only when the existing System and Plan no longer serve their stated roles. Keep the number of canonical references small.

### Deferred from the current mobile 1.1 effort

- **Desktop browser parity** — review wider responsive layout, keyboard/focus behavior, desktop-only actions, and side rails after mobile web/iOS 1.1 alignment.
- **Mac/Windows Tauri behavior** — assess shell-specific window controls, notification bridge, deep links, and release packaging separately. Tauri loads the web application; it is not a separate implementation of the entire product.
- **Android implementation** — begin only after the shared contracts and release workflow are in place.
- **Business operations outside software** — marketing, legal operations, and customer support operations remain out of this Plan.

## 9. Maintenance and completion rules

- Review this Plan at the start of a milestone and update status/evidence as work changes; do not rewrite a completed item into a new claim.
- A milestone closes only when its listed acceptance evidence is present and its owner decision is recorded. Keep unresolved actions open.
- Keep stable product semantics in the System, active milestones and evidence here, and detailed inventories in narrowly scoped reference documents.
- Archive a superseded Plan after its replacement has been reviewed and checked. Never delete useful project history.
- Before a commit or pull request, inspect Git status in both repositories. Do not include pre-existing unrelated changes.
- This operating model is specific to 44OS and can evolve as the product gains platforms, contributors, and delivery automation.
