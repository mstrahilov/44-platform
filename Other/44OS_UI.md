# 44OS UI Principles

This is one of the three active handoff documents for 44OS. Read it before changing layout, styling, app chrome, component primitives, or visual behavior.

44OS should feel like a premium operating system: calm, spatially consistent, tactile, legible, and fast. It is not a marketing site and should not look like a stack of unrelated pages.

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

Apple references used for this quality bar:

- Clean, efficient interfaces with adequate spacing, contrast, and 44pt touch targets.
- Content-first design where controls sit in a distinct, thoughtfully grouped layer above content.
- High-resolution imagery that preserves aspect ratio and supports, rather than obscures, the experience.

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
- Bonus content, hidden files, commentary, and interactive artifacts should feel like ways to deepen a release.
- Dashboard screens should prioritize clarity, previews, validation, and confidence.

Fan-facing rules:

- Browse should invite discovery without feeling algorithmic or manipulative.
- Library should feel personal and durable, like a shelf, archive, and activity record.
- Profiles should make a creator's work, posts, and identity feel connected.
- Community should feel useful and human: posts, questions, collaboration, follows, and messages should support real creative scenes.
- V1.0 achievements are music-only and should feel earned and legible, not gamified clutter.
- Bonus Content is not a generic feature bucket in v1.0. It is unlockable creator material released by Overachiever.
- Interactive/flagship experiences should always return to the Library with clear evidence of what changed.

Copy rules:

- Prefer direct human language over platform jargon.
- Explain what a creator or fan can do, not what the database or API does.
- Avoid hype words unless the feature actually earns them.
- Use "global price" and "local price" in ways that make the creator's intent clear.
- Use "Library" as the durable home for owned work, unlocked artifacts, bonus material, and future interactive discoveries.

---

## 4. Materials

Use three material roles:

- **Environment**: the fixed background behind the OS window.
- **Shell glass**: Dock, Topbar, menus, popovers, modals, and system overlays.
- **Content surface**: readable pages, lists, forms, cards, detail bodies, and dense work areas.

Rules:

- Glass belongs to shell chrome and overlays.
- Dense content should use readable paper/material surfaces, not transparent background bleed.
- Avoid decorative orbs, bokeh blobs, and heavy ambient gradients.
- Do not place cards inside cards.
- Page sections are layout regions, not floating cards.
- Individual repeated items may be cards when that helps scanning.

---

## 5. Layout And Rhythm

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

Page rhythm:

- App title and description align to the same leading axis as sections and content.
- Section title to content: 16px.
- Section to section: 48px.
- Page bottom breathing room: 64px minimum.
- Detail pages may use a wider inset, but the leading axis must stay clear.

Rules:

- Use shared containers before local margins.
- Do not hardcode left offsets for one page.
- Do not tune spacing by adding random inline `style` props.
- If a spacing fix is broadly useful, move it into a primitive or global class.

---

## 6. Typography

Preferred font stack:

```css
-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", sans-serif
```

Rules:

- Use the shared type classes and tokens.
- Do not use negative letter spacing.
- Do not scale body text with viewport width.
- Reserve hero-scale type for app front doors and true hero/detail moments.
- Dense panels, cards, settings, and dashboard controls use compact type.
- Body copy should be readable before it is stylish.

Core type roles:

- Display/app title.
- Page/detail title.
- Section title.
- Card/list title.
- Body.
- Body small/helper.
- Meta.
- Eyebrow.

---

## 7. Dock

The Dock is the OS taskbar and app launcher. It renders from `src/lib/osApps.ts`.

Rules:

- Browse is the visible label for the Store app.
- Search is a Dock app.
- Notifications stay in the Topbar.
- Library, Dashboard, Messages, Profile, and Settings require sign-in.
- Support is public.
- Services and Resources are not v1 Dock destinations.
- Compact Dock items are square.
- Full Dock rows and compact Dock targets keep a 56px rhythm.
- Pinned items should use artwork/profile imagery when available.
- Dock visibility preferences apply after sign-in; signed-out visitors get the public default.

Desktop Dock target:

- Public: Search, Browse, Radio, Community, Support, Log In.
- Signed in: Search, Browse, Radio, Community, Messages, Profile, Library, Dashboard, Support, Settings.

Mobile Dock:

- Bottom tray.
- Safe-area aware.
- Horizontally scrollable if needed.
- Labels hidden.
- Targets remain usable.

---

## 8. Topbar

The Topbar is system chrome plus local app context.

Topbar owns:

- Local tabs.
- Back label.
- Cart when it has items.
- Notifications.
- Avatar/account menu.

Rules:

- Topbar tabs are local filters, not primary app navigation.
- Do not show tabs and back label in the same slot.
- Do not add Search back to the Topbar.
- Cart appears only when the cart has items.
- Topbar controls use icon buttons with accessible labels.
- Popovers should feel like system menus, not page cards.
- Tabs must be visually discoverable. Use stronger contrast, a clearer active state, and enough weight that testers immediately understand there is deeper navigation inside the app.
- The Dock answers "Where am I going?" The Topbar tabs answer "What part of this app am I viewing?"

---

## 9. Page Copy And Information Architecture

Every primary page needs three layers of orientation:

- **Dock/app label**: short destination name, such as Browse, Library, Community, Dashboard.
- **Page hero**: title plus one sentence that explains the current surface.
- **Tab/section context**: title and optional description for the selected tab or section.

Page hero rules:

- Titles are nouns or clear destinations: Discover, Library, Questions, Collaboration, Dashboard, Settings.
- Descriptions tell the user what they can do there.
- Descriptions should be human and useful, not marketing blurbs.
- Avoid vague copy like "manage your content" when the page can say "publish releases, update pricing, and review catalog health."

Tab copy rules:

- Each tab view needs its own title and description when the tab changes the user's task.
- Community tabs should explain behavior:
  - Posts: general conversation from the community.
  - Following: posts from people you follow.
  - Questions: ask practical creative questions and get answers.
  - Collaboration: find or offer help on creative work.
- Dashboard tabs should explain the work to be done, not the database object.
- Settings tabs should explain the consequence of the controls.

Section heading rules:

- **Simple sections** use title only when the content is obvious: Tracklist, Details, Files, Orders.
- **Guided sections** use title plus one short description when the concept is new or powerful: Achievements, Creator Updates, Bonus Content, Local Pricing, Questions, Collaboration, Library Unlocks, Launch.
- Descriptions should be one sentence. If a section needs more than that, the UI likely needs a better structure.
- Small metric/stat cards should not include wrapping helper text inside tight cards. Put explanations in the section intro, tooltip, or larger row surface.

Creator/fan copy tone:

- Speak to outcomes: publish, add, unlock, update, ask, collaborate, follow, download, launch.
- Avoid internal language: product row, trigger config, RLS, storage path, schema.
- Achievements copy should make the fan action clear and the creator setup simple.
- Creator Updates should read like living release notes: "Updates from the creator for people who own this item."
- Library should communicate memory: owned, unlocked, saved, downloaded, updated, launched.

---

## 10. Workspace Patterns

Use existing/shared containers:

- `.app-page` for Browse, Library, Search, Support, and hub pages.
- `.dashboard-page` for Dashboard and Settings.
- `.social-shell` for Community, profiles, and inbox.
- Detail layout classes for Store and Library item detail pages.

Rules:

- Primary app front screens open with `HubHero`.
- Sections use `HubSection`.
- Empty states use shared message primitives.
- Forms use shared field, label, helper, and action-row classes.
- Lists should prefer row surfaces with clear dividers over decorative cards.
- Repeated cards must have consistent image ratio, title line behavior, metadata rhythm, and action placement.

---

## 11. Controls

Use familiar controls:

- Icon buttons for tool actions.
- Segmented controls/tabs for modes and filters.
- Toggles or checkboxes for binary settings.
- Sliders, steppers, or inputs for numeric values.
- Menus for option sets.
- Text buttons only for clear commands.

Rules:

- Buttons must not resize or jump on hover.
- Icon-only buttons need accessible labels.
- Primary actions are visually rare.
- Destructive actions require clear copy and confirmation when data loss is possible.
- Disabled controls must communicate state without becoming unreadable.

---

## 12. Icons And Imagery

Rules:

- Prefer the existing `os-icon` mask system for shell/app icons.
- Do not scatter one-off inline SVG icons when a system icon exists.
- If adding an icon library later, standardize it rather than mixing strategies.
- Product, profile, and media imagery should show the real item/person/state whenever available.
- Do not use purely atmospheric imagery where users need to inspect an item.
- Preserve image aspect ratio.

---

## 13. Motion

Motion should be quiet and functional.

Allowed:

- Small hover/press transitions.
- Popover/menu entrance.
- Selection and active-state transitions.
- Player/status transitions.

Avoid:

- Large decorative animation.
- Background movement that competes with content.
- Motion that changes layout dimensions.

Respect reduced-motion preferences.

---

## 14. Implementation Rules

- Shared primitive first, one-off style second.
- Prefer classes and tokens over inline styles.
- Dynamic inline styles are allowed for real dynamic values such as artwork URLs.
- Keep CSS grouped by system area and component role.
- Remove unused CSS when routes/components are removed.
- Do not add a new palette for a single page.
- Every visual change should be checked in desktop and mobile widths.
