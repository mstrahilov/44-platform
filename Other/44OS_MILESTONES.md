# 44OS Current Milestones

This file contains only current work. It deliberately does not preserve retired milestone numbering, the implementation diary, deployment chronology, or completed checkbox history.

Current system behavior belongs in `44OS_FOUNDATION.md`. Current visual behavior belongs in `44OS_UI.md`. Git history retains implementation detail. Do not repeat accepted work unless relevant code, configuration, provider state, or production evidence changed.

## Current position

Recorded July 26, 2026:

- 44OS is live and healthy.
- `44os.com` is now the editorial front door, `app.44os.com` is the canonical application and PWA origin, `www` redirects to the apex, and legacy application links preserve their paths and queries on the app host.
- The architectural, UI, catalog, digital-commerce, Auth-email, transactional-email, Help Center, metadata, structured-data, and consent foundations described in Foundation/UI are implemented.
- Public Member signup and eligible digital/physical purchase presentation are active.
- Eight launch Merch products are live.
- The private Team workspace, Handbook, read-only Creator/release directories, and versioned Brand Kit are live for Admins and explicitly granted Team members.
- 44OS 1.1 is live with the accepted mobile shell, unified Discover and Community presentation, intent-based Community posts, route-aware Search, Account hub, Item-linked Community surfaces, and MASK as the first published desktop Game.
- The repository handoff remains limited to the four Foundation, UI, iOS, and Milestones documents. The August 7 web polish removed the signed-out Account login detour, cleared the production npm audit, batched repeated-card ownership, bounded Discover auxiliary queries, corrected stale experience contracts, and isolated marketing from the application stylesheet and shell chunks while preserving shared analytics consent.
- Two controlled digital orders completed purchase, refund, access revocation, email, and reconciliation with zero unexplained mismatch.
- The broad-launch audit was paused by the owner to preserve time and credits for user-facing improvements.
- No milestone below authorizes destructive cleanup, a Creator-clock re-base, a paid physical test, provider expansion, payout activation, or optional feature activation without its stated approval.
- A fully native SwiftUI iOS client is the next active product build. The existing mobile web application is its product and visual reference, but core iOS screens will be rebuilt natively and will share the existing server-authoritative 44OS platform rather than embed the website.

## Completed baseline — do not re-audit by default

The following areas are represented as current system truth in Foundation and UI and do not need their former milestone histories:

- Canonical Item/data spine, typed domain services, RLS/RPC boundaries, permanent IDs, archival, entitlements, and immutable audit.
- Persistent shell, canonical routes/redirects, Store, Library, Community, profiles, Inbox, Search, Radio, Studio, Admin, Support, Settings, Orders, and Calendar.
- Canonical UI materials/tokens/components, responsive shell/safe areas, shared player, page identity, and completed CSS/component cleanup baseline.
- Music achievements, named YouTube embeds, Overachiever Item unlocks, protected downloads, PDF Books, Sample Packs, form recovery, external links, Events, and Calendar.
- Interactive infrastructure is active only for the accepted MASK runtime; additional Games remain disabled pending separate acceptance. Version 1.2 promotes only standard single-owner non-exclusive Beat licenses through the existing independently gated Stripe path; split and exclusive Beat sales remain disabled.
- Printful-owned catalog synchronization, eight-product Merch launch catalog, Admin image workflow, featured/color/bonus imagery, safe replacement/orphan queue, signed provider webhook, quotes, and non-charging drafts.
- Stripe-hosted Checkout, signed webhook authority, immutable terms/order evidence, refund/dispute/access/accounting behavior, Admin offer pause/restore, and zero-mismatch reconciliation.
- Public Member signup, manual Creator paperwork-grace controls, branded Supabase Auth email, Resend transactional outbox/worker/webhook, monitored support mailbox, and production Help Center.
- Public metadata, published-only sitemap, structured-data foundation, indexability guards, and inert consent-gated analytics foundation.
- Permanent two-origin architecture: isolated light marketing layout, canonical app shell/PWA, exact host routing, legacy deep-link and API compatibility, app-origin Auth/Checkout/email links, paired desktop/mobile product screenshots, and the server-only rollback switch.
- Recorded release gates: schema replay, pgTAP security, linked lint/history, lint, typecheck, UI cleanup audit, hardening/observability/provider contracts, safe-area checks, production build, launch smoke, and diff integrity.

## Open milestones

Work through this single list. User-facing breakage comes before optional launch expansion. Record only the outcome and changed current truth; do not rebuild a step-by-step historical ledger here.

### 1. Native iOS Application

**Status: Native member/Creator Studio route-parity checkpoint complete; live Auth, protected behavior, accessibility matrix, and distribution acceptance remain open**

`44OS_IOS.md` is the canonical native product and architecture reference. This milestone records only the current implementation sequence and evidence gates.

#### Phase 0 — Environment and permanent decisions

- [x] Install Xcode 26.6 (build 17F113) and verify the bundled iPhone Simulator 26.5 SDK.
- [x] Change the active developer directory from `/Library/Developer/CommandLineTools` to the installed Xcode developer directory, accept any remaining first-launch/license requirements, and install at least one iOS Simulator runtime.
- [x] Verify `xcodebuild -version`, selected developer directory, installed SDKs, and available simulator/device destinations through the active command-line toolchain.
- [x] Inspect and preserve the complete Git working tree before creating files.
- [x] Confirm product name `44OS`, bundle identifier `com.fortyfour.os44`, iOS 18.0 minimum, iPhone-only first-release destination, current no-paid-membership signing state, and Simulator-first path before owner-device, TestFlight, or App Store distribution.
- [x] Confirm the member-first feature boundary: shell/design system, Auth, Home, Library, Radio/player, Community, Account, Store/Item details, remaining member utilities, approved native integrations, then commerce/distribution. By later explicit owner direction, Creator Studio visual/native route parity moved into the pre-refinement scope; its authenticated writes remain deferred.
- [x] Inventory the existing typed web domain services, Supabase RLS/RPC calls, authenticated route handlers, protected-asset flows, realtime needs, and server-only operations; record the accepted initial native split in `44OS_IOS.md`.
- [x] Record the accepted Xcode folder/project structure and Apple-frameworks-first dependency policy in `44OS_IOS.md`.

**Complete when:** Xcode can build an empty signed Debug application for an available simulator, the permanent identity decisions are recorded, and the backend inventory identifies how the first native journey obtains authorized data without a service-role credential.

#### Phase 1 — Native foundation and design system

- [x] Create the Xcode project, application target, unit-test target, and UI-test target without adding a WebView implementation of the product.
- [ ] Establish SwiftUI application lifecycle, dependency composition, typed navigation, feature boundaries, environment configuration, and sanitized diagnostics.
- [ ] Translate the accepted 44OS colors, typography roles, spacing, artwork ratios, Glass/Paper semantics, icons, controls, loading, empty, error, and accessibility states into reusable native primitives.
- [x] Build the five-destination Home, Library, Radio, Community, and Account navigation structure with placeholder feature boundaries only where needed.
- [ ] Verify safe areas, keyboard behavior, Dynamic Type, VoiceOver labels/order, light/dark presentation, reduced motion, and compact/large iPhone widths.
- [ ] Keep signing material, DerivedData, archives, and generated simulator data out of Git.

**Complete when:** the native shell and reference components render consistently in accepted simulators, pass the initial accessibility checks, and contain no copied React/CSS or embedded core web screens.

#### Phase 2 — Authentication and shared data boundary

- [x] Select and pin only the native dependencies justified by the Phase 0 inventory. Supabase Swift is pinned exactly at `2.53.0` with its resolved transitive graph recorded by Swift Package Manager.
- [ ] Connect the native client to the existing Supabase identities and reviewed 44OS service boundaries with user-scoped credentials.
- [ ] Implement secure session storage, refresh, logout, revoked-session handling, confirmation, recovery, and native-safe callback states.
- [x] Establish typed Auth, own-profile repository, and first-party HTTPS transport boundaries; SwiftUI views do not call database tables or arbitrary endpoints directly.
- [ ] Prove that Member, Creator, Team, and Admin visibility remains server-authoritative and that no native bundle contains privileged credentials.
- [x] Add deterministic development/test configuration without connecting automated tests to production data. Public local values are ignored by Git, validated before client construction, and replaced by offline services whenever `--ui-testing` is present.

Current evidence: Debug and Release simulator builds pass; offline unit tests cover configuration rejection, stable navigation identity, session/profile restoration, and mismatched-profile failure; the targeted UI path verifies the signed-out Library and native Account form. The built Info.plist contains all three required configuration values without printing the anonymous key. A normal Debug launch completed only the bounded public published-catalog read and rendered live production titles/artwork; no live signup, login, profile read, logout, migration, commerce action, or production write was performed. The owner approved an eventual controlled Auth check but selected UI-first implementation, so owner-account acceptance, callback design, revoked-session behavior, and role/permission verification remain open until a meaningful end-to-end native journey is ready.

**Complete when:** an owner-controlled account can authenticate in a native test build, load a bounded authorized read, persist/refresh securely, log out, and fail closed without weakening the web platform.

#### Phase 3 — Core member experience

- [ ] Implement Home discovery, category navigation, shelves, search entry points, and Item routing.
- [ ] Implement Library grouping/filtering and entitled Item presentation.
- [ ] Implement the single native Radio/Music player, queue, seek, interruptions, audio routes, lock-screen/remote behavior if approved, and recovery after suspension.
- [ ] Implement Community feed, categories, composer, mentions, reactions without public totals, conversations, editing, reporting, and Item references.
- [ ] Implement Account, public/owner profile, notifications, messages, settings, Support, recovery, legal, and role-aware Creator Studio destinations within the accepted version boundary. Calendar is hidden to match production; Checkout and Orders remain excluded.
- [ ] Implement Store and Item pages required for discovery, saving, listening, reading, and understanding work.
- [ ] Keep MASK and other interactive Items desktop-only unless a separate native-game milestone is approved.

Current Home/Search evidence: the native Discover screen uses a typed published-catalog repository; preserves Featured, Music, Books, Games, Merch, Beats, and Sample Packs; limits Recently Added to eight Music Items for a consistent square-card rail; keeps those distinct from eight additional New in Music fixtures; and provides eight deterministic examples for every remaining category. An August 1 production-mobile comparison refined the native presentation to a horizontal text-and-underline category rail, `New in Music` before `Recently Added`, tappable shelf headers with category disclosure, responsive two-up artwork/title/creator cards without web-only format labels, and a compact toolbar menu for supported sort and format controls. Category pages no longer duplicate the page title or inline Search; global Search remains the dedicated native search destination. The typed category source still supports title/creator search, format filtering, and Release Date/Recently Added/Title sorting. Native Search aggregates bounded published Items, public profiles, visible Community posts, and canonical Support links behind one read-only typed repository, with ranked suggestions, explicit submission, case/diacritic-insensitive matching, Items/Creators/Posts/Help sections, and native Item, reusable public-profile, and Community destinations. The Home/Search live-read-only catalog acceptance passed without Auth or production mutation. A thermal-safe single-job Simulator build, the complete 53-test unit target, and the focused primary-navigation UI journey passed August 1; the UI result includes retained screenshots of refined Featured and Music category states. The compact/large simulator matrix, manual VoiceOver, and real-device evidence remain open.

Current Library evidence: the native account surface uses a bounded `library_entries` repository constrained to the authenticated user and visible rows, with bounded nested Item/creator fields and no direct write path. Source covers Music, Books, Games, Beats, and Sample Packs grouping; physical Merch exclusion; title/creator search; a compact native category menu; full Library Item composition; tracklists; achievements/progress; included and bonus content; Creator Updates; local Reader layout; sample browser; and desktop-only interactive launch state. The August 1 production-reference pass removes acquisition labels from visual shelf cards, reduces the root to the accepted title/search-filter/category hierarchy, and translates music detail into centered artwork and identity, monochrome Play, and a full-width divider tracklist without a desktop panel. Relationship data remains available to the repository and accessibility boundary without being repeated as visual decoration. Live detail deliberately returns no invented protected achievements/assets until a contract is accepted. A thermal-safe single-job build, the complete 53-test unit target, and the refined signed-in Library root/music detail/tracklist/filter/game-detail journey pass on iPhone 17 Pro Simulator. Historical archived/revoked presentation, entitlement-aware playback/reading/download, protected assets, save/remove/progress mutations, owner-account read acceptance, and manual VoiceOver remain open.

Current Radio/player evidence: the native station uses a bounded read-only repository for active playlist entries plus track, published Music, streaming, artwork, and creator fields; SwiftUI does not access those tables directly. A shell-owned `PlayerStore` uses one `AVPlayer`/`AVAudioSession` foreground engine while test runs substitute a deterministic no-network engine. The August 1 production-reference pass confirms the intentional title-free centered Now Playing composition, synchronized station offset, square artwork, track and artist identity, one monochrome capsule Play/Stop control, loading/empty/retry states, and pull-to-refresh; accent color no longer dominates the primary playback control. The offline suite now has seventeen passing tests, including station looping, fail-closed loading, and shared player start/stop; the refined Radio UI composition/play/stop test passes on iPhone 17 Pro Simulator. Light and dark accessibility-extra-extra-extra-large renders were inspected. Live playlist decoding/audio acceptance, exact web creator-balanced rotation parity, queue/seek, analytics, interruption and route handling, lock-screen/remote controls, suspension recovery, approved background behavior, manual VoiceOver, and real-device evidence remain open, so the Radio/player checkbox is not yet complete.

Current Community evidence: the native feed and canonical thread pages use a typed repository; SwiftUI does not access Community tables or RPCs directly. Public reads are bounded to published, moderation-visible entries and replies, while post/reply creation, viewer-only Like state, and evidence-preserving reports remain authenticated user-scoped operations. Offline fixtures prove the stable All, General, Updates, Questions, Collaborations, Showcase, and Assistance filter order; Item references; hidden public Like totals; native navigation; root and nested replies; independent Like, Reply, Copy Link, and non-owner Report actions; signed-in composers; loading/empty/retry/refresh states; reusable public profiles; and fail-closed transport behavior. A compact Community author now expands through a bounded read-only public-profile repository into bio, icon links, all visible posts, and published Items. The complete 53-test unit target, signed-in filter/thread/reply/Like/post journey, dedicated public-profile journey, and primary navigation pass on iPhone 17 Pro Simulator with parallel cloning disabled; primary navigation also passed at accessibility-extra-extra-extra-large. Light and dark renders were inspected. Creator Update creation remains deliberately disabled until a published Item can be selected. Live owner identity/RLS/RPC acceptance, mentions, Item tagging, owner edit/delete, following, reply reactions, moderation/report acceptance, manual VoiceOver, and real-device evidence remain open, so the Community checkbox is not yet complete.

Current Account evidence: the native signed-in hub uses typed repositories for the matching owner's profile/external links, notifications, and participant-private Messages; SwiftUI does not access those tables or RPCs directly, identity mismatch fails closed, and Checkout/Orders are hidden. Stable source destinations are Profile, Creator Studio, Notifications, Messages, Support, and Settings. Calendar is also hidden because it is not a visible production feature; the Account acceptance journey asserts its absence. The signed-out state now matches production's progressive visual hierarchy: `44OS`, guidance, Email, and Continue first, followed by Welcome back, change-email summary, Password, Log in, and recovery. It preserves the reviewed native password sign-in implementation without yet copying production's server-orchestrated account discovery/signup path. The signed-in hub matches the accepted mobile information density with no redundant title/copy, a centered uncarded avatar and name, and one material list of production-ordered title/description rows with Log Out integrated at the end. Owner and visitor Profile share one content-backed native composition with centered identity, system typography, neutral avatar treatment, icon-only Around the Web links, monochrome controls, full-width tab rails, Community-style edge-to-edge post rows, and artwork-led Item grids with year metadata. Owner actions are Edit Profile/Open Studio; visitor actions remain safe Follow/Message/Share boundaries. Edit Profile uses a centered live preview, native form sections, the production external-link set, and a toolbar Save action that remains local-only. Email, Admin/Creator labels, and redundant Item-format labels are absent from public identity. Content-backed tabs expose published Music and other categories only when present. Notifications use production copy, a single native filter menu, one divider-separated material list, and restrained per-row overflow actions; the filter/thread/dismiss/achievement journey passes. Messages retain the native large-title plain-list inbox and now include production's participant `@username` detail; the inbox/thread/local-send/new-message journey passes. Settings matches production's Appearance-first hierarchy and exposes local System/Light/Dark and Amber/Sage/Ocean/Violet choices; static ambient gradients, shared native ultra-thin material surfaces, and selected-accent tint provide restrained theme-responsive glass without animation, continuous blur work, or Supabase writes. Support matches production's introduction, How can we help search, Quick help, grouped non-commerce topics, and monitored-email safety guidance through native large-title navigation, material divider lists, and native article detail. Its focused search/article journey passes with one test and zero failures plus a retained landing screenshot. Account Recovery now mirrors production's reset-request title, guidance, email field, and action in a focused native layout, while remaining an explicit no-send/no-write preview until delivery and native callback work is approved; the focused Log In-to-Recovery journey passes with one test and zero failures and a retained iPhone screenshot. Settings uses exact production titles/descriptions for Terms of Service, Privacy Policy, and Copyright and Takedowns and presents each canonical live document through Apple `SFSafariViewController`, keeping versioned text current without duplicating it in Swift or using `WKWebView` for a core feature. The legal title/URL contract test passes. Creator Studio follows production's landing hierarchy with the canonical title/copy, a monochrome create action, Saves/Plays/Sold/Earned metrics, Catalog, and Creator Tools. The Release editor now mirrors production's Details, Download/Market/Price, Artwork, Tracks, External Links, Achievements, Videos, removal, and save hierarchy using persistent native field labels, date/stepper/picker/toggle controls, appropriate URL and decimal keyboards, monochrome tint, and a hidden tab bar for deep form navigation. Asset selection, removal, and saving remain accurate local-only boundaries; its focused composition journey passes with one test and zero failures and two retained screenshots, followed by a clean final build after visual polish. Item-type-specific editors, Event and Update new/edit, Radio selection, Earnings, Payouts, and onboarding remain local-only routes. Team stays hidden until server-authoritative capability proves access. A thermal-safe single-job Simulator build, the complete 53-test unit target, the focused Community public-profile journey, the focused Account/Profile/Edit Profile/Studio journey, focused Support, Notifications, and Messages journeys, and the focused Account appearance journey pass on iPhone 17 Pro Simulator. Live Auth account discovery/signup/profile/recovery/callback acceptance, real following state, username validation, image/upload and Studio writes, notification/message synchronization, APNs, role-aware capability reads, manual VoiceOver, and real-device evidence remain open.

Current Store/Item evidence: Discover provides the stable Featured, Music, Books, Games, Merch, Beats, and Sample Packs entry structure. Its August 1 production-reference pass now uses native text-and-underline category navigation, category-disclosing shelf headers, responsive two-up cards, and a toolbar filter for the supported sort and format controls. Global Search remains separate. The full public detail screen remains behind a typed repository for bounded published tracks, external links, and same-creator related Items; SwiftUI does not query those tables directly. A production-mobile comparison against `Muses` refined Music detail to centered square artwork and release identity, a monochrome Library action plus compact Share control, and a full-width divider tracklist without the former desktop panel. Section names now match the accepted product language: Creator Updates, Community, Product Details, and More from the creator. Source also covers permanent routing, experience-specific artwork ratios, Beat metadata and license preview, public book/sample preview layouts, videos, reviews, merch-option selection, external links, native loading/retry, and explicit desktop-only Game states. Deterministic fixtures exercise these layouts; live Beat and expanded detail fields return nil or empty rather than inventing schema or authorization truth. A thermal-safe single-job build and the focused Product journey pass on iPhone 17 Pro Simulator with one test and zero failures, retaining refined Music and desktop-only Game screenshots. The Library action currently performs no write. Ownership/save, protected playback/reading/downloads, accepted live review/Item Community/merch reads, prices, Cart/Checkout/Orders, StoreKit, commerce policy review, manual VoiceOver, and real-device evidence remain open.

**Complete when:** the owner can complete the accepted everyday member journeys natively against the same canonical platform data, with no core WebView screen and no duplicate client-side authorization truth.

#### Phase 4 — Native integration and resilience

- [ ] Add only approved native capabilities such as APNs notifications, universal links, background audio, sharing, downloads, or offline behavior.
- [ ] Verify app switching, memory pressure, network transitions, interruption, keyboard/file pickers, protected assets, deep links, and recovery from terminated state.
- [ ] Measure launch time, scrolling, image loading, audio stability, energy, memory, and data usage on representative real devices.
- [ ] Complete VoiceOver, Dynamic Type, contrast, reduced motion, touch-target, and orientation acceptance.
- [ ] Preserve privacy declarations, permission purpose strings, and sanitized diagnostics that match actual behavior.

**Complete when:** accepted native integrations improve the iOS experience without introducing an unnecessary permission, privacy mismatch, protected-content leak, or server-authority regression.

#### Phase 5 — Commerce and distribution

- [ ] Review current App Store rules for digital content, external purchase links, reader behavior, physical Merch, StoreKit, entitlement restoration, refunds, and every intended launch country before implementing native purchase presentation.
- [ ] Obtain explicit owner approval before creating StoreKit products, changing commerce architecture, or running any production payment.
- [ ] Configure signing, provisioning, privacy manifests/answers, App Store metadata, screenshots, review notes, support/privacy links, and an approved review account or demo mode.
- [ ] Pass clean Debug/Release builds, unit/UI tests, static checks, simulator matrix, physical-device acceptance, archive validation, and TestFlight review.
- [ ] Submit to the App Store only after explicit owner approval; treat review feedback as a new bounded task.

**Complete when:** an accepted signed build passes owner-device and TestFlight testing, accurately declares its data and commerce behavior, preserves the existing 44OS platform boundary, and is approved for the chosen distribution path.

### 2. Desktop Mac and Windows Application

This is the detailed implementation tracker and handoff for the 44OS Mac and Windows website shells. It is intentionally thorough so a future session can resume without reconstructing the plan. Read Foundation and UI first, then resume from the earliest incomplete evidence gate in this milestone.

#### Current status

Recorded August 7, 2026:

- The repository and live domain architecture have been reviewed.
- Tauri 2 has been selected for a thin desktop shell that displays `https://app.44os.com`.
- Scope, risks, build targets, checks, release sequence, and estimated effort are documented below.
- The minimal Tauri source, locked Rust graph, desktop icon set, exact Tauri CLI, security contract, and private manual Windows workflow now exist. Local format, Clippy, and Rust tests pass.
- An ignored private universal Mac application and ad-hoc-signed DMG build successfully. The application launched directly into `https://app.44os.com/` with the accepted 44OS shell and live Discover content. No installed-package acceptance, Windows artifact, or public Download page exists yet.
- The next implementation step is to inspect/install the private DMG through the real Gatekeeper path, complete the Mac behavior/parity matrix, then run the private Windows workflow.

Checkboxes are evidence gates. Mark one complete only when its stated artifact or acceptance evidence exists. Add a dated progress-log entry after every implementation session.

#### Exact v1 scope

44OS Desktop v1 is the existing website inside a small desktop window. It is not a separate product implementation.

The shell will:

- Load exactly `https://app.44os.com/` in production.
- Load the local Next.js server during development.
- Use the same live accounts, catalog, Library, Community, Radio, Studio, Admin, payments, uploads, downloads, and server data as the website.
- Receive all normal product and UI updates automatically whenever the website is deployed.
- Provide a normal 44OS application icon and desktop window.
- Produce an installable Mac package and Windows installer.

The shell will not:

- Bundle or copy the Next.js frontend.
- Create a second API or database.
- Add broad computer access, a tray, launch-at-login, native menus, offline mode, or background services. The only narrow native feature is the approved notification permission/display bridge while the app is running.
- Use the Mac App Store, Microsoft Store, or paid Windows code signing.
- Add a native auto-updater. Website changes already appear on the next page load; a rare shell-only update can use a newly downloaded installer.
- Attempt to transfer browser/PWA sessions into the desktop WebView.

#### Architecture decision

Use **Tauri 2 as a minimal remote website shell**.

The current 44OS Next.js application depends on server rendering, hostname-aware routing, route handlers, Supabase, protected downloads, uploads, and payments. Tauri’s bundled Next.js integration requires a static export, so the existing application must remain hosted. The Tauri window supports an external WebView URL and will point at the canonical app origin.

Consequences:

- The desktop app requires an internet connection.
- The WebView has its own local browser storage, so a person signs in once inside the desktop app even if already signed in through Safari, Chrome, Edge, or the PWA.
- Normal web deployments do not require a new desktop installer.
- If the permanent app origin, icon, window behavior, or native shell configuration changes, users may need to download a newer installer manually.
- The wrapper must remain deliberately boring. If a feature already works through the website, do not recreate it in Rust.

#### Platform distribution tradeoff

The owner has enrolled in Apple Developer and approved a Developer ID release for macOS. Windows code signing remains a separate future decision.

- **macOS:** the public DMG is signed with the Developer ID Application certificate, notarized by Apple, stapled, and Gatekeeper-verified. The download page may describe this as a verified developer release.
- **Windows:** the unsigned installer can run, but Microsoft SmartScreen may warn that the publisher is unknown. The download page must explain that warning honestly.

Do not claim that the Windows installer is verified or store-approved. Do not instruct users to disable system security globally.

#### Time estimate

This is likely **one focused implementation session**, not a multi-day native application project.

| Work | Estimate |
|---|---:|
| Tauri scaffold, icons, remote window, and security boundary | 1–2 hours |
| Local Mac build and application-journey verification | 1–2 hours |
| Windows GitHub Actions build and installer verification | 1–2 hours |
| Download page, final checks, and handoff | 1–2 hours |
| **Expected total** | **4–8 focused hours** |

A second short session may be needed if Windows CI, WebView-specific audio/download behavior, or access to a real Windows device exposes a problem. The work should not take days unless the website itself has a platform incompatibility.

#### Permanent decisions

Resolve these while scaffolding and record the final values here:

- [x] Confirm shell application name: `44OS`.
- [x] Confirm permanent application identifier: `com.fortyfour.os44`.
- [x] Confirm v1 Mac target: universal DMG for Apple Silicon and Intel.
- [x] Confirm v1 Windows target: x64 NSIS installer for current Windows 10 and Windows 11.
- [x] Confirm minimum window: 960×640, with 1280×800 initial size.
- [x] Confirm the Download page may disclose the unsigned-publisher warning before download.

Changing the application identifier later can make the operating system treat the replacement as a separate app, so it should be chosen once.

#### Proposed repository ownership

Keep the shell inside this repository:

```text
src-tauri/
  Cargo.toml
  Cargo.lock
  build.rs
  tauri.conf.json
  capabilities/
  icons/
  src/
    lib.rs
    main.rs
.github/
  workflows/
    desktop-build.yml
scripts/
  desktop-contract.mjs
src/app/download/
  page.tsx
```

Expected package scripts:

- `desktop:dev` — open the shell against localhost.
- `desktop:check` — run the native configuration/security contract and Rust checks.
- `desktop:build` — build the current platform’s unsigned installer.

Do not create another frontend package, copy pages into `src-tauri`, run a bundled Node server, or commit installer artifacts to Git.

#### Security boundary

The production window loads remote web content. That content must not receive general access to the user’s computer.

- Keep `withGlobalTauri` false.
- Keep the sole remote Tauri capability limited to the exact app/local-development origins and notification permission/status/display commands.
- Do not enable Shell, Process, File System, HTTP client, Clipboard, Store, Dialog, Upload, or arbitrary command APIs.
- Explicitly list any capability file in `tauri.conf.json`; do not automatically accept every file found in the capabilities directory.
- Do not embed Supabase service-role credentials, provider secrets, Vercel secrets, Auth tokens, updater keys, or signing material.
- Use only HTTPS in production and only the exact `https://app.44os.com` start URL.
- Block unsafe schemes and unexpected embedded origins. External creator links, YouTube destinations, email links, and support links should open safely without granting their pages a native bridge.
- Do not expand the native boundary beyond the notification bridge without a separately approved security review.

#### Phase 0 — Planning

- [x] Review the live marketing/app domain split and canonical application origin.
- [x] Confirm the app relies on server behavior and should not be converted to a static export.
- [x] Select a Tauri 2 remote website shell.
- [x] Confirm no Apple Developer enrollment, app stores, paid code signing, native updater, or native-feature expansion for v1.
- [x] Define scope, effort, risks, build targets, tests, download behavior, and rollback.
- [x] Record primary references at the end of this file.

**Complete when:** this tracker and the first Milestone entry accurately describe the agreed website-shell project.

#### Phase 1 — Scaffold the shell

- [x] Inspect the latest Git status and dependencies before changing files.
- [x] Add Tauri CLI `2.11.4` as an exact dev dependency.
- [x] Initialize `src-tauri` without replacing or reconfiguring the Next.js application.
- [x] Generate and preserve `Cargo.lock` with compatible locked Tauri/Rust dependency versions; staging and commit remain owner-controlled.
- [x] Set product name, application identifier, shell version, copyright, homepage, and package targets.
- [x] Configure the development WebView URL as explicit `http://localhost:3000`.
- [x] Configure the production WebView URL as exactly `https://app.44os.com/`.
- [x] Do not set `frontendDist` to the Next.js build and do not add `output: 'export'`.
- [x] Do not run `npm run build` as though the website were bundled into the installer.
- [x] Configure a standard decorated window with dark initial background, centered launch, 1280×800 initial size, and 960×640 minimum size.
- [ ] Keep DevTools available for local development and disabled in the release build.
- [x] Keep the Rust entry point minimal and free of business logic.
- [x] Add `desktop:dev`, `desktop:check`, and `desktop:build` scripts.
- [ ] Verify `desktop:dev` opens localhost and production mode opens only the app origin.

**Complete when:** the Mac development shell opens the real 44OS UI, refreshes normally, and contains no native plugin or permission beyond the reviewed notification bridge.

#### Phase 2 — Icons and platform packages

- [x] Use the approved `public/icon-512.png` black-background 44 mark as the source artwork.
- [x] Generate the complete Tauri PNG, `.icns`, and `.ico` icon set from that source.
- [ ] Inspect the Mac Dock, Finder, Windows desktop, Start menu, taskbar, installer, and uninstall icon presentation.
- [x] Configure macOS direct-download targets as `.app` and DMG.
- [x] Build the universal Mac `.app` and branded DMG with the Apple Developer ID Application certificate, Apple notarization, stapling, and Gatekeeper verification.
- [x] Configure the Windows x64 NSIS setup executable.
- [x] Use the standard WebView2 download-bootstrapper behavior unless a clean Windows test proves an offline runtime is required.
- [ ] Record artifact filename, shell version, target, architecture, size, SHA-256 checksum, commit, and build date.
- [x] Keep generated desktop build output and installers out of Git history.

**Complete when:** the Mac DMG and Windows installer display the approved icon, install into the expected location, launch, and uninstall cleanly.

#### Phase 3 — Window and website behavior

Keep behavior browser-like unless a verified defect requires a narrow fix.

- [ ] First launch, refresh, back/forward navigation, minimize, maximize, full screen, close, reopen, and quit behave normally on Mac and Windows.
- [ ] A second launch either focuses the existing window or creates only the clearly intended single additional instance. Prefer one application instance if achievable without adding frontend permissions.
- [ ] The window never flashes a large white screen before the dark app loads.
- [ ] A network failure does not leave an unexplained permanent blank screen. At minimum, the operating-system/WebView error must allow refresh; a tiny local Retry surface is permitted only if necessary.
- [x] The first private production launch opens the application origin and accepted Discover shell rather than the marketing page.
- [ ] Internal `app.44os.com` routes stay in the shell.
- [ ] External HTTPS, `mailto:`, and support links behave predictably and do not create an unsafe native-capable page.
- [ ] Unexpected `file:`, `javascript:`, or arbitrary custom-scheme navigation is blocked.
- [ ] Popup-dependent behavior is tested instead of assumed.
- [x] The macOS 44OS menu exposes Settings, View mirrors Profile, Studio, Orders, Messages, and Settings, and Help links 44OS Support without adding a duplicate Log Out action or a remote menu capability.

**Complete when:** the wrapper feels like one stable 44OS window and cannot be navigated into an unsafe local or native-capable context.

#### Phase 4 — Website parity inside the shell

These tests prove the existing website works inside the platform WebViews. They are not requests to rewrite the features natively.

##### Authentication and account

- [ ] Signup, confirmation followed by normal login, email/password login, logout, session refresh, recovery, Settings, and profile editing pass.
- [ ] Document that a person already signed into a browser or PWA must sign in separately inside the desktop shell.
- [ ] Document that email links normally open the system browser. A custom desktop deep-link protocol is outside v1.
- [ ] Creator and Admin authorization remains server-authoritative and unchanged.

##### Discovery, Community, and Library

- [ ] Discover, Browse filters/sorts, Store, Item pages, profiles, Community, Radio, Search, Support, and legal pages load.
- [ ] Library save, purchased entitlements, achievements, notification history, Inbox, messages, and Orders load for the signed-in user.
- [ ] External creator links and YouTube content work without trapping the user in a broken blank window.

##### Playback

- [ ] Music starts after user intent and uses the existing shared player.
- [ ] Queue, seek, pause/resume, volume, next track, artwork/title, Radio shuffle, and route changes pass.
- [ ] Playback while minimized is measured on both systems.
- [ ] Sleep/wake, audio-device change, network interruption, and reconnect do not permanently stall or duplicate audio.
- [ ] Media keys/OS now-playing are not promised. If the WebView supports them, record that as observed behavior; do not add native integration in v1.

##### Uploads and downloads

- [ ] Artwork, PDF, ZIP, preview, and Music file pickers work.
- [ ] A resumable Music upload over 50 MiB completes on both systems and respects the 500 MiB ceiling.
- [ ] Interrupted upload and Studio form recovery are checked.
- [ ] Protected audio, PDF, ZIP, and sample downloads save with the correct filename.
- [ ] If the current browser download code fails in a platform WebView, repair the web behavior first where possible. Any native file bridge is outside the agreed v1 scope and requires a new owner decision.

##### Checkout

- [ ] Cart, currency, shipping, Stripe Checkout, 3DS if presented, success/cancel return, entitlement, Order history, and download access work.
- [ ] Run a non-charging test first; any production payment canary requires separate owner approval.
- [ ] Signed Stripe webhooks remain payment authority; the shell adds no payment state.

##### Notifications

- [ ] The in-app bell, unread count, mention, reply, message, like, and achievement history work.
- [x] macOS and Windows use the shared permission prompt through an origin-bound native bridge and can display newly observed activity while the app is running or minimized.
- [x] The PWA notification prompt distinguishes the desktop shell and does not falsely require installed-PWA display mode.
- [ ] Delivery after the desktop app is fully quit remains outside v1 and is not promised on the Download page.

**Complete when:** the accepted website journeys work on installed Mac and Windows shells without a wrapper-specific playback, upload, download, Auth, or payment failure.

#### Phase 5 — GitHub Actions Windows build

Windows packaging should use a native Windows GitHub Actions runner rather than cross-compilation from the owner’s Mac.

- [x] Create `.github/workflows/desktop-build.yml` with manual dispatch.
- [ ] Add a macOS job only if it provides useful reproducibility; the first Mac artifact may be built locally.
- [x] Add `windows-latest` x64 with Node LTS, Rust stable, npm cache, `npm ci`, desktop contracts, Rust formatting/Clippy/tests, and the Tauri build. Cargo reuses the runner cache until a dedicated reviewed cache step is justified.
- [x] Do not run the workflow on every web push to `main`; it is manual-only.
- [x] Upload the installer as a private 14-day workflow artifact for owner review before any public release.
- [ ] Pin third-party Actions to reviewed versions or commit SHAs before relying on the workflow.
- [x] Keep provider/application secrets out of the shell, workflow, logs, and artifact configuration; the desktop contract rejects known secret patterns.

**Complete when:** a clean native Windows runner produces an installer from the recorded commit and the owner can download it for testing.

#### Phase 6 — Automated checks

- [x] Add `scripts/desktop-contract.mjs`.
- [x] Assert the production WebView starts at exactly `https://app.44os.com/`.
- [x] Reject `http:` production URLs, origin wildcards, `withGlobalTauri: true`, unexpected capabilities/plugins, embedded secrets, and a changed application identifier.
- [x] Assert no Next.js static export or bundled frontend was introduced.
- [x] Assert no updater configuration exists in this v1 shell.
- [ ] Run web lint, strict typecheck, production build, domain contract, smoke tests, and diff integrity.
- [x] Run `cargo fmt --check`, Clippy with warnings denied, and Rust tests.
- [ ] Confirm both platform build jobs pass from a clean checkout.

**Complete when:** an unsafe origin/capability change, accidental native feature, static-export conversion, or broken platform build fails before an installer is shared.

#### Phase 7 — Real-device acceptance

Minimum matrix:

| Device | Required evidence |
|---|---|
| Apple Silicon Mac | DMG download, Gatekeeper path, install, full website journey, uninstall |
| Intel Mac | Same universal DMG launches and passes playback/login, or Intel is explicitly removed from support |
| Windows 11 x64 | SmartScreen path, standard-user install, full journey, uninstall |
| Windows 10 x64 | Install, login, playback, upload/download, uninstall |

For each device:

- [ ] Download through an anonymous browser rather than launching a local build.
- [ ] Record the exact OS version, processor architecture, artifact checksum, shell version, and commit.
- [ ] Confirm the warning text matches the Download page instructions and does not require disabling security globally.
- [ ] Complete the Phase 3 and Phase 4 journeys.
- [ ] Confirm uninstall removes the application while server-backed account/library/order/content data remains intact.
- [ ] Inspect native/WebView logs for tokens, credentials, private messages, full Auth links, or payment details.

**Complete when:** every advertised operating system/architecture has a real accepted installation and no critical website-shell regression remains.

#### Phase 8 — Download page and public release

- [ ] Create `https://44os.com/download` only after at least one tested installer exists.
- [ ] Add **Download App** directly beside **Open App** in the 44os.com marketing header only after the route and its available installer links pass anonymously.
- [ ] Design `/download` as a restrained editorial marketing page using the accepted 44os.com typography, spacing, monochrome palette, and navigation rather than application-shell UI.
- [ ] Show explicit **Download for Mac** and **Download for Windows** actions. OS detection may recommend one but must not hide the other.
- [ ] Host the approved artifacts in a public GitHub Release because the repository is public.
- [ ] Use stable first-party routes such as `/download/mac` and `/download/windows` that redirect to the reviewed current artifact.
- [ ] Show the shell version, simple system requirements, approximate size, install steps, the Windows unsigned-publisher warning, Support, legal links, and **Open Web App**. Keep architecture, build dates, and checksums in internal release evidence rather than the editorial UI.
- [ ] State clearly that the shell displays the live website and therefore needs an internet connection.
- [ ] State clearly that website improvements appear automatically; the shell itself has no native auto-updater.
- [ ] Never expose a local/CI artifact, broken link, placeholder package, or unsupported claim of verified publisher status.
- [ ] Verify content type, filename, redirect, anonymous access, checksum, and fresh install for both buttons.
- [ ] Add correct metadata and the Download route to the marketing sitemap.

Release order:

1. Owner-only local Mac build.
2. Owner-only Windows workflow artifact.
3. Real-device acceptance.
4. Public GitHub Release containing exact reviewed artifacts and checksums.
5. Stable first-party redirects.
6. `44os.com/download` page.
7. Marketing **Download App** action.
8. Seven-day support/error observation.

**Complete when:** an anonymous Mac user can download the notarized installer without an unidentified-developer block, and a Windows user can understand its unsigned-app warning, download the correct installer, install it, sign in, and use the live website shell successfully.

#### Manual replacement and rollback

There is no native updater in v1.

- Website/UI/API changes continue through normal GitHub-to-Vercel deployments and require no desktop download.
- If the shell configuration changes, increment the shell version, produce new artifacts, test them, replace the stable Download links, and tell affected users to install the new version.
- Never replace a public artifact behind the same filename/version/checksum. Publish a new version.
- If a shell build is broken, hide **Download App**, remove or redirect the affected stable download action, and keep **Open App** available.
- Do not roll back Supabase or the healthy website to repair a wrapper problem.
- Retain the affected artifact, checksum, commit, and incident evidence privately until the issue is understood.

#### Session progress log

##### 2026-08-07 — shell scaffold and live-web polish

- Completed: exact Tauri CLI and locked Rust scaffold, icons, capability-free remote configuration, desktop security contract, manual Windows workflow, universal Mac `.app`/DMG build, production dependency patches, shared signed-out Account auth, catalog-query batching, and marketing/application asset isolation.
- Accepted Mac window treatment: a slim transparent title bar uses the 44OS background, retains native traffic-light controls and dragging, hides the redundant window title, and keeps the web interface below it.
- Accepted UI direction: remove the former 10px application-frame gutter and redundant inner shell radius/border on desktop web and native shells; the native Mac window supplies its own outer corners.
- Added to release scope: an editorial `/download` page and a **Download App** action beside **Open App**, gated behind private Mac and Windows acceptance.
- Local review ready: the uncommitted editorial `/download` page, responsive marketing navigation buttons, production URL gates, fixed development-only Mac download endpoint, simplified platform choices, and Apple/Microsoft security disclosures are implemented. The local Mac response reproduces the internally reviewed DMG checksum exactly; Windows remains disabled because its CI artifact has not yet been produced.
- Windows release path ready: the private `windows-latest` workflow builds one unsigned x64 NSIS installer, renames it deterministically, records an internal SHA-256, and retains both for 14 days. The local import command validates the MZ/PE signatures and recognized NSIS-compatible PE machine type before copying the installer into the ignored review path; the packaged application target is verified separately as AMD64. Localhost enables **Download** only after validation succeeds.
- Local Windows test artifact ready: after the GitHub credential rejected workflow-file upload without `workflow` scope, the documented Tauri macOS cross-build path produced the unsigned NSIS `44OS-0.1.0-windows-x64-setup.exe`. The outer NSIS stub is the expected PE32 Intel 80386 self-extractor; the packaged 44OS executable is PE32+ AMD64 and uses the Windows GUI subsystem so launch does not create a separate console window. The 1.7 MB review copy is ignored under `artifacts/` with SHA-256 `c1f10397f91955b353b8671ca669833db3058bfa7fe97ceb738bacf3c27af247`. Cross-compilation remains experimental, so this artifact cannot pass the release gate until real Windows install, launch, behavior, and uninstall acceptance succeeds.
- Settings polish ready locally: Discover and Community consume one shared open underline-tab primitive, while Settings keeps Appearance, Account, and Notifications visible in one continuous hash-addressable page. Appearance places equal-width circular Theme and Accent pills on separate left-aligned rows with each pill's content centered. System uses a half-light, half-dark circle; Light and Dark use white and black circles.
- Desktop Account unification is ready locally: the Sidebar replaces Settings with an Account destination that uses the signed-in profile image, and the duplicate signed-in Topbar avatar/menu is removed. The shared Account hub now leads with a centered avatar/name identity, limits its menu to Profile, conditional Studio, conditional Orders, Messages, and Settings, and places Log Out as a separate centered action beneath the menu. Notifications and Support remain in their established shell controls.
- Owner-profile action polish is ready locally: the large Edit Profile and Open Studio buttons are removed from the identity row, and one circular glass pencil action aligned beneath the Topbar controls opens Edit Profile. Visitor Follow and Message actions remain unchanged; Studio stays available from Account.
- Desktop-launch onboarding and Discover polish are ready for release: signup now enters one editorial `/welcome` route with state-driven Member and Creator guidance; Creator profile setup is immediate but publishing remains approval-gated. Web Home uses `Discover` for every viewer and avoids a profile request solely for heading personalization. Its accepted rail order is Featured, Music, gated Beats, Samples, Merch, Books, Games. The rail begins below the title divider, then docks into the Topbar while scrolling; both states use the same open underline treatment, align to the content edge, and never become pills. On mobile, the docked rail replaces the logo/actions and scrolls horizontally. Community shares that dockable navigation, and Library shows All plus only the member's populated categories, omits its duplicate mobile Search field, and matches the Home opening rhythm. Every Home category uses a matching `Browse …` title without inline Beats Search. One taller, non-hovering Admin-selected release banner contains only its eyebrow, title, and release action. `New Releases` selects at most one latest non-featured release per creator, then image/name-only New Creators, nonempty Creators You Follow, and a nonduplicating Browse Music shelf precede Browse Beats, Browse Samples, Browse Merch, Browse Books, and Browse Games. The duplicate Recently Added shelf remains omitted. Home Creator links open the first available published-content profile tab and otherwise fall back to Posts. The experimental artist-specific release rows remain omitted. Admin Home is narrowly restored for the single audited banner selection. Primary Radio and Account destinations are route-prefetched and idle-warmed; their assembled data is shared briefly to avoid repeated navigation queries.
- Evidence: production npm audit reports zero vulnerabilities; web lint, strict typecheck, production build, focused contracts, Rust formatting, Clippy, and Rust tests pass. A local production-host comparison proves marketing omits the generated application stylesheet and `app-frame` while the app receives both. The Developer ID-signed and Apple-notarized `44OS.app` is a valid arm64/x86_64 Mach-O bundle with identifier `com.fortyfour.os44`; its mounted app and DMG both pass `spctl` with `source=Notarized Developer ID`. The accepted submission is `4955ea20-18fe-4075-a81a-da01ed3cf216`; the published-candidate DMG is 7,202,557 bytes with SHA-256 `ead11288c238eb468d366e8f37ff356968c7c2cb9a8c55036b2361b54cfdae28`.
- Decisions: keep Tauri rather than Electron, exact `https://app.44os.com/`, no native plugins/capabilities/updater, notarized Developer ID Mac and unsigned Windows distribution, shared first-party analytics consent, and four `Other` handoff documents.
- Blockers: complete Mac install/uninstall acceptance, Windows real-device acceptance, and public artifact hosting remain.
- Next: move the ignored Windows installer to the owner’s PC, verify SmartScreen disclosure, install/launch/navigation/auth/playback/upload/download/uninstall behavior, and report the exact Windows version plus results. Retain the artifact only if that matrix passes; configure no production URL before acceptance.

Add one concise entry after each desktop-shell session:

```text
##### YYYY-MM-DD — short session name

- Completed: exact checked items and artifacts.
- Evidence: commands, artifact names, OS/device, release/version/commit, and results.
- Decisions: permanent or temporary choices made.
- Blockers: device, CI, or code blocker and owner.
- Next: the earliest unchecked task to resume.
```

Never paste secrets, tokens, Auth links, user data, payment information, or verbose private logs into this file.

#### Next-session instructions

1. Read Foundation, UI, and this Milestones document.
2. Inspect current Git status and any existing `src-tauri` or workflow files; treat the repository as authority.
3. Verify the latest progress-log evidence.
4. Resume at the earliest incomplete phase unless a production incident takes priority.
5. Keep installers private until real-device acceptance passes.
6. Update this milestone before ending the session.

#### Primary references

Research verified July 20, 2026. Recheck current versions before implementation.

- [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/)
- [Tauri 2 Next.js integration and its static-export requirement](https://v2.tauri.app/start/frontend/nextjs/)
- [Tauri configuration reference, including external WebView URLs](https://v2.tauri.app/reference/config/)
- [Tauri capabilities and remote API access](https://v2.tauri.app/security/capabilities/)
- [Tauri Content Security Policy](https://v2.tauri.app/security/csp/)
- [Tauri distribution overview](https://v2.tauri.app/distribute/)
- [Tauri GitHub Actions pipeline](https://v2.tauri.app/distribute/pipelines/github/)
- [Tauri macOS signing, including ad-hoc signing](https://v2.tauri.app/distribute/sign/macos/)
- [Tauri Windows installer](https://v2.tauri.app/distribute/windows-installer/)
- [Tauri Windows code-signing and SmartScreen behavior](https://v2.tauri.app/distribute/sign/windows/)

**Complete when:** anonymous users can download the tested Mac or Windows installer from `44os.com/download`, understand the unsigned-publisher warning, install the shell, sign in, and use the live application without a critical wrapper-specific regression.

### 3. Production account and repository hygiene

**Status: Repository sweep refreshed July 23; production account deletion remains open and requires exact target verification**

- Repository hygiene keeps `Other/` limited to Foundation, UI, iOS, and Milestones. The live Team Handbook and Brand Kit sources live under `content/team/`; local Unity exports, design references, source artwork, and retired working notes live only in the ignored `.local-artifacts/` archive. Migrations, security tests, seed data, required local configuration, production assets, and the recovery-test fixture remain preserved.
- Verify the exact live identities and dependencies for the owner-named usernames `Adrian` and `Test`; distinguish usernames from content or track titles.
- Back up current data, delete only the approved accounts through the Auth Admin boundary, and compare preservation of unrelated Items, Community content, messages, Library, entitlements, orders, achievements, Events, and playback.

**Complete when:** the two approved accounts are absent, unrelated production evidence is preserved, only safe reproducible caches are removed, and the repository passes its proportional quality gates.

### 4. Legal and operating facts

**Status: Waiting on owner facts/approval**

- Record the exact registered entity spelling/type and public business address.
- Approve final Terms, Privacy, Copyright, refund/return, cancellation, shipping, and account-recovery wording.
- Decide whether a current U.S. Copyright Office designated-agent registration exists. Do not claim DMCA safe-harbor designation without it.
- Confirm Stripe/settlement ownership, statement descriptor, tax registration/remittance ownership, receipts/invoices, Printful billing/Wallet owner, return address, manual-confirmation operator, shipping promises, and support escalation.

**Complete when:** the published legal and operating facts are accurate, owner-approved, internally consistent, and contain no unsupported designation or placeholder business detail.

### 5. External alerts and operational ownership

**Status: Open**

- Name one primary responder and one genuinely separate backup responder.
- Assign external notification channels and approve either an applicable Vercel monitoring upgrade or a separately reviewed external monitor.
- Prove safe external delivery without generating a burst of production failures.
- Assign content moderation, abuse escalation, privacy-request, customer-support, and release-rollback owners.

**Complete when:** a real production-critical alert reaches the assigned external channel and every operational responsibility has a named owner and backup/escalation path.

### 6. Manual accessibility and device acceptance

**Status: Partially complete**

The public foundation and available Admin/Creator structure/contrast checks passed. Remaining work:

- Re-authenticate existing owner-controlled Member, Creator, and Admin sessions.
- Test focus order/visibility, menus/dialogs, error announcements, touch/keyboard operation, and VoiceOver names/order.
- Cover 390, 430, 1280, and 1440px, Safari, and an installed iOS/PWA launch.
- Do not create disposable production identities solely for this matrix.

**Complete when:** the role/device matrix passes without a launch-blocking accessibility, layout, or input failure and any narrow repairs are verified on affected surfaces.

### 7. Recovery and storage safety

**Status: Open**

- Restore current production database and referenced storage into a separate disposable project/environment.
- Compare permanent IDs, row counts, audit rows, entitlements, orders, provider references, and storage references.
- Resolve the recorded 69 unverified public-storage candidates across product, profile, resource, and track namespaces.
- Delete nothing outside the dedicated Merch prefix until current, historical, submission, and protected-access dependencies are mapped.

**Complete when:** the separate-project restore is proven and every candidate object is classified as referenced, intentionally retained, or safely removable with recorded evidence.

### 8. Analytics, search, and Merchant discoverability

**Status: Foundation deployed; external acceptance open**

- Establish owner and backup-owner access for GA4, Search Console Domain property, and Merchant Center; record only non-secret identifiers and recovery ownership.
- Approve analytics privacy/cookie behavior, retention, deletion, internal traffic, and staff/test filtering.
- Instrument representative discovery/content/Cart/Checkout surfaces. Purchase and refund events must come from durable server-authoritative, deduplicated evidence rather than redirects.
- Add the reviewed production Google measurement ID only after consent/privacy ownership is approved.
- Verify Search Console ownership, submit the canonical sitemap, inspect representative root/Store/Item routes, and clear critical crawl/index/mobile/security/structured-data errors.
- Complete a Bing Webmaster Tools or equivalent secondary-engine check using the same canonical sitemap.
- Publish a deterministic Merchant feed/API derived only from published, image-complete, available, margin-safe Merch; pass shipping, tax, returns, variant, price, availability, and image diagnostics.
- Set measurable Core Web Vitals, crawlability, index coverage, rich-result, Merchant, organic-acquisition, and verified-conversion budgets with owners and review cadence.

**Complete when:** consented production analytics records representative journeys without direct personal data or duplicate transactions; intended public routes are accepted by search engines; private routes stay excluded; eligible Merch passes Merchant diagnostics; and monitoring/rollback ownership is recorded.

### 9. Final public-launch decision

**Status: Owner action; do not execute early**

- Confirm the preceding legal, monitoring, accessibility, recovery/storage, ownership, and discoverability gates are accepted or explicitly deferred by the owner.
- Use the audited Admin control to re-base each approved existing Creator’s 30-calendar-day paperwork follow-up exactly once.
- Record explicit owner approval before expanding physical-commerce scope or enabling any provider/payout capability beyond the current boundary.

**Complete when:** the owner gives the terminal launch instruction, the Creator dates are correctly recorded, and rollback ownership is documented. This action starts the clock and must not be used for closed testing.

### 10. One real physical-commerce lifecycle

**Status: Waiting for owner-approved funds and timing**

- Run one owner-funded U.S. Hoodie or Windbreaker purchase with a known tester.
- Prove exact Stripe payment, current Printful quote, idempotent `confirm=false` draft, and explicit owner confirmation inside Printful. 44OS must never confirm through its API.
- Preserve signed production/status/tracking evidence.
- Prove the applicable cancellation/refund path and payment/fulfillment reconciliation without duplicate drafts, charges, or provider facts.

**Complete when:** the lifecycle ends with zero unexplained payment or fulfillment mismatch and all immutable order/provider evidence is preserved.

### 11. Optional inactive capabilities

**Status: Mostly deferred; first interactive runtime active**

- Interactive: MASK by ØLSTEN is the first published desktop Unity/WebGL Item. Its isolated compiled export, gzip/MIME headers, user-gesture start, Library entitlement, reviewed manifest, and desktop-only launch boundary are active. Progress events, signed achievements, and publication of additional games remain separate acceptance work.
- Beat Store: version 1.2 promotes the standard single-owner non-exclusive path. The implementation covers Add Beat, edit/recovery, permanent Discover/Store/Library Beats categories, original Basic/Premium/Trackout terms, exact license acceptance/snapshotting, Stripe Checkout, signed-payment grants, refund/dispute status, and protected Library files. Eligible complete offers now activate when their Beat is published; seller, offer, template, file, tax, Stripe, Beat-runtime, and general-commerce gates remain independently authoritative. The first `feel` Beat is published with active Basic and Premium offers. Complete one real low-value lifecycle before broad promotion. Splits remain a later acceptance; Exclusive licensing is out of scope.
- Beat Store detail is ready for 1.2: Add to Library is replaced by a Buy License anchor; public sections run Preview, Licenses, then Product Details; Product Details owns BPM, key, time signature, moods, instruments, sample data, and tags; aligned license rows expose License Info before the rightmost Add to Cart/View Cart action; the centered reusable focus-managed dialog sits above a full-window dark scrim; the retired Review-only/unavailable copy and Reviews section are absent; and same-creator recommendations contain Beats only with an explicit empty state. Cart and Checkout are exposed for standardized Beat offers, but neither can bypass the existing server-authoritative payment/runtime gates.
- Radio programming, newsletters, creator Merch, international physical shipping, Wise payout execution, desktop packaging, Services, and other ecosystem expansion require separate owner promotion into this open list.

**Complete when:** each capability receives its own explicit activation decision and required legal, provider, security, failure, accessibility, and rollback acceptance. Until then it remains hidden and fail-closed.

### Current Studio item-type refinement

Distinct Book, Sample Pack, Game, and Beat editors now preserve production's item semantics. Book covers Description, optional Release Date, Novel/Artbook/Zine type, Download, Artwork, full PDF, and Native Reader sample/page/language controls. Sample Pack covers mandatory paid-download pricing, Market, Artwork, full-pack ZIP, dynamic preview count, named preview audio, removal, and save. Game covers Details, the desktop-only/free-review boundary, Artwork, Unity WebGL ZIP, removal, and save without inventing mobile launch or pricing controls. Beat covers its tagged preview, BPM/time-signature/key, metadata, private delivery files, three standardized license offers, and rights attestation. Native navigation titles replace duplicate in-form web headings. Asset selection, removal, submission, and saving remain local-only and fail closed. The focused Book, Sample Pack, and Game journeys each pass with one test, zero failures, and two retained screenshots; the Beat journey passes with one test, zero failures, and three retained screenshots. Studio Radio preserves production's read-only playlist model, passes a focused journey with one retained screenshot, and can switch to the main Radio tab. Earnings, Payouts, and Creator Setup preserve production's ledger, readiness/history, and three-step seller setup concepts; one focused journey passes with four retained screenshots and no sensitive writes. Calendar, Events, and Updates are hidden production pages and remain excluded from native navigation.

### Current native visual acceptance baseline

The visible member-facing production page families now have native SwiftUI counterparts and focused visual evidence. Public Book, Sample Pack, and Merch Item variants pass one focused journey with three retained screenshots. Native Reader contents and chapter reading pass one focused journey with two retained screenshots. Checkout, Cart, Orders, payment processing, Admin operations, and hidden Calendar/Events/Updates remain explicitly outside this baseline. The next acceptance input is owner testing on a physical iPhone; resulting observations become targeted polish work and do not broaden data-write or commerce authorization.

## Maintenance

- Keep this as one ordered list with plain names. Do not reintroduce P/M numbering.
- Remove completed items from the open list after their durable behavior is captured in Foundation/UI and retain only a short baseline summary above.
- Do not paste deployment IDs, command transcripts, provider object IDs, test card journeys, or long rollback diaries here. Git history and immutable application/provider records retain that evidence.
- When work changes architecture or UI, update Foundation/UI in the same change.
- Completion requires authoritative evidence for the stated criterion, not UI presence or an unchecked error search.
