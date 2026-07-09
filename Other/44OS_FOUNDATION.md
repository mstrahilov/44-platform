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

The launch mental model is:

- **Browse**: the user-facing discovery and acquisition app.
- **Store**: the underlying route/system name for Browse. Keep `/store` stable under the hood.
- **Library**: the signed-in user's owned, saved, purchased, or added items.
- **Community**: public social and creator-knowledge surface.
- **Radio**: public listening surface.
- **Dashboard**: signed-in creator workspace.
- **Settings**: signed-in system, Dock, region, and account controls.
- **Support**: public help surface.

Services, Resources, Projects, Friends, and older category app routes are not v1 Dock destinations. They may exist as hidden or compatibility surfaces, but they should not appear as polished launch apps until their product strategy is intentionally restored.

Language rules:

- User-facing copy says Browse, Store item, Library, music, books, sample packs, merch, releases, items, reviews, updates, earnings, and sold items.
- UI copy should not use "products" as the generic catalog word. The database table can remain `products`.
- UI copy should not use "collection"; use Library.
- Services are excluded from the v1 polished Browse surface.

---

## 2. North Star

44OS exists to give underground creatives and their fans a home outside ad-driven, algorithm-driven platforms. The product should feel closer to a creator operating system than a social app: a place where people publish, collect, listen, read, explore, ask questions, follow each other, collaborate, sell work, and build cultural memory around releases.

The closest strategic reference is Steam/Valve, adapted for music, books, art, services, games, interactive releases, and local creative economies:

- 44 first uses 44OS to publish its own flagship work.
- The platform then opens outward so friends, collaborators, and other creatives can publish their own work.
- Over time, platform capabilities become creator tools, the way Steam grew from distribution into Workshop, achievements, communities, modding, and hardware/engine showcases.
- Flagship 44 releases should demonstrate what the system can do, then those capabilities should become simple tools other creators can use without needing to code.

Core doctrine:

- **Creator-first, fan-respecting**: no dark patterns, no algorithmic addiction loops, no ad-first design.
- **Technology hidden, power exposed**: creators should not need to understand achievement tracking, local/global pricing, Supabase events, file unlocks, or interactive-experience APIs. The Dashboard should expose clear choices and 44OS should handle the machinery.
- **Library as memory**: when a fan adds a release, finds a hidden item, unlocks an achievement, watches bonus content, or joins an experience, the Library should become the durable record of that relationship.
- **Community as infrastructure**: posts, follows, questions, collaboration, profiles, and messages are not engagement bait. They exist so people can learn, find each other, support each other, and build creative scenes.
- **Global reach, local fairness**: creators should be able to sell globally at a fair global price while optionally offering local pricing that respects their home community and currency.
- **Flagship experiences lead the system**: 44 should use major releases to prove new capabilities, then productize those capabilities for other creators.

Long-term capability model:

- Music, books, sample packs, merch, games, tools, and future creative formats live in the Store/Browse catalog.
- The Library stores owned/saved items, bonus files, achievements, creator updates, commentary, behind-the-scenes material, hidden unlocks, and future interactive artifacts.
- Achievements should feel automatic to creators. They define intent; 44OS tracks listening, reading, unlocks, timing, progress, and events.
- Interactive experiences can eventually send trusted events back to 44OS. Example: a Unity-built museum experience lets a fan discover a hidden book; the experience reports the event; Supabase records the unlock; the fan later sees that book in their Library.
- Services eventually return as a creator earning surface, with local/global pricing and simple project workflows.
- Dashboard publishing should stay boring in the best way: clear fields, clear previews, clear pricing, clear release tools, no unnecessary technical burden.

Version 1.0 should not try to ship every long-term capability. It should establish the correct foundation: Store/Browse, Library, profiles, Community, Dashboard publishing, global/local pricing groundwork, achievements groundwork, and a visual/technical system that can grow into the fuller vision.

---

## 3. Launch Doctrine

44OS 1.0 is not only for established creators. It should also support the person who has been drawing, writing, producing, coding, filming, or making music privately for years and has never published because the current creative industries feel expensive, confusing, gatekept, or socially intimidating.

Important launch journeys:

- **Fan journey**: discover work in Browse, add it to Library, follow the creator, read creator updates, unlock achievements, discuss it in Community, and come back as the release evolves.
- **Early creator journey**: join Community, ask practical questions, learn how publishing works, find collaborators, build confidence, publish a first release, then use updates and Library features to keep improving it.
- **Working creator journey**: publish music/books/sample packs/merch, configure fair global/local pricing, add achievements/bonus content, post updates, interact with fans, and track catalog health in Dashboard.
- **Collaborator journey**: find people through Community questions/collaboration, profiles, posts, and eventually Services/Projects.
- **Flagship release journey**: experience a 44 release that demonstrates achievements, bonus content, behind-the-scenes material, Library memory, and eventually interactive 3D/Unity/WebGL unlocks.

Creator-fan distance should be low:

- Creator profiles connect posts, releases, Library items, updates, and future services.
- Store item pages explain the release and acquisition.
- Library item pages show the deeper relationship: owned status, play/read/download, achievements, updates, bonus content, and future Launch actions.
- Creator Updates are the 44OS version of patch notes, release notes, dev logs, and album/project updates. They make a release feel alive instead of frozen after distribution.
- Community is where fans and creators talk, ask, answer, collaborate, and build scenes without algorithmic pressure.

Learning curve doctrine:

- Do not assume creators know music distribution, mastering, LUFS, collaborators, pricing, file packaging, achievement logic, or release operations.
- Dashboard should guide without patronizing: clear fields, plain explanations, previews, validation, and safe defaults.
- Practical creator knowledge belongs in Community and future guided resource surfaces, not hidden in support tickets.
- The system should turn hard technical ideas into simple creator choices.

Global/local pricing doctrine:

- A creator can sell to a global audience at a global price.
- The same creator can offer a fair local price for their own region/community.
- UI should explain this as reach plus fairness, not as a complicated finance model.
- Supabase and pricing code should preserve both global and local pricing intent cleanly for products and, later, services.

Launch copy doctrine:

- Sidebar/Dock is primary navigation.
- Topbar tabs are local navigation inside the current app.
- Every primary page needs a clear title and one-sentence description.
- Every tab view needs a title and description that tells the user what they can do there.
- Sections that are obvious can use title-only headings. Sections that introduce a 44OS concept, such as Achievements, Creator Updates, Bonus Content, Collaboration, Questions, Local Pricing, or Library unlocks, should include a short explanatory description.

---

## 4. Achievement Foundation Target

Current state:

- Achievement tracking exists through `product_achievements`, `user_achievements`, `achievement_events`, and `achievement_progress`.
- Dashboard achievement templates are hardcoded in `src/components/DashboardReleaseFeatures.tsx`.
- Product achievement rows are product-specific and currently duplicate title, description, trigger, points, secret state, and icon.
- The builder currently writes `icon: null`, which blocks the unified artwork direction.
- Existing migrations seeded product-specific defaults for music/books, but v1.0 now ships music achievements only.

Target state for launch:

- 44OS owns one central achievement template catalog with 8 v1.0 music achievement slots: Front to Back, No Skips, Nightbird, Heavy Rotation, Joined the Orbit, Left Your Mark, Signal Boost, and Overachiever.
- Each template has one stable code, title, description, point value, sort order, secret/default state, trigger mapping, and shared artwork URL from Supabase Storage.
- Product achievements become per-product enablement rows that reference the central template instead of acting as the source of truth for copy/artwork.
- Creators do not hand-edit achievement text or artwork during v1. They choose whether a music release supports the 44OS achievement set and can attach Bonus Content.
- Bonus Content is the only v1 release extra. It unlocks from Overachiever only.
- `First Wave` is removed from v1.0 because time-limited achievements can permanently block Overachiever for late listeners.
- Books, sample packs, merch, games, and interactive experiences can join later when their core experiences and triggers are real.
- Existing user unlocks must be preserved during any migration.

Recommended Supabase path:

- Add `achievement_templates` as the central catalog.
- Add nullable `template_id` to `product_achievements`.
- Backfill `product_achievements.template_id` by `code`.
- Backfill `product_achievements.icon` from the template icon URL for compatibility.
- Keep existing `product_achievements.id` values for remaining v1 rows so `user_achievements` remains valid.
- Remove non-v1 achievement rows, including book achievements, `First Wave`, Commentary/Director's Cut, and any future-only feature achievements.
- Update Dashboard code to expose music achievements and Overachiever Bonus Content only.
- Update Library/Notification code to show v1 music achievements only while preserving existing row compatibility.
- Only after verification, consider whether legacy duplicated fields should become snapshots, overrides, or compatibility-only fields.

Do not run this migration directly from an agent. Create reviewed SQL first, inspect remote data, back up affected tables, and let the user run the SQL.

---

## 5. Stack And Workflow

- App: Next.js App Router, React 19, TypeScript strict mode.
- Styling: custom CSS in `src/app/globals.css` with `--os-*` tokens.
- Backend: Supabase via `@supabase/supabase-js`.
- Deployment: Vercel, canonical domain `https://44os.com`.
- Local scripts: `npm run dev`, `npm run lint`, `npm run build`, `npm run start`.
- Shell entry: `src/app/layout.tsx`.
- App registry: `src/lib/osApps.ts`.
- Store routes: `src/lib/storeRoutes.ts`.
- Library routes: `src/lib/libraryRoutes.ts`.

Quality gates for production-facing work:

- `npm run lint` must pass with zero errors and zero warnings.
- `npm run build` must pass.
- `npm run dev` should start without Turbopack root warnings.
- Route and auth changes require manual browser QA at desktop and mobile widths.

Do not delete files just because they look old. First verify references with `rg`, route ownership, and tracked status.

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
- Signed-in users may see personal destinations such as Messages, Profile, Library, Dashboard, and Settings.

Current public Dock target:

- Search
- Browse
- Radio
- Community
- Support
- Log In system action

Current signed-in Dock target:

- Search
- Browse
- Radio
- Community
- Messages
- Profile
- Library
- Dashboard
- Support
- Settings

---

## 7. Canonical Routes

Canonical public routes:

- `/` - Browse front door at the apex domain.
- `/store` - Store/Browse index.
- `/store/[category]` - Store category: music, books, assets, merch.
- `/store/[category]/[slug]` - Store item detail.
- `/product/[id]` - compatibility item detail route owned by Store.
- `/cart` and `/checkout` - acquisition flow.
- `/community` - Community front door.
- `/radio` - Radio.
- `/support` - Support.
- `/search` - Search.
- `/login` - authentication.

Canonical signed-in routes:

- `/library` - Library front door.
- `/library/[category]` - Library category.
- `/library/item/[kind]/[id]` and category detail routes - owned Library item detail.
- `/inbox` - Messages.
- `/profile` and `/profile/[username]` - profile surfaces.
- `/dashboard` and dashboard subroutes - creator workspace.
- `/settings?tab=account` - default Settings entry.

Compatibility and legacy policy:

- `/collection` redirects to `/library` for legacy compatibility.
- `/browse` is not canonical.
- `/music`, `/books`, `/assets`, `/merch`, and `/shop` are not canonical app roots.
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

- Achievement templates: planned central table `achievement_templates`.
- Catalog/Browse items: `products`.
- Creator profiles and public member profiles: `profiles`.
- Music tracks: `tracks`.
- Files and extras: `product_assets`.
- User-owned/saved items: `library_items`.
- Store reviews: `product_reviews`.
- Creator updates: `product_updates`.
- Achievements: `product_achievements`, `user_achievements`, `achievement_events`, `achievement_progress`.
- Community: `posts`, `post_replies`, `post_likes`, `reply_likes`, `profile_follows`.
- Messaging: `conversations`, `conversation_members`, `messages`.
- Non-v1 Services/Projects spine: `services`, `service_requests`, `project_messages`.
- Preferences: `user_os_preferences`, `user_app_preferences`, plus localStorage while persistence is unfinished.

Known Supabase issues from the current audit:

- Achievements need a central template/catalog migration before launch polish.
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
- Keep Store/Browse category behavior centralized in Store primitives and route helpers.
- Keep Library ownership behavior centralized in Library primitives and route helpers.
- Add shared UI primitives before adding page-specific styling.
- Avoid one-off inline styles unless the value is genuinely dynamic.
- Keep shell chrome glassy; keep dense content readable.
- Keep lint/build green before visual polish work is considered done.
