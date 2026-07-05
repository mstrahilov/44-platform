# 44OS UI Specification

**This is the only source of truth for how 44OS looks and behaves.** Every page in the app complies with it; every new page is built from it. If a screen disagrees with this document, the screen is wrong. If this document is missing a rule, add the rule here first, then build.

44OS is one operating system, not a collection of pages. Different apps do different jobs, but they are made of the same materials, the same metrics, the same rhythm, and the same controls — the way every screen of macOS or iOS feels like one system. Nothing in the shell moves between apps. Only the workspace content changes.

Live reference: open `/studio/44os` signed in as a creator/admin tester.
Architecture and product strategy: `Other/44OS_FOUNDATION.md`. Data model: `Other/supabase-current-system-reference.sql`.

---

## 1. System Anatomy

44OS renders as one persistent shell. From back to front:

1. **Environment** — ambient background: accent-tinted gradient image, veil, noise (`.app-environment`). Never place content here.
2. **System window** — the glass shell (`.app-shell`): the entire OS lives inside one translucent window floating on the environment.
3. **Dock** — the left rail (`.app-sidebar`). App navigation. Persistent.
4. **Top bar** — system controls plus optional internal workspace sections/back links (`.os-topbar`). Persistent.
5. **Workspace** — the scrollable content area (`.app-main-content`). The only region that changes between apps.
6. **Player bar** — the music player (`.music-player-bar`), when active.

### Fixed shell metrics

| Element | Value | Token / class |
|---|---|---|
| Desktop frame padding (window to viewport) | 10px | `.app-frame` |
| System window corner radius | 18px | `.app-shell` |
| System window material | blur 44px, saturate 1.72, `--os-shell-bg` | `.app-shell` |
| Dock width (full) | 280px | `--os-sidebar-width` |
| Dock width (compact) | 76px | `--os-sidebar-compact-width` |
| System band height (Dock top row **and** tab bar) | 60px | `--os-topbar-height` |
| Tab pill height | 40px | `--os-topbar-pill-height` |
| Topbar icon control size | 44px | `--os-topbar-control-size` |
| Topbar trailing edge inset | 8px | `--os-topbar-edge-inset` |
| Workspace gutter (leading/trailing content inset) | clamp(44px, 4.4vw, 72px) | `--os-content-inset` |
| Content column max width | 1440px | `--os-content-max` |
| Readable column max width | 1180px | `--os-content-readable` |
| Long-form detail inset | clamp(64px, 6.5vw, 112px) | `--os-detail-inset` |

**The 60px system band**: the Dock's logo/clock row and the tab bar are the same height and form one continuous horizontal band across the top of the window. Nothing else may occupy this band.

### The leading axis

There is exactly **one vertical alignment line** in the workspace: the leading edge of the content column (`--os-content-inset` from the workspace edge, centered once the column hits 1440px). On this axis sit, pixel-exact:

- the first tab pill's leading edge
- the app title
- the app description
- every section title
- every card grid / list surface's leading edge

This is enforced by `--os-topbar-left-inset: calc(max((100% - var(--os-content-max)) / 2, 0px) + var(--os-content-inset))` — the tab bar computes the same axis the content column uses, at every viewport width. Do not hardcode left offsets anywhere; nothing is allowed to sit off this axis except the topbar's trailing system controls (which hug the window edge at 8px, like OS chrome).

---

## 2. The Grid

**Base unit: 4px.** Every spacing value in 44OS is a step on this scale:

| Token | Value | Typical use |
|---|---|---|
| `--os-space-1` | 4px | icon-to-text micro gaps |
| `--os-space-2` | 8px | title→description inside a head; control gaps |
| `--os-space-3` | 12px | pill padding; small clusters |
| `--os-space-4` | 16px | **section title → section content**; field padding; card padding |
| `--os-space-5` | 20px | card gaps; **list row vertical padding** |
| `--os-space-6` | 24px | panel padding; **list row horizontal padding**; header actions gap |
| `--os-space-7` | 32px | **app header bottom padding**; two-pane layout gutters |
| `--os-space-8` | 40px | large module padding |
| `--os-space-9` | 48px | **the system beat**: app header top padding, section-to-section gap |
| `--os-space-10` | 64px | page bottom padding |

### The vertical beat

The page breathes on one repeating beat of **48px** (`--os-space-9`), with harmonics at 32, 16, and 8:

```
tab bar (60px band)
  48px   ← app header top pad
APP TITLE
   8px   ← title → description
description
  32px   ← header bottom pad
──────── hairline
  48px   ← section gap
SECTION TITLE
  16px   ← section head gap
[ content: cards gap 20 / rows pad 20×24 ]
  48px   ← section gap
SECTION TITLE
  16px
[ content ]
  64px   ← page bottom
```

Named rhythm tokens (use these, never raw numbers):

- `--os-section-gap: var(--os-space-9)` — between sections. Applied by the page containers (`.app-page`, `.dashboard-page`, `.social-shell`, `.view-hub`); never add your own section margins.
- `--os-section-head-gap: var(--os-space-4)` — section title to content. Applied by `.app-section`; `.hub-section-head` has **no margin of its own** so spacing can never double-stack.
- `--os-row-pad-y` / `--os-row-pad-x` (20px / 24px) — list row padding, all lists.

If a design wants a spacing that isn't on the scale, round it to the scale.

---

## 3. The Dock

The Dock is the OS taskbar. It renders **only** from the app registry — `src/lib/osApps.ts`. Never hardcode a nav item; register an app.

- Registry entries define: id, label, description, href, icon, group (`media` / `community` / `studio` / `account` / `system` / `legacy`), auth/creator gating, `hidden` (registered, not shipped), `locked` (can't be hidden by the user).
- Layout, top to bottom: logo + clock (60px band) → **44OS** (Store, Library when signed in, Dashboard when creator) → divider → Community, Resources, Services → spacer → Log In (signed-out) → Support (directly above the divider) → divider → system group (Settings). Full Dock shows the section label; compact Dock hides labels and stays icon-only. Profile and Inbox live in the avatar menu. Account controls live inside Settings. Notifications stay in the topbar bell, and Search is the topbar search icon — neither is a Dock item. Home, Search, Radio, Friends, and format-specific Store apps are hidden from the Dock for now.
- Item metrics: padding 10px 14px, radius 12px, icon 22px, icon-to-label gap 14px, label 15px/540. Active state: 13% ink wash, weight 620. Hover: 8% ink wash.
- **Modes** (Settings > Dock): `full` (icon + label, 280px) and `compact` (icon only, 76px, items centered, clock hidden, `title` tooltip on items). Stored in localStorage (`44-dock-mode`, `44-dock-hidden`) via `src/lib/dockPreferences.ts` — always read/write through that module so the Dock and Settings stay in sync.
- Users may hide any app except `locked` ones (Home, Settings).
- Exactly one Dock item is active at all times, resolved by `getActiveOSAppId(pathname)` — every route in the shell maps to one owning app.
- **Right-click on a Dock item** opens a context menu: Open <App> / Hide from Dock (never on `locked` apps) / Compact–Expand Dock / Dock Settings. Right-click on empty Dock space offers the mode toggle + Dock Settings.
- **Drag to toggle mode**: a horizontal pointer drag on the Dock (~56px) snaps it between full and compact — drag left to compact, right to expand. The Dock never free-resizes; it only snaps between the two modes, and a drag never triggers the item click underneath.

---

## 4. The Top Bar

The top bar is system chrome first. It holds search, cart, notifications, account, and optional internal workspace sections/back links.

- Primary destinations belong in the Dock, not the top bar. Store, Library, Community, Resources, Services, Dashboard, Support, and Settings are the shipped primary destinations. Search lives in the topbar; Profile and Inbox are account-menu destinations because they are personal utilities, not platform browsing modes.
- Tabs, when used, are internal sections for configuration/workspace surfaces such as Settings, Account, and Creator. They are not the discovery mechanism for core apps.
- Tabs can also be used as local filters when the active page already has a clear destination, but never to hide where saved/owned items or messages live.
- Registered from the page via `useTopbarTabs()` (`src/components/TopbarContext.tsx`); dashboard pages use the shared `useDashboardTabs()` from `src/lib/dashboardTabs.ts`. Tabs live in code beside the app, but always render through this one component.
- Pills: 40px tall, min-width 70px, padding 0 18px, radius pill, 14px/680. Active: 13% ink wash. Hover: 8% wash.
- The first pill's leading edge sits on the leading axis (section 1).
- When a page has no tabs it may register a back link (`useTopbarBack`) that renders in the same slot; never both.
- Trailing system controls (search, cart, notifications, avatar) belong to the system, not the app. Apps must not add controls to the tab bar.
- Tabs must never resize or shift the shell when the active tab changes.

---

## 5. The Workspace

All app content renders inside `PageShell` (`.view-hub`): max-width 1440px, centered, gutter `--os-content-inset`, bottom padding 64px. Inside it, exactly one page container:

| Container | Use | Column |
|---|---|---|
| `.app-page` | browse/hub apps (Search, Store, Library, Resources, Home) | full 1440 |
| `.dashboard-page` | management tools (Dashboard, Settings) | full 1440 |
| `.social-shell` | reading/feed surfaces (Community, Friends, Inbox, threads) | readable 1180, **left-aligned on the leading axis** (never self-centered) |

All three apply the same header line and the same `--os-section-gap`. Long-form detail pages (product/release) may use `--os-detail-inset` for reading comfort — that is the only sanctioned alternative inset.

---

## 6. The App Header

**Every app's first screen opens with the app header, upper-left, always identical:**

```
APP TITLE        (.os-type-display, 54px)
description      (.os-type-body, ink-secondary, one line)
──────────────── (hairline)
```

- Component: `HubHero` (`src/components/Ui.tsx`), class `.dashboard-header` / `.social-header` (same metrics: padding 48px 0 32px, hairline bottom border).
- **The title is the app's name** — "Search", "Library", "Store", "Community", "Support", "Inbox", "Profile", "Dashboard", "Settings", "Home". Store/Library filter tabs may title the filtered view ("Music", "Books", "Assets", "Merch") while remaining inside the Store/Library app. The description may be contextual (e.g. Settings describes the active tab).
- Canonical labels/descriptions live in the app registry (`osApps.ts`); page copy should match them.
- Optional actions (e.g. "New Post") sit at the header's trailing end, bottom-aligned with the title block.
- Sub-pages (detail views, editors, composers) use `.os-type-page-title` (40px) or panel titles instead of display type; only an app's front screen uses display type.

---

## 7. Sections

A section = title row + content, composed with `HubSection` (`.app-section`):

- Title: `.hub-section-title` (panel-title type, 31px) with an optional trailing "View All" action.
- Title → content: `--os-section-head-gap` (16px), from the `.app-section` grid only.
- Section → section: `--os-section-gap` (48px), from the page container only.
- Content is one of the sanctioned content blocks: card shelf (`.app-shelf`), card grid (`.app-grid`, gap 20px), list surface, settings group, or quiet empty state.
- Sections are unframed — no cards around sections. Repeated content items are cards; sections are layout.

---

## 8. Lists

One list anatomy everywhere (dashboard, requests, notifications, orders, cart):

- Surface: `.dashboard-list-surface` — one glass panel per list, radius 28px.
- Row: `.dashboard-list-row` — padding `--os-row-pad-y` × `--os-row-pad-x` (20 × 24), grid gap 20px, hairline between rows.
- Row anatomy: `.dashboard-row-copy` (title `.dashboard-row-title`, subtitle `.dashboard-row-subtitle`) + `.dashboard-row-meta` + `.dashboard-row-actions` (one line where possible).
- State: status pills (`.project-status-pill`, `.dashboard-status`) — never oversized controls.
- Empty list: `.dashboard-empty` quiet text inside the surface, or `EmptyMessage` outside one.

---

## 9. Settings Anatomy

Settings-style screens (Settings app and any future configuration surface) use one anatomy:

**Field group** (`.settings-field`): the unit of one setting or one group of related toggles.

```
Field title       (.os-type-field-title)
description       (.os-type-body-small, ink-secondary)   ← head gap 8px
   16px
[ control: segment | swatches | select | toggle rows ]
```

- `.settings-field` pads 16px vertical; `.settings-field-head` gaps 8px; the section stacks with 24px gaps inside a 660px column (`.settings-section`; `-wide` removes the cap for toggle lists).
- **Toggle rows** (`.settings-row`): title + description left, switch right, 16px vertical padding, hairline between rows. This is the pattern for any on/off list (notification toggles, privacy toggles, Dock apps).
- **Segmented choice** (`.settings-segment` + `-item`): for one-of-N choices (theme, Dock mode, landing page).
- **Swatches** (`.settings-swatch`): for color choices only.
- Never invent a new settings control layout; compose these three.

---

## 10. Typography

One family (`--os-font-app`), fixed sizes — **type never scales with viewport width.**

| Class | Size / weight | Role |
|---|---|---|
| `.os-type-display` | 54px / 780 | App title in the app header. One per screen, max. |
| `.os-type-page-title` | 40px / ~760 | Sub-page titles where display is too large |
| `.os-type-panel-title` | 31px / ~720 | Section titles (`.hub-section-title`), focused module titles |
| `.os-type-section-title` | 22px / ~680 | Sub-headings, empty-state titles, tile groups |
| `.os-type-card-title` | 17px / ~650 | Card/list/form titles, toggle-row titles |
| `.os-type-body` | 15px | App description, primary paragraphs |
| `.os-type-body-small` | 13px | Helper text, field descriptions, list subtitles |
| `.os-type-meta` | 12px | Timestamps, category labels |
| `.os-type-eyebrow` / `.os-type-pill` | 11px uppercase | Eyebrow labels and pills only |

Hierarchy on any screen reads: display → panel-title → card-title → body → body-small → meta. Do not skip levels upward (a card title must not outrank its section title).

---

## 11. Color & Materials

- Canvas/atmosphere: `--os-color-canvas`, `--os-color-app-environment`.
- Ink: `--os-color-ink` (primary), `--os-color-ink-secondary` (descriptions), `--os-color-ink-muted` (hints/meta).
- Accent (`--os-color-accent`): sparingly — focus, success, ownership, small active signals. Never large fills.
- Danger (`--os-color-danger`, `.os-button-danger`): destructive actions only. Unpublish is not destructive.
- Hairlines: `--os-color-hairline` for all dividers.
- Materials: `.os-glass-panel` for system layers; `.os-paper` / `.os-paper-card` / list surfaces for readable content. Glass is structure, not decoration — no orbs, bokeh, or gradient-only backgrounds. No nested cards.
- Interactive washes are ink-mixes, system-wide: hover 8% ink, active/selected 13% ink.
- Theme = `body.theme-light|theme-dark` + `accent-amber|sage|ocean|violet` swapping token values. Components use semantic tokens only; **never hardcode a color** unless artwork demands it.

## 12. Radius & Shadow

Radius scale: 6, 10, 14, 18, 22, 26, 34, 44 (`--os-radius-1…8`) + `--os-radius-pill` (999) and `--os-radius-artwork` (16). Notable fixed points: system window 18, Dock items 12, tab pills & clock pill, list surfaces 28, artwork 16, avatars round.

Shadows: `--os-shadow-1…` scale only; hairline borders + subtle shadows for depth. No heavy drop shadows.

---

## 13. Components

**Buttons** — `.os-button` + `-primary` / `-secondary` / `-ghost` / `-danger`, `-compact` for dense contexts. Light theme: paper by default, black on hover; dark theme inverts. Prefer mask icons for icon buttons.

**Inputs** — `.os-input-field`, `.os-input-textarea`, `.os-input-search`, `.os-input-upload`. Quiet borders, accent focus rings, short helpful placeholders. Labels use the settings field-head pattern.

**Cards** — product/service/resource/post cards from `Ui.tsx` (`ProductCard`, `ServiceCard`, `ResourceCard`, `PostCard`). Cards navigate to detail pages; ownership/checkout actions live on detail pages. Artwork uses fixed aspect-ratio so loading never shifts layout. Cards never contain cards.

**App tiles** — `.os-app-tile` in `.os-app-tile-grid`: Home quick-launch tiles, rendered from the registry (icon + label, min-height 108px, glass control surface).

**Popovers** — `.os-popover` + `.os-popover-item`: the canonical dropdown (profile menu is the reference). Short, predictable actions. Closes on outside click, escape, route change.

**Context menus** — `ContextMenuProvider` / `useContextMenu` (`src/components/ContextMenu.tsx`), rendered as `.os-popover os-context-menu` at the cursor (viewport-clamped, z-index 200). Entries: label + `href` or `onSelect`, optional `danger` (`.os-popover-item-danger`) and dividers. One menu at a time; closes on outside press, Escape, scroll, resize, route change. Every object menu should open with the object's primary action, destructive actions last after a divider. Never build a bespoke right-click surface — always this primitive.

**Modals** — shared modal styles for gated actions/confirmations. Primary action first; danger styling only on the destructive confirm.

**Empty states** — quiet text (`EmptyMessage` / `.app-empty-text`) or one quiet surface; say what's missing and the next action. No drama, no humor in production flows.

**Icons** — `.os-icon` CSS masks (`--os-icon-url`), sized 18/22/28 (`-sm/-md/-lg`); they inherit `currentColor` so they theme automatically. New icons: SVG file in `/public/icons/...` or inline data-URI mask, stroke ~1.8, 24px grid.

---

## 14. Interaction Rules

- **Right-click belongs to 44OS.** The browser context menu is suppressed shell-wide (`SystemShell.tsx`); editable elements (inputs, textareas, contenteditable) keep the native menu. 44OS context menus (§13) are live on Dock items (Open / Hide from Dock / mode / Dock Settings), store product tiles (View Item / View Creator), and app Library tiles (Play·Read·Download / Open / View Creator / Remove from Library for free items · Hide from Library for purchases). Posts and projects come next — until an object has a menu, right-click simply does nothing.
- Minimum touch/click target: 44px (`--os-topbar-control-size` is the reference).
- Focus states are visible; every interactive element is reachable by keyboard.
- Landing: signed-in users entering at `/` are routed once per app load to their landing app (Settings > Dock > Landing App, default Music) by `SystemShell`. Landing choices are currently visible Dock apps only. In-app navigation to Merch or legacy Store routes is never hijacked.

## 15. Motion

Quiet and system-like; "responsive and alive," never decorative. Transitions run 120–130ms ease on background/color (the current standard across items, tabs, tiles). Route/workspace transitions and popover scale-fade land with the motion pass (Foundation Phase 6) and must respect `prefers-reduced-motion` plus a Settings motion preference. No per-page animation hacks; shared classes only.

## 16. Responsive

Desktop-first; every screen must degrade cleanly.

- Shared breakpoints: 1080px, 860px, 720px, unless a layout already defines a better local one.
- On mobile the Dock collapses toward an app-launcher pattern; never squeeze two-pane layouts into narrow columns — stack them.
- Grids/shelves drop to 1–2 columns keeping artwork aspect ratios stable.
- Type never scales with viewport; containers change instead. Descriptions wrap naturally.
- Mobile sweeps update shared primitives first, page exceptions second.

---

## 17. App-Specific Rules (unchanged foundations)

**Community** — The Dock exposes Feed, Messages, and Profile directly. Feed general posts map to the `discussions`/legacy `discussion` category. Creator/member profiles are Community item pages with a topbar back-link to Community when reached from another profile; profile-local tabs are Posts, Music, Books, Assets, Services, and empty tabs are hidden. Friends is hidden from primary navigation while following is reconsidered. In feeds, only avatars link to profiles; handles are display-only; title/body link to the thread.

**Reviews / Updates** — Reviews are not Community posts visually or conceptually. They live only on Store item pages for Music, Books, Assets, and Merch. Updates live only on owned Library item pages for Music, Books, and Assets. Creator profiles do not show Reviews or Updates. Reviews use `product_reviews`; Updates use `product_updates`.

**Store** — The Store front page (All tab) is two shelves: Explore Music and Explore Apparel, eight items each, each with a trailing View All action that opens the matching filter tab (Music / Merch). Filter tabs (Music, Books, Assets, Merch) title the filtered view in the app header; Library filter tabs do the same.

**Music** — Store detail pages are public Release pages: release hero, primary release action, Library/Cart action, creator link, tracklist with stable playable rows, Reviews, details, and related creator items. Owned Library detail pages are owned Release pages: album header, Play Release / Play All, stable playable track rows, achievement rows, release details, creator/store links, and read-only Creator Updates. Tracklist rows use the shared `.view-tracklist` / `.view-track-row` anatomy; updates and reviews stay in release or Library context, not Community.

**Books** — Owned Library detail pages are Book/Artbook pages: book-format header, Read action, embedded reader, page controls, file-open fallback, book details, creator/store links, and read-only Creator Updates. Reader surfaces are functional app surfaces, not marketing previews.

**Merch** — Merch is physical goods only. Store and detail pages should use shipped-goods language, Cart/Checkout actions, and Related Merch strips filtered to physical goods. Merch must never behave like a digital Library item.

**Resources** — Resources is public discovery/browse. Saved resources are backed by `saved_resources`; the compatibility route remains `/resources/collection`, but user-facing copy never says Collection. Do not call saved resources a Library.

**Search** — Search is reached from the topbar search icon, which opens `/search?q=`; it is not a Dock item. The Search app must include an in-page search field so the destination is usable without the topbar icon. Results group by Items, Creators, and Posts; `/browse` is not a shipped surface.

**Services** — Services is browsing/intake. Projects and Requests routes remain compatibility/future workspaces while Services is paused. Service categories stay inside the Services workspace, not in the top bar.

**Profiles** — cover/header never overlaps avatar/name/bio/actions. No public follower/following counts yet. Existing friend actions may remain on profile pages during the transition, but Friends is not primary navigation while following is reconsidered.

**Settings** — Settings is the single control panel. Shipped topbar tabs are System, Dock, Region, Account. Only working controls appear: theme/accent, landing app, Dock mode, visible Dock apps, region/currency, email, password reset, privacy toggles, and notification toggles. Do not show placeholder-only sections such as Clock, Accessibility, Advanced, Orders, typography, wallpaper, integrations, sessions, or two-factor authentication until they work. Account profile identity fields do not live here; username, avatar, display name, and bio live on Profile/Edit Profile.

**Dashboard** — creator tooling for digital releases at `/dashboard`; Dock copy says Dashboard and the item sits in the main 44OS group directly below Library (creators only), above the divider that separates Community/Resources/Services. Shipped topbar tabs are Overview, Music, Books, Assets. Music/Books/Assets are separate creator-catalog sections (compat route may stay `/dashboard/products`). Overview shows three digital catalog cards and an embedded Earnings section; there is no separate Earnings tab. Merch, Preferences, Services, Requests, Resources, and Updates stay out of Dashboard navigation until their workflows are redesigned. New/edit item forms expose Title, type selector, Description, Price, optional Local Price, year, Artwork, Music tracks, and Books/Assets file upload. Do not expose category dropdowns, creator fields, or hero-image fields. Payout language is Earnings / Sold Items. UI says Music/Books/Assets items by context — never "Products".

**Library** — "Library" is the universal owned-items word and a visible Dock app. The global `/library` route is the aggregate entry point for everything a user has added or purchased; owned item detail routes may still live under Music/Books/Assets, but they should activate Library in the Dock. "Collection" is legacy-route-only and never appears in UI copy.

---

## 18. Sanctioned Exceptions

Temporary, tracked, and shrinking — do not add to this list:

1. **Legacy resource/service library item details** (`/library/item/resource/...`, `/library/item/service/...`): compatibility detail surfaces until Resources/Services get owned detail pages. Product library items redirect to owning app Library routes.
2. **`browse-page-title`** uses viewport-clamped display type; to be retired onto `.os-type-display`.
3. **Detail pages** may use `--os-detail-inset` (this one is permanent — reading comfort).

---

## 19. Compliance Checklist — every new or edited screen

1. Renders inside `PageShell` with exactly one sanctioned page container (`.app-page` / `.dashboard-page` / `.social-shell`).
2. Opens with the app header: app name (display type) + one-line description, 48/8/32 rhythm, hairline.
3. Tabs (if any) registered via `useTopbarTabs` / `useDashboardTabs` — never a local tab bar.
4. If it's a new app or route: registered in `src/lib/osApps.ts` (including the route → app mapping in `getActiveOSAppId`).
5. Every spacing value is a token on the 4px scale; sections use `HubSection`; no local margins between sections.
6. Lists use the list anatomy (§8); settings use the settings anatomy (§9); no new one-off layouts for either.
7. Type classes only; semantic color tokens only; no hardcoded palettes; no nested cards.
8. Left edge of everything sits on the leading axis.
9. Degrades cleanly at 1080 / 860 / 720.
10. `npm run build` passes.

## 20. Agent Workflow

Before creating or changing UI:

1. Read this file.
2. Open `/studio/44os` for the living reference.
3. Search for the existing component/class that matches the need — it almost certainly exists (`Ui.tsx`, `globals.css`).
4. Reuse it. If a genuinely new primitive is needed, define it with tokens, document it here, then use it.
5. Run `npm run build` after production-facing changes.
