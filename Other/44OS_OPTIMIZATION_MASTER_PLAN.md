# 44OS Optimization Master Plan

This is one of the three active handoff documents for 44OS. Keep it updated as optimization work lands.

Status legend:

- `[done]` complete and verified.
- `[in progress]` actively being changed.
- `[pending]` planned but not started.
- `[blocked]` needs user action, external credentials, or Supabase approval.

---

## 1. Vision Alignment

- `[done]` Document 44OS as a Steam/Valve-like creative operating system for underground creatives and fans.
- `[done]` Document anti-ad, anti-algorithmic, creator-first product doctrine.
- `[done]` Document launch journeys for fans, early creators, working creators, collaborators, and flagship releases.
- `[done]` Document creator-fan distance reduction through profiles, Library, creator updates, and Community.
- `[pending]` Review Dashboard publishing flows against the rule: technology hidden, creator power exposed.
- `[pending]` Review Library detail pages as durable homes for achievements, bonus content, creator updates, commentary, hidden files, and future interactive artifacts.
- `[pending]` Review Store/Browse copy so discovery feels human and catalog-driven, not algorithmic.
- `[pending]` Review global/local pricing UI so it communicates reach and local fairness clearly.
- `[pending]` Design the flagship-release template: album/release page, achievements, bonus content, behind-the-scenes material, hidden unlocks, and future Launch action.
- `[pending]` Define the future interactive-experience event bridge: external experience reports event, Supabase validates it, Library records the unlock.
- `[pending]` Revisit Services after v1 as a creator earning surface with local/global pricing and simple project workflows.

Acceptance:

- A future engineer can explain 44OS in one sentence: a creator-first operating system for publishing, collecting, community, and interactive creative experiences.
- Dashboard screens use creator outcomes, not implementation jargon.
- Library screens clearly show what the user owns, unlocked, experienced, or can revisit.
- Future Unity/web/3D experience work has a documented event contract before implementation.

---

## 2. Foundation

- `[done]` Keep exactly three active `/Other` handoff docs.
- `[done]` Rewrite Foundation around current architecture, canonical route model, Supabase contract, deployment, and desktop stance.
- `[done]` Rewrite UI as 44OS principles instead of stale implementation notes.
- `[done]` Set explicit Next/Turbopack project root.
- `[done]` Remove external CSS font import and use the documented OS font stack.
- `[done]` Remove unused scaffold CSS and repo-local generated `.DS_Store` files.
- `[done]` Bring ESLint to zero errors and zero warnings.
- `[done]` Verify production build after foundation and lint cleanup.
- `[pending]` Reduce global CSS duplication and legacy aliases after lint/build are green.
- `[pending]` Add conservative security headers, excluding CSP until theme/auth inline scripts are audited.

Acceptance:

- `npm run dev` starts without a Turbopack root warning.
- `npm run build` passes.
- `npm run lint` passes with zero errors and zero warnings.

---

## 3. Routes And Navigation

- `[done]` Document Browse as the visible Store app and `/store` as the underlying acquisition system.
- `[done]` Document Library as the canonical owned/saved system.
- `[done]` Keep Services out of v1 Dock and Browse surfaces.
- `[pending]` Audit obsolete route files and remove or redirect only after reference checks.
- `[pending]` Verify all active routes map to one Dock owner through `getActiveOSAppId`.
- `[pending]` Verify production apex/www/http redirects and canonical app routes.

Canonical launch routes:

- `/`
- `/store`
- `/store/[category]`
- `/store/[category]/[slug]`
- `/library`
- `/library/[category]`
- `/library/item/[kind]/[id]`
- `/community`
- `/radio`
- `/support`
- `/search`
- `/login`
- `/dashboard`
- `/settings?tab=account`

Acceptance:

- Public Dock shows Search, Browse, Radio, Community, Support, and Log In.
- Signed-in Dock shows Search, Browse, Radio, Community, Messages, Profile, Library, Dashboard, Support, and Settings.
- Services and Resources are not visible v1 app destinations.
- `/collection` continues to redirect to `/library`.

---

## 4. Supabase

- `[done]` Document current Supabase contract and table ownership.
- `[blocked]` Do not apply Supabase SQL automatically.
- `[done]` Decide and document the exact v1.0 achievement set: music only, 8 achievements, no `First Wave`, no book achievements.
- `[done]` Create reviewed SQL for central `achievement_templates`, v1 music icon URLs, non-v1 achievement pruning, and Overachiever-only Bonus Content cleanup: `supabase/migrations/20260709230000_44os_v1_music_achievements.sql`.
- `[done]` Update Dashboard achievement setup so creators configure music achievements and Overachiever Bonus Content instead of hand-editing achievement rows/art.
- `[done]` Update Library/Notification achievement display and tracking to filter to v1 music achievement codes.
- `[pending]` User runs reviewed v1 music achievement SQL in Supabase after confirming storage filenames match the SQL.
- `[pending]` Re-probe Supabase achievement tables after the SQL is applied.
- `[pending]` Create a reviewed SQL fix for recursive `conversation_members/messages` RLS.
- `[pending]` Resolve `friend_requests` drift by either restoring the table with RLS or removing/rebasing code to `profile_follows`.
- `[pending]` Classify empty migration `20260704164154_remote_schema.sql`.
- `[pending]` Mark destructive historical migration as do-not-replay without backup and approval.
- `[pending]` Document production Auth Site URL and redirect allow-list settings.
- `[pending]` Plan Supabase event tables/policies for future achievement and interactive-experience unlocks before building the flagship release.

Acceptance:

- Required v1 REST probes return 200/206.
- Messaging no longer returns RLS recursion errors.
- No live code references a missing table.
- Achievement templates exist as the central source of truth for the 8 v1 music achievements.
- Product achievement rows reference templates and remaining v1 unlocks still render correctly.
- Dashboard achievement setup is simple enough that creators do not need to understand triggers, tables, icon URLs, or Overachiever reward wiring.
- Any SQL file is reviewed before the user runs it.

---

## 5. UI Polish

- `[done]` Define 44OS UI quality principles.
- `[done]` Define Dock vs Topbar tab navigation rules.
- `[done]` Define page hero, tab copy, and simple/guided section heading rules.
- `[done]` Remove Services from Browse tabs and shelves for v1.
- `[pending]` Refactor high-inline-style pages into shared classes/primitives.
- `[pending]` Consolidate icon usage around the existing `os-icon` mask system or one intentionally chosen replacement.
- `[pending]` Remove decorative orb/bokeh background treatment.
- `[pending]` Standardize forms, empty states, list rows, cards, segmented tabs, and dashboard surfaces.
- `[pending]` Restore visual screenshot QA for desktop and mobile.
- `[pending]` Strengthen Topbar tab contrast and active state so testers immediately recognize local app tabs.
- `[pending]` Sweep page titles/descriptions across Browse, Library, Community, Dashboard, Settings, Search, Support, Radio, and protected states.
- `[pending]` Sweep section headings: title-only for obvious sections, title plus description for concepts like Achievements, Creator Updates, Bonus Content, Local Pricing, Questions, Collaboration, and Launch.
- `[pending]` Fix Dashboard overview cards so helper text does not wrap awkwardly inside tight metric cards.
- `[pending]` Review Dashboard forms for creator confidence: clear fields, previews, validation, and plain-language help.
- `[pending]` Review Library item pages for fan memory: achievements, extras, updates, bonus files, and future Launch action placement.

Priority screens:

- Browse/Store
- Library
- Product detail
- Login
- Settings
- Dashboard
- Community
- Support
- Radio

Acceptance:

- No visible overlap.
- No unintended horizontal scroll.
- 44px target rule is met where practical.
- Typography and material usage match `Other/44OS_UI.md`.
- Loading, empty, error, signed-out, and signed-in states are intentional.

---

## 6. Desktop

- `[done]` Choose Tauri remote shell as the first desktop strategy.
- `[pending]` Defer desktop implementation until web lint/build/visual QA are green.
- `[pending]` Validate desktop login, auth redirects, password reset, audio, downloads, uploads, external links, and window sizing.
- `[pending]` Decide later whether a native `44os://` deep link is required.

Acceptance:

- macOS and Windows shells load the production app cleanly.
- Auth return paths are documented and tested.
- Desktop behavior does not require static-exporting the current Next app.

---

## 7. Current Known Blockers

- Current achievement setup is split between hardcoded dashboard templates and product-specific Supabase rows; unified artwork requires a central template catalog.
- Supabase messaging RLS recursion needs reviewed SQL and user approval before it can be fixed remotely.
- Remote `friend_requests` table is absent while code references it.
- Browser screenshot QA tooling needs repair or replacement before visual acceptance can be completed.
- Full UI polish requires a second pass after lint/build are green.
