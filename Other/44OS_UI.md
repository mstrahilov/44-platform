# 44OS UI Principles

This is one of the three active handoff documents for 44OS. Read it before changing layout, styling, app chrome, component primitives, or visual behavior.

44OS should feel like a premium operating system: calm, spatially consistent, tactile, legible, and fast. It is not a marketing site and should not look like a stack of unrelated pages.

The local screenshot reference folder is `UI Elements/`. Treat those images as reference material, not production assets.

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
- Glassy in shell chrome, readable in content.
- Spatially consistent.
- Minimal without feeling empty.

44OS is not:

- A landing page.
- A purple/blue gradient dashboard.
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
- Dashboard screens should prioritize clarity, previews, validation, and confidence.

Fan-facing rules:

- Browse should invite discovery without feeling algorithmic or manipulative.
- Library should feel personal and durable, like a shelf, archive, and activity record.
- Profiles should make a creator's work, posts, and identity feel connected.
- Community should feel useful and human.
- V1 achievements are music-only and should feel earned and legible, not gamified clutter.
- Interactive/flagship experiences should always return to the Library with clear evidence of what changed.

---

## 4. Materials And Surface Families

Use three material roles:

- **Environment**: the fixed background behind the OS window.
- **Shell glass**: Dock, Topbar, menus, popovers, modals, and system overlays.
- **Content surface**: readable pages, lists, forms, cards, detail bodies, and dense work areas.

Use three content surface families:

- **Elevated clickable cards**: Browse cards, Library cards, radio cards, and product search results.
- **Recessed interactive lists**: tracklists, social rows, replies, notifications, editable dashboard rows, and selectable rows.
- **Flat information lists**: metadata/details/settings summaries that do not need hover or card treatment.

Rules:

- Glass belongs to shell chrome and overlays.
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
- Dense panels, cards, settings, and dashboard controls use compact type.

---

## 6. Dock And Topbar

The Dock is the OS taskbar and app launcher. It renders from `src/lib/osApps.ts`.

Current Dock order:

- Signed in: Library, divider, Search, Browse, Radio, Community, Dashboard for creators, spacer, Support, Settings.
- Signed out: Search, Browse, Radio, Community, spacer, Support, Log In.

Rules:

- Browse is the visible catalog app.
- Library and Settings are signed-in Dock destinations. Dashboard appears only for creator accounts. Signed-out users see Support and Log In at the bottom.
- Search is a Dock app.
- Notifications stay in the Topbar.
- Messages and Profile are hidden from the v1 Dock.
- Resources and the old Services/Projects flows are removed from the v1 app.
- Compact Dock items are square.
- Full Dock rows and compact Dock targets keep a 56px rhythm.
- Pinned items should use artwork/profile imagery when available.

The Topbar owns:

- Local tabs.
- Back label.
- Cart when it has items.
- Notifications.
- Avatar/account menu.

Topbar rules:

- Topbar tabs are local filters, not primary app navigation.
- Do not show tabs and back label in the same slot.
- Do not add Search back to the Topbar.
- Tabs must be visually discoverable with clear contrast and active state.
- The Dock answers "Where am I going?" The Topbar tabs answer "What part of this app am I viewing?"

---

## 7. Page Copy And Information Architecture

Every primary page needs three layers of orientation:

- **Dock/app label**: Browse, Library, Community, Dashboard.
- **Page hero**: title plus one sentence that explains the current surface.
- **Tab/section context**: title and optional description for the selected tab or section.

Page hero rules:

- Titles are nouns or clear destinations: Browse, Library, Questions, Collaboration, Dashboard, Settings.
- Descriptions tell the user what they can do there.
- Descriptions should be human and useful, not marketing blurbs.
- Avoid vague copy like "manage your content" when the page can say "publish releases, update pricing, and review catalog health."

Section heading primitive:

- Use `SectionHeader` / `HubSection` for title/action/description combinations.
- **Simple sections** use title only when the content is obvious: Tracklist, Product Details, Files, Orders.
- **Guided sections** use title plus one short description when the concept is new or powerful: Achievements, Creator Updates, Bonus Content, Local Pricing, Questions, Collaboration, Library Unlocks, Launch.
- Descriptions should be one sentence. If a section needs more than that, the UI likely needs a better structure.
- Small metric/stat cards should not include wrapping helper text inside tight cards. Put explanations in the section intro, tooltip, or larger row surface.

Community tab copy:

- Posts: general conversation from creators and fans.
- Following: posts from people you follow.
- Questions: ask practical creative questions and get answers.
- Collaboration: find or offer help on creative work.

Community state rules:

- Posts, Questions, and Collaboration show loading states until their first Supabase request completes.
- Never render an empty-state message while the initial request is still pending.
- Read failures surface as errors; they must not silently look like an empty community.

---

## 8. Workspace Patterns

Use existing/shared containers:

- `.app-page` for Browse, Library, Search, Support, and hub pages.
- `.dashboard-page` for Dashboard and Settings.
- `.social-shell` for Community, profiles, and inbox.
- Detail layout classes for Browse and Library item detail pages.

Rules:

- Primary app front screens open with `HubHero`.
- Sections use `HubSection` or `SectionHeader`.
- Empty states use shared message primitives.
- Forms use shared field, label, helper, and action-row classes.
- Lists should prefer row surfaces with clear dividers over decorative cards.
- Repeated cards must have consistent image ratio, title line behavior, metadata rhythm, and action placement.

Dashboard publishing rules:

- Release Type, Release Year, and Price belong in the same 3-column field group.
- Track editors use the recessed editable list primitive, not nested glass cards.
- Book achievements are hidden for v1.
- Music release features start with the eight v1 achievement templates and optional Overachiever Bonus Content.
- Destructive buttons should align with system action rows and use confirmation copy.

---

## 9. Controls, Icons, And Imagery

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

- Browse
- Browse item
- Library
- Library item
- Dashboard overview
- Dashboard release editor
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
