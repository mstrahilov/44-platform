# 44OS Desktop Applications

This is the implementation tracker and handoff for the 44OS Mac and Windows website shells. It is intentionally more detailed than `44OS_MILESTONES.md` so a future session can resume without reconstructing the plan. Read Foundation, UI, and Milestones first. Update this file during every desktop-shell work session.

## Current status

Recorded July 20, 2026:

- The repository and live domain architecture have been reviewed.
- Tauri 2 has been selected for a thin desktop shell that displays `https://app.44os.com`.
- Scope, risks, build targets, checks, release sequence, and estimated effort are documented below.
- No Tauri code, installer, public Download page, or desktop artifact exists yet.
- The next implementation step is **Phase 1 — Scaffold the shell**.

Checkboxes are evidence gates. Mark one complete only when its stated artifact or acceptance evidence exists. Add a dated progress-log entry after every implementation session.

## Exact v1 scope

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
- Add native features, broad computer access, a tray, launch-at-login, native push, native menus, offline mode, or background services.
- Use the Mac App Store, Microsoft Store, Apple Developer program, Apple notarization, or paid Windows code signing.
- Add a native auto-updater. Website changes already appear on the next page load; a rare shell-only update can use a newly downloaded installer.
- Attempt to transfer browser/PWA sessions into the desktop WebView.

## Architecture decision

Use **Tauri 2 as a minimal remote website shell**.

The current 44OS Next.js application depends on server rendering, hostname-aware routing, route handlers, Supabase, protected downloads, uploads, and payments. Tauri’s bundled Next.js integration requires a static export, so the existing application must remain hosted. The Tauri window supports an external WebView URL and will point at the canonical app origin.

Consequences:

- The desktop app requires an internet connection.
- The WebView has its own local browser storage, so a person signs in once inside the desktop app even if already signed in through Safari, Chrome, Edge, or the PWA.
- Normal web deployments do not require a new desktop installer.
- If the permanent app origin, icon, window behavior, or native shell configuration changes, users may need to download a newer installer manually.
- The wrapper must remain deliberately boring. If a feature already works through the website, do not recreate it in Rust.

## Unsigned distribution tradeoff

The owner has explicitly chosen not to enroll in Apple Developer or purchase Windows signing for this version.

This keeps the build simple, but operating systems will not identify 44OS as a verified publisher:

- **macOS:** use Tauri’s ad-hoc signing identity (`-`) so the downloaded application has a basic signature, especially for Apple Silicon. Gatekeeper may still identify it as unverified and require the user to choose Open from the context menu or approve it in Privacy & Security.
- **Windows:** the unsigned installer can run, but Microsoft SmartScreen may warn that the publisher is unknown. The download page must explain the warning honestly.

Do not claim the installers are notarized, verified, trusted, or store-approved. Do not instruct users to disable system security globally. If the owner later wants warning-free public installation, code signing becomes a separately approved milestone.

## Time estimate

This is likely **one focused implementation session**, not a multi-day native application project.

| Work | Estimate |
|---|---:|
| Tauri scaffold, icons, remote window, and security boundary | 1–2 hours |
| Local Mac build and application-journey verification | 1–2 hours |
| Windows GitHub Actions build and installer verification | 1–2 hours |
| Download page, final checks, and handoff | 1–2 hours |
| **Expected total** | **4–8 focused hours** |

A second short session may be needed if Windows CI, WebView-specific audio/download behavior, or access to a real Windows device exposes a problem. The work should not take days unless the website itself has a platform incompatibility.

## Permanent decisions

Resolve these while scaffolding and record the final values here:

- [ ] Confirm shell application name: recommended `44OS`.
- [ ] Confirm permanent application identifier: recommended `com.fortyfour.os44`.
- [ ] Confirm v1 Mac target: recommended universal DMG for Apple Silicon and Intel.
- [ ] Confirm v1 Windows target: recommended x64 NSIS installer for current Windows 10 and Windows 11.
- [ ] Confirm minimum window: recommended 960×640, with 1280×800 initial size.
- [ ] Confirm the Download page may disclose the unsigned-publisher warning before download.

Changing the application identifier later can make the operating system treat the replacement as a separate app, so it should be chosen once.

## Proposed repository ownership

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

## Security boundary

The production window loads remote web content. That content must not receive general access to the user’s computer.

- Keep `withGlobalTauri` false.
- Begin with no remote Tauri capabilities.
- Do not enable Shell, Process, File System, HTTP client, Clipboard, Store, Dialog, Upload, or arbitrary command APIs.
- Explicitly list any capability file in `tauri.conf.json`; do not automatically accept every file found in the capabilities directory.
- Do not embed Supabase service-role credentials, provider secrets, Vercel secrets, Auth tokens, updater keys, or signing material.
- Use only HTTPS in production and only the exact `https://app.44os.com` start URL.
- Block unsafe schemes and unexpected embedded origins. External creator links, YouTube destinations, email links, and support links should open safely without granting their pages a native bridge.
- Do not add a native permission merely to imitate something that already works in the WebView.

## Phase 0 — Planning

- [x] Review the live marketing/app domain split and canonical application origin.
- [x] Confirm the app relies on server behavior and should not be converted to a static export.
- [x] Select a Tauri 2 remote website shell.
- [x] Confirm no Apple Developer enrollment, app stores, paid code signing, native updater, or native-feature expansion for v1.
- [x] Define scope, effort, risks, build targets, tests, download behavior, and rollback.
- [x] Record primary references at the end of this file.

**Complete when:** this tracker and the first Milestone entry accurately describe the agreed website-shell project.

## Phase 1 — Scaffold the shell

- [ ] Inspect the latest Git status and dependencies before changing files.
- [ ] Add the current compatible Tauri 2 CLI as an exact dev dependency.
- [ ] Initialize `src-tauri` without replacing or reconfiguring the Next.js application.
- [ ] Commit `Cargo.lock` and use compatible pinned Tauri/Rust dependency versions.
- [ ] Set product name, application identifier, shell version, copyright, homepage, and package targets.
- [ ] Configure the development WebView URL as an explicit localhost address.
- [ ] Configure the production WebView URL as exactly `https://app.44os.com/`.
- [ ] Do not set `frontendDist` to the Next.js build and do not add `output: 'export'`.
- [ ] Do not run `npm run build` as though the website were bundled into the installer.
- [ ] Configure a standard decorated window with dark initial background, centered launch, 1280×800 initial size, and 960×640 minimum size unless the owner selects different values.
- [ ] Keep DevTools available for local development and disabled in the release build.
- [ ] Keep the Rust entry point minimal and free of business logic.
- [ ] Add `desktop:dev`, `desktop:check`, and `desktop:build` scripts.
- [ ] Verify `desktop:dev` opens localhost and production mode opens only the app origin.

**Complete when:** the Mac development shell opens the real 44OS UI, refreshes normally, and contains no unnecessary native plugin or permission.

## Phase 2 — Icons and platform packages

- [ ] Use the approved black background and green 44 logo as the source artwork.
- [ ] Generate the complete Tauri PNG, `.icns`, and `.ico` icon set from one source.
- [ ] Inspect the Mac Dock, Finder, Windows desktop, Start menu, taskbar, installer, and uninstall icon presentation.
- [ ] Configure macOS direct-download targets as `.app` and DMG.
- [ ] Build the Mac package with Tauri’s ad-hoc signing identity (`-`), not an Apple Developer certificate.
- [ ] Configure the Windows x64 NSIS setup executable.
- [ ] Use the standard WebView2 bootstrap behavior unless a clean Windows test proves an offline runtime is required.
- [ ] Record artifact filename, shell version, target, architecture, size, SHA-256 checksum, commit, and build date.
- [ ] Keep built installers out of Git history.

**Complete when:** the Mac DMG and Windows installer display the approved icon, install into the expected location, launch, and uninstall cleanly.

## Phase 3 — Window and website behavior

Keep behavior browser-like unless a verified defect requires a narrow fix.

- [ ] First launch, refresh, back/forward navigation, minimize, maximize, full screen, close, reopen, and quit behave normally on Mac and Windows.
- [ ] A second launch either focuses the existing window or creates only the clearly intended single additional instance. Prefer one application instance if achievable without adding frontend permissions.
- [ ] The window never flashes a large white screen before the dark app loads.
- [ ] A network failure does not leave an unexplained permanent blank screen. At minimum, the operating-system/WebView error must allow refresh; a tiny local Retry surface is permitted only if necessary.
- [ ] The shell never loads the marketing page in place of the app.
- [ ] Internal `app.44os.com` routes stay in the shell.
- [ ] External HTTPS, `mailto:`, and support links behave predictably and do not create an unsafe native-capable page.
- [ ] Unexpected `file:`, `javascript:`, or arbitrary custom-scheme navigation is blocked.
- [ ] Popup-dependent behavior is tested instead of assumed.

**Complete when:** the wrapper feels like one stable 44OS window and cannot be navigated into an unsafe local or native-capable context.

## Phase 4 — Website parity inside the shell

These tests prove the existing website works inside the platform WebViews. They are not requests to rewrite the features natively.

### Authentication and account

- [ ] Signup, confirmation followed by normal login, email/password login, logout, session refresh, recovery, Settings, and profile editing pass.
- [ ] Document that a person already signed into a browser or PWA must sign in separately inside the desktop shell.
- [ ] Document that email links normally open the system browser. A custom desktop deep-link protocol is outside v1.
- [ ] Creator and Admin authorization remains server-authoritative and unchanged.

### Discovery, Community, and Library

- [ ] Discover, Browse filters/sorts, Store, Item pages, profiles, Community, Radio, Search, Support, and legal pages load.
- [ ] Library save, purchased entitlements, achievements, notification history, Inbox, messages, and Orders load for the signed-in user.
- [ ] External creator links and YouTube content work without trapping the user in a broken blank window.

### Playback

- [ ] Music starts after user intent and uses the existing shared player.
- [ ] Queue, seek, pause/resume, volume, next track, artwork/title, Radio shuffle, and route changes pass.
- [ ] Playback while minimized is measured on both systems.
- [ ] Sleep/wake, audio-device change, network interruption, and reconnect do not permanently stall or duplicate audio.
- [ ] Media keys/OS now-playing are not promised. If the WebView supports them, record that as observed behavior; do not add native integration in v1.

### Uploads and downloads

- [ ] Artwork, PDF, ZIP, preview, and Music file pickers work.
- [ ] A resumable Music upload over 50 MiB completes on both systems and respects the 500 MiB ceiling.
- [ ] Interrupted upload and Studio form recovery are checked.
- [ ] Protected audio, PDF, ZIP, and sample downloads save with the correct filename.
- [ ] If the current browser download code fails in a platform WebView, repair the web behavior first where possible. Any native file bridge is outside the agreed v1 scope and requires a new owner decision.

### Checkout

- [ ] Cart, currency, shipping, Stripe Checkout, 3DS if presented, success/cancel return, entitlement, Order history, and download access work.
- [ ] Run a non-charging test first; any production payment canary requires separate owner approval.
- [ ] Signed Stripe webhooks remain payment authority; the shell adds no payment state.

### Notifications

- [ ] The in-app bell, unread count, mention, reply, message, like, and achievement history work.
- [ ] Native desktop push is not part of v1 and is not promised on the Download page.
- [ ] The PWA notification prompt must not loop or falsely imply the desktop shell is an installed PWA.

**Complete when:** the accepted website journeys work on installed Mac and Windows shells without a wrapper-specific playback, upload, download, Auth, or payment failure.

## Phase 5 — GitHub Actions Windows build

Windows packaging should use a native Windows GitHub Actions runner rather than cross-compilation from the owner’s Mac.

- [ ] Create `.github/workflows/desktop-build.yml` with manual dispatch.
- [ ] Add a macOS job only if it provides useful reproducibility; the first Mac artifact may be built locally.
- [ ] Add `windows-latest` x64 with Node LTS, Rust stable, npm cache, Cargo cache, `npm ci`, desktop contracts, Rust formatting/Clippy/tests, and the Tauri build.
- [ ] Do not run the workflow on every web push to `main`; shell installers change only when desktop files or the shell version change.
- [ ] Upload the installer as a private workflow artifact for owner review before any public release.
- [ ] Pin third-party Actions to reviewed versions or commit SHAs before relying on the workflow.
- [ ] Ensure logs and artifacts contain no repository, Vercel, Supabase, Stripe, Resend, Printful, or Google secrets.

**Complete when:** a clean native Windows runner produces an installer from the recorded commit and the owner can download it for testing.

## Phase 6 — Automated checks

- [ ] Add `scripts/desktop-contract.mjs`.
- [ ] Assert the production WebView starts at exactly `https://app.44os.com/`.
- [ ] Reject `http:` production URLs, origin wildcards, `withGlobalTauri: true`, unexpected capabilities/plugins, embedded secrets, and a changed application identifier.
- [ ] Assert no Next.js static export or bundled frontend was introduced.
- [ ] Assert no updater configuration exists in this v1 shell.
- [ ] Run web lint, strict typecheck, production build, domain contract, smoke tests, and diff integrity.
- [ ] Run `cargo fmt --check`, Clippy with warnings denied, and Rust tests.
- [ ] Confirm both platform build jobs pass from a clean checkout.

**Complete when:** an unsafe origin/capability change, accidental native feature, static-export conversion, or broken platform build fails before an installer is shared.

## Phase 7 — Real-device acceptance

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

## Phase 8 — Download page and public release

- [ ] Create `https://44os.com/download` only after at least one tested installer exists.
- [ ] Add **Download App** to the marketing header only after the route and its available installer links pass anonymously.
- [ ] Show explicit **Download for Mac** and **Download for Windows** actions. OS detection may recommend one but must not hide the other.
- [ ] Host the approved artifacts in a public GitHub Release because the repository is public.
- [ ] Use stable first-party routes such as `/download/mac` and `/download/windows` that redirect to the reviewed current artifact.
- [ ] Show shell version, build date, system requirements, architecture, approximate size, SHA-256 checksum, simple install steps, unsigned-publisher warning, Support, legal links, and **Open Web App**.
- [ ] State clearly that the shell displays the live website and therefore needs an internet connection.
- [ ] State clearly that website improvements appear automatically; the shell itself has no native auto-updater.
- [ ] Never expose a local/CI artifact, broken link, placeholder package, or claim of verified publisher status.
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

**Complete when:** an anonymous Mac or Windows user can understand the unsigned-app warning, download the correct installer, install it, sign in, and use the live website shell successfully.

## Manual replacement and rollback

There is no native updater in v1.

- Website/UI/API changes continue through normal GitHub-to-Vercel deployments and require no desktop download.
- If the shell configuration changes, increment the shell version, produce new artifacts, test them, replace the stable Download links, and tell affected users to install the new version.
- Never replace a public artifact behind the same filename/version/checksum. Publish a new version.
- If a shell build is broken, hide **Download App**, remove or redirect the affected stable download action, and keep **Open App** available.
- Do not roll back Supabase or the healthy website to repair a wrapper problem.
- Retain the affected artifact, checksum, commit, and incident evidence privately until the issue is understood.

## Session progress log

Add one concise entry after each desktop-shell session:

```text
### YYYY-MM-DD — short session name

- Completed: exact checked items and artifacts.
- Evidence: commands, artifact names, OS/device, release/version/commit, and results.
- Decisions: permanent or temporary choices made.
- Blockers: device, CI, or code blocker and owner.
- Next: the earliest unchecked task to resume.
```

Never paste secrets, tokens, Auth links, user data, payment information, or verbose private logs into this file.

## Next-session instructions

1. Read Foundation, UI, Milestones, and this tracker.
2. Inspect current Git status and any existing `src-tauri` or workflow files; treat the repository as authority.
3. Verify the latest progress-log evidence.
4. Resume at the earliest incomplete phase unless a production incident takes priority.
5. Keep installers private until real-device acceptance passes.
6. Update this file and the desktop Milestone before ending the session.

## Primary references

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
