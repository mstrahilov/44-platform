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
- `[done]` Make Browse the user-facing discovery model and Library the durable memory model.
- `[pending]` Review remaining Dashboard publishing flows against the rule: technology hidden, creator power exposed.
- `[pending]` Review Library detail pages as durable homes for achievements, bonus content, creator updates, hidden files, and future interactive artifacts.
- `[pending]` Review global/local pricing UI so it communicates reach and local fairness clearly.
- `[pending]` Design the flagship-release template: album/release page, achievements, bonus content, and future Launch action.
- `[pending]` Define the future interactive-experience event bridge before building Unity/WebGL/Spline-style unlocks.
- `[pending]` Revisit Services after v1 as a creator earning surface with local/global pricing and simple project workflows.

Acceptance:

- A future engineer can explain 44OS in one sentence: a creator-first operating system for publishing, collecting, community, and interactive creative experiences.
- Dashboard screens use creator outcomes, not implementation jargon.
- Library screens clearly show what the user owns, unlocked, experienced, or can revisit.

---

## 2. Foundation

- `[done]` Keep exactly three active `/Other` handoff docs.
- `[done]` Rewrite Foundation around Browse-first canonical routes, Supabase contract, deployment, and desktop stance.
- `[done]` Rewrite UI around the `UI Elements/` primitive system.
- `[done]` Bring ESLint to zero errors and zero warnings.
- `[done]` Verify production build after Browse/Library route changes.
- `[pending]` Reduce global CSS duplication and legacy aliases after visual QA.
- `[pending]` Add conservative security headers, excluding CSP until theme/auth inline scripts are audited.

Acceptance:

- `npm run build` passes.
- `npm run lint` passes with zero errors and zero warnings.
- `npm run dev` starts cleanly on the project root.

---

## 3. Routes And Navigation

- `[done]` Make `/browse`, `/browse/[category]`, and `/browse/item/[identifier]` canonical.
- `[done]` Make `/library/item/[id]` the canonical Library item detail route.
- `[done]` Redirect `/` to `/browse`.
- `[done]` Redirect `/store*`, `/product/[id]`, `/collection*`, and old typed category routes to Browse/Library equivalents.
- `[done]` Update route helpers with `browseIndexHref`, `productBrowseHref`, and `libraryItemHref`.
- `[done]` Update Dock order to Library, Search, Browse, Radio, Community, optional creator Dashboard, Support, Settings/Log In.
- `[done]` Hide Messages and Profile from the v1 Dock.
- `[pending]` Verify all active routes map to one Dock owner through `getActiveOSAppId`.
- `[pending]` Verify production apex/www/http redirects and canonical app routes.

Canonical launch routes:

- `/browse`
- `/browse/[category]`
- `/browse/item/[identifier]`
- `/library`
- `/library/[category]`
- `/library/item/[id]`
- `/community`
- `/radio`
- `/support`
- `/search`
- `/login`
- `/dashboard`
- `/settings?tab=account`

Acceptance:

- Public Dock shows Search, Browse, Radio, Community, Support, and Log In.
- Signed-in Dock shows Library, Search, Browse, Radio, Community, optional creator Dashboard, Support, and Settings.
- Services and Resources are not visible v1 app destinations.
- Legacy route redirects are intentional and documented.

---

## 4. Supabase

- `[blocked]` Do not apply Supabase SQL automatically.
- `[done]` Decide and document the exact v1 achievement set: music only, 8 achievements, no `First Wave`, no book achievements.
- `[done]` Create reviewed SQL for central `achievement_templates`, v1 music icon URLs, non-v1 achievement pruning, and Overachiever-only Bonus Content cleanup: `supabase/migrations/20260709230000_44os_v1_music_achievements.sql`.
- `[done]` Update Dashboard achievement setup so creators configure music achievements and Overachiever Bonus Content only.
- `[done]` Update Library/Notification achievement display and tracking to filter to v1 music achievement codes.
- `[pending]` User runs reviewed v1 music achievement SQL in Supabase after confirming storage filenames match the SQL.
- `[pending]` Re-probe Supabase achievement tables after the SQL is applied.
- `[pending]` Create a reviewed SQL fix for recursive `conversation_members/messages` RLS.
- `[pending]` Resolve `friend_requests` drift by restoring the table with RLS or removing/rebasing code to `profile_follows`.
- `[pending]` Classify empty migration `20260704164154_remote_schema.sql`.
- `[pending]` Mark destructive historical migration as do-not-replay without backup and approval.
- `[pending]` Document production Auth Site URL and redirect allow-list settings.

Acceptance:

- Required v1 REST probes return 200/206.
- Messaging no longer returns RLS recursion errors.
- No live code references a missing table.
- Achievement templates exist as the central source of truth for the 8 v1 music achievements.
- Any SQL file is reviewed before the user runs it.

---

## 5. UI Polish

- `[done]` Define 44OS UI quality principles.
- `[done]` Document the `UI Elements/` reference folder as the visual primitive source.
- `[done]` Add a reusable `SectionHeader` primitive with title, optional description, and optional action.
- `[done]` Upgrade `HubSection` to use the shared section header primitive.
- `[done]` Define elevated card, recessed interactive list, and flat information list surface families.
- `[done]` Align Dashboard release edit/create field grouping so Release Type, Release Year, and Price share the same row.
- `[done]` Replace nested glass track editor cards with a recessed editable list primitive.
- `[done]` Add guided descriptions to Creator Updates and Reviews.
- `[done]` Sweep major Browse/Library/Search/Community copy away from Store/Collection/self-referential language.
- `[pending]` Continue refactoring remaining inline-style pages into shared classes/primitives.
- `[pending]` Consolidate icon usage around the existing `os-icon` mask system or one intentionally chosen replacement.
- `[done]` Strengthen Topbar tab contrast and active state so testers immediately recognize local app tabs.
- `[done]` Fix Dashboard overview cards so helper text does not wrap awkwardly inside tight metric cards.
- `[done]` Remove negative letter spacing and viewport-scaled global font sizes from shared CSS.
- `[done]` Stabilize shared button and product tile hover states so controls do not jump or scale.
- `[in progress]` Restore visual screenshot QA for desktop and mobile.
- `[pending]` Verify achievement artwork renders from Supabase Storage after the SQL is applied.

Priority screens:

- Browse
- Browse item
- Library
- Library item
- Dashboard overview
- Dashboard release editor
- Community
- Search
- Radio
- Support
- Settings
- Login

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

- User still needs to run the reviewed v1 music achievement SQL after backing up and confirming storage filenames.
- Supabase messaging RLS recursion needs reviewed SQL and user approval before it can be fixed remotely.
- Remote `friend_requests` table is absent while code references it.
- Browser screenshot QA tooling still needs to be run against the updated app.
- Full visual QA requires a running local app and desktop/mobile screenshots.
