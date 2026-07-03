# 44OS UI Guidelines

44OS is the visual and interaction system for the 44 Platform. Treat every new page like part of one operating system: different jobs, same materials, rhythm, controls, and language.

For live visual examples, open `/studio/44os` in the app while signed in as a creator/admin tester.

## Foundations

### Principles
- Content first: artwork, titles, creators, descriptions, and user-owned items carry the interface.
- Systems over one-offs: use existing shells, page headers, tabs, buttons, lists, cards, fields, and modals before adding CSS.
- Glass is structure, not decoration: use it to separate system layers, not as ornamental blobs.
- Cards navigate: product, service, resource, and post cards open detail pages. Ownership and checkout actions belong on detail pages or in Library flows.
- No scoreboards by default: avoid public follower/following counts and unnecessary social comparison metrics.

### Color
- Use `--os-color-canvas` for page canvas and `--os-color-app-environment` for the app atmosphere.
- Use `--os-color-ink` for primary text, `--os-color-ink-secondary` for descriptions, and `--os-color-ink-muted` for hints/meta.
- Use `--os-color-accent` sparingly for focus, success, ownership, and small active signals.
- Use `--os-color-danger` or `.os-button-danger` only for delete/destructive actions.
- Never hardcode one-off page colors unless a product image/artwork requires it.

### Materials
- Use `.os-glass-panel` or existing page surfaces for large translucent system layers.
- Use `.os-paper`, `.os-paper-card`, or dashboard list/card surfaces for readable content areas.
- Use hairline borders and subtle shadows for depth. Avoid heavy drop shadows or nested cards inside cards.
- Do not add decorative orbs, bokeh blobs, or gradient-only backgrounds.

### Typography
- `.os-type-display`: page heroes and major identity moments only.
- `.os-type-page-title`: secondary page titles where display type is too large.
- `.os-type-panel-title`: large panel headings and focused module titles.
- `.os-type-section-title`: section titles such as Explore Music, Recent Content, or Profile tabs areas.
- `.os-type-card-title`: compact card/list/form titles.
- `.os-type-body`: descriptions under page titles and primary paragraph copy.
- `.os-type-body-small`: secondary explanations, helper text, and list descriptions.
- `.os-type-meta`: timestamps, category labels, subtle metadata.
- `.os-type-eyebrow` and `.os-type-pill`: uppercase labels only.
- Do not scale type with viewport width. Use existing tokens and responsive wrapping.

## Components

### Buttons
- Use `.os-button` with `.os-button-primary`, `.os-button-secondary`, or `.os-button-ghost`.
- Light theme: buttons are white/paper by default and black on hover.
- Dark theme: buttons are dark by default and light on hover.
- Use `.os-button-danger` only for destructive actions such as Delete Account/Delete Product.
- Do not use red for Unpublish; Unpublish is a regular system action.
- Prefer lucide/icons for icon buttons when available.

### Inputs
- Use `.os-input-field`, `.os-input-textarea`, `.os-input-search`, and `.os-input-upload`.
- Inputs should have subtle accent/focus rings and visible but quiet borders.
- Labels should use `.os-type-card-title` or the established dashboard field label.
- Keep placeholder text helpful and short.

### Tabs And Segmented Controls
- Use the existing topbar tabs for major browse modes.
- Use `.settings-segment` and `.settings-segment-item` for compact in-page category or setting choices.
- Tabs must not resize the page shell when active state changes.

### Dropdowns And Popovers
- The profile icon popover is the canonical 44OS dropdown pattern.
- Use `.os-popover` and `.os-popover-item` for compact menus.
- Dropdown actions should be short, predictable, and not duplicate sidebar destinations unnecessarily.

### Cards
- Product/service/resource cards should use the existing product tile/card patterns.
- Cards should not contain other cards.
- Repeated content items can be cards. Page sections should be unframed layouts or full-width bands.
- Product artwork dimensions must be stable with aspect-ratio so loading states do not shift layout.

### Lists
- Dashboard and management lists should use `.dashboard-list-surface`, `.dashboard-list-row`, `.dashboard-row-copy`, `.dashboard-row-meta`, and `.dashboard-row-actions`.
- Keep row actions on one line where possible.
- Use status pills for state; avoid turning state labels into oversized controls.

### Modals
- Use the shared modal styles for gated actions and confirmations.
- Modal copy should be direct. Primary action first, secondary action second.
- Destructive confirmations use danger styling only on the confirming action.

### Empty States
- Use quiet text or a single quiet surface.
- Empty states should say what is missing and, when useful, the next action.
- Avoid dramatic or humorous empty states in production flows.

## Page Patterns

### Public Browse Pages
- Store, Services, Resources, Community, and Library should share the same title/description spacing.
- Hub pages use title, one-line description where possible, hairline divider, then sections.
- Section title/button rhythm should match Store.

### Community
- Tabs: Feed, Friends, Local, Updates, Questions, Collaboration.
- New Post category picker starts with General.
- General maps to the existing database `discussions` or legacy `discussion` category.
- General is for ordinary social posts where people can talk about anything.
- Tagging writes to `post_subjects`; never rename it to `post_tags`.
- In feeds, only avatars link to profiles. Handles are display-only. Post title/body links to the thread.

### Profiles
- Profile cover/header must not overlap avatar, name, username, bio, or actions.
- Profile tabs: Posts, Releases, Services, Resources.
- Do not show public follower/following counts.
- Friend actions use Add Friend / Request Sent / Friends / Accept Friend.

### Dashboard
- Dashboard is creator tooling.
- Overview stays concise: Products, Services, Resources, then Recent Content.
- Management lists use the unified dashboard list surface.
- User-facing payout language is Earnings / Sold Items, even if route remains `/dashboard/payouts`.

### Library
- Use Library everywhere user-facing.
- Collection is legacy compatibility only.
- Library cards should visually align with Store cards where practical.

## Responsive Guidance

44OS is currently desktop-first, but all new UI must degrade cleanly on smaller screens.

- Use existing breakpoints around `1080px`, `860px`, and `720px` unless a layout already defines a better local breakpoint.
- On mobile, sidebars should collapse or stack above content; do not squeeze two-pane desktop layouts into tiny columns.
- Minimum touch target should be roughly 44px.
- Cards/lists should stack to one or two columns and preserve stable artwork aspect ratios.
- Page descriptions should wrap naturally but not become narrow columns.
- Avoid viewport-scaled type. Use token classes and let containers change.
- Mobile implementation sweeps should update shared layout primitives first, then page-specific exceptions.

## Use / Do Not Use

Use:
- Shared 44OS typography classes.
- Shared `os-button` variants.
- Shared input classes.
- Existing dashboard list surfaces.
- Existing profile/social/feed components.
- CSS custom properties for values.

Do not use:
- New hardcoded palettes for one page.
- Nested cards.
- Visible instructional text explaining how UI works.
- Public follower/following scoreboards.
- New `Collection` wording.
- `post_tags` for subject tagging.
- Red buttons for non-destructive actions.

## Agent Workflow

Before creating or changing a UI:
1. Read this file.
2. Open `/studio/44os` for visual reference.
3. Search for an existing component/class that already matches the need.
4. Reuse the existing pattern.
5. Run `npm run build` after production-facing changes.
