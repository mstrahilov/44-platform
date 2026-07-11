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

- **Store**: the user-facing discovery and acquisition app.
- **Library**: the signed-in user's owned, saved, purchased, or added items.
- **Community**: public posts, questions, collaboration, follows, and creator/fan connection.
- **Radio**: public listening surface with a live Now Playing hero.
- **Studio**: signed-in creator workspace for publishing and catalog health; canonical routes live under `/studio`.
- **Settings**: signed-in system, Dock, region, and account controls. On mobile, Settings is reached from the avatar/account menu rather than the Dock.
- **Support**: public help surface.
- **Search**: desktop topbar control and mobile Dock destination for global search.

Resources and the old Services/Projects workflow are removed. Inbox and standalone Profile remain account-level surfaces rather than v1 Dock destinations.

Language rules:

- User-facing copy says Store, Library, Community, release, item, music, book, sample pack, merch, review, creator update, bonus content, earnings, and orders.
- UI copy should not use "Browse" or "Collection" as the visible product model.
- `products` is the permanent internal catalog noun. User-facing copy should use "items" or format-specific nouns.
- Services are excluded from the v1 polished Store surface.

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

Version 1.0 should establish the correct foundation: Store, Library, profiles, Community, Studio publishing, global/local pricing groundwork, music achievements, Overachiever Bonus Content, and a visual/technical system that can grow into future interactive releases.

---

## 3. Launch Journeys

Important launch journeys:

- **Fan journey**: discover work in Store, add it to Library, follow the creator, read creator updates, unlock achievements, discuss it in Community, and come back as the release evolves.
- **Early creator journey**: join Community, ask practical questions, learn how publishing works, find collaborators, build confidence, publish a first release, then use updates and Library features to keep improving it.
- **Working creator journey**: publish music/books/sample packs/merch, configure fair global/local pricing, add music achievements/bonus content where supported, post updates, interact with fans, and track catalog health in Studio.
- **Collaborator journey**: find people through Community questions/collaboration, profiles, posts, and eventually Services/Projects.
- **Flagship release journey**: experience a 44 release that demonstrates achievements, bonus content, behind-the-scenes material, Library memory, and eventually interactive 3D/Unity/WebGL unlocks.

Creator-fan distance should be low:

- Creator profiles connect posts, releases, Library items, updates, and future services.
- Store item pages explain the release and acquisition.
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
- Bonus Content is the only v1 release extra and can unlock from Overachiever.
- Existing user unlocks must be preserved during any migration.

Current code state:

- `src/lib/achievementCatalog.ts` filters Library display/tracking to the eight v1 music codes.
- `src/components/StudioReleaseFeatures.tsx` exposes Release Features for music: the eight achievement templates plus optional Overachiever Bonus Content. `DashboardReleaseFeatures.tsx` remains only as a compatibility export.
- Studio create/edit pages show release achievements only for music.
- The reviewed achievement migration is `supabase/migrations/20260709230000_44os_v1_music_achievements.sql`.
- Launch foundation SQL exists at `supabase/migrations/20260710143000_44os_launch_foundation_alignment.sql`.

Supabase is still staging-only before public launch. Back up first, run dry runs, then apply reviewed repo migrations directly through the Supabase CLI.

---

## 5. Stack And Workflow

- App: Next.js App Router, React 19, TypeScript strict mode.
- Styling: custom CSS in `src/app/globals.css` with `--os-*` tokens.
- Backend: Supabase via `@supabase/supabase-js`.
- Deployment: Vercel, canonical domain `https://44os.com`.
- Local scripts: `npm run dev`, `npm run lint`, `npm run build`, `npm run start`.
- Shell entry: `src/app/layout.tsx`.
- App registry: `src/lib/osApps.ts`.
- Store/category route helpers: `src/lib/experience.ts` and category helpers in `src/lib/storeRoutes.ts`.
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
- The Dock, Dock settings, route ownership, app labels, archived app descriptions, and app visibility derive from the registry.
- Dock child routes may define `iconClass`, but desktop and mobile dropdowns render text-only child rows aligned under the parent label axis.
- `getActiveOSAppId(pathname)` must map every route to exactly one owning app.
- Desktop Search is a topbar control immediately left of Notifications. Mobile Search is a fixed bottom-Dock destination and is the preferred mobile search entry point.
- Notifications are a topbar control, not a Dock app.
- Signed-out users see public destinations only.

Current Dock order:

- Signed in desktop: Library, divider, Discover (`/store`), Radio, Community, spacer, Support, divider, Settings.
- Signed out desktop: Discover (`/store`), Radio, Community, spacer, Support, Log In.
- Mobile: Discover (`/store`), Library, Radio, Community, Search.

Library and Settings are signed-in desktop Dock destinations. Library sits alone at the top of the signed-in desktop Dock. Studio does not appear in the Dock; creators enter through `Open Studio` on their own profile or the account menu. Inbox and Profile remain account-level surfaces. Support sits directly above the Settings divider on desktop. On mobile, Search replaces Settings in the Dock, and Settings is available from the avatar/account menu.

Current topbar/account behavior:

- Mobile top-left shows the 44 logo linking to `/store`; contextual detail pages show a circular back button immediately beside it.
- Signed-out mobile top-right shows a default profile icon linking to `/login`.
- Signed-in account menu order is Profile, Inbox, Studio; mobile additionally shows Settings and hides Log Out.
- The user-facing account label is Inbox, not Messages.

---

## 7. Canonical Routes

Canonical public routes:

- `/store` - Store front door.
- `/store/[category]` - Store category: music, books, assets, merch.
- `/store/item/[identifier]` - Store item detail. Resolve by slug first where available; id fallback is supported.
- `/cart` and `/checkout` - acquisition flow.
- `/community` - Community front door.
- `/community` - Community posts with an All Posts / Following filter.
- `/community/questions` and `/community/collaboration` - dedicated Community views.
- `/radio` - Radio.
- `/support` - Support.
- `/search` - Search.
- `/login` - authentication.
- `/notifications` - signed-in notification center launched from the topbar.

Canonical signed-in routes:

- `/library` - Library front door.
- `/library/[category]` - Library category.
- `/library/item/[id]` - owned Library item detail using `library_items.id`.
- `/profile` and `/profile/[username]` - profile surfaces.
- `/inbox` - signed-in direct-message inbox, surfaced through the account menu.
- `/studio` and Studio subroutes - creator workspace.
- `/settings` - Settings entry. The page is sectioned into Account, Notifications, Region, and Appearance; legacy `?tab=` links are compatibility anchors only.

Compatibility and legacy policy:

- `/` redirects to `/store`.
- `/browse`, `/browse/[category]`, and `/browse/item/[identifier]` redirect to Store equivalents.
- `/product/[id]` resolves as a compatibility hop to `/store/item/[identifier]`.
- `/collection` redirects to `/library`; `/collection/item/[kind]/[id]` redirects to `/library/item/[id]`.
- `/music`, `/books`, `/assets`, `/merch`, `/shop`, and old typed `/discover` paths redirect to Store categories.
- `/library/item/[kind]/[id]` remains as a legacy compatibility route and redirects to `/library/item/[id]`.
- `/dashboard` and dashboard subroutes redirect to Studio equivalents.
- `/community/following` redirects to `/community?filter=following`.
- `/community/thread/[id-or-slug]` is the canonical regular post detail page. Community feed rows and reply-count affordances should navigate there instead of expanding inline reply drawers on `/community`.
- Removed Resources and Services/Projects URLs intentionally return not found; they are not compatibility surfaces.
- Do not add vanity redirects unless there is a real public link to preserve.

---

## 8. Supabase Contract

Supabase is the staging source of auth, user, catalog, community, messaging, and commerce state until public launch. Treat it carefully, but optimize for settling the correct foundation before testers return.

Rules:

- Do not run Supabase schema or data changes without a current backup and a reviewed repo migration.
- Prefer normal Supabase migrations, dry runs, then `supabase db push` from the linked project.
- Never rename live tables casually.
- UI language can change without database table renames.
- Destructive migrations require backup, rollback notes, and explicit approval.

Current concept-to-table map:

- Canonical catalog items: `products`. `status` is the publication lifecycle and `experience_type` controls runtime behavior. The UI calls the acquisition surface Store; Library views still point to the same product row.
- Product category lookup: `product_categories`, referenced by `products.product_category_id`.
- Creator profiles and public member profiles: `profiles`.
- Music tracks: `tracks`.
- Files, galleries, and release feature unlocks: `product_assets`.
- User-owned/saved/purchased relationship to a product: `library_items`.
- Reviews: `product_reviews`.
- Creator updates: `product_updates`.
- Achievements: `achievement_templates` 44-defined catalog plus `product_achievements`, `user_achievements`, `achievement_events`, `achievement_progress`.
- Release features: achievements first, with optional `product_assets` unlocks such as `bonus_content`; future features include `commentary_audio` and `behind_the_scenes`.
- Points foundation: `user_points_ledger`.
- Community: `posts`, `post_replies`, `post_likes`, `reply_likes`, `profile_follows`, `community_questions`, `community_question_answers`, `community_question_votes`, `community_collaborations`, `community_collaboration_responses`.
- Messaging: `conversations`, `conversation_members`, `messages`.
- Future services placeholder: `services` and `service_categories` are private and dormant. When services return, migrate them into canonical `products` rows with service fulfillment instead of restoring a parallel commerce system.
- Resources were replaced by Community Questions. The old resource tables and app routes are removed.
- Radio queue: `radio_playlist_entries` references canonical product `tracks` directly.
- Theme mode and accent are stored only in the narrowly scoped `user_theme_preferences` table. Signed-out visitors always use dark mode with the Ocean accent; signed-in accounts load and save their theme through Supabase for cross-device consistency.
- Removed speculative systems: generic categories, post categories, item/product components, product relations, generic unlockables, Library activity, unused Radio scheduling tables, and empty preference/icon registries.

Known Supabase state from the launch cleanup:

- Migration history has been repaired so all ten local and remote migration versions match through `20260710174500`.
- Backups exist under ignored `supabase/backups/`.
- Message RLS cleanup, product asset vocabulary, table comments, and points ledger are handled by `20260710143000_44os_launch_foundation_alignment.sql`.
- Resource removal and service workflow retirement are handled by `20260710161500_remove_resources_and_service_workflows.sql`.
- Final category split, product-column consolidation, and speculative-table cleanup are handled by `20260710174500_final_schema_normalization.sql`.
- `20260704164154_remote_schema.sql` is an intentionally empty migration-history anchor and is labeled accordingly.
- `20260704201500_44os_steam_foundation.sql` is retained for ordered clean-database replay and is labeled as unsafe to run manually against an existing database.
- Final live read probes verified 5 product categories, 38 normalized products, 21 posts, 109 Radio playlist entries, and 8 achievement templates. Retired tables and product columns return not-found errors as expected.
- July 10, 2026 app sweep was read-only against Supabase: `supabase migration list` matched local/remote migrations through `20260710174500`; anon reads saw 38 products, 142 tracks, 109 Radio playlist entries, 5 product categories, 21 posts, and 13 profiles.
- The canonical track ordering column is `tracks.number`; `tracks.track_number` is absent in the live schema and should not be selected by app code.
- Anonymous access to the dormant `services` table returns zero rows; its data remains available only through admin/service-role access.
- `supabase db push --linked --dry-run` reports the remote database is up to date.

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
- Keep Store category/detail behavior centralized in route helpers.
- Keep Library ownership behavior centralized in Library primitives and route helpers.
- Add shared UI primitives before adding page-specific styling.
- Avoid one-off inline styles unless the value is genuinely dynamic.
- Glass is exclusive to the single unified `.app-shell`. Menus, popovers, filters, modals, panels, cards, and content surfaces are solid and readable.
- Keep lint/build green before visual polish work is considered done.
