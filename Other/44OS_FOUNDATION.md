# 44OS Foundation

**One of exactly two sources of truth.** This document explains how 44OS works under the hood — app architecture and Supabase — and what it must become. Its sibling, `Other/44OS_UI.md`, defines how the UI must look and behave. If any other document, comment, or memory disagrees with these two, these two win. Do not create additional strategy/handoff documents; extend these.

**How this document works:** every area is described as **CURRENT STATE** (what is true in the code and database today) and **TARGET STATE** (what we are building toward). As work lands, update this file in the same change: move the item into CURRENT STATE and delete the TARGET STATE lines it fulfilled. Current-state lines that stop being true get corrected or removed immediately — a stale line here is a bug.

---

## 1. What 44OS Is

The parent company is **44** — a creative company that publishes work from creators, offers professional creative services like an agency, and provides free resources to creatives. The software is **44OS**: a light creative operating system (web-first, Electron wrapper later) that molds to whoever is using it — a fan sees Music and Community; a client sees their Projects; a creator sees their publishing workspace.

Principles:
- Creators do not publish "products." They release **music, books, videos, resources, and merch**. "Products" is backend language only and never appears in the UI.
- Apps, not pages: each creative format/job gets its own app in the Dock, owning its public acquisition surface (**Store**), its owned items (**Library**), and its contextual reviews/updates.
- App tabs are sections, not category filters. Categories and filters live inside the active section.
- **"Library" is the universal owned-items word.** "Collection" is legacy-route-only, never in UI copy.
- If it ships to you, it's **Merch** (physical merch, Printful-backed). If it's digital media, it lives in its experience app. Digital-first, always.
- **Services are 44-operated** (agency model, "Projects"), not a Fiverr-style creator marketplace.
- The system shell (Dock, tab bar, Home, Settings) is persistent; only the workspace changes. UI rules live in `44OS_UI.md`.

---

## 2. Stack & Working Rules

- Next.js 16 (App Router) + React 19 + TypeScript. Supabase via `@supabase/supabase-js` only. No component libraries; all custom CSS in `src/app/globals.css` on the `--os-*` token system.
- Local path: `/Users/miro/Studio/44 CORPORATION/44-platform`. Dev: `npm run dev` (or `.claude/launch.json` config "44-platform", port 3000).
- **Run `npm run build` after any production-facing change.** Wrap `useSearchParams()` usage in `Suspense` or Vercel builds break.
- New users default to `role = 'creator'` so testers reach Dashboard immediately (already applied to live data).
- Historical SQL migration files were removed in the 2026-07-04 cleanup — the live database is the record of applied SQL; `Other/supabase-current-system-reference.sql` is the documentation-only reference. New schema changes ship as new individual SQL files in `Other/` **and** update section 5/6 here. Latest applied additive SQL: `Other/44os-phase7-additive-schema.sql`.
- Hidden visual reference route: `/studio/44os` (and `/studio/44os-home`), signed in as creator/admin.

---

## 3. App Architecture — CURRENT STATE

### Shell
`src/app/layout.tsx` composes: theme bootstrap script (localStorage `44-theme-mode` / `44-theme-accent` → `body.theme-* accent-*` before paint) → environment layers → `SystemShell` → `.app-frame > .app-shell` containing `Sidebar` (the Dock) + `main.app-main` (Topbar → workspace → MusicPlayerBar). Providers: `MusicPlayerProvider`, `TopbarProvider`, `ThemeSync`.

`src/components/SystemShell.tsx` (mounted once in layout):
- **Landing redirect**: signed-in users entering at `/` are routed once per app load to their landing app (`src/lib/landingPage.ts`, localStorage `44-setting-landing-page`, default **Music** → `/music`). Never hijacks in-app navigation.
- **Right-click**: browser context menu suppressed shell-wide except inputs/textareas/contenteditable. `src/components/ContextMenu.tsx` (`ContextMenuProvider` in the layout + `useContextMenu`) is the shared 44OS context-menu primitive — live on Dock items and Dock background (open / hide from Dock / mode toggle / Dock Settings), store item tiles (`ProductCard`: View Item / View Creator), resource tiles (Open Resource / Save Resource / View Creator), community posts (Open Post / View Author / Reply / Like / Delete when owned), and app Library tiles (`ExperienceApp`: Play (queues `tracks` into the music player) · Read · Download, Open, View Creator, and Remove from Library for free acquisitions / Hide from Library — `status='hidden'` — for purchases). Services/Projects context menus wait until that workflow is redesigned. UI rules in `44OS_UI.md` §13/§14.
- **Dock drag**: a horizontal drag on the Dock (~56px) snaps full ↔ compact via `setDockMode`; no free resizing.

### App registry — the navigation backbone
`src/lib/osApps.ts` defines every app: id, label, description (doubles as the app-header copy), href, icon class, group (`media`/`community`/`studio`/`account`/`system`/`legacy`), `requiresAuth`, `requiresCreator`, `hidden` (registered, not shipped), `locked` (can't be hidden). `getActiveOSAppId(pathname)` maps every route to its owning app. The Dock, Home quick-launch, and Settings > Dock all render from it. **Never hardcode navigation.**

Registered and visible: `music`, `books`, `assets`, `merch`, `community`, `resources`, `services`, `dashboard` (creator), `account`, `settings`.
Registered hidden/legacy: `home`, `friends`, `inbox` (labelled Messages), `notifications` (topbar bell), `radio`, `shop`, `store`, `library`, `projects`.
Current Dock order: media (`music`, `books`, `assets`, `merch`) → community (`community`, `resources`, `services`) → studio (`dashboard`) → bottom account/settings (`account` above divider, `settings` below). Friends and Messages live as tabs inside Community; Radio is hidden until it is ready.

`src/lib/dockPreferences.ts`: Dock mode `full`/`compact` + hidden app ids, localStorage (`44-dock-mode`, `44-dock-hidden`), synced app-wide via a window event. All reads/writes go through this module.

### Key libraries (`src/lib/`)
- `platform.ts` — core types (Profile, Service, Resource, Track, CommunityPost, ServiceRequest, ProjectMessage…) + href/price helpers.
- `products.ts` — Product type + pricing format.
- `libraryContent.ts` — `getProductRuntimeKind(product)` → `music | book | sample_pack | interactive | product`; owned-item actions (play/read/download/launch).
- `studioProfiles.ts` — profile ensure/load, `isCreatorProfile()`.
- `useAuth.ts` — `{ user, loading }` with profile ensure.
- `theme.ts` — mode (light/dark/system) + accent (amber/sage/ocean/violet).
- `cart.ts` — client cart, localStorage `44-cart-v1`.
- `projects.ts` — service-request/project status labels + hrefs.
- `dashboardTabs.ts` — `DASHBOARD_TABS` + `useDashboardTabs()`.
- `dashboardCatalog.ts` — Dashboard digital creator-catalog sections (Music/Books/Assets) mapped onto the legacy `products` route/table via `experience.ts`.
- `landingPage.ts`, `marketPreferences.ts`, `taxonomy.ts`, `social.ts`, `friends.ts`, `messages.ts`, `communityProfile.ts`, `achievementNotifications.ts`, `schemaCompat.ts` (missing-column/relation tolerance), `uploads.ts`, `supabase.ts`.

### Apps & routes
- **Home** `/home` — greeting, registry-driven quick-launch tiles, creator shortcuts, recent Library, recent notifications.
- **Music** `/music` (→ `/music/store`), `/music/store`, `/music/store/[slug]`, `/music/library`, `/music/library/[id]` — filtered through `src/lib/experience.ts`. Tabs are Store first, Library second; the app root lands on Store so users open into content, not an empty page. `/music/store/[slug]` is the public **Release page** mode on `ProductStoreDetail`: release hero, release actions, playable tracklist from `tracks`, Reviews, details, and related creator items. `/music/library/[id]` is the owned Release page: ownership-gated album header, Play Release / Play All, track rows, achievement unlocks, release details, store/creator links, and read-only Creator Updates.
- **Books** `/books` (→ `/books/store`), `/books/store`, `/books/store/[slug]`, `/books/library`, `/books/library/[id]` — Store-first pattern. `/books/library/[id]` is the owned Book/Artbook page: ownership-gated book header, Read action, embedded PDF/artbook reader with page controls, file-open fallback, book details, creator/store links, and read-only Creator Updates.
- **Assets** `/assets` (→ `/assets/store`), `/assets/store`, `/assets/store/[slug]`, `/assets/library`, `/assets/library/[id]` — same Store-first pattern.
- **Radio** `/radio` — registered hidden starter app with an intentional empty stations surface.
- **Merch** `/merch`, `/merch/store`, `/merch/store/[slug]` — physical goods app filtered through `src/lib/experience.ts`; legacy `/shop`, `/store/apparel`, and `/store/merch` redirect here. Merch Store lists only physical products. Merch detail routes reject non-physical items back to their owning app, use shipped-goods language, add to Cart/Checkout rather than Library, and show Related Merch filtered to physical goods from the same creator.
- **Store** `/` + `/store/[category]` (+ legacy `/browse`) — legacy route layer during migration; `/store/music`, `/store/books`, and `/store/assets` redirect to the new app Store routes; `/product/[id]` redirects to the app Store item route when possible.
- **Cart / Checkout** `/cart`, `/checkout` — Merch-owned system surfaces (client-side cart, localStorage `44-cart-v1`). Each registers a topbar back-link (`/cart` → Merch, `/checkout` → Cart); cart rows deep-link to each item's owning app Store via `CartItem.href`.
- **Services** `/services`, `/service/[id]`, `/service/[id]/request` (brief form: title, description, budget, timeline → creates `service_requests` row → redirects to `/projects/[id]`).
- **Services sections** `/services`, `/services/projects`, `/services/requests` — Services is the browse/intake surface; Projects and Requests are placeholder section shells for the service workspace.
- **Projects** `/projects/[id]` — workspace for a service request: brief, message thread (`project_messages`), status actions (creator: accept/decline/quote/complete; client: pay/withdraw).
- **Resources** `/resources`, `/resources/collection`, `/resources/[id]`, `/resources/browse[/category]` — Resources is discovery/browse; Saved is the saved-resources UI backed by `saved_resources` (compat route remains `/resources/collection`, but UI copy does not say Collection).
- **Community** `/community`, `/community/feed`, `/community/friends`, `/community/messages`, `/community/profile`, `/community/new`, `/community/thread/[id]`, `/community/profile/[username]` + `/edit`. Tab order: Feed, Profile, Friends, Messages. Feed is general posts; Profile routes to the signed-in user's public community profile; Friends is the friend manager; Messages is friend-gated DMs. Other creators' profiles behave like Community item/detail pages: no Profile tab highlight, topbar back-link to Community, and profile-local tabs only when content exists (Posts, Music, Books, Assets, Services). Category browse routes stay under the Feed tab; post topics are workspace filters, not system tabs.
- **Library** `/library` (legacy aggregate; no global topbar tabs), `/library/item/[kind]/[id]` (compat redirect for product items), `/collection/*` legacy-compat only. New owned-item app surfaces are `/music/library/[id]`, `/books/library/[id]`, and `/assets/library/[id]`; Music no longer depends on `/library/item/...`.
- **Messages** `/community/messages` — friend-gated DMs. Legacy `/inbox` server-redirects here with its query preserved.
- **Notifications** `/notifications` + topbar popover (achievements/replies/mentions). Notifications stay out of the Dock and are accessed from the bell.
- **Search** `/search?q=` — topbar global search surface across published items (Music/Books/Assets/Merch), creator profiles, Community posts, and Resources. Results render in that order as Items, Creators, Posts, Resources. Legacy `/browse?q=` still works as the old product-only browse layer, but the topbar no longer targets it.
- **Dashboard** `/dashboard` + digital creator catalog sections (Music/Books/Assets on the compatibility `/dashboard/products` route). Topbar tabs: Overview, Music, Books, Assets. Overview shows three catalog cards and an embedded Earnings section; there is no separate Earnings tab. Dashboard preferences redirects back to Overview, because local market/location now lives in Settings > Region and item pricing is per item. Dashboard services, requests, resources, merch, updates, payouts, and orders routes may still exist as compatibility/future surfaces, but they are not shipped in Dashboard navigation.
- **Account** `/account?tab=` — Account, Privacy & Security, Orders, Notifications. User profile, password reset, account-level privacy, notification preferences, and purchase/order history live here. Topbar tabs deep-link to these query-backed sections.
- **Settings** `/settings?tab=` — OS settings only. Tabs: Appearance (theme, accent, future typography/wallpaper), Dock (landing app, Dock mode, visible apps, future reorder/badges), Region (market, currency, local-pricing defaults, future language/units), Clock (future time/date controls), Accessibility (future motion/contrast/readability/input controls), Advanced (future cache/reset/integrations). Landing app choices are generated from the currently visible Dock apps. localStorage-first, profile columns where they exist. Topbar tabs deep-link to these query-backed sections.
- **Auth**: `/login` (Sign Up / Log In / email link) → confirm → `/account` (community setup gate: username + avatar).

### Content conventions
- Posts are social only: `post_type = 'general'` appears in Community feeds and creator profile Posts. Reviews and Updates are app-domain systems backed by dedicated tables: Reviews live only on Store item pages; Updates live only on owned Library item pages. They do not display on creator profiles.
- **Never rename `post_subjects` to `post_tags`** (`post_tags` reserved for future hashtags).
- No public follower/following counts. Friends are the relationship model; messaging is friend-gated.
- Payout language: Earnings / Sold Items.

### Legacy route redirect table (audited 2026-07-04)
Every legacy URL keeps working. Server redirects unless noted; client = needs data (product classification, auth) before it can route.

| Legacy route | Target |
|---|---|
| `/` | renders the legacy Store hub (signed-in users are landing-redirected once per app load) |
| `/store` | → `/` |
| `/store/music` · `/store/books` · `/store/assets` | → app Store (client) |
| `/store/apparel` · `/store/merch` | → `/merch/store` (client) |
| `/store/games` (+ unknown categories) | renders the legacy category grid (no Games app yet) |
| `/product/[id]` | → owning app Store item (client); unclassifiable items render in place |
| `/browse` | renders the legacy browse grid — also the topbar-search target (`?q=`) |
| `/shop` | → `/merch/store` |
| `/library` | renders the legacy aggregate Library |
| `/library/[category]` | → `/library` |
| `/library/item/[kind]/[id]` | product items redirect to owning app Library; legacy resource/service details render in place |
| `/collection` · `/collection/[category]` · `/collection/item/…` | permanent → `/library` equivalents |
| `/inbox` (query preserved) | → `/community/messages` |
| `/friends` | → `/community/friends` |
| `/profile` | → own `/community/profile/[username]` (client, needs auth) |
| `/profile/[username]` | → `/community/profile/[username]` |
| `/music` · `/books` · `/assets` · `/merch` | → their `/store` sub-route |
| `/music/discover` · `/books/discover` · `/assets/discover` | → their `/store` sub-route |

Friends and Messages implementations live at `/community/friends` and `/community/messages`; the legacy routes are pure redirects (flipped 2026-07-04).

### Legacy link hygiene (swept 2026-07-04)
Internal links no longer point at legacy routes. Cart rows deep-link to the owning app Store via `CartItem.href` (set from `productStoreHref` at add-to-cart; older stored carts fall back to `/product/…`, which redirects). The project workspace back-links to `/services/projects`. Home and the legacy `/library` empty states link to app Stores. Sanctioned fallbacks: `experience.ts` returns `/product/…` / `/library/item/…` only for unclassifiable items, and the legacy root Store page's Games tab still targets `/store/games` (no Games app exists).

### Known issues
- Region select on `/settings?tab=region` causes a hydration mismatch (`Intl.DisplayNames` country names differ server vs client) — pre-existing, fix by making `COUNTRIES` in `marketPreferences.ts` stable.
- `/library/item/...` is compatibility-only. Product items redirect to owning app Library routes; resource/service details still render there until those apps get owned detail surfaces.

---

## 4. App Architecture — TARGET STATE

The restructure ships in phases (~4–8 weeks total). Phase 1 (shell foundation: registry, Dock modes, Home, Settings > Dock, landing redirect, right-click, unified metrics) **is complete**. The first migration-friendly app split for Music/Books/Assets/Merch/Radio is in CURRENT STATE. Phase 2 (Music: public Release pages, owned Release Library pages, playable tracklists, creator updates in release context, and route/build QA) **is complete**. Phase 3 (Books: owned Book/Artbook Library pages, embedded reader with page controls, creator updates in book context, and route/build QA) **is complete**. Remaining:

### Phase 4 — Projects reframe
- `/projects` list app (client's requests + active projects). Unhide `projects`.
- Services copy → 44-operated project intake ("Projects", "Brief"); 44 defines the service categories; later a modular request builder.
- Workspace tabs: Overview / Messages / Brief (Files later).

### Phase 6 — Personalization + system feel
- Context menus on posts and projects (the shared primitive + Dock/cards/library tiles already shipped).
- Home widgets by user mode; mode-based Dock presets (fan / creator / client / collaborator — derived from role + open projects first).
- Motion pass (route/popover transitions, reduced-motion setting); Notifications Center polish (Dock/topbar badge counts, mark read, click-through).

### Phase 7 — Hardening + legacy removal
- OS preferences move localStorage → Supabase (tables in §6).
- Mobile app-launcher pass; copy sweep killing any surviving "Product"/"Collection" wording; remove/redirect old Store browse + Collection routes once covered.
- Electron-readiness notes (deep links, window title, offline states) without blocking web ship.

### Target Dock (first ship)
Music · Books · Assets · Merch / Community · Resources · Services / Dashboard (creators) / Account · Settings. Friends and Messages live inside Community. Radio, Home, Notifications, Library, Store, Shop stay legacy-hidden or topbar-only; Videos/Games/Vault stay hidden until real.

### User-facing rename map (backend names frozen)
Products → Music/Books/Assets/Merch items (per context) · Add Product → Add Music/New Release · Product page (music) → Release page · Store (digital) → Music/Books/Assets Store · Store (physical) → Merch · Service Request → Brief · Sidebar → Dock.

### Never do
Rename Supabase tables · delete Store/Library routes mid-migration · ship empty Videos/Games apps · build Vault before project files demand it · fake-desktop windowing · merge reviews/updates into Community · `post_tags` for tagging · public follower counts · block ship on Printful API · revive "Collection".

---

## 5. Supabase — CURRENT STATE

Auth users in `auth.users`; public records in `public.profiles` (id = auth id). RLS: public browsing open for Store/Services/Resources/Community; authenticated users manage their own profile and authored content (`author_id → profiles.id`); policies are live in Supabase and documented in `supabase-current-system-reference.sql`.

### profiles
`display_name, username, slug, avatar_url, hero_url, bio, role ('member'|'creator'|'admin' — default creator for testing), creator_type, is_official, is_published, country_code, display_currency, home_country_code, home_currency, product_market_mode, service_market_mode`. Created by `studioProfiles.ts`. Community-setup complete = username + avatar_url.

### categories
Shared taxonomy: `scope ('products'|'services'|'resources'|'posts'|'creators'), slug, name, sort_order`. Community post topics: `discussions`/legacy `discussion` (displayed "General"), `questions`, `collaboration` (already applied to live data).

### products (+ tracks)
`author_id, category_id, slug, title, creator, product_type, category, short_description (nullable legacy/card copy), long_description, description, cover_url, hero_url, price_cents, currency, is_free, is_published, status, runtime_type, experience_type ('music'|'book'|'asset'|'radio'|'video'|'game'|'merch'|'other'), fulfillment_type ('digital'|'physical'|'hybrid'), launch_url, read_url, download_url, local_price_cents, local_currency, local_country_code, created_at, updated_at`.
Music products have `tracks`: `product_id, title, track_number`/legacy `number`, `duration_seconds, audio_url`. Achievements: `product_achievements` + `achievement_events` (feeds notifications).
Digital files for books/assets use `product_assets`: `product_id, asset_type, title, file_url, storage_path, is_downloadable, sort_order, created_at`. Creator manages rows; authenticated owners can read files for owned Library items. Book uploads set `read_url`/`download_url`; asset uploads set `download_url`.
Explicit related-item links use `product_relations`: `product_id, related_product_id, relation_type ('merch'|'artbook'|'companion'), sort_order`.

### services
`author_id, category_id, slug, title, service_type, description, cover_url, starting_price_cents, currency, local_* pricing, delivery_estimate, featured, status`.

### resources
`author_id, category_id, slug, title, summary, body, resource_type, cover_url, download_url, status`.

### library_items / saved_resources
`library_items`: `user_id, product_id, acquisition_type, acquired_at, status` — owned/saved products. `saved_resources`: `user_id, resource_id, saved_at`. Resources are never Library items.

### service_requests / project_messages (the project workspace spine)
`service_requests`: `user_id (client), service_id, message (legacy brief), status ('inquiry'|'pending'|'accepted'|'declined'|'in_progress'|'awaiting_payment'|'completed'|'canceled'), brief_title, brief_body, budget_cents, timeline, agreed_price_cents, agreed_currency, responded_at, paid_at, completed_at`. RLS: client and creator (`services.author_id`) read/update; only client inserts. Brief submit → status `pending` → `/projects/[id]`.
`project_messages`: `request_id, author_id, body, created_at`; RLS client+creator.

### posts + social
`posts`: `author_id, category_id, slug, title, body, post_type ('general' for shipped Community), status`. `post_replies` (threaded via `parent_reply_id`), `post_likes`, `reply_likes`. `post_subjects`: `post_id, subject_type ('product'|'service'|'resource'|'profile'|'library_item'), subject_id` remains for legacy/compat references only; shipped Reviews/Updates no longer read through it.

### product_reviews / product_updates
`product_reviews`: `user_id, product_id, title, body, rating, sentiment, status, legacy_post_id, created_at, updated_at`; one review per user/product, public reads only published rows, authenticated users manage their own review. Legacy review posts were copied into this table.
`product_updates`: `product_id, author_id, title, body, version_label, status, legacy_post_id, created_at, updated_at`; creators manage updates for their products; owners/authors read published updates on Library item pages. Legacy update posts were copied into this table.

### OS preference tables
`user_os_preferences`: `user_id, theme_mode, theme_accent, landing_app, dock_mode, motion_mode, active_workspace_mode, created_at, updated_at` with owner-only RLS.
`user_app_preferences`: `user_id, app_id, preferences jsonb, created_at, updated_at` with owner-only RLS. The current UI still writes localStorage/profile fields first; these tables are ready for the next persistence pass.

### friends + messaging
`friend_requests`: `requester_id, addressee_id, status ('pending'|'accepted'|'declined'|'canceled')`. `conversations`, `conversation_members` (`last_read_at`), `messages` (`conversation_id, sender_id, body`). Messaging is friend-gated.

### Pricing model
Global price (`price_cents`/`starting_price_cents` + `currency`) with optional per-item local-market price (`local_price_cents`, `local_currency`, `local_country_code`); viewer/creator region lives in Settings > Region (profile + localStorage). "Price" is global; "Local Price" is the local offer. Blank local price means use the global price.

### SQL files kept in `Other/`
Only `supabase-current-system-reference.sql` (documentation, never run). The historical migration files (`supabase-author-content-rls.sql`, `supabase-library-foundation.sql`, `supabase-social-foundation.sql`, etc.) were applied to the live database and removed in the 2026-07-04 cleanup. Future schema changes ship as new individual SQL files here.

---

## 6. Supabase — TARGET STATE

No table renames, no destructive migrations, ever. Classification derives in code first; SQL lands only when the direction is proven. Each addition ships as its own SQL file in `Other/` and updates §5 here.

1. **Project evolution** (only when the workspace outgrows `service_requests`): `projects`, `project_members`, `project_files` (and possibly `project_tasks`) — built **on** the `service_requests` spine, not replacing it.
2. **Preference persistence wiring**: move Settings/Dock reads and writes from localStorage/profile fallbacks into `user_os_preferences` / `user_app_preferences`, then add `user_dock_items` and `user_home_widgets` only if the UI outgrows JSON preferences.
3. Printful needs no schema at v1: physical merch = normal `products` rows (mockup images as `cover_url`); fulfillment manual first.

---

## 7. Working Checklist

The ordered build queue for the restructure. Work items top to bottom (one per session ideally); when an item lands, mark it done with the date, correct the CURRENT/TARGET sections it touched, and delete it once fully absorbed into §3/§5. This section is the only "what's next" list — do not create separate roadmap docs.

1. ~~**Legacy link sweep**~~ — done 2026-07-04. No internal link points at a legacy route (see §3 "Legacy link hygiene").
2. ~~**Redirect audit**~~ — done 2026-07-04. Redirect table lives in §3; `/store` index, `/profile/[username]`, `/friends`, and `/inbox` became real (server) redirects; `/product/[id]` no longer self-redirects for unclassifiable items.
3. ~~**Cart/checkout ownership**~~ — done 2026-07-04. `/cart` and `/checkout` are Merch-owned system surfaces: both register a topbar back-link (Merch → Cart → Checkout), spacing tokenized, empty/placed states live inside their surfaces. Entry points: topbar cart badge, product/store item "Add to Cart", cart rows deep-link back to each item's app Store.
4. ~~**Tab-contract pass**~~ — done 2026-07-04. Every app registers sections through the global topbar (UI spec §4): Music/Books/Assets = Store·Library; Merch = Store; Community = Feed·Profile·Friends·Messages; Resources = Resources·Saved; Services = Services·Projects·Requests; Dashboard and Account/Settings use their shared tab arrays. Legacy Store, Community category browse, and aggregate Library no longer use the system tab bar for categories or runtime filters; Account/Settings tabs deep-link to `?tab=` sections.
5. ~~**Dashboard rename + simplification pass**~~ — done 2026-07-04, updated again 2026-07-04. Creator catalog UI no longer exposes "Products": the Dashboard topbar has Overview, Music, Books, and Assets only. Music/Books/Assets are backed by the compatibility `/dashboard/products` route and filtered through `experience.ts`/`dashboardCatalog.ts`. Overview is three digital catalog cards plus an embedded Earnings section; Merch and Preferences are no longer shipped Dashboard tabs. Services/Requests/Resources/Updates/Earnings are not first-ship Dashboard tabs. New/edit/delete copy is contextual ("New Release", "New Book", "New Asset"); creator is assigned automatically; forms expose one Description field, Artwork upload, section-specific type choices (Music: Album/EP/Single; Books: Lyrics Book/Art Book/Novel; Assets: Sample Pack/Remix Stems), and per-item Global vs Global + Local pricing. `products` stays the table name.
6. ~~**Music hardening (Phase 2)**~~ — done 2026-07-04. Public `/music/store/[slug]` is a Release page with tracks, reviews, read-only Creator Updates, details, and related items. Owned `/music/library/[id]` now renders the Release Library surface directly with ownership gating, Play Release/Play All, playable track rows, achievement unlocks, release details, creator/store links, and read-only Creator Updates; Music no longer depends on `/library/item/...`. Production build passed.
7. ~~**Books hardening + artbook viewer (Phase 3)**~~ — done 2026-07-04. Owned `/books/library/[id]` now renders the Book/Artbook Library surface directly with ownership gating, Read action, embedded PDF/artbook reader with page controls, file-open fallback, details, creator/store links, and read-only Creator Updates. Production build passed.
8. **Services → Projects build-out (Phase 4).** Fill `/services/projects` and `/services/requests` from `service_requests`; workspace tabs Overview/Messages/Brief; intake copy says "Brief"/"Projects".
9. ~~**Merch completion (Phase 5)**~~ — done 2026-07-04. Merch is physical-goods-only in Store and detail routing; Printful/manual-fulfillment items remain normal `products` rows; merch detail pages use shipped-goods language, route non-physical items back to their owning app, add to Cart/Checkout rather than Library, and show Related Merch filtered to physical goods. Production build passed.
10. ~~**Copy + empty-state sweep**~~ — done 2026-07-04. Shipped visible copy no longer uses "Product" or "Collection" for user-facing release/item/saved-resource flows. Account notifications, Community composer guidance, generic item-not-found text, and creator profile release fallbacks were cleaned up; remaining product/collection names are backend types, compatibility routes, or code identifiers.
11. ~~**System feel (Phase 6)**~~ — done 2026-07-04 for the shipped scope. Context menus cover Dock/Dock background, Store item tiles, app Library tiles, Resource tiles, and Community posts; Services/Projects menus wait for the paused Services rebuild. Topbar notifications/cart badges are live. Topbar search now targets `/search?q=` for global search across items, resources, posts, and creators instead of legacy `/browse?q=`. Home remains hidden by product direction; motion/widgets can be revisited later as polish, not restructure blockers. Production build passed.
12. ~~**Additive Supabase split (Phase 7)**~~ — done 2026-07-04. Applied `Other/44os-phase7-additive-schema.sql` to the linked Supabase project: `products.short_description` is nullable, `products.experience_type`/`fulfillment_type` and `product_relations` exist, `product_assets` has creator/owner RLS for book/asset files, `product_reviews` and `product_updates` are dedicated item-domain systems with legacy post migration, and `user_os_preferences` / `user_app_preferences` are ready for the next persistence pass. Store item pages now read/write Reviews from `product_reviews`; Library item pages read Updates from `product_updates`; Community posts stay social-only. `npm run build` required after code wiring.
13. **Phase 7 remaining polish.** Wire Settings/Dock persistence into the new preference tables, fix the Region-select hydration bug in `marketPreferences.ts`, do the mobile app-launcher pass, run a final Product/Collection copy sweep, and remove/redirect old Store browse + Collection routes once fully covered.

Definition of done for every item: `npm run build` green, old URLs still resolve, tab bar and spacing comply with `44OS_UI.md`, and this file updated in the same change.

---

## 8. Maintenance

- Two documents only: this file and `44OS_UI.md`. Historical strategy docs — including `44OS_MASTER_PLAN.md` (removed 2026-07-04) — were deliberately deleted; their decisions live here. Do not resurrect them or add new ones.
- When you ship a change: update CURRENT STATE, delete the TARGET STATE lines it fulfilled, correct anything stale, and note new known issues. Same commit as the change.
- When you touch Supabase: new SQL file in `Other/` + update §5/§6.
- Success criteria for the restructure: a musician never sees "product"; music seekers open Music, not Store; owned music is a library inside Music; artbooks readable inside Books; services feel like agency intake; Merch is the physical-goods app inside the OS, not its heart; a client's 44OS shows their project world, a fan's shows music + community, a creator's shows their workspace; every old route and all data keep working.
