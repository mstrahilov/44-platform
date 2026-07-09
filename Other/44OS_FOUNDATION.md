# 44OS Foundation

**One of exactly two project handoff documents.** This file explains what 44OS is, how the app is structured, how Supabase is used, and what should happen next. Its sibling, `Other/44OS_UI.md`, defines the visual system and interaction rules. If any older note, chat memory, or comment disagrees with these two files, these two files win.

**Critical rule for future chats:** read `Other/44OS_FOUNDATION.md` and `Other/44OS_UI.md` before making changes. Keep them updated in the same change whenever architecture, routes, Supabase, Dock behavior, or UI rules change.

---

## 1. 44OS Definition

44 is the parent creative company. 44OS is the web-first creative operating system for fans, creators, collaborators, and clients. It is currently a Next.js web app and may later be wrapped as a desktop app for macOS and Windows.

The current launch surface is:

- **Home**: visual name for the public discovery/acquisition app. The underlying route can remain `/store` for now, but the Dock/app-facing label should become Home.
- **Library**: everything a signed-in user saved, added, or purchased.
- **Community**: social posts, replies, likes, profiles, follows, mentions, hashtags, and messaging surfaces.
- **Dashboard**: creator workspace for publishing and managing music, books, assets, achievements, extras, overview metrics, and earnings.
- **Resources**: guides, templates, and useful creative references.
- **Services**: 44-operated help/project/service intake.
- **Radio**: upcoming 44 Radio station/playlist experience.
- **Settings**: system, Dock, region, and account controls.
- **Support**: currently a quiet coming-soon page; future operating-system help center for account/login, orders, Dock/settings, Library behavior, purchases, downloads, Radio, and troubleshooting.

The web app follows a Steam-like public/private split. Signed-out visitors can browse public surfaces such as Home, Community, Resources, Services, Radio, and Support, plus shared item/profile links. Personal surfaces such as Library, Dashboard, and Settings are only exposed in the Dock after sign-in.

Language rules:

- The UI says **music**, **books**, **assets**, **merch**, **releases**, **items**, **library**, **reviews**, **updates**, **earnings**, and **sold items**.
- The UI does **not** say "products" as a generic catalog/item word. The shipped **Product Details** section label is allowed until renamed intentionally.
- The UI does **not** say "collection"; use **Library**.
- Services are 44-operated project intake/workspace flows, not a creator marketplace.
- Reviews live on Store item pages. Creator Updates live on owned Library item pages. They are not Community posts.

---

## 2. Stack And Local Workflow

- App: Next.js 16 App Router, React 19, TypeScript.
- Styling: custom CSS in `src/app/globals.css`, using `--os-*` tokens. No component library.
- Backend client: `@supabase/supabase-js`.
- Local project path: `/Users/miro/Studio/44 CORPORATION/44-platform`.
- Main scripts: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`.
- Current build gate: run `npm run build` after production-facing code changes. For docs-only changes, build is not required.
- `useSearchParams()` must stay inside `Suspense` boundaries or production builds can fail.
- GitHub push may require user auth setup. Local commits can exist even when `git push origin main` fails from missing GitHub credentials.

Do not delete files during cleanup just because they look unused. First identify tracked/untracked status, references, and route ownership. The next cleanup pass should be auditable and reversible.

---

## 3. Shell Architecture

The app shell is persistent. Only the workspace changes between apps.

Core shell files:

- `src/app/layout.tsx`: mounts providers, shell, topbar, workspace, and music player.
- `src/components/SystemShell.tsx`: global context-menu handling and Dock drag mode behavior.
- `src/components/Sidebar.tsx`: Dock rendering.
- `src/components/Topbar.tsx` and `src/components/TopbarContext.tsx`: tabs, back labels, search/cart/notifications/avatar controls.
- `src/components/MusicPlayerBar.tsx` and `src/components/MusicPlayerContext.tsx`: persistent music player.
- `src/components/ContextMenu.tsx`: one shared right-click menu primitive.

The app registry is the navigation backbone:

- `src/lib/osApps.ts` defines app id, label, description, href, icon, group, auth/creator gating, hidden state, and locked state.
- `getActiveOSAppId(pathname)` maps every route to exactly one owning app so Dock highlight state stays coherent.
- The Dock, Settings > Dock, and app availability should come from this registry. Do not hardcode app nav arrays.

Current default Dock in code:

- Signed-in default visible order: **Home**, **Library**, **Community**, **Dashboard**, **Resources**, **Services**, **Radio**.
- Signed-out public visible order: **Home**, **Community**, **Resources**, **Services**, **Radio**.
- Support remains the bottom help destination. The system slot shows Log In when signed out and Settings when signed in.
- Search opens from the topbar search control, not the Dock.
- Notifications open from the topbar bell, not the Dock.
- Profile and Inbox are account/community utilities, reached from profile/avatar or Community surfaces.
- Dock mode and visible apps are localStorage-first through `src/lib/dockPreferences.ts`.
- Pinned Dock items are localStorage-first and capped at 5. Pins can point to music, books, assets, profiles, or item pages. In compact mode pins use artwork/profile imagery when available.
- Dock app reorder exists in code/localStorage but should remain disabled for launch unless deliberately re-enabled later.

Current Dock behavior:

- The visible Store app is labeled **Home** and uses a Home-style icon. `/store` URLs remain for category and detail routes until a deliberate route migration is planned.
- Resources, Services, and Radio are available in the Dock/menu for building and testing.
- Users can still hide non-locked Dock apps from Settings > Dock.
- Signed-out visitors always see the default public Dock, regardless of any old local hidden-app preferences on the machine. Signed-in users can still personalize visible Dock apps locally.
- The Dock bottom cluster is **Support** above the system divider. Signed-out users see **Log In** where signed-in users see **Settings**.

Landing:

- `src/lib/landingPage.ts` still uses the `store` landing id, but it now resolves to **Home** at `/`.
- Settings currently offers only Home, Library, Community, and Dashboard as landing choices.
- Legacy landing choices normalize safely back to current apps.

Immediate landing target:

- `44os.com` opens the Home experience at the root domain and does not visibly land on `/store`.
- The app can continue using Store internals/routes behind the scenes, but the user-facing landing destination should read Home.
- Re-check saved user landing settings after the domain change because stale settings/redirects may be causing Settings tabs or Appearance/System controls to fail on production.

---

## 4. Current Routes

Primary routes:

- `/` - canonical Home surface at the root domain.
- `/store` and `/store/[category]` - Store browse surfaces.
- `/store/[category]/[slug]` - canonical Store item detail surface.
- `/product/[id]` - compatibility item route still exists and is Store-owned.
- `/cart` and `/checkout` - Store/cart surfaces.
- `/library` and `/library/[category]` - Library browse surfaces.
- `/library/[category]/[id]` - canonical owned Library item detail surface.
- `/community` - main feed with Feed, Following, Questions, and Collaboration tabs.
- `/community/[slug]`, `/community/new`, `/community/feed`, `/community/browse`, `/community/messages`, `/community/profile`, `/community/friends` - compatibility or secondary Community surfaces.
- `/profile` and `/profile/[username]` - profile surfaces, Community-owned in Dock behavior.
- `/inbox` - messaging surface, Community-owned.
- `/notifications` - notifications center, opened from the bell.
- `/dashboard` plus dashboard subroutes - creator workspace. Navigation should only expose current shipped Dashboard sections.
- `/settings` - System, Dock, Region, Account.
- `/support` - help surface.
- `/search` - global search from topbar.
- `/resources`, `/resources/[id]`, `/services`, `/service/[id]`, `/projects/[id]` - existing future/hidden surfaces.
- `/radio` - registered starter page for the Radio app.

Legacy/compatibility routes still exist in the codebase. The next health-check chat should audit which ones are actually linked, which should redirect, and which can be safely removed. Do not remove routes blindly.

---

## 5. Current App Behavior

### Home / Store

Home is the public acquisition surface. It currently uses Store routes and Store internals. Detail pages use the same clean release/item header style as Library detail pages, but with acquisition actions:

- Music: Add to Library for streaming/save; Add to Cart for paid download support.
- Books: Read Sample where available; Add to Cart or View in Library when owned.
- Assets: Add to Cart or library/download behavior depending on ownership.
- Merch: Add to Cart only.

Home/Store item pages show **Reviews**. Empty reviews show quiet text, not a card. Published reviews use the Community-style white/paper card surface.

### Library

Library is the saved/owned surface. Detail pages mirror Store header style without acquisition explainer text:

- Music: Play. Download appears only when the paid download is purchased.
- Books: Read and Download.
- Assets: Download.

Library music and Store music should share tracklist behavior: hover/selected play state, playable rows, track lengths, total length, straight dividers, rounded selected/hover rows, and context actions for Play and Play Next.

Library pages show achievements, extras/features, Product Details, and Creator Updates in that order where applicable.

Library is a personal surface. It is hidden from the signed-out Dock and direct visits show a quiet centered empty state asking the visitor to log in.

### Community

Community has been simplified into a single-page feed experience:

- Tabs: Feed, Following, Questions, Collaboration.
- Questions and Collaboration are official topic tabs based on hashtags like `#question` and `#collaboration`.
- New Post opens an inline composer.
- Clicking a post opens its reply drawer.
- Clicking the speech bubble opens the reply input for that post or reply.
- Only one reply drawer/input should be open at a time.
- Replies are newest-first within their visible drawer, with clean divider spacing and no vertical thread line.
- Mentions and hashtags are bold black links with no underline. Mention suggestions should appear only after the user starts typing a username fragment such as `@b`.
- Owned replies/posts should expose delete where appropriate.

### Dashboard

Dashboard is creator-first. Current shipped areas:

- Overview cards and summary metrics.
- Music, Books, Assets catalog editing.
- Achievements and extras/future release features foundation.
- Earnings/Sold Items as creator revenue context.

Avoid exposing placeholder tabs/workflows until they actually work.

Dashboard is a personal/creator surface. It is hidden from the signed-out Dock and direct visits show a login empty state; signed-in creator/admin capabilities still depend on profile permissions and available data.

### Settings

Settings tabs:

- System: theme/accent and system defaults.
- Dock: mode, visible apps, landing page, reset defaults.
- Region: country/currency/local pricing defaults.
- Account: email, password reset, privacy and notification preferences.

Reset defaults controls should sit at the bottom right of each settings page.

Settings are session-scoped in the UI. Signed-out visitors see a login prompt instead of editable controls, and stored theme/accent preferences only apply while a Supabase session is present. Signed-out visitors fall back to the default light/amber system look.

### Mobile

The site has a mobile pass: the Dock becomes a bottom tray, compact icon targets stay square, the workspace stacks, and major cards/details collapse to one column. Future mobile work should improve from this foundation rather than building separate mobile pages.

---

## 6. Supabase Baseline

Supabase is the source of live user/content data. Treat it carefully.

Important rule:

- **Do not run Supabase schema/data changes from an agent unless the user explicitly approves that specific change.**
- Prefer creating a reviewed SQL file in `Other/` and having the user run it manually after backup.
- Before any destructive SQL, export/backup the affected data and document rollback.
- Never rename existing Supabase tables casually. UI language can change without database table renames.

Auth/session behavior:

- The Supabase browser client uses `persistSession`, `autoRefreshToken`, and `detectSessionInUrl`.
- The app hydrates auth state from `supabase.auth.getSession()` so persisted browser sessions are restored quickly after page loads.
- If a user is unexpectedly signed out after these client settings, first check browser storage/cache clearing, Supabase auth token lifetime settings, and the Supabase Auth URL/redirect allow list before changing app code again.

Current data areas:

- `profiles`: auth profile, display name, username, avatar, bio, role, creator/admin flags, region/currency preferences.
- `products`: backend table for music, books, assets, merch, and future item types. UI should not say "products".
- `tracks`: music track metadata, order, duration, audio/download URLs.
- `product_assets`: files for books/assets/extras.
- `library_items`: saved/owned products, with acquisition type/status.
- `product_reviews`: Store reviews.
- `product_updates`: creator updates shown on Library item pages.
- `product_achievements`, `user_achievements`, `achievement_events`: release/book achievement definitions, unlocks, and notifications/events.
- `posts`, `post_replies`, `post_likes`, `reply_likes`: Community feed and replies.
- `profile_follows`: following graph.
- `conversations`, `conversation_members`, `messages`: messaging.
- `services`, `service_requests`, `project_messages`: Services/Projects spine.
- `resources`, `saved_resources`: resource discovery and saves.
- `user_os_preferences`, `user_app_preferences`: preference tables prepared for future persistence; many settings are still localStorage/profile-first.

Existing SQL/migration material:

- `Other/44os-phase7-additive-schema.sql`
- `Other/44os-steam-foundation.sql`
- `Other/44os-functional-sweep.sql`
- `supabase/migrations/20260704164154_remote_schema.sql`
- `supabase/migrations/20260704190000_44os_phase7_additive_schema.sql`
- `supabase/migrations/20260704201500_44os_steam_foundation.sql`
- `supabase/migrations/20260705220000_44os_achievement_tracking.sql`
- `supabase/migrations/20260705223000_44os_signal_boost_trigger.sql`
- `supabase/migrations/20260705233000_44os_product_sort_order.sql`

`supabase/.temp` is ignored and should remain local-only. `.DS_Store`, `.next`, and TypeScript build-info files are ignored generated artifacts and can be removed during cleanup.

---

## 7. Domain, Vercel, Auth, And Launch Checklist

The desired production domain is **44os.com**.

Current verified production setup:

- As of July 9, 2026 UTC, `https://44os.com` returns `200` from Vercel and matches `/`.
- As of July 9, 2026 UTC, `https://www.44os.com` returns a `308` redirect to `https://44os.com/`.
- Vercel has `44os.com` attached to Production and `www.44os.com` redirecting to `44os.com`.
- GoDaddy DNS points apex/root to Vercel and `www` to the Vercel CNAME target.
- `NEXT_PUBLIC_SITE_URL` should be `https://44os.com`.
- Auth callback URLs in app code use `src/lib/siteUrl.ts`, which preserves localhost during local development and uses `NEXT_PUBLIC_SITE_URL` for production-like hosts.
- Supabase Auth Site URL should match `https://44os.com`.
- Supabase Auth Redirect URLs should include `https://44os.com/**`, `https://www.44os.com/**`, and local development URLs.
- Password reset, email confirmation, magic link, signup, login, logout, and session persistence should be tested end-to-end on the production domain.
- If testers hit sign-in wait/rate-limit issues, inspect Supabase Auth rate limits, email provider limits, OTP settings, and custom SMTP setup. Do not blindly loosen security.
- If OAuth is added later, update provider callback URLs for the production domain.

Recommended manual test script:

1. Open `https://44os.com` in a clean/private browser.
2. Sign up with a new test email.
3. Confirm email or magic link.
4. Verify landing app, Dock, Library, Community, Dashboard access for creator role.
5. Log out.
6. Log in again.
7. Run password reset.
8. Verify reset link returns to the correct 44OS domain and leaves the user signed in correctly.

---

## 8. Next Work Queue

This is the handoff list for the next chat. Work top to bottom unless the user redirects.

1. **Production login/account QA.** Verify signup, login, logout, password reset, email confirmation/magic link, session persistence, and role/profile creation on `https://44os.com`.
2. **Production Settings regression check.** On the live domain, test Settings tabs and saved user preferences, especially System/appearance controls after the domain change.
3. **Support knowledge-base plan.** Turn Support into a Steam/Spotify-style help center for the OS: account/login, orders, Library saves/purchases/downloads, Dock/settings, Radio, creator uploads, troubleshooting, and contact/escalation.
4. **Route/taxonomy audit.** Make a current map of every route, its owner app, whether it is public, compatibility, hidden, or removable, and what it should redirect to if kept. Do not remove routes blindly.
5. **Lint health cleanup.** `npm run build` passes. `npm run lint` still has broad React hook/ref rule failures; separate real blockers from lint-rule migration noise and fix production blockers first.
6. **Supabase safety snapshot.** Generate a current schema/reference snapshot after user approval, and store it as documentation in `Other/`. Do not overwrite live data.
7. **Creator onboarding/upload polish.** Prepare the platform for invited creators to upload releases/books/assets without confusion or data loss.
8. **Final UI consistency sweep.** Check mobile, empty states, list materials, Dock active state, section spacing, context menus, and Home/Library detail parity.
9. **Radio app foundation.** Build Radio as a real app. First version can be a Supabase-backed playlist/station that plays continuously like 44 Radio, with schedule metadata. Dashboard creator submission/curation can come later.
10. **Desktop shell research.** After the web app stabilizes, compare Electron vs Tauri or another lightweight shell for macOS/Windows testing. Preserve web routing/auth/deep-link behavior.

---

## 9. Maintenance Rules

- Only maintain these two project handoff docs: `Other/44OS_FOUNDATION.md` and `Other/44OS_UI.md`.
- If app behavior changes, update the Foundation doc.
- If visual/interaction rules change, update the UI doc.
- If Supabase changes are proposed, add a reviewed SQL file and update this doc before running anything.
- Never make destructive database changes without explicit user approval and a backup/rollback plan.
- Keep future chats efficient: document the current state, not old debates.
