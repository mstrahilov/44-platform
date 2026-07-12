# 44OS UI Principles

This is one of the three active handoff documents for 44OS. Read it before changing layout, styling, app chrome, component primitives, or visual behavior. Architecture and sequencing live in `44OS_FOUNDATION.md` and `44OS_MILESTONES.md`; this document remains the visual and interaction contract.

44OS should feel like a premium operating system: calm, spatially consistent, tactile, legible, and fast. It is not a marketing site and should not look like a stack of unrelated pages.

The local screenshot reference folder is `UI Elements/`. Treat those images as reference material, not production assets.

Current implementation snapshot, July 12, 2026:

- Store, Community, Library, Radio, Search, Profiles, Studio, Notifications, Settings, and Inbox have been through the desktop and mobile system-UI consolidation pass.
- Verified after the pass: `npm run lint`, `npx tsc --noEmit`, `npm run build`, migration dry-run, and route smoke checks for `/store`, `/community`, `/library`, `/radio`, `/search`, `/profile/[username]`, `/studio`, and `/notifications`.
- Mobile rendered checks confirmed the root and Store title/filter rows, hidden local mobile search, visible Search page title with no placeholder, and the current mobile Dock order: Home (`/`), Library, Radio, Community, Search.
- Radio and Notifications also have source-level implementation aligned with this document; their live visual state may depend on signed-in/session data or Radio playlist setup.
- The root URL is the branded 44OS discovery front door. It may reuse Store catalog sections, but the page title, metadata, search label, and shared-link identity say 44OS rather than Store.
- Desktop content now follows one shared material, radius, border, spacing, elevation, input-focus, button, tab-navigation, and post-row authority. Page-specific visual overrides are not a supported extension point.

---

## 1. Quality Bar

Every shipped screen must pass these checks:

- No horizontal scroll at normal desktop or mobile widths.
- No overlapping text, buttons, media, menus, or shell chrome.
- Interactive targets are at least 44px in both dimensions where practical.
- Type remains legible; do not scale fonts directly with viewport width.
- Cards, rows, buttons, and controls keep stable dimensions when content loads or hover states appear.
- Empty, loading, error, signed-out, and success states look intentional.
- Keyboard focus is visible.
- Images keep their aspect ratio and never stretch.
- The same action uses the same visual control across the app.
- The app looks like one system in light and dark themes.

---

## 2. System Personality

44OS is:

- Premium, quiet, and focused.
- Editorial enough for creative work, but operational enough for repeated use.
- Glassy only in the unified app shell, solid and readable everywhere else.
- Spatially consistent.
- Minimal without feeling empty.

44OS is not:

- A landing page.
- A purple/blue gradient admin panel.
- A pile of nested cards.
- A theme demo.
- A set of separate mobile pages.
- A decorative orb/bokeh composition.

---

## 3. Creator And Fan Experience

The UI should make advanced creative technology feel approachable. A creator should feel, "I know what to do next." A fan should feel, "This work belongs somewhere, and my relationship to it is remembered."

Creator-facing rules:

- Publishing should feel straightforward, not technical.
- Advanced systems should be explained through creator outcomes, not implementation language.
- Local/global pricing should read as fairness and reach, not as a finance tool.
- Achievement setup should describe what fans can unlock or experience, not how event tracking works.
- Bonus Content is the first v1 unlockable release extra and can be attached to Overachiever.
- Studio screens should prioritize clarity, previews, validation, and confidence.

Fan-facing rules:

- Store should invite discovery without feeling algorithmic or manipulative.
- Library should feel personal and durable, like a shelf, archive, and activity record.
- Profiles should make a creator's work, posts, and identity feel connected.
- Community should feel useful and human.
- V1 achievements are music-only and should feel earned and legible, not gamified clutter.
- Interactive/flagship experiences should always return to the Library with clear evidence of what changed.

---

## 4. Materials And Surface Families

Use four material roles:

- **Environment**: the fixed background behind the OS window.
- **Shell glass**: the single unified `.app-shell` surface behind Dock, Topbar, and workspace.
- **Theme-through control/content material**: the shared translucent tint used by controls, inputs, overview cards, achievements, Community surfaces, reviews, creator forms, and comparable workspace panels.
- **Opaque paper**: dropdowns, filters, account/notification menus, modal sheets, and the music player.

Use three content surface families:

- **Elevated clickable cards**: Store cards, Library cards, radio cards, and product search results.
- **Recessed interactive lists**: tracklists, social rows, replies, notifications, editable Studio rows, and selectable rows.
- **Flat information lists**: metadata/details/settings summaries that do not need hover or card treatment.

Rules:

- The app environment and shell glass are not changed when tuning content components.
- Menus, popovers, filters, modal sheets, and the music player use the same opaque semantic paper family.
- Panels and controls use the shared theme-through material; do not introduce page-specific gray fills or legacy glass overrides.
- On desktop, content-first list surfaces may be transparent so the shell theme reads through them. This applies to Library tracklists/achievements, Community feed rows/composer, related detail lists, and similar repeated content; it does not turn controls or modal surfaces into glass.
- Mobile keeps its established surface treatment outside the Studio editor. Do not apply desktop transparency sweeps to mobile pages.
- Dense content should use readable paper/material surfaces.
- Do not place cards inside cards.
- Page sections are layout regions, not floating cards.
- Individual repeated items may be cards when that helps scanning.
- Avoid decorative orbs, bokeh blobs, and heavy ambient gradients.

---

## 5. Layout, Typography, And Rhythm

Base unit: 4px.

Preferred spacing tokens:

- `--os-space-1`: 4px
- `--os-space-2`: 8px
- `--os-space-3`: 12px
- `--os-space-4`: 16px
- `--os-space-5`: 20px
- `--os-space-6`: 24px
- `--os-space-7`: 32px
- `--os-space-8`: 40px
- `--os-space-9`: 48px
- `--os-space-10`: 64px

Preferred font stack:

```css
-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", sans-serif
```

Rules:

- Use shared containers before local margins.
- Do not hardcode left offsets for one page.
- Do not tune spacing with random inline `style` props.
- Use the shared type classes and tokens.
- Do not use negative letter spacing.
- Do not scale body text with viewport width.
- Reserve hero-scale type for app front doors and true hero/detail moments.
- Dense panels, cards, settings, and Studio controls use compact type.

Mobile geometry contract:

- QA at both 390px and 430px. No page may rely on one iPhone width.
- `--os-content-inset` owns normal mobile page padding. Do not add a second page-specific inset around an already inset container.
- Hub headers and forms stay inside the content inset. Repeated list rows may bleed to the workspace edges when that surface is intentionally full width.
- Full-width mobile lists place dividers on the list/row boundary, spanning the available workspace width. Text and controls remain inset inside the row; do not shorten the divider to the text column.
- Reply indentation is applied once. A nested reply may indent its row content, but its composer must use the full remaining row width and must never combine parent padding with an additional inline margin.
- Textareas, composers, segmented controls, search fields, and action rows use `width: 100%` with `min-width: 0`; controls may not force horizontal scrolling.
- Mobile hub titles flex while their action group remains auto-width and right-aligned inside the same content inset and divider boundary. Never give the header action group `width: 100%`; doing so pushes filters beyond the viewport or behind long titles.
- Active Store filter pills live below the header divider, wrap onto additional rows, and constrain long labels with ellipsis rather than expanding the page width.
- Mobile page content clears the fixed Dock, the optional music player, and `env(safe-area-inset-bottom)` through shared shell spacing.

---

## 6. Dock And Topbar

The Dock is the OS taskbar and app launcher. It renders from `src/lib/osApps.ts`.

Current Dock order:

- Signed in desktop: Home (`/`), Radio, Library, Community, optional pinned-item divider and pinned items, spacer, Support, divider, Settings.
- Signed out desktop: Home (`/`), Radio, Community, spacer, Support, Log In.
- Mobile fixed Dock: Home (`/`), Library, Radio, Community, Search.

Rules:

- Store is the visible catalog app.
- Library and Settings are signed-in desktop Dock destinations. Studio opens from the creator's own profile/account menu and is not a Dock app.
- Search is immediately left of Notifications on desktop and remains a page destination in the mobile Dock.
- Notifications stay in the Topbar.
- Inbox and Profile are hidden from the v1 Dock.
- Resources and the old Services/Projects flows are removed from the v1 app.
- Full Dock rows keep a 56px rhythm; child routes use substantial 40px rows.
- Expanded Dock child routes are text-only and align child labels under the parent row label axis.
- Compact Dock targets are slightly landscape-shaped at 56 by 52px.
- There is currently no mobile Dock menu button. Mobile global destinations are the five fixed Dock items; account-only destinations live in the avatar menu.
- Pinned items should use artwork/profile imagery when available.

The Topbar owns:

- Back label.
- Cart when it has items.
- Notifications.
- Avatar/account menu.

Theme rules:

- Signed-out visitors always see dark mode with the Ocean accent on desktop and mobile.
- Signed-in theme mode and accent are account preferences loaded from Supabase; they are never persisted in browser local storage.
- Accent labels are Amber, Sage, Ocean, Violet, Magma, and Polar. The stable stored IDs remain `amber`, `sage`, `ocean`, `violet`, `red`, and `cyan` for backward compatibility.

Topbar rules:

- Do not use Topbar tabs for primary app sections. Prefer in-page sections and filters.
- Do not show tab-like local filters and back label in the same slot.
- Desktop Search expands in place without a halo or rectangular highlight and must remain left of Notifications.
- Mobile top-left shows the 44 logo linking to `/`; contextual detail pages show a circular back button immediately to the right of the logo.
- Signed-out mobile shows a default profile icon linking to `/login`.
- Account menu labels are Profile, Inbox, Studio; mobile also exposes Settings and hides Log Out.
- Any local filters must be visually discoverable with clear contrast and active state.
- The Dock answers "Where am I going?" In-page sections answer "What part of this app am I viewing?"

---

## 7. Page Copy And Information Architecture

Every primary page uses concise orientation:

- **Dock/app label**: Home, Radio, Library, Community.
- **Page hero**: title only. Do not render descriptive copy beneath primary page titles.
- **Section context**: title and optional description only when the section itself needs guidance.
- **Root identity**: `/` uses `44OS` as its hero/document identity while retaining discovery sections. `/store` uses `Store`.

Page hero rules:

- Titles are nouns or clear destinations: Store, Library, Questions, Collaboration, Studio, Settings.
- Primary title descriptions are archived below for possible future reuse and are not rendered in the current UI.
- On mobile hub pages with a local filter, the header collapses to title plus the circular filter button on one row. Do not show Store/Community/Library local search inputs on mobile; use the fixed mobile Search Dock item for global search.
- Store, Library, and Community use the same filter-popover containment: the circular trigger stays inside the header safe margin, the popover stays inside both viewport insets, and outside interaction closes it.
- Mobile primary page titles use a smaller iOS-like large-title scale, currently 42px, so controls can sit beside them without overlap.
- Radio is the intentional exception: the fixed Now Playing panel is the entire page and does not repeat a Radio page title or permit workspace scrolling.

Catalog and Library presentation rules:

- Browse artwork follows Item presentation: Music and Assets are square, Books use their 2:3 portrait cover ratio, and physical Merch uses a 3:4 portrait product ratio. Store detail artwork uses the same Category-specific ratio. Mobile shelf actions collapse from the desktop `View All` pill to a compact trailing arrow without changing their behavior or accessible label.
- Library remains one filterable destination but renders separate grid bands in the stable order Music, Books, Assets. Existing catalog order remains intact within each band, and Books always begin on a fresh row so 2:3 covers never mix into a square Music row.
- The `New in Merch` editorial shelf temporarily prioritizes Apparel, then Accessories, then all remaining Merch Types; products retain the normal public catalog order inside each priority group. This is editorial presentation, not a new global ranking rule.

Archived primary-page descriptions (saved July 10, 2026):

- Store: Find releases, books, assets, and merch from independent creators.
- Library: Everything you have saved, added, or purchased.
- Music: Explore albums, EPs, singles, and releases built to grow over time.
- Books: Explore art books, poetry, and stories from independent creators.
- Merch: Explore apparel, accessories, and physical goods from creators.
- Assets: Explore assets, remix stems, and creative tools for your work.
- Community: General posts from creators and fans.
- Community feed filter: All Posts and Following.
- Questions: Ask something specific and get an answer from someone who has solved it.
- Collaboration: Find collaborators or make yourself available to creative work.
- Radio: Tune in to 44 Radio, a live 24/7 station playing around the world.
- Search: Find items, creators, posts, questions, and collaborations.
- Support: Find help for account access, orders, Library, Dock settings, Radio, creator tools, and troubleshooting.
- Settings: Account, region, appearance, and Dock controls.
- Studio: Creator tools, catalog health, and earnings.

Keep this archive in documentation rather than rendering it under titles. Revive individual descriptions only after an explicit product decision.

Section heading primitive:

- Use `SectionHeader` / `HubSection` for title/action/description combinations.
- **Simple sections** use title only when the content is obvious: Tracklist, Product Details, Files, Orders.
- **Guided sections** use title plus one short description when the concept is new or powerful: Achievements, Creator Updates, Bonus Content, Local Pricing, Questions, Collaboration, Library Unlocks, Launch.
- Descriptions should be one sentence. If a section needs more than that, the UI likely needs a better structure.
- Small metric/stat cards should not include wrapping helper text inside tight cards. Put explanations in the section intro, tooltip, or larger row surface.

Community tab copy:

- Posts: general conversation from creators and fans.
- Following: a filter on the Community landing page, not a separate visible route.
- Questions: ask practical creative questions and get answers.
- Collaboration: find or offer help on creative work.

Community state rules:

- Posts, Questions, and Collaboration show loading states until their first Supabase request completes.
- Never render an empty-state message while the initial request is still pending.
- Read failures surface as errors; they must not silently look like an empty community.
- Regular Community feed posts are links to `/community/thread/[id-or-slug]`; do not reintroduce inline reply drawers on the feed.
- Inline reply forms live on the thread page only.
- On mobile, thread posts, replies, and their dividers use the full thread width. Nested replies indent content once; all reply composers expand to the full remaining width.
- The feed composer placeholder is `Start a new post...` for the general feed.

Search rules:

- Desktop Search is a topbar control.
- Mobile Search is the fixed Dock item and opens `/search`.
- `/search` uses the same `.page-search-control` visual as Store/Community/Library search.
- On mobile `/search`, show the compact page title, hide placeholder text, and keep the empty guidance to one quiet line: `Enter any term to start a search.`

Notifications rules:

- Notification rows show icon/image, title, description, and a one-off dismiss `x`.
- Do not show the uppercase kind label such as Achievement Unlocked, Reply, Mention, or Like above the title on the notification center.
- Do not show full timestamp/date columns in notification rows; they caused mobile overlap and are not needed for the current notification center.
- The topbar notification popover may keep compact local dismissal behavior, but the full `/notifications` page should stay visually simple.

---

## 8. Workspace Patterns

Use existing/shared containers:

- `.app-page` for Store, Library, Search, Support, and hub pages.
- `.dashboard-page` for Studio and Settings.
- `.social-shell` for Community, profiles, and inbox.
- Detail layout classes for Store and Library item detail pages.
- `.radio-page` plus `.radio-hero` for the Radio Now Playing surface.

Rules:

- Primary app front screens open with `HubHero`.
- Public catalog grids use a predictable editorial order: release year newest-first, then artist/profile name alphabetically. This applies to `/store`, Store Music and Books, and creator-profile Music and Books tabs. Releases from the same artist and year use stable catalog/date tie-breakers.
- Desktop Home and Community do not show local search fields; global Search remains in the topbar. Library keeps one compact text filter labeled `Filter Library` beside its category filter.
- Radio is the exception: its live state uses a full-bleed item-detail-style hero rather than a standard HubHero.
- Settings is a single sectioned page ordered Appearance, Account, then Notifications. Appearance and Account use two-column field grids; Region and Display Currency live under Account. Dock controls live inside Appearance.
- Sections use `HubSection` or `SectionHeader`.
- Empty states use shared message primitives.
- Forms use shared field, label, helper, and action-row classes.
- Inbox uses a two-column conversation list/thread layout on desktop and two distinct navigation states on mobile. Mobile threads use the global topbar back control, show the recipient avatar/name/username, anchor the composer above the Dock, and align outgoing bubbles right and incoming bubbles left.
- New Message is a full-height state with recipient search at the top and the message composer at the bottom. Do not place a redundant Cancel control inside the recipient field.
- Lists should prefer row surfaces with clear dividers over decorative cards.
- Repeated cards must have consistent image ratio, title line behavior, metadata rhythm, and action placement.
- Track titles do not marquee. They stay single-line with truncation before the duration column.
- The desktop mini-player keeps its close control at the far-right edge. Expanded Now Playing uses an opaque paper state filling the workspace below the topbar and beside the sidebar, with centered artwork and controls. Opening Queue shifts Now Playing into a 60/40 split and slides the Queue into the right column; opening Queue directly from the mini-player starts in this split state. The top-right X always closes/minimizes the full player. Queue opens and closes from the Queue control itself, and active Queue and Shuffle controls use the accent color.
- The mini-player artwork and metadata always open expanded Now Playing; they are not navigation links. Inside expanded Now Playing on mobile and desktop, artist opens the creator profile, artwork opens the release at its playback source (Library or Store), and track title opens that release with the current track selected/highlighted.

Radio rules:

- `/radio` uses the same blurred artwork language as Store/Library item detail pages.
- On mobile, Radio is full-bleed between topbar and Dock: no standard app header, and the main live state should fit without meaningful scrolling.
- Radio content is centered: artwork, Now Playing, title, text-only artist, then Stream/Stop.
- Keep the radio title smaller than item-detail hero titles so long track names do not wrap awkwardly.
- Use symmetrical vertical spacing around Now Playing, artist, and Play Radio; avoid a top-heavy card.
- Desktop Radio uses the same centered composition inside the workspace: app-shell background, centered bounded artwork, then track, artist, and action. Do not add a separate opaque hero panel or blurred artwork backdrop.

Studio publishing rules:

- Studio release lists are creator-management views, not public discovery grids, and remain ordered by when the release was added (`created_at` newest-first).
- Release Type, Release Year, and Price belong in the same 3-column field group.
- Track editors use the recessed editable list primitive, not nested glass cards.
- Book achievements are hidden for v1.
- Music release features start with the eight v1 achievement templates and optional Overachiever Bonus Content.
- New and edit release forms do not collect a description. Existing legacy descriptions may remain readable, but Studio does not display or overwrite them during edits.
- Music Tracks are a flat section rather than a nested paper card. Desktop track rows use a wide title column and a narrower Audio File/upload column; mobile stacks those fields. Keep generous section spacing between Details, Tracks, and Achievements.
- Achievements use a single master switch in the section header. Off hides the picker; on reveals flat rows with white editor icons and right-aligned checkboxes. There is no minimum selection count.
- Checked achievement controls must keep a black checkmark on the light checked fill. Overachiever Bonus Content is its own card below the flat achievement list.
- Destructive buttons should align with system action rows and use confirmation copy.
- Studio overview is a consolidated landing page: four operational metric cards—Saves, Plays, Sold, and Earned—followed by clickable Item-management rows grouped by Category. Desktop uses four metric cards per row and mobile uses two. Mobile Item rows show title and Type only; publication status remains a desktop information pill.
- Studio Plays is sourced from the append-only `item_play_events` ledger. A validated playback start counts regardless of whether it came from Store, Library, Radio, the creator, or another user; playback analytics must never interrupt audio.

---

## 9. Controls, Icons, And Imagery

Dock icon sources are fixed to public assets where available:

- Store: `public/icons/sidebar/STORE.svg`
- Library: `public/icons/sidebar/COLLECTION.svg`
- Community: `public/icons/sidebar/COMMUNITY.svg`
- Radio: `public/icons/sidebar/RADIO.svg`
- Store child routes use legacy category icons for Music, Books, Assets, and Merch.
- Community child routes expose Questions and Collaboration only; Following is available through the Community feed filter.

Use familiar controls:

- Icon buttons for tool actions.
- Segmented controls/tabs for modes and filters.
- Toggles or checkboxes for binary settings.
- Inputs for numeric/text values.
- Menus for option sets.
- Text buttons only for clear commands.

Rules:

- Buttons must not resize or jump on hover.
- Card/tile hover states must not scale the layout; use material/shadow/color feedback instead.
- Icon-only buttons need accessible labels.
- Primary actions are visually rare.
- Destructive actions require clear copy and confirmation when data loss is possible.
- Disabled controls must communicate state without becoming unreadable.
- Prefer the existing `os-icon` mask system for shell/app icons.
- Do not scatter one-off inline SVG icons when a system icon exists.
- Product, profile, and media imagery should show the real item/person/state whenever available.
- Preserve image aspect ratio.

---

## 10. Visual QA

Visual QA target pages:

- Store
- Store item
- Library
- Library item
- Studio overview
- Studio release editor
- Community Posts/Questions/Collaboration
- Search
- Radio
- Support
- Settings
- Login

Viewport targets:

- Desktop: 1440px and 1280px.
- Mobile: 390px and 430px.

Acceptance:

- No visible overlap.
- No unintended horizontal scroll.
- 44px targets where practical.
- Typography and material usage match this document.
- Loading, empty, error, signed-out, and signed-in states are intentional.
- Achievement icons render correctly from Supabase Storage.
