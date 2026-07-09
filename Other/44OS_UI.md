# 44OS UI Specification

**One of exactly two project handoff documents.** This file defines how 44OS looks, feels, and behaves. `Other/44OS_FOUNDATION.md` defines architecture, routes, Supabase, and next work. If a screen disagrees with this document, the screen is wrong or this document must be updated in the same change.

44OS should feel like one operating system, not a pile of pages. Apps can do different jobs, but they share one shell, one material system, one spacing rhythm, one Dock, one topbar, one set of controls, and one interaction philosophy.

Live visual reference: `/studio/44os`.

---

## 1. Core Principles

- The shell is persistent. Only workspace content changes.
- Primary destinations live in the Dock. Topbar tabs are for local sections or filters.
- Glass belongs to the app shell and system popovers. Lists/cards/content should use the same readable paper/material color as notifications, not background bleed-through.
- User-facing copy says Library, releases, books, sample packs, merch, services, reviews, updates, earnings, sold items. It does not say Product as a generic catalog/item word and does not say Collection. The shipped Product Details section label is allowed until renamed intentionally.
- Spacing is part of the brand. Section titles, lists, headers, and empty states must share the same rhythm everywhere.
- Build reusable primitives before one-off page fixes.
- Mobile is the same OS adapted to a smaller screen, not a separate experience.

---

## 2. System Anatomy

From back to front:

1. **Environment**: ambient background and tint. No content goes here.
2. **System window**: `.app-shell`, the main translucent OS container.
3. **Dock**: `.app-sidebar`, desktop left rail and mobile bottom tray.
4. **Topbar**: `.os-topbar`, search/cart/notifications/avatar plus optional local tabs/back link.
5. **Workspace**: `.app-main-content`, scrollable app content.
6. **Music player**: persistent bottom player when audio is active.

Desktop shell metrics:

| Element | Standard |
|---|---|
| Frame padding | 10px |
| App shell radius | 18px |
| Dock width, full | 280px |
| Dock width, compact | 76px |
| Dock item size, compact | 56px square |
| Dock row min-height, full | 56px |
| Topbar/system band | 60px |
| Topbar control | 44px |
| Content inset | `clamp(44px, 4.4vw, 72px)` |
| Content max width | 1440px |
| Readable max width | 1180px |
| Detail inset | `clamp(64px, 6.5vw, 112px)` |

Mobile shell metrics:

| Element | Standard |
|---|---|
| Frame padding | 0 |
| Shell radius | 0 |
| Dock position | bottom tray |
| Dock height | `74px + safe-area-inset-bottom` |
| Mobile Dock item | 58px square |
| Small mobile Dock item | 54px square under narrow widths |
| Mobile pin art/avatar | 36px, 34px on narrow widths |
| Workspace height | viewport minus Dock tray |
| Topbar controls | compact but never below usable tap size |

---

## 3. Grid And Rhythm

Base unit: **4px**.

Use tokenized spacing only:

| Token | Value | Typical use |
|---|---:|---|
| `--os-space-1` | 4px | micro gaps |
| `--os-space-2` | 8px | title to description |
| `--os-space-3` | 12px | compact groups |
| `--os-space-4` | 16px | section title to content |
| `--os-space-5` | 20px | row vertical padding, card gaps |
| `--os-space-6` | 24px | row horizontal padding, panel padding |
| `--os-space-7` | 32px | header bottom padding |
| `--os-space-8` | 40px | large module padding |
| `--os-space-9` | 48px | section-to-section beat |
| `--os-space-10` | 64px | page bottom padding |

Default page rhythm:

```text
topbar
48px
page title
8px
description
32px
hairline
48px
section title
16px
content
48px
next section
64px bottom
```

Rules:

- `--os-section-gap` is 48px between sections.
- `--os-section-head-gap` is 16px between section title and content.
- Section titles and their content must share the same left edge.
- Do not add local margins that double-stack against `HubSection`, `.app-section`, `.dashboard-page`, or `.social-shell`.
- If one section has better spacing than another, update the shared primitive/class rather than tuning a one-off.

---

## 4. Leading Axis

There is one content leading axis.

The following align to it:

- first topbar tab/back label
- app title
- app description
- hairline start
- section titles
- cards, lists, empty states, and detail content

Do not hardcode left offsets. Use the shared page containers and tokens.

---

## 5. Dock

The Dock is the OS taskbar. It renders from `src/lib/osApps.ts` plus user preferences from `src/lib/dockPreferences.ts`.

Current Dock in code:

- Library, signed in only
- Community
- Browse
- Radio
- pinned item divider when pins exist
- up to 5 pinned items
- Dashboard, signed in only
- Log In when signed out, Settings when signed in

Notifications remain a topbar control. Search is now a Dock app. Profile and Messages are signed-in Dock apps and also appear in the avatar menu.

Current Dock target:

- Store is renamed visually to **Browse**.
- The Browse app still uses `/store` routes behind the scenes until a route migration is intentionally planned.
- Browse uses the grid icon from the legacy icon set.
- Community uses a people-style icon instead of chat bubbles.
- Dashboard uses a creator/showcase-style icon.
- Radio remains in the Dock. Search, Community, Messages, Profile, Library, Dashboard, Support, and Settings are current Dock destinations where auth rules allow. Services and Resources are not Dock destinations.
- Users can still hide unfinished apps from Settings > Dock when needed.
- Signed-out visitors see the default public Dock for testing, even if that browser has old local hidden-app preferences. Personal Dock visibility preferences apply after login.
- Library, Dashboard, and Settings are personal surfaces and should not appear as signed-out Dock destinations.

Dock rules:

- No "44OS" label in the Dock.
- Full Dock shows icon + label. Compact Dock shows icons/artwork only.
- Full and compact Dock items use the same 56px height rhythm.
- Compact Dock items are perfect squares with rounded corners.
- Pinned music/books/assets should show artwork when available.
- Pinned profiles should show profile imagery when available.
- Active state belongs to the most specific current target. Opening a pinned item should highlight the pinned item, not its parent app.
- Dock app reorder is built but disabled for launch. Treat reorder as a future system update unless the user explicitly asks to re-enable it.
- Right-click Dock app: Open, Hide from Dock when allowed, Dock Settings, mode actions.
- Right-click pinned Dock item: Open, Unpin Item.
- Right-click empty Dock space: mode toggle and Dock Settings.

Signed-out protected states:

- Public destinations should remain visible in the shell during testing: Community, Browse, and Radio.
- Personal areas such as Library, Dashboard, and Settings should be hidden from signed-out navigation. Direct visits should show quiet centered empty states with a clear login action instead of exposing controls.
- Signed-out visitors use the default light/amber look. Stored theme/accent preferences should only affect the UI when a user session is present.

Mobile Dock:

- Bottom tray.
- Horizontal scroll if needed.
- Labels hidden.
- Items remain square.
- Dividers become vertical separators.
- Safe area padding is respected.

---

## 6. Topbar

The topbar is system chrome first.

Trailing controls:

- Search
- Cart
- Notifications
- Avatar/profile menu

Local controls:

- Tabs for app-local filters/sections.
- Back label when a detail page was opened from another context.
- Never show tabs and back label in the same slot.

Rules:

- Topbar tabs are not primary navigation.
- Home/Store and Library can use tabs for category filters.
- Community can use tabs for Feed, Following, Questions, Collaboration.
- Settings can use tabs for System, Dock, Region, Account.
- Dashboard can use tabs for current shipped creator sections.
- Back buttons should preserve origin label and scroll position when practical.
- Search, cart, notifications, and avatar are system controls; apps do not add custom trailing controls there.
- The topbar trailing controls are notifications, avatar, and cart only when the cart has items. Search lives in the Dock.

---

## 7. Workspace Containers

Use the existing containers:

| Container | Use |
|---|---|
| `.app-page` | Home/Store, Library, Search, Resources, Support, hub pages |
| `.dashboard-page` | Dashboard and Settings |
| `.social-shell` | Community, profiles, inbox, readable social surfaces |
| detail layout classes | Store/Library item pages |

Rules:

- Every primary app front screen opens with `HubHero`.
- App title is display type; detail pages use smaller page/detail titles.
- Sections use `HubSection`.
- Long detail pages can use `--os-detail-inset` for reading comfort.
- Avoid nested cards. Content item rows can be cards; a section itself should not become a card unless it is a list surface.

---

## 8. Typography

Use the type scale, not local font sizes.

| Class | Role |
|---|---|
| `.os-type-display` | app title |
| `.os-type-page-title` | detail/subpage title |
| `.os-type-panel-title` | section title |
| `.os-type-section-title` | subheading |
| `.os-type-card-title` | card/list/form title |
| `.os-type-body` | body and app descriptions |
| `.os-type-body-small` | helper text/list subtitles |
| `.os-type-meta` | timestamps/meta |
| `.os-type-eyebrow` | tiny uppercase labels |

Default rule: type does not scale dramatically by viewport. Exception: very large Store/Library detail titles may use responsive clamping so they do not break mobile or wrap every title.

Hierarchy must read naturally: app title > section title > item title > body > meta.

---

## 9. Materials And Color

Use semantic tokens only:

- `--os-color-canvas`
- `--os-color-ink`
- `--os-color-ink-secondary`
- `--os-color-ink-muted`
- `--os-color-accent`
- `--os-color-hairline`
- `--os-surface-*` / shared paper/list materials

Rules:

- Shell and popovers can be glass.
- Lists, rows, achievements, posts, reviews, notifications, settings groups, and detail panels should use the same readable content material family.
- Avoid brown/amber bleed-through or background image bleed in content panels.
- Hover wash: ink mixed around 8%.
- Active/selected wash: ink mixed around 13%.
- Danger color only for destructive actions.
- No hardcoded one-off colors except artwork.

---

## 10. Lists

One list system should cover tracks, achievements, dashboard rows, settings rows, notifications, posts/replies where appropriate, product details, and library/detail metadata.

List anatomy:

- Surface: one readable panel or unframed list, depending on context.
- Row padding: shared row tokens.
- Dividers: straight hairlines between regular rows.
- Rounded corners: only the surface outer edge, hover row, selected row, or active row.
- Empty states: quiet text, not a large white card unless it is a real content list with actual items.

Tracklists:

- Home/Store and Library tracklists share row behavior.
- Track number, title, and duration align consistently.
- Duration must display for singles and multi-track releases.
- Play button appears on hover and selected/playing state.
- Play button must not sit behind the track number.
- Context menu can expose Play and Play Next.

Achievements:

- Use the same list material as notifications/content lists.
- Section title to achievement list spacing must match the global 16px section-head gap.
- Unlocked achievements sort above locked achievements.
- Unlocked status uses the success/accent state.
- Hidden achievements hide description until unlocked.

Product Details:

- Home/Store and Library both include Product Details where useful.
- Download Size is hidden for now.
- Library Product Details sit below achievements/extras and above Creator Updates.

---

## 11. Empty States

Global empty-state standard:

- If an empty state sits immediately below a page title/description with no section title, center the quiet text in the available content area.
- If an empty state sits inside a section, align quiet text to the section leading edge.
- Empty states do not need action buttons unless the action is truly the primary purpose of the section.
- Reviews are the exception: section title with Post Review button on the right is allowed.
- No empty-state card if there is no content yet, unless the surrounding surface exists because other real rows/items are present.
- Empty-state typography should be consistent: muted body or body-small, no oversized novelty messages.

Examples:

- No reviews yet: section title + Post Review button + left-aligned quiet text.
- No Product Gallery / Book Sample / Tracklist content: left-aligned quiet text, no white card.
- Empty Assets page directly under page header: centered quiet text is acceptable.
- Empty Library subsection: left-aligned quiet text under that subsection.

---

## 12. Buttons, Inputs, Context Menus

Buttons:

- Use `.os-button` variants only.
- Primary action first when there are multiple actions.
- Detail page actions should be short: Play, Read, Download, Add to Library, Add to Cart, Remove from Library.
- "Buy Download" should be "Add to Cart".

Inputs:

- Use shared input/textarea styles.
- Composer/reply inputs should use consistent rounded boxes.
- Buttons for composer/reply should sit below or cleanly aligned within the input area, not cramped against the text field.

Context menus:

- Use `ContextMenuProvider` / `useContextMenu`.
- One menu at a time.
- Unified text color in light and dark themes.
- Destructive actions last and visually marked.
- Library tiles should offer Open Item, View Creator, Remove From Library, Pin to Dock.
- Profile/avatar context menus should allow Pin to Dock where it makes sense.
- If an item is already in the Library, do not show Add to Library for that item.

---

## 13. Home/Store And Library Detail Pages

Home/Store and Library detail pages should look like siblings.

Header:

- Artwork aligns with the detail content/section axis.
- Artwork should respect item aspect ratio: square for music, book ratio for books, merch/item image ratio where appropriate.
- Item/release title uses the next smaller type size when needed to fit cleanly.
- Metadata uses spaced bullets: `Single · 2025 · Free`, never jammed together.
- Creator row uses circular avatar/profile icon and links to profile.
- Informational purchase/explainer text should be tiny, muted, and not dominate the header.

Home/Store actions:

- Music: Add to Library, Add to Cart.
- Books: Read Sample if available, Add to Cart or View in Library.
- Assets: Add to Cart/download behavior depending on state.
- Merch: Add to Cart.

Library actions:

- Music: Play; Download only if purchased.
- Books: Read and Download.
- Assets: Download.

Section order:

- Description
- Tracklist / reader / sample / gallery when applicable
- Achievements
- Extras/features
- Product Details
- Reviews on Home/Store pages only
- Creator Updates on Library pages only

Reviews:

- Empty reviews use quiet left-aligned text.
- Published reviews use the same card visual language as Community posts.
- Reviews are body-only; no review title field.

Creator Updates:

- Empty updates use quiet left-aligned text, no empty card.

---

## 14. Community

Community is a single-feed social experience.

Current interaction model:

- New Post is a button. It opens an inline composer.
- Clicking a post opens its reply drawer.
- Clicking the speech bubble opens the reply input under that post or reply.
- Opening another drawer/input closes the previous one.
- The speech bubble is not highlighted just because a drawer is open; it represents reply intent.
- Replies include reply and like actions.
- Owned replies/posts expose delete where appropriate.
- Reply dividers and spacing match the former reply-page visual style.
- Replies are newest-first.
- Reply nesting should remain readable: the original post is top-level; replies align under it; replies-to-replies indent one level.

Mentions and hashtags:

- Mentions like `@big_boss` are bold black links with no underline.
- Hashtags like `#question` are bold black links with no underline.
- Cursor/pointer communicates clickability.
- Mention suggestions appear while typing after a real fragment starts, e.g. `@b`, not on bare `@` or `@ `.
- Questions tab should append/lock `#question` when posting from that tab. Collaboration should do the same with `#collaboration`.

Topic panel:

- Trending topics panel is built/optional but hidden for launch unless the user asks to re-enable it.

---

## 15. Settings

Settings is the single control panel.

Tabs:

- Account
- System
- Dock
- Region

Rules:

- Reset Defaults sits at the bottom right of each settings page.
- Region should default from user login/home location when that is available; reset should return to the detected home country/currency.
- Dock landing options should match the current visible/testing apps: Browse, Library, Community, Dashboard, Radio.
- Dock reorder should not be exposed for launch.
- Account identity fields such as display name, avatar, username, and bio belong in Profile/Edit Profile, not Account settings.
- Lightweight onboarding tips are allowed when an interaction is not obvious. They must be contextual, dismissible, and persisted so they do not become a repeated tour.
- Account notification toggles cover mentions, replies, likes, and achievements. Do not show unused promotional email or recommendation toggles until they are wired to real behavior.

---

## 16. Mobile Rules

Mobile must stay usable without special instructions.

- Dock is bottom tray.
- Topbar controls remain reachable.
- Menus/popovers should fit viewport and avoid horizontal overflow.
- Store/Library detail headers collapse to one column.
- Artwork keeps correct aspect ratio.
- Grids become one or two columns based on available space.
- Player bar must not block primary actions.
- Context menus and popovers must be reachable by touch alternatives where possible.
- Tap targets should be at least 44px.
- Avoid fixed desktop widths.
- Test Store, Library, Community, Dashboard, Settings, auth, and item detail pages on mobile before launch.

---

## 17. App-Specific Rules

Browse / Store:

- Public acquisition surface.
- User-facing app label should be Browse.
- Existing `/store` URLs can remain until a deliberate route migration.
- Discover should use the tab order `Discover, Music, Books, Merch, Sample Packs, Services`.
- Discover page sections use clean shelves/grids.
- Discover should show `Explore Music`, `Explore Books`, `Explore Merch`, `Explore Sample Packs`, and `Explore Services`, capped at 8 items each and hidden completely when empty.
- Detail pages show Reviews, not Creator Updates.
- Music is streamable when published tracks exist.

Library:

- Saved/owned surface.
- Detail pages show Creator Updates, not Reviews.
- Music playback behavior should match Store tracklists.
- Product Details included below achievements/extras.

Community:

- Feed-first.
- Topbar order is Posts, Questions, Collaboration, Following.
- Questions and Collaboration use structured title/body posts instead of duplicating body text as title.
- Question and Collaboration card actions align right. Card click expands the thread; response composers appear before long response lists.
- Use green for complete, verified, unlocked, answered, and closed states. Use amber for open, locked, and not-answered states.
- Inline composer and reply drawers.
- No separate reply page for normal browsing unless a direct route is needed for deep links.

Dashboard:

- Creator workspace.
- Shipped navigation should not expose unfinished tabs.
- Achievement/extras foundation is part of music/books publishing only.
- Creator list rows should stay simple but include Edit plus Publish/Unpublish where the item can be published.
- Upload fields should show a preview after upload and provide an inline remove control.
- Audio uploads should not render file preview cards; show a concise green Uploaded state instead.
- Merch uses Product Image language, plus a previewable/removable gallery on creation.
- Achievement controls use 44-owned artwork/placeholder art on the left, grey descriptions, and a right-side enable checkbox. Creators should not set achievement image URLs or hidden/secret state.

Messages:

- New Message should behave like a draft conversation: a left-side draft row, a To field at the top of the thread pane, recipient search only after typing, and the message composer pinned at the bottom.
- Profile/message entry points should route into the same Messages UI.

Resources and Services:

- Should remain out of the Dock.
- Services can still be surfaced under Browse navigation and Dashboard where needed.
- Do not over-polish these before core launch/domain/auth health is done.

Radio:

- Should be made available in the Dock/menu for building and testing.
- Future first version should feel like a station/playlist app, not a generic list page.

Support:

- Should remain a Steam/Spotify-style OS help center.
- Cover account/login, orders, Library saves/purchases/downloads, Dock/settings, creator uploads, Radio, troubleshooting, and contact/escalation.
- Support content should be searchable and categorized with a left sidebar of expandable sections, breadcrumb context above the content, and an article reader on the right.
- Do not use repeated Open buttons on the main support index; actions belong inside the selected article.

---

## 18. Compliance Checklist

Every new or edited screen should pass:

1. Uses the correct page container.
2. Uses the shared app header or detail header pattern.
3. Uses Dock/topbar ownership from the registry.
4. Uses global spacing tokens.
5. Aligns to the leading axis.
6. Uses shared list/card/input/button/context-menu primitives.
7. Uses semantic color/material tokens.
8. Handles empty state according to the global standard.
9. Works in light and dark themes.
10. Works on mobile.
11. Does not expose Product as generic catalog/item copy or Collection as a user-facing word; Product Details is the current allowed exception.
12. `npm run build` passes after production-facing code changes.

---

## 19. Agent Workflow

Before changing UI:

1. Read this file and `Other/44OS_FOUNDATION.md`.
2. Inspect the current component/class before creating a new one.
3. Prefer changing shared primitives over repeating page-specific fixes.
4. Keep Supabase/data changes out of UI work unless the user explicitly approves them.
5. Update this doc if a UI rule changes.
6. Run build for production-facing code changes.
