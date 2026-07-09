# 44OS Foundation

**One of exactly two project handoff documents.** This file explains what 44OS is, how the app is structured, how Supabase is used, and what should happen next. Its sibling, `Other/44OS_UI.md`, defines the visual system and interaction rules. The finalized build plan in `Other/44OS_Finalized_Build_Plan.md` can temporarily supersede this file and the UI doc where it says so; once a decision is adopted, update these handoff docs in the same change so they stay current.

**Critical rule for future chats:** read `Other/44OS_FOUNDATION.md` and `Other/44OS_UI.md` before making changes. Keep them updated in the same change whenever architecture, routes, Supabase, Dock behavior, or UI rules change.

---

## 1. 44OS Definition

44 is the parent creative company. 44OS is the web-first creative operating system for fans, creators, collaborators, and clients. It is currently a Next.js web app and may later be wrapped as a desktop app for macOS and Windows.

The current launch surface is:

- **Browse**: visual name for the public discovery/acquisition app. The underlying route can remain `/store` for now, but the Dock/app-facing label is now Browse and uses the grid icon.
- **Library**: everything a signed-in user saved, added, or purchased.
- **Community**: social posts, replies, likes, profiles, follows, mentions, hashtags, messaging, structured Questions, structured Collaboration listings, and practical knowledge/helpful creator knowledge that previously sat in standalone Resources planning.
- **Dashboard**: creator workspace for publishing and managing music, books, sample packs, merch, services, overview metrics, and earnings.
- **Resources**: no longer a standalone launch app. Existing routes may remain temporarily, but its practical knowledge role is being absorbed into Community and it should stay out of the Dock.
- **Services**: 44-operated help/project/service intake. This surface is no longer in the Dock; it is accessed from Browse navigation and creator Dashboard sections.
- **Radio**: real 44 Radio station experience with synced playback and a single always-on looping playlist built from uploaded creator music. The first web UI pass now exists at `/radio` and `/dashboard/radio`, backed by reviewed SQL in `Other/44os-radio-foundation.sql` that must be applied before live data will work.
- **Settings**: system, Dock, region, and account controls.
- **Support**: real operating-system help center for account/login, orders, Dock/settings, Library behavior, purchases, downloads, Radio, creator uploads, troubleshooting, and escalation/contact.

The web app follows a Steam-like public/private split. Signed-out visitors can browse public surfaces such as Browse, Community, Services, Radio, and Support, plus shared item/profile links. Personal surfaces such as Library, Dashboard, and Settings are only exposed in the Dock after sign-in.

Language rules:

- The UI says **music**, **books**, **sample packs**, **merch**, **services**, **releases**, **items**, **library**, **reviews**, **updates**, **earnings**, and **sold items**.
- The UI does **not** say "products" as a generic catalog/item word. The shipped **Product Details** section label is allowed until renamed intentionally.
- The UI does **not** say "collection"; use **Library**.
- Services are 44-operated project intake/workspace flows, not a creator marketplace.
- Reviews live on Store item pages. Creator Updates live on owned Library item pages. They are not Community posts.
- Merch is a real Browse/Library category with local creator fulfillment. Do not frame it like a global shipping marketplace.

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

Current product-direction Dock target:

- Current testing layout is **Search**, **Browse**, **Radio**, divider, **Community**, **Messages**, **Profile**, divider, **Library**, **Dashboard**, with **Support** and **Settings** in the bottom utility area.
- Signed-out public visible order should be **Search**, **Browse**, **Radio**, **Community**, and **Support**, with **Log In** in the system slot.
- **Support** is currently hidden from the Dock for testing. **Library** remains signed-in only.
- Search is a Dock app. It should not also appear as a persistent topbar search control.
- Notifications open from the topbar bell, not the Dock.
- Profile and Messages are Dock apps for signed-in users and also appear in the avatar menu.
- Dock mode and visible apps are localStorage-first through `src/lib/dockPreferences.ts`.
- Pinned Dock items are localStorage-first and capped at 5. Pins can point to music, books, assets, profiles, or item pages. In compact mode pins use artwork/profile imagery when available.
- Dock app reorder exists in code/localStorage but should remain disabled for launch unless deliberately re-enabled later.

Current Dock behavior:

- The visible Store app is labeled **Browse** and uses the grid icon from `public/icons/legacy/grid.svg`. `/store` URLs remain for category and detail routes until a deliberate route migration is planned.
- Services remains out of the Dock and is surfaced under Browse navigation plus Dashboard creator tools.
- Resources should not be built out as its own Dock app; its future value is absorbed into Community.
- Users can still hide non-locked Dock apps from Settings > Dock, but the visible-app list should move toward the finalized set from the build plan.
- Signed-out visitors always see the default public Dock, regardless of any old local hidden-app preferences on the machine. Signed-in users can still personalize visible Dock apps locally.
- Community uses a people-style icon rather than chat bubbles. Dashboard uses a creator/showcase-style icon.
- The Dock bottom utility target is currently **Dashboard** and **Settings**. Signed-out users still see **Log In** in the system slot where signed-in users see **Settings**.

Landing:

- `src/lib/landingPage.ts` still uses the `store` landing id, but it now resolves to **Browse** at `/`.
- Settings currently offers only Browse, Library, Community, and Dashboard as landing choices.
- Legacy landing choices normalize safely back to current apps.
- Normal sign-in, sign-up confirmation, and magic-link authentication return to Browse at `/`. Password reset intentionally returns to `/settings?tab=account`.

Immediate landing target:

- `44os.com` opens the Browse experience at the root domain and does not visibly land on `/store`.
- The app can continue using Store internals/routes behind the scenes, but the user-facing landing destination should read Browse.
- Settings opens to `/settings?tab=account` by default because Account is the most common user control area. System remains available at `/settings?tab=system`.

---

## 4. Current Routes

Primary routes:

- `/` - canonical Browse surface at the root domain.
- `/store` and `/store/[category]` - Store browse surfaces.
- `/store/[category]/[slug]` - canonical Store item detail surface.
- `/product/[id]` - compatibility item route still exists and is Store-owned.
- `/cart` and `/checkout` - Store/cart surfaces.
- `/library` and `/library/[category]` - Library browse surfaces.
- `/library/[category]/[id]` - canonical owned Library item detail surface.
- `/community` - main feed with Feed, Following, Questions, and Collaboration tabs.
- Questions and Collaboration are moving from hashtag-driven feed variants to structured Community objects with their own data shape and purpose-built list/detail behavior.
- `/community/[slug]`, `/community/new`, `/community/feed`, `/community/browse`, `/community/messages`, `/community/profile`, `/community/friends` - compatibility or secondary Community surfaces.
- `/profile` and `/profile/[username]` - profile surfaces, Community-owned in Dock behavior.
- `/inbox` - messaging surface, Community-owned.
- `/notifications` - notifications center, opened from the bell.
- `/dashboard` plus dashboard subroutes - creator workspace. Navigation should only expose current shipped Dashboard sections.
- `/settings` - System, Dock, Region, Account.
- `/support` - help surface.
- `/search` - global search from topbar.
- `/resources`, `/resources/[id]`, `/services`, `/service/[id]`, `/projects/[id]` - existing secondary surfaces. Resources is no longer a standalone app direction; Services lives under Browse navigation and creator Dashboard sections instead of the Dock.
- `/radio` - registered starter page for the Radio app.

Legacy/compatibility routes still exist in the codebase. The next health-check chat should audit which ones are actually linked, which should redirect, and which can be safely removed. Do not remove routes blindly.

---

## 5. Current App Behavior

### Browse / Store

Browse is the public acquisition surface. It currently uses Store routes and Store internals. Detail pages use the same clean release/item header style as Library detail pages, but with acquisition actions:

- Music: Add to Library for streaming/save; Add to Cart for paid download support.
- Books: Read Sample where available; Add to Cart or View in Library when owned.
- Sample Packs: Add to Cart or library/download behavior depending on ownership.
- Merch: Add to Cart only.

Browse/Store item pages show **Reviews**. Empty reviews show quiet text, not a card. Published reviews use the Community-style white/paper card surface.

Browse tabs should remain consistent across every public acquisition surface: **Discover**, **Music**, **Books**, **Merch**, **Sample Packs**, **Services**.

The Discover page should show:

- `Explore Music`
- `Explore Books`
- `Explore Merch`
- `Explore Sample Packs`
- `Explore Services`

Each section should show at most 8 items and hide entirely if empty.

### Library

Library is the saved/owned surface. Detail pages mirror Store header style without acquisition explainer text:

- Music: Play. Download appears only when the paid download is purchased.
- Books: Read and Download.
- Sample Packs: Download.

Library music and Store music should share tracklist behavior: hover/selected play state, playable rows, track lengths, total length, straight dividers, rounded selected/hover rows, and context actions for Play and Play Next.

Library pages show achievements, extras/features, Product Details, and Creator Updates in that order where applicable.

Removed library items should stop showing as owned in Browse/Store immediately. Re-adding a previously removed item should restore the existing `library_items` row to visible state rather than leaving the UI stuck on `View in Library`.

Library is a personal surface. It is hidden from the signed-out Dock and direct visits show a quiet centered empty state asking the visitor to log in.

### Community

Community currently has a simplified single-page feed experience, but the build direction is broader:

- Tabs: Feed, Following, Questions, Collaboration.
- Questions and Collaboration are moving to real structured objects with their own schema and purpose-built cards/sort behavior. Do not keep treating them as only hashtagged feed posts.
- New Post opens an inline composer.
- Clicking a post opens its reply drawer.
- Clicking the speech bubble opens the reply input for that post or reply.
- Only one reply drawer/input should be open at a time.
- Replies are newest-first within their visible drawer, with clean divider spacing and no vertical thread line.
- Mentions and hashtags are bold black links with no underline. Mention suggestions should appear only after the user starts typing a username fragment such as `@b`.
- Owned replies/posts should expose delete where appropriate.
- Community will also absorb the practical creator-knowledge role that earlier planning placed under Resources.

### Dashboard

Dashboard is creator-first. Current shipped areas:

- Overview cards, summary metrics, and the sold-items earnings list together on the Overview page.
- Music, Books, Sample Packs, Merch, and Services management.
- Dashboard Radio is no longer part of the active creator workflow.

Avoid exposing placeholder tabs/workflows until they actually work.

Dashboard is a personal/creator surface. It is hidden from the signed-out Dock and direct visits show a login empty state; signed-in creator/admin capabilities still depend on profile permissions and available data.

### Settings

Settings tabs:

- System: theme/accent and system defaults.
- Dock: mode, visible apps, landing page, reset defaults.
- Region: country/currency/local pricing defaults.
- Account: email, password reset, privacy and notification preferences.
- Account and Settings are both scheduled for a full functional pass. Every visible control should work; avoid cosmetic-only settings.

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
- Questions and Collaboration will require reviewed schema work for structured objects. Write SQL in `Other/` first and do not run it without explicit approval and a backup.
- `profile_follows`: following graph.
- `conversations`, `conversation_members`, `messages`: messaging.
- `services`, `service_requests`, `project_messages`: Services/Projects spine.
- `resources`, `saved_resources`: resource discovery and saves.
- `user_os_preferences`, `user_app_preferences`: preference tables prepared for future persistence; many settings are still localStorage/profile-first.

Existing SQL/migration material:

- `Other/44os-messages-foundation.sql`
- `Other/44os-achievement-icons.sql`
- `Other/44os-community-delete-policies.sql`
- `Other/44os-phase7-additive-schema.sql`
- `Other/44os-steam-foundation.sql`
- `Other/44os-functional-sweep.sql`
- `Other/44os-radio-foundation.sql`
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

This is the active work-session queue from the finalized build plan. Work top to bottom unless the user redirects.

1. **Completed:** Radio v1 listener experience is live with synced playback, now-playing UI, and creator-track rotation.
2. **Completed:** Community Questions and Collaboration are now structured Community objects with reviewed SQL recorded in `Other/`.
3. **Completed:** Merch is now a real local-fulfillment category with checkout capture, creator orders, and region-aware creator pricing.
4. **Completed for v1:** Messages functional pass now includes conversation creation/opening, send flow, focus/visibility refresh, local unread indication, and an iOS-style new-message draft with a searchable To field before the first send.
5. **Completed for v1:** Account settings include Supabase email change, password update, password reset flows, and functional local notification preferences for mentions, replies, likes, and achievements.
6. **Completed for v1:** Settings functional pass covers System, Dock, Region, and Account controls, including Radio as a landing option.
7. **Completed for v1:** Support is now a categorized, searchable help center with a left topic sidebar, expandable sections, breadcrumb context, article reader, and contact/escalation guidance.
8. **Completed for v1:** Onboarding tips have a lightweight dismissible local persistence primitive.
9. **Completed for v1:** Desktop packaging research recommends Tauri 2 first, with Electron as fallback, in `Other/44OS_Desktop_Packaging_Recommendation.md`.
10. **Pending:** Evaluation and testing pass. Run internal QA across Browse, Library, Community, Radio, Support, Settings, Messages, Account, and Merch, then gather external feedback.

---

## 9. Maintenance Rules

- Only maintain these two project handoff docs: `Other/44OS_FOUNDATION.md` and `Other/44OS_UI.md`.
- Keep `Other/44OS_Finalized_Build_Plan.md` as the current interim planning source when it supersedes older notes, but fold accepted decisions back into the two handoff docs immediately so future sessions do not drift.
- If app behavior changes, update the Foundation doc.
- If visual/interaction rules change, update the UI doc.
- If Supabase changes are proposed, add a reviewed SQL file and update this doc before running anything.
- Never make destructive database changes without explicit user approval and a backup/rollback plan.
- Keep future chats efficient: document the current state, not old debates.
