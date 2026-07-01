# 44OS Design System

44OS is the shared visual and interaction language for the 44 Platform. Treat the site like an operating system: every page can have a different job, but the controls, rhythm, materials, and content behavior should feel native to one environment.

## Principles

- Content first. Artwork, titles, creators, descriptions, and user-owned items should carry the experience. Controls stay quiet until needed.
- Glass is a material, not decoration. Use translucent panels, soft borders, and blur to separate layers without making the interface noisy.
- Cards navigate. Store and Browse cards open detail pages. Get, Save, Request, Checkout, and Collection actions belong on detail pages or in personal Collection/resource flows.
- Systems over one-offs. New pages should reuse the same shells, panels, cards, grids, buttons, and tabs before creating a custom layout.
- No scoreboards by default. Avoid follower counts, like counts, download counts, and social comparison metrics unless there is a clear product reason later.

## Foundation

- Background: dark spatial canvas using `--bg`.
- Accent: `--accent` green for primary discovery links and positive/free states.
- Text: `--t1` primary, `--t2` secondary, `--t3` inactive/hints.
- Spacing: use the existing 8px-based scale from `--space-1` through `--space-8`.
- Radius: use `--r-sm` for chips, `--r-md` for inputs, `--r-lg` for compact cards, `--r-xl` for panels, and `--r-pill` for nav/buttons.
- Page width: use `--max-w` and `--page-pad` for public pages.

## Materials

- `glass-flush`: default page panels and quiet cards.
- `glass-elevated`: selected nav items, active controls, and raised overlays.
- `glass-recessed`: search fields and input wells.
- Shadows should be minimal. Prefer border and blur for depth.

## Typography

- Eyebrows: uppercase, small, spaced, muted.
- Display titles: only for heroes and major identity moments.
- Card titles: compact, high contrast, never oversized.
- Body text: muted and readable, not pure white unless it is the primary title.

## Cards

- `CategoryTile`: short horizontal category card. Title only unless artwork is available.
- `ProductCard`: square artwork area, info panel below, title, creator, price/owned state. Entire card opens the product page.
- `ServiceCard`: larger text-forward card with category chip, title, creator, description, starting price, and delivery estimate. Entire card opens service detail.
- `ResourceCard`: text-forward learning/resource card with category chip, title, creator, summary, and a save action.
- `PostCard`: feed card for creator/community posts. No public popularity counters.
- `FeatureHero`: large landscape card with image or empty artwork surface, gradient overlay, title, creator, price/status, and detail-page actions.

## Grids And Shelves

- Product grids use fixed card widths and wrap. One product must never stretch full width.
- Product shelves scroll horizontally and snap softly.
- Services and resources use medium or large grid cards with max widths.
- Category rows scroll horizontally on small viewports.
- Empty states use quiet panels and short direct copy.

## Navigation And Actions

- Global nav: Store, Services, Community, Collection when logged in.
- Profile, settings, creator dashboard, and sign out live in the user menu.
- Page-specific filters live inside the page, not the global nav.
- Store cards do not perform ownership actions. Product pages do.

## Page Patterns

- Store: hero, category row, horizontal product shelves, featured creator cards, free shelf/grid.
- Browse: sidebar filters with Category -> Tags, fixed-width product grid.
- Services: hero, service categories, service cards, service browse.
- Community: feed, resources, creators, and discussion surfaces.
- Collection: personal vault tabs for Products, Resources, and Services.
- Dashboard: future creator/admin tools should still use the same panels, tabs, spacing, and controls.
