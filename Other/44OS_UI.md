# 44OS UI

This document is the visual, interaction, responsive, and accessibility source of truth for 44OS. It describes the current system, not the history of how it was built.

Architecture and provider rules live in `44OS_FOUNDATION.md`. Current work lives in `44OS_MILESTONES.md`. Do not create additional UI audit, proposal, or handoff documents.

Company/product voice, identity, logo, social, and outreach rules live in the private canonical `44OS_BRANDING.md` source.

## Experience standard

The application at `app.44os.com` should feel like a premium creative operating system: calm, tactile, spatially consistent, legible, and fast. It is not a generic dashboard, theme demo, or collection of unrelated pages. The public editorial front door at `44os.com` is intentionally a separate marketing surface described below.

Every shipped screen must provide:

- One clear page identity and useful primary heading where appropriate.
- No unintended horizontal scrolling, overlap, clipped controls, or unstable layout.
- Intentional loading, empty, error, signed-out, disabled, pending, and success states.
- Visible keyboard focus and accessible names for icon-only controls.
- Practical 44px touch targets.
- Legible theme-aware contrast without making disabled controls look active.
- Stable image ratios, control sizes, and content rhythm while data loads.
- The same action, material, and component behavior everywhere it appears.
- Full support for light/dark signed-in application themes; signed-out application presentation remains dark with Ocean accent. The marketing origin always uses its light editorial palette.

Technology should be explained through user outcomes. A creator should know what to do next without understanding the schema, entitlement engine, provider APIs, or achievement evaluator. A fan should understand what an Item is, what is free, what is purchased, and what remains in Library history.

## Visual system

The application cascade is limited to:

- `src/app/globals.css`
- `src/styles/44-ui/canonical-system.css`

`/44OS_UI` is the responsive living registry for current application components, tokens, and classes. The isolated marketing page uses one scoped CSS module and does not import the application shell or create another in-app component system. Do not restore retired proposal stylesheets, page-specific application visual systems, legacy Glass wrappers, or copied desktop/mobile reference routes.

Base spacing is 4px. Preferred spacing tokens are 4, 8, 12, 16, 20, 24, 32, 40, 48, and 64px. Use shared containers and tokens before local margins or inline styles.

Font stack:

```css
-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", sans-serif
```

Typography rules:

- Page titles are concise nouns or destinations. Do not render descriptive marketing copy beneath primary titles.
- Mobile hub titles use the compact iOS-like large-title scale, currently 42px.
- Hero-scale type is reserved for front doors and genuine detail/Now Playing moments.
- Body text does not scale directly with viewport width and does not use negative letter spacing.
- Labels use primary ink; descriptions and metadata use secondary ink; placeholder ink stays inside controls.
- Detail rows use primary labels and secondary values.
- Store Item pages render a plain-text Product Details section only for relevant facts: release date, category, type, tags, track count and total length, page count, or sample count. Library Item pages omit this section.

## Marketing front door

`44os.com` is a light editorial page, not an application workspace. It uses a warm paper background, near-black ink, the system font stack, an 8px editorial layout rhythm, pill-shaped actions, and large concise headings. It does not use gradients, Glass, decorative shapes, external fonts, the dark application shell, Dock, Topbar, player, push prompt, account state, analytics consent, or commerce presentation.

The first release exposes only `Open App`, linking to `https://app.44os.com`. Download navigation and `44os.com/download` remain absent until signed desktop installers exist. Footer links route Community, Support, and legal destinations to the app origin; Contact uses `support@44os.com`.

Marketing product visuals use approved real application screenshots rather than fabricated UI. Each visual pairs a 1280×800 desktop WebP with a 390×844 mobile WebP inside a restrained desktop-and-phone composition. The phone is a smaller foreground accent, lifted above the lower edge so it communicates multi-platform support without lengthening the page. Images load directly and eagerly because they are already optimized; a black lazy placeholder is not an accepted state. The social share image is 1200×630 PNG. Screenshots must exclude private messages, email addresses, payment data, unpublished work, and other personal information.

Marketing copy uses plain direct sentences. Do not use em dashes as a stylistic substitute for punctuation. Claims about ownership, earnings, payouts, or platform availability must match live capability and owner-approved legal language.

## Private Team workspace

The private Team workspace is deployed for Admin and explicitly granted-account review. The Brand Guide copy and Brand Kit assets remain provisional until owner acceptance.

- `/team` uses the standard dark application shell and a compact Overview, Brand, Creators, Releases section navigation.
- Team appears in the signed-in account menu only after the authenticated no-store access check succeeds.
- Loading uses the existing animated loading shell. Unauthorized and failed states are explicit and reveal no guide or Brand Kit content.
- Creator and release directories are searchable, filterable, responsive, and visibly read-only. They use public avatars/artwork and published facts only.
- `/team/brand` is the deliberate cream-document exception inside the dark app shell. Paper is `#F5F5F0`; Ink is `#1A1A1A`. Desktop uses a sticky table of contents, while mobile uses compact horizontal section navigation.
- Inter is self-hosted and scoped to the Brand Guide and private marketing assets. The application and public marketing page retain their existing system stacks.
- The Brand Guide action requests a 60-second private signed download. Until owner-approved masters are registered, the action reports that the approved kit is unavailable rather than serving provisional files as final.
- Team routes set noindex, nofollow, noarchive and are excluded from robots and sitemap discovery.

44 and 44OS use one two-color logo system: white mark on black/dark and black mark on white/Paper/light. Social profiles use white on black. Acid green is retired from the logo and application-icon identity. Ocean remains an interface accent, never a substitute logo color. The 44OS PWA/Home Screen icons, favicon, and social share artwork use white on black.

## Materials and elevation

Four material roles exist:

- **Environment** — fixed background behind the OS window.
- **Shell glass** — the unified `.app-shell` behind Dock, Topbar, and workspace.
- **Glass** — the canonical ordinary panel/control/input/list surface. It uses the Dock/Sidebar semantic tint and owns no blur, saturation, or shadow.
- **Paper** — opaque raised surface used only for menus, dropdowns, popovers, context menus, and selection lists.

Content patterns:

- Catalog/media cards are raised clickable surfaces.
- Tracklists, social rows, notifications, editable rows, and selectable lists are recessed Glass lists with hairline dividers.
- Metadata, settings summaries, and other noninteractive facts are flat information lists.
- Expanded Now Playing is transparent over the shell rather than another panel.
- Dialog content uses Glass unless the dialog is a transient option picker.

Only Flat and Raised content elevation exist. Glass is Flat. Paper and clickable catalog/media cards use the one Raised shadow. The App Shell window shadow remains independent.

Do not introduce decorative orbs, bokeh, heavy gradients, nested cards, page-specific gray fills, panel blur, or one-off shadows.

## Shell and navigation

44OS uses one persistent shell. Only the workspace content changes between apps.

Desktop Dock:

- Signed in: Library, divider, Home, Radio, Community, optional pinned Items, spacer, Support, divider, Settings.
- Signed out: Home, Radio, Community, spacer, Support, Log In.
- Studio is opened from the creator’s profile or account menu and is not a Dock app.
- Notifications remain in the Topbar. Inbox and Profile remain account-menu destinations.
- Dock rows use a 56px rhythm; expanded child rows use 40px and text-only labels.
- The Dock clock uses the viewer’s timezone in two-digit 24-hour `HH:mm` format.

Mobile Dock is fixed to Home, Library, Radio, Community, and Search. Settings is in the avatar menu. There is no mobile Dock menu button.

Topbar:

- Desktop Search expands immediately left of Notifications.
- The populated mobile Cart control is one compact icon/count pill; the count never becomes a separate overlapping badge.
- Mobile top-left shows the 44 logo linking home. Detail pages add a circular back button beside it.
- Signed-out mobile top-right links the default profile icon to Login.
- Signed-in account order is Profile, Inbox, conditional Orders, Studio, and role-gated Admin. Orders appears only when the member has at least one non-draft order. Mobile additionally exposes Support immediately above Settings; Log Out remains the final action.
- The Dock answers “where am I going?”; in-page controls answer “what part am I viewing?”

## Responsive geometry

The shell—not individual pages—owns mobile safe areas, Topbar, player, and Dock spacing.

- `viewport-fit=cover` is required.
- Total mobile Topbar height includes `env(safe-area-inset-top)` plus the fixed 56px control row.
- Search, menus, player sheets, route overlays, scroll offsets, and content placement use the same total Topbar height.
- `html[data-safe-area-test="notch"]` provides a deterministic 47px test inset.
- `--os-content-inset` owns ordinary mobile page padding. Do not double-inset a shared container.
- Mobile content clears the Dock, optional player, and `env(safe-area-inset-bottom)` through shared shell spacing.
- Controls use `width: 100%` and `min-width: 0` where necessary; long content must not force viewport expansion.
- Hub titles flex while action groups remain auto-width and right-aligned.
- Mobile filter popovers stay inside both viewport insets and close on outside interaction.
- Repeated list dividers may span the workspace while row content remains inset.
- Test normal portrait widths at 390px and 430px. Shell work also guards 320, 360, 375, and 412px plus phone landscape.

## Page identity and information architecture

- `https://app.44os.com/` is `Discover` at rest, not Store, even though it reuses catalog data and sections. Its page identity changes to `Browse` whenever a category or filter is active and returns to `Discover` when that state is cleared. `https://44os.com/` is the editorial landing page and never renders the application shell.
- `/store` is `Store`.
- Primary page titles do not include archived explanatory taglines.
- Mobile Store, Library, and Community hubs use title plus a circular local-filter action. They do not render local search inputs; global Search is in the mobile Dock.
- Desktop Home and Community use global Topbar Search. Library may keep its compact `Filter Library` control.
- Radio is the intentional exception: the Now Playing composition is the page and does not repeat a page title.
- Use `HubHero`, `HubSection`, and `SectionHeader` rather than page-specific title systems.
- Simple sections use a title only. Guided sections may add one concise sentence when the concept is unfamiliar.

Shared page containers:

- `.app-page` — Store, Library, Search, Support, and hubs.
- `.dashboard-page` — Studio and Settings.
- `.social-shell` — Community, profiles, Inbox.
- Canonical detail layouts — Store and Library Item details.
- `.radio-page` and `.radio-hero` — Radio.

## Catalog, Item, Cart, and Library UI

Artwork ratios are format-specific:

- Music and Sample Packs: square.
- Books: 2:3 portrait.
- Merch: 3:4 portrait.

Public Music/Books ordering is release year newest-first, then creator alphabetically, with stable catalog/date tie-breakers. Studio management lists remain creation-date newest-first. Merch always uses `catalog_items.sort_order` with deterministic fallbacks.

Home discovery begins with the four-item `New Releases` shelf in the exact order saved through Admin Home controls; only currently published Music releases render, so an unavailable selection fails closed. `Recently Added` follows with up to eight eligible Music releases in stable Item creation-time order, newest first. Items already present in New Releases are excluded, but Recently Added does not deduplicate creators or substitute by creator. This intentionally lets a newly active creator’s current uploads appear together. `Creators You Follow` shows no more than one Item per followed creator. Smaller catalogs use `Browse Books`, `Browse Sample Packs`, and `Browse Merch`; the Merch shelf retains its curated catalog order.

Browse filters begin with `Sort by`. `Release date` uses public release chronology, while `Recently added` uses stable Item creation time and never bumps an edited Item. The New Releases arrow opens the complete Music catalog in release-date order; the Recently Added arrow opens the complete Music catalog in creation-time order. Admin curation and Home-only Featured exclusion never remove Items from Browse. Shared section arrows are vertically centered on their title row, and the desktop Store/Home filter action aligns to the Topbar action column.

Admin Home provides four numbered Featured slots. Published non-Beat Music releases are selectable, slot order is public order, duplicates are unavailable, and later slots require the previous slot. Saving is one confirmed mutation with a required audit reason, pending state, success state, authoritative refetch, and immutable before/after history. If a selected Item later becomes unavailable, Admin identifies it for replacement while public discovery simply omits it.

Item cards share stable artwork, title, metadata, and action placement. Hover does not scale layout.

Merch detail:

- Show the Printful-controlled product name and product Tag, not a creator link.
- Show the current price and `Add to Cart`.
- Begin with the featured image, followed by remaining current-color and bonus images without duplication.
- Selecting a color advances to its assigned image; size selection does not duplicate imagery.
- Never show archived-color imagery or Printful thumbnails/mockups.

Cart:

- One line per Item; no quantity controls.
- One checkout decision area; no duplicate hero Checkout action.
- Cart rows name the exact selected option/offer.
- Mobile rows use compact artwork, title/type, price, and accessible remove action.
- The summary ends with equal-width Keep Shopping and Checkout actions.
- Copy states that price/availability are revalidated and Stripe calculates approved tax/shipping.

Checkout:

- Signed-out users are asked to sign in.
- Missing runtime, terms, seller, offer, tax, shipping, or provider readiness shows one explicit unavailable state and collects no card/delivery data.
- Exact terms consent is required before Stripe-hosted Checkout.
- A return from Stripe displays Confirming Payment until signed webhook authority resolves the order.
- Decline, cancellation, expiry, configuration error, or provider failure preserves the Cart and never implies access or fulfillment.

Library detail uses one primary format action:

- Music: Play.
- Book: Read.
- Sample Pack: Download.

An active downloadable entitlement may add Download beside Play or Read. Music then exposes per-track downloads; Books and Sample Packs use short-lived authorized asset links. Refund/revocation removes current access without deleting historical presentation. Book/Sample Pack pages do not add a redundant View Creator action; Music does not add Shuffle.

## Player and Radio

The shared music player is the only audio engine for Music, Store/Library previews, Sample Packs, and Radio.

- Track titles truncate and never marquee.
- Mini-player artwork and metadata open expanded Now Playing; they are not release-navigation links.
- In expanded Now Playing, artist opens the profile, artwork opens the source release, and title opens the release with the current track selected.
- Expanded Now Playing is transparent and shadowless over the shell.
- Desktop Queue divides the workspace with one hairline. Mobile Queue replaces the player sheet at the same height; its close action returns to Now Playing first.
- Player, Queue, and mobile Dock meet without a gap.

Radio is a centered full-bleed composition between shell controls: artwork, Now Playing, track, text-only artist, and Stream/Stop. It uses no separate opaque hero panel or scroll-heavy layout.

## Community, profiles, Inbox, and notifications

Community and profile post rows share one identity, hover, action, divider, and routing contract.

- Initial requests show loading, not premature empty states. Read failures show errors.
- Feed posts open canonical thread pages; feed pages do not reintroduce inline reply drawers.
- Profile identity, Like, Reply, Report, and owner Delete controls keep independent actions inside the clickable row.
- Thread roots and direct replies use full-width rows. Reply-to-reply relationships use one centered profile connector without adding nested cards.
- Like/Reply/Delete use neutral theme-aware action color; only an activated Like fills its heart.
- Reporting is available for signed-in non-owners and enters the Admin moderation boundary without deleting evidence.
- Item pages include Item Questions and reviews with explicit loading/empty/error/signed-in states.

Profiles:

- Registration and Edit Profile accept 3–32 uppercase or lowercase ASCII letters, numbers, and underscores. The chosen capitalization renders everywhere, while availability and routing remain case-insensitive.
- Populated tabs appear in the stable order Posts, Music, Books, Sample Packs, Merch, Events.
- Tabs are flat, horizontally scrollable, separated by hairlines, and use an underline for the active state.
- Other-user actions are Follow then Message. Owner actions are Edit Profile then Open Studio.
- Mobile action pairs occupy equal columns.
- External destinations appear as compact non-wrapping monochrome icon rows with recognizable glyphs, descriptive accessible names, and visible focus.

Inbox uses a two-column list/thread desktop layout and distinct mobile list/thread states. Mobile thread navigation uses the global Topbar back control. Incoming and outgoing bubbles remain visually distinct; the composer clears the Dock. New Message places recipient search at the top and the composer at the bottom without a redundant Cancel control.

Notifications show image/icon, title, description, and dismissal. They do not add uppercase event-kind labels or full date columns that compete with mobile width.

## Studio UI

Studio is a creator workspace, not a public discovery grid.

- The overview shows four operational metrics: Saves, Plays, Sold, Earned.
- Only populated Events and Item-management sections render.
- One circular plus menu in the title row contains only Add Music, Add Book, Add Pack, and Add Update, in that order. The shorter `Pack` label applies only to this menu; Event creation is omitted from this shortcut.
- Merch creation stays hidden because Merch is 44-owned.
- Rows show title, Type, and catalog-health issues without exposing Draft/Published switches.
- Earnings remain distinct from payout-ready money; no UI implies that pending money is available or paid.

Publishing forms:

- Use shared labels, controls, helpers, recovery, validation, and action rows.
- New and Edit use the same pricing fields for Music, Books, and Sample Packs.
- Music is always streamable and may always be added to Library for free. Books may always be read and added to Library for free. Both formats present `Offer a paid download` as an optional checkbox; Market and price controls appear only when it is enabled.
- Sample Packs are paid downloadable products. Studio always shows their Market and price controls, and publication requires an enabled download with a positive price. Studio does not use segmented choice controls.
- New Music requires an Item Type, Release Date, Track Count, and complete Track files; Item Tags remain optional. Its standard Item Type chooser contains only Album, EP, Single, and Mixtape; Beat remains in its dedicated workflow and Live Set is not offered. New Sample Packs infer their single Item Type and hide Item Type, Release Date, and Item Tags from the creation screen.
- New Books end with the protected full-PDF upload and do not expose Native Reader/sample configuration. Store Book pages omit sample-reader UI and offer free Library access plus an optional paid download.
- Sample Preview Count sits on its own row directly below the Sample Previews description rather than competing with the section title.
- A paid Item has one global USD price and may have a separately entered local price in the creator country currency. Neither amount is copied into the other.
- Price accepts ordinary decimals such as `5.99`.
- Track editors are flat recessed editable lists, not nested Glass cards.
- New releases require a plain-language publishing-rights attestation.
- Server validation owns publication truth. Failures remain visible in the editor and never imply success.
- Removal is labeled Remove and clearly describes archival/preserved Library history.

Music configuration includes the eight v1 achievements, up to ten URL-only YouTube videos, and optional Overachiever Item unlock. Saved videos appear in both Store and Library Item detail. Book achievements, generic Bonus Content, commentary, and speculative feature pickers remain hidden. Music forms do not collect Description; Book and Sample Pack forms do.

External-link editors show every approved platform in fixed order with a URL field below its label. There is no Add Link, Clear, reorder, or arbitrary-platform control. Blank URLs remain off the public surface.

Release Date is required for Music creation and editing and must remain contained on mobile. The production Music catalog already has a date for every published release, so the shared rule does not introduce an empty required field for current creators. Admin content detail provides an audited Release Date correction that also synchronizes the display year. Release Date remains optional for other formats where the field is shown. Mobile audio uploads use resumable transfer for larger files and persist the uploaded value before non-blocking duration analysis. Form behavior must survive app switching, focus changes, refresh, iOS file picking, upload completion, and delayed waveform analysis without losing other unsaved fields. Owner device acceptance is tracked in Milestones.

## Native content, Events, and interactive UI

Books:

- Store order is Description then Sample.
- Protected full PDFs never become public samples.
- Desktop reader occupies the content pane beside the Sidebar and replaces normal Topbar/player content with its own 60px toolbar.
- Mobile/compact landscape reader is full viewport with close, page count, bookmark, bookmark list, previous, and next controls.
- Pinch zoom, scrolling, keyboard page navigation, readable page text, last-page restoration, appearance, and entitled bookmarks are supported.
- Protected PDFs are not placed in offline caches.

Sample Packs:

- Store order is Description then Preview Samples.
- Preview rows use the shared player.
- Library exposes one primary protected pack Download; optional individual samples use compact actions.
- Do not duplicate the full-pack action inside Pack Contents.

Events:

- Formats are In Person, Online, and Hybrid.
- Studio reveals only relevant venue/destination fields and preserves timezone truth.
- Profiles distinguish Upcoming, Past, and Cancelled.
- Calendar uses a desktop month view and mobile chronological agenda over the same source data.
- External actions are descriptive and open safely; 44OS does not claim to sell or fulfill tickets.

Interactive Items:

- `/launch/[itemId]` opens separately from the main app/player.
- The launch window suppresses ordinary Sidebar, Topbar, page heading, and player and provides one persistent return action.
- Loading, unavailable, unsupported, failure, expiry, and exit states share the immersive surface with announcements and visible focus.
- Narrow/mobile devices stop before session issuance and show Desktop Required.

Beat review surfaces remain completely absent unless the client review flag is enabled. When reviewed, they use the same Item composition, shared player, Glass/Paper system, device recovery, and responsive/accessibility rules. Draft legal terms and inactive commerce always look unavailable, never purchasable.

Settings Appearance contains Theme and Accent on one two-column row. Theme is a dropdown; accents are Amber, Sage, Ocean, and Violet. Account Country is the only region/currency choice and automatically determines display and creator-local currency. There is no Landing App or standalone currency selector.

## Admin UI

Admin navigation is visible only to administrators, but server authorization remains authoritative for direct route access.

- `/admin` is a single-column hub linking People, Content, Errors, Payments, Email, and Fulfillment.
- Lists use URL-backed search/filter/pagination with desktop columns and mobile stacked cards.
- People exposes safe identity/account/role facts only; passwords, tokens, raw Auth metadata, phone numbers, and provider credentials never render.
- Content keeps publication and review status separate and preserves immutable lifecycle/review history.
- Every mutation requires confirmation, a reason, pending state, success feedback, and authoritative refetch. Archival also requires exact-title confirmation.
- Errors is a chronological sanitized log of bounded fields only.
- Payments shows configuration readiness, attention orders, webhook failures, and reconciliation history without secrets.
- Email shows configuration presence, controls, failures, and append-only activation/reconciliation history. Disabled support/newsletter controls must not appear active.
- Fulfillment begins with Sync with Printful, then Active/Archived products. Product detail shows provider facts read-only, per-color/bonus imagery, featured-image selection, margin, and publication controls.

Admin offer pause/restore, Creator paperwork follow-up, role changes, content lifecycle, delivery reconciliation, and fulfillment operations remain reasoned and auditable. Browser UI never fabricates provider evidence or silently changes runtime controls.

## Accessibility and visual acceptance

Target pages include Home/Store, Store Item, Library, Library Item, Studio overview/editor, Admin hub and operational details, Community, Search, Radio, Support, Settings, Login, Cart/Checkout/Orders, reader, Calendar, and any changed surface.

Standard rendered widths are 390, 430, 1280, and 1440px. Safe-area shell changes additionally cover 320, 360, 375, 412px, phone landscape, installed iOS/PWA, and Android Chrome.

Acceptance for affected work:

- One useful main landmark and heading structure.
- Logical Tab/Shift-Tab order and always-visible focus.
- Correct names and reading order with VoiceOver/screen reader.
- Menus, dialogs, errors, pending states, and announcements operate without a pointer.
- Touch/file-picker/app-switch behavior works on mobile Safari and installed PWA where relevant.
- No ordinary-text contrast failure, overlap, clipping, or unintended horizontal overflow.
- Images preserve ratio and meaningful alternatives.
- User zoom remains enabled.

Automated smoke, computed contrast, route contracts, and safe-area checks are regression guards, not substitutes for the manual role/device journeys explicitly listed in Milestones.

## Maintenance rules

- Add or improve shared primitives before page-specific CSS.
- Keep app registration and route ownership in `osApps.ts`.
- Keep ordinary surfaces on canonical Glass and transient selections on Paper.
- Avoid one-off inline styles unless a value is genuinely dynamic.
- Do not revive archived descriptions, legacy routes, unused component exports, shadowed declarations, or redundant mobile/desktop implementations.
- Run `npm run audit:ui-cleanup` for visual-system work and keep unreachable components, dead exports, unused CSS, and exact-shadowed declarations at zero.
- Update Foundation when a UI decision changes authorization, data, routing, providers, or operational behavior. Update Milestones when it changes current work or acceptance.
