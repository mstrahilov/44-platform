# 44OS Foundation

This is one of the three active handoff documents for 44OS. Read it before changing architecture, routes, authentication, Supabase, desktop packaging, or deployment behavior.

The active handoff set is:

- `Other/44OS_FOUNDATION.md` - architecture, routes, data, auth, deployment, desktop stance.
- `Other/44OS_UI.md` - visual system, interaction principles, and quality bar.
- `Other/44OS_OPTIMIZATION_MASTER_PLAN.md` - living implementation checklist and acceptance status.

Do not revive deleted planning documents or old SQL notes as active references. If a decision changes, update the relevant active docs in the same change.

---

## 1. Product Definition

44 is the parent creative company. 44OS is a web-first creative operating system for fans, creators, collaborators, and clients. It ships first as a Next.js app on Vercel and will later be wrapped for macOS and Windows.

44OS exists to give underground creatives and their fans a home outside ad-driven, algorithm-driven platforms. The product should feel closer to a creator operating system than a social app: a place where people publish, collect, listen, read, explore, ask questions, follow each other, collaborate, sell work, and build cultural memory around releases.

The launch mental model is:

- **Browse**: the user-facing discovery and acquisition app.
- **Library**: the signed-in user's owned, saved, purchased, or added items.
- **Community**: public posts, questions, collaboration, follows, and creator/fan connection.
- **Radio**: public listening surface.
- **Dashboard**: signed-in creator workspace for publishing and catalog health.
- **Settings**: signed-in system, Dock, region, and account controls.
- **Support**: public help surface.

Services, Resources, Projects, Friends, Messages, and standalone Profile are not v1 Dock destinations. They may exist as hidden, account-menu, profile, or compatibility surfaces, but they should not appear as polished launch apps until their strategy is intentionally restored.

Language rules:

- User-facing copy says Browse, Library, Community, release, item, music, book, sample pack, merch, review, creator update, bonus content, earnings, and orders.
- UI copy should not use "Store" or "Collection" as the visible product model.
- The database table can remain `products`; user-facing copy should prefer "items" or format-specific nouns.
- Services are excluded from the v1 polished Browse surface.

---

## 2. North Star

The closest strategic reference is Steam/Valve, adapted for music, books, art, services, games, interactive releases, and local creative economies:

- 44 first uses 44OS to publish its own flagship work.
- The platform then opens outward so friends, collaborators, and other creatives can publish their own work.
- Over time, platform capabilities become creator tools, the way Steam grew from distribution into Workshop, achievements, communities, modding, and hardware/engine showcases.
- Flagship 44 releases should demonstrate what the system can do, then those capabilities should become simple tools other creators can use without needing to code.

Core doctrine:

- **Creator-first, fan-respecting**: no dark patterns, no algorithmic addiction loops, no ad-first design.
- **Technology hidden, power exposed**: creators should not need to understand achievement tracking, local/global pricing, Supabase events, file unlocks, or interactive-experience APIs.
- **Library as memory**: when a fan adds a release, unlocks an achievement, receives bonus content, or joins an experience, the Library becomes the durable record of that relationship.
- **Community as infrastructure**: posts, follows, questions, collaboration, profiles, and later messages exist so people can learn, find each other, support each other, and build creative scenes.
- **Global reach, local fairness**: creators can sell globally at a fair global price while optionally offering local pricing that respects their home community and currency.
- **Flagship experiences lead the system**: 44 should use major releases to prove new capabilities, then productize those capabilities for other creators.

Version 1.0 should establish the correct foundation: Browse, Library, profiles, Community, Dashboard publishing, global/local pricing groundwork, music achievements, Overachiever Bonus Content, and a visual/technical system that can grow into future interactive releases.

---

## 3. Launch Journeys

Important launch journeys:

- **Fan journey**: discover work in Browse, add it to Library, follow the creator, read creator updates, unlock achievements, discuss it in Community, and come back as the release evolves.
- **Early creator journey**: join Community, ask practical questions, learn how publishing works, find collaborators, build confidence, publish a first release, then use updates and Library features to keep improving it.
- **Working creator journey**: publish music/books/sample packs/merch, configure fair global/local pricing, add music achievements/bonus content where supported, post updates, interact with fans, and track catalog health in Dashboard.
- **Collaborator journey**: find people through Community questions/collaboration, profiles, posts, and eventually Services/Projects.
- **Flagship release journey**: experience a 44 release that demonstrates achievements, bonus content, behind-the-scenes material, Library memory, and eventually interactive 3D/Unity/WebGL unlocks.

Creator-fan distance should be low:

- Creator profiles connect posts, releases, Library items, updates, and future services.
- Browse item pages explain the release and acquisition.
- Library item pages show the deeper relationship: owned status, play/read/download, achievements, updates, bonus content, and future Launch actions.
- Creator Updates are the 44OS version of patch notes, release notes, dev logs, and album/project updates.
- Community is where fans and creators talk, ask, answer, collaborate, and build scenes without algorithmic pressure.

---

## 4. Achievement Foundation

V1.0 ships music achievements only.

The v1 music achievement set is:

- Front to Back
- No Skips
- Nightbird
- Heavy Rotation
- Joined the Orbit
- Left Your Mark
- Signal Boost
- Overachiever

Rules:

- `First Wave` is removed from v1 because time-limited achievements can permanently block Overachiever for late listeners.
- Book achievements are removed/hidden until the reader experience and trigger model are real.
- Creators do not hand-edit achievement text or artwork during v1.
- Bonus Content is the only v1 release extra and unlocks from Overachiever only.
- Existing user unlocks must be preserved during any migration.

Current code state:

- `src/lib/achievementCatalog.ts` filters Library display/tracking to the eight v1 music codes.
- `src/components/DashboardReleaseFeatures.tsx` exposes the eight music templates and Overachiever-only Bonus Content.
- Dashboard create/edit pages show release achievements only for music.
- Reviewed manual SQL exists at `supabase/migrations/20260709230000_44os_v1_music_achievements.sql`.

Do not run this migration directly from an agent. The user should back up affected tables, confirm Supabase Storage filenames, then run the reviewed SQL manually.

---

## 5. Stack And Workflow

- App: Next.js App Router, React 19, TypeScript strict mode.
- Styling: custom CSS in `src/app/globals.css` with `--os-*` tokens.
- Backend: Supabase via `@supabase/supabase-js`.
- Deployment: Vercel, canonical domain `https://44os.com`.
- Local scripts: `npm run dev`, `npm run lint`, `npm run build`, `npm run start`.
- Shell entry: `src/app/layout.tsx`.
- App registry: `src/lib/osApps.ts`.
- Browse/category route helpers: `src/lib/experience.ts` and compatibility category helpers in `src/lib/storeRoutes.ts`.
- Library routes: `src/lib/libraryRoutes.ts`.

Quality gates for production-facing work:

- `npm run lint` must pass with zero errors and zero warnings.
- `npm run build` must pass.
- `npm run dev` should start without Turbopack root warnings.
- Route and auth changes require manual browser QA at desktop and mobile widths.

---

## 6. Shell Architecture

44OS is a persistent operating-system shell. Only the workspace content changes between apps.

Core shell files:

- `src/app/layout.tsx`: providers, theme bootstrap, shell, Dock, Topbar, workspace, and music player.
- `src/components/Sidebar.tsx`: Dock rendering and app launch behavior.
- `src/components/Topbar.tsx` and `src/components/TopbarContext.tsx`: topbar tabs, back labels, cart, notifications, and account menu.
- `src/components/MusicPlayer.tsx`: persistent music player provider and bar.
- `src/components/SystemShell.tsx`: global shell behavior.
- `src/components/ContextMenu.tsx`: shared right-click menu primitive.

Navigation rules:

- `src/lib/osApps.ts` is the single source of truth for Dock apps.
- The Dock, Dock settings, route ownership, app labels, app descriptions, and app visibility should derive from the registry.
- `getActiveOSAppId(pathname)` must map every route to exactly one owning app.
- Search is a Dock app, not a persistent topbar search field.
- Notifications are a topbar control, not a Dock app.
- Signed-out users see public destinations only.

Current Dock order:

- Signed in: Search, Browse, Radio, divider, Community, divider, Library, Dashboard, spacer, Support, Settings.
- Signed out: Search, Browse, Radio, divider, Community, divider, Library, Dashboard, spacer, Support, Settings, divider, Log In.

Library, Dashboard, and Settings remain visible when signed out because they are core OS destinations; their pages render auth gates instead of disappearing from the shell. Messages and Profile are hidden from the v1 Dock. Keep profile/account access through avatar/profile/community surfaces where supported.

---

## 7. Canonical Routes

Canonical public routes:

- `/browse` - Browse front door.
- `/browse/[category]` - Browse category: music, books, assets, merch.
- `/browse/item/[identifier]` - Browse item detail. Resolve by slug first where available; id fallback is supported.
- `/cart` and `/checkout` - acquisition flow.
- `/community` - Community front door.
- `/radio` - Radio.
- `/support` - Support.
- `/search` - Search.
- `/login` - authentication.

Canonical signed-in routes:

- `/library` - Library front door.
- `/library/[category]` - Library category.
- `/library/item/[id]` - owned Library item detail using `library_items.id`.
- `/profile` and `/profile/[username]` - profile surfaces.
- `/dashboard` and dashboard subroutes - creator workspace.
- `/settings?tab=account` - default Settings entry.

Compatibility and legacy policy:

- `/` redirects to `/browse`.
- `/store`, `/store/[category]`, and `/store/[category]/[slug]` redirect to Browse equivalents.
- `/product/[id]` resolves as a compatibility hop to `/browse/item/[identifier]`.
- `/collection` redirects to `/library`; `/collection/item/[kind]/[id]` redirects to `/library/item/[id]`.
- `/music`, `/books`, `/assets`, `/merch`, `/shop`, and old typed `/discover`/`/store` paths redirect to Browse categories.
- `/library/item/[kind]/[id]` remains as a legacy compatibility route and redirects to `/library/item/[id]`.
- `/resources`, `/services`, `/service`, and `/projects` are non-launch secondary surfaces.
- Do not add vanity redirects unless there is a real public link to preserve.

---

## 8. Supabase Contract

Supabase is the live source of auth, user, catalog, community, messaging, and commerce state. Treat it as production data.

Rules:

- Do not run Supabase schema or data changes from an agent unless the user explicitly approves that exact SQL.
- Prefer creating reviewed SQL files for the user to run manually after backup.
- Never rename live tables casually.
- UI language can change without database table renames.
- Destructive migrations require backup, rollback notes, and explicit approval.

Current concept-to-table map:

- Catalog/Browse items: `products`.
- Creator profiles and public member profiles: `profiles`.
- Music tracks: `tracks`.
- Files and extras: `product_assets`.
- User-owned/saved items: `library_items`.
- Reviews: `product_reviews`.
- Creator updates: `product_updates`.
- Achievements: `achievement_templates` target catalog plus `product_achievements`, `user_achievements`, `achievement_events`, `achievement_progress`.
- Community: `posts`, `post_replies`, `post_likes`, `reply_likes`, `profile_follows`.
- Messaging: `conversations`, `conversation_members`, `messages`.
- Non-v1 Services/Projects spine: `services`, `service_requests`, `project_messages`.
- Preferences: `user_os_preferences`, `user_app_preferences`, plus localStorage while persistence is unfinished.

Known Supabase issues from the audit:

- User still needs to run the reviewed v1 music achievement SQL after backup/storage verification.
- `conversation_members/messages` currently return an RLS recursion error through the REST API.
- `friend_requests` is referenced by code but does not exist remotely.
- `supabase/migrations/20260704164154_remote_schema.sql` is empty and must be classified before migration replay.
- `20260704201500_44os_steam_foundation.sql` includes destructive statements and must not be replayed casually.

Auth redirect target:

- Production Site URL: `https://44os.com`.
- Local development: `http://localhost:3000` and `http://127.0.0.1:3000`.
- Vercel previews: controlled preview allow-list or wildcard pattern.
- Desktop deep links: plan later with a `44os://` scheme if the Tauri shell needs native auth return.

---

## 9. Deployment And Desktop

Web excellence comes first. The current app should remain a full Next.js/Vercel application for v1.

Desktop strategy:

- Use Tauri remote shell first.
- Wrap the production web app rather than forcing a static export.
- Validate login, password reset, magic links, audio, downloads, uploads, external links, and native window sizing.
- Do not pursue offline/static desktop behavior until the web foundation is clean.

Vercel/domain target:

- `https://44os.com` serves the app.
- `https://www.44os.com` redirects to apex.
- `http://44os.com` redirects to HTTPS.
- Production route behavior must match the canonical route table above.

---

## 10. Maintenance Rules

- Keep only the three active `/Other` handoff docs.
- Keep Dock app behavior centralized in `src/lib/osApps.ts`.
- Keep Browse category/detail behavior centralized in route helpers.
- Keep Library ownership behavior centralized in Library primitives and route helpers.
- Add shared UI primitives before adding page-specific styling.
- Avoid one-off inline styles unless the value is genuinely dynamic.
- Keep shell chrome glassy; keep dense content readable.
- Keep lint/build green before visual polish work is considered done.
