# 44OS iOS Typography

## Purpose and audit boundary

This is a source audit of the current native iOS and mobile-web typography. It records current behavior for later parity work; it does not propose or implement a new scale.

**Snapshot:** 2026-11-18. The iOS checkout is `/Users/miro/Developer/44OS-iOS`; the web checkout is `/Users/miro/Developer/44OS`. Both working trees had unrelated uncommitted changes during this audit. Findings therefore describe those checkouts as inspected, not a released binary or the deployed website.

### Verification limits

- The iOS source scan covered all 175 `44OS/**/*.swift` files. It found 485 `.font(...)` modifiers in 52 Swift files.
- The web source scan covered both authored application stylesheets, `src/app/globals.css` and `src/styles/44-ui/canonical-system.css`, plus the page/component source using those classes. The stylesheets contain 652 `font` or `font-size` declarations, including repeated component rules and scoped overrides.
- The CoreSimulator service could not be contacted, and no booted simulator could be enumerated. The iOS “Large” Dynamic Type baseline below is the documented SwiftUI system-style baseline, not a live simulator measurement. Device model and simulator text-size setting are **unverified**.
- No browser runtime/DevTools session was available for computed-style sampling. The web comparison is based on source declarations at the mobile rules (`max-width: 768px` and narrower), not a measured browser viewport. A specific viewport/device width is **unverified**.
- Colors expressed through system semantic colors or CSS variables are recorded semantically unless the source defines an exact value. Platform rendering, user theme/accent preferences, font fallback, and font rasterization can change the final pixels.

## Findings at a glance

| Topic | Native iOS | Web mobile |
| --- | --- | --- |
| Primary font | SwiftUI system font (SF on iOS); no app custom font was found in Swift source | `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| Main body text | SwiftUI `.body`, nominally 17 pt at the standard `.large` Dynamic Type size | Shared `os-type-body`: 13 px / 18 px, weight 400 |
| Main page title | Usually SwiftUI semantic title styles; screen-level choices vary | Shared `os-type-page-title`: 26 px / 32 px, weight 700 |
| Text scaling | Semantic styles participate in Dynamic Type; raw `.system(size:)` values are fixed unless explicitly made relative | CSS sizes are fixed CSS px; no app-wide browser text scaling equivalent is configured in these stylesheets |
| Spacing/leading | `OSSpacing` and `OSMetric` provide layout gaps; text mostly uses native font leading, with no app-wide explicit line-spacing/tracking modifier found | CSS declares line-height and margins/gaps at many component scopes; type tokens coexist with many direct selector overrides |
| Mentions and links | Person mentions and detected URLs use the selected accent and strong emphasis in Community | Links/mentions have component-specific selectors; person mention accent is a CSS rule, while many other text styles are defined independently |

**Overall:** iOS primarily composes semantic system text styles and selectively overrides them. The web has a semantic role set, but its role values are compact and many production areas still use screen/component-specific font declarations. They are not currently one shared, one-to-one scale.

## Native iOS typography

### Font family and semantic styles

The app uses the platform system font through SwiftUI. No `Font.custom(...)` usage was found in the 175 Swift files. These are the standard iOS Dynamic Type `.large` reference values for SwiftUI text styles; semantic styles scale with the user’s Dynamic Type preference. The weights shown are the default style weight unless the code adds `.weight(...)`, `.bold()`, or an attributed emphasis.

| SwiftUI style | Standard reference size | Typical default weight | Notes |
| --- | ---: | --- | --- |
| `.largeTitle` | 34 pt | regular | Often explicitly bold/semibold for welcome or feature headings. |
| `.title` | 28 pt | regular | Infrequent. |
| `.title2` | 22 pt | regular | Frequently bold for detail titles. |
| `.title3` | 20 pt | regular | Often semibold for section or card headings. |
| `.headline` | 17 pt | semibold | Used for row titles and labels. |
| `.body` | 17 pt | regular | General reading text; can be semibold/bold at call sites. |
| `.callout` | 16 pt | regular | Used less often. |
| `.subheadline` | 15 pt | regular | Common for secondary row text; often semibold for controls and tabs. |
| `.footnote` | 13 pt | regular | Common for supporting copy, timestamps, and secondary details. |
| `.caption` | 12 pt | regular | Common for compact metadata; sometimes semibold. |
| `.caption2` | 11 pt | regular | Compact metadata. |

Values above are a baseline reference, not a guarantee that a label renders at that point size in every setting. SwiftUI style metrics are system-defined and can vary with Dynamic Type, platform release, and accessibility settings.

### Explicit point-size overrides

Raw `.font(.system(size: ...))` modifiers occur throughout view code. They are not a single semantic family and should be read with their call-site context. Observed literal sizes include **11, 12, 13, 16, 17, 20, 21, 22, 24, 28, 32, 34, 42, 44, 54, and 56 pt**. Some are icons/placeholders or large feature values, not ordinary paragraph styles. Unless a relative text-style API is supplied, raw system-size fonts do not automatically behave like `.body`/`.headline` Dynamic Type styles.

The most intentional shared raw-size contract is `StudioForm`:

| Role | Size / weight | Line-height | Spacing |
| --- | --- | --- | --- |
| Studio section heading | 22 pt / bold (700) | Native font leading | 16 pt heading-to-panel gap; 28 pt between sections |
| Form field label | 15 pt / semibold (600) | Native font leading | 8 pt label-to-control gap |
| Form input | 16 pt / regular (400) | Native control/text-field behavior | 16 pt field gap; 16 pt panel padding |

These are explicit fixed sizes in `Features/Studio/StudioFormComponents.swift` (`StudioForm`). The comments state they were measured from production web computed styles; that comment is source evidence of intent, not an independent runtime comparison in this audit.

### Dynamic Type and layout adaptation

- `AppShellView` passes the environment’s Dynamic Type size through unchanged in normal use. It only forces `.accessibility3` or `.accessibility5` for UI-test launch arguments.
- Semantic text styles scale with the system text-size setting. A smaller set of views checks `dynamicTypeSize.isAccessibilitySize` to change wrapping, row layout, or spacing. Examples are Home, Community, Item detail, Library, Messages, Notifications, Profile, and Radio.
- Raw numeric `.system(size:)` modifiers and `StudioForm` sizes are not equivalent to scaled semantic text styles. They are potential parity/accessibility exceptions.
- `minimumScaleFactor`, `lineLimit`, and `allowsTightening` occur in constrained titles and rows. They can shrink or reflow text without changing its base font declaration.
- No production `lineSpacing(...)`, `.tracking(...)`, `.kerning(...)`, or `Font.custom(...)` usage was found by source search. Most multiline leading is therefore SwiftUI’s font/layout default. This does not assert that UIKit/SwiftUI controls have zero internal padding or that every composed `Text` has identical paragraph geometry.
- `.textCase(...)` was not found as a shared typography rule. Uppercase labels are generally literal or are set by a particular component.

### Native color and emphasis

| Treatment | Source behavior |
| --- | --- |
| Primary | SwiftUI `.primary`; adapts to the active light/dark color scheme. The app’s `OSColor` surface palette also defines exact environment/material colors. |
| Secondary / tertiary | `.secondary` / `.tertiary`; system semantic foreground hierarchy, not a hard-coded universal gray. |
| Accent | `OSColor.accent`, resolved from `OSAppearancePreference`. Defined base accent values include Ocean `#60A5FA`, Amber `#F59E0B`, Sage `#7CFF4F`, and Violet `#B56CFF`. |
| Person mention | `CommunityView` creates an `AttributedString` with `foregroundColor = OSColor.accent` and `.stronglyEmphasized`; thus accent + emphasized weight, and it may be linked to the profile. |
| Detected URL | Also accent-colored and strongly emphasized in Community body text. |
| Item mention in post body | Rendered as ordinary primary text; the attached-item card is the actionable display. |

Exact color definitions and semantic resolution are in `DesignSystem/OSDesignSystem.swift` (`OSColor`); mention rendering is in `Features/Community/CommunityView.swift` (`styled(_:)`).

### Native layout spacing relevant to text

`OSSpacing` defines 4, 8, 12, 16, 20, 24, 32, 40, and 48 pt increments. `OSMetric.sectionSpacing` is 28 pt, and shared screen margins are 16 pt. These are layout constants, not line-height values. Components choose among them, and many use their own `VStack`/`HStack` spacing. `StudioForm` defines the specific label/control/field/section gaps above. Text line height otherwise follows the selected SwiftUI font style unless a view supplies a custom layout modifier.

Primary references: [`OSDesignSystem.swift`](../../44OS-iOS/44OS/DesignSystem/OSDesignSystem.swift#L1), [`OSAppHeader.swift`](../../44OS-iOS/44OS/DesignSystem/OSAppHeader.swift), [`StudioFormComponents.swift`](../../44OS-iOS/44OS/Features/Studio/StudioFormComponents.swift#L10), [`AppShellView.swift`](../../44OS-iOS/44OS/App/AppShellView.swift#L152).

## Web mobile typography

### Font family and semantic role values

The production stylesheet declares `--44ui-font-app: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`; `--os-font-app` aliases it. On iOS Safari this resolves to the browser’s available system face, but it is not a literal guarantee of the same SwiftUI font metrics or glyph rasterization.

The canonical production token table below is defined in `canonical-system.css`. The mobile media block at `max-width: 768px` repeats these values, so the role sizes do not become larger on phone-width web layouts.

| Production web role | Size / line-height | Weight | Tracking |
| --- | --- | ---: | ---: |
| Display / page title | 26 px / 32 px | 700 | 0 |
| Panel title | 22 px / 26 px | 700 | 0 |
| Card title | 13 px / 16 px | 600 | 0 |
| Field title | 12 px / 15 px | 600 | 0 |
| Body | 13 px / 18 px | 400 | 0 |
| Small body | 12 px / 15 px | 500 | 0 |
| Metadata | 10 px / 13 px | 400 | 0 |
| Button | 13 px / 16 px | 600 | 0 |

Selectors such as `.os-type-page-title`, `.os-type-panel-title`, `.os-type-body`, `.os-type-body-small`, `.os-type-meta`, and `.os-type-field-title` apply these roles. This token set is documented as compact/macOS defaults in the stylesheet and is retained at mobile widths. It is not equivalent to the separate large-size examples on the UI reference page.

There is also a `ui44-type-*` API and `--44ui-type-*` token family. Its production base roles are similar (page 26/32; section 22/26; subsection 17/22; headline/body 13/16 or 13/18; callout 12/15; subheadline 11/14; metadata/caption 10/13; field 12/15; control 13/16). The `.ui-audit-page-mobile` example deliberately changes these roles to larger sample values (e.g. page 34/41, section 28/34, body 17/24). Those demo-only values are **not** the production mobile scale.

### Direct component rules and overrides

The semantic roles do not cover all production text. The two application stylesheets contain 651 `font`/`font-size` declarations. Many components directly set `font-size`, `font-weight`, `line-height`, or the `font` shorthand. Some also set local margins/gaps and responsive overrides. Therefore the effective font on a real page must be traced through its component class, later canonical rules, theme, and viewport media query; the token table alone does not describe every label.

Examples of source-confirmed local behavior:

| Area / component | Current web source behavior | Source |
| --- | --- | --- |
| Community text | `.social-row-body`: 15 px, line-height 1.5 (22.5 px), secondary ink. `.social-rich-link`: weight 760; mention color is accent in the community mobile scope and the canonical person-reference rule. | `src/app/globals.css` `.social-row-body` / `.social-rich-link`; `src/styles/44-ui/canonical-system.css` Community references section |
| Profile identity | Profile name, handle, bio, links, and tabs have profile-scoped declarations; bio is primary ink in the current profile override. The profile header is not simply the generic page-title role. | `src/styles/44-ui/canonical-system.css` profile rules; `src/components/PublicProfileApp.tsx` |
| Forms | Shared `ui44-form-field` uses an 8 px label/control gap; individual form components can set their own fonts, line heights, and colors. Studio has its own fields and form styles. | `canonical-system.css` `.ui44-form-field`; Studio form components |
| Admin | Admin rows, metadata, badges, and detailed labels use multiple local sizes, including 10–16 px values and distinct weights. | `src/app/globals.css` admin selectors, including `.admin-person-detail-facts` and `.admin-content-metadata-row` |
| Buttons and controls | Shared button geometry is tokenized, but text inherits or is locally specified in component rules. Native-looking controls do not all use the same font role. | `canonical-system.css` `.os-button`; `src/app/globals.css` button variables and `.os-button` |
| Search, legal, support, inbox, settings | Many use semantic `os-type-*` classes; other children retain native heading/control defaults or scoped class rules. | Route/component sources in coverage table below |

Most canonical role rules explicitly use `letter-spacing: 0`. Exceptions exist: compact eyebrow/record labels use positive tracking, and some numeric/stat titles use negative tracking. They are local treatments, not a shared body-text rule. CSS leading is explicit where `line-height` is declared; otherwise the browser’s normal line-height applies. CSS sizes are fixed CSS pixels and do not automatically follow iOS Dynamic Type.

### Web color roles

| Role | Current tokens |
| --- | --- |
| Primary ink | Dark theme `#F4F3EE`; light theme `#151515` |
| Secondary ink | Dark `rgba(255,255,255,.60)`; light `rgba(0,0,0,.58)` |
| Muted ink | Dark `rgba(255,255,255,.38)`; light `rgba(0,0,0,.42)` |
| Accent | User-selected Ocean `#60A5FA`, Amber `#F59E0B`, Sage `#7CFF4F`, or Violet `#B56CFF` |

Production text classes generally use `var(--os-color-ink)`, `--os-color-ink-secondary`, `--os-color-ink-muted`, and `--os-color-accent`; specific controls may use additional state colors. These token values are from `src/app/globals.css` and accent declarations. Theme and accent selection can change the rendered values.

### Web responsive behavior

- The main canonical mobile rules begin at `max-width: 768px`; most semantic type values are restated unchanged there. Some mobile-only selectors begin at 767, 720, 700, 520, or 420 px.
- Viewport-specific rules often change width, layout, truncation, wrapping, or visibility without changing shared font tokens. Some then override type locally.
- There are many independent `@media` blocks in the canonical stylesheet. A source audit of a component should search all of its selector occurrences, not only the first declaration.
- CSS uses CSS pixels. A 16 px CSS font-size on mobile is not a point-size guarantee; device pixel ratio and browser scaling affect physical pixels, while text autosizing/zoom can also affect runtime presentation.

Primary references: [`canonical-system.css`](../src/styles/44-ui/canonical-system.css#L1399), [`globals.css`](../src/app/globals.css#L2304), [`PublicProfileApp.tsx`](../src/components/PublicProfileApp.tsx), [`Typography.tsx`](../src/components/ui44/Typography.tsx).

## Side-by-side role comparison

The “difference” column is a source-level comparison, not a claim that every screen uses that role.

| Concept | iOS baseline | Web production mobile role | Source-level comparison |
| --- | --- | --- | --- |
| Page/display heading | Semantic `.largeTitle` 34 pt or title styles; call sites vary | 26 px / 32 px, 700 | Different base metrics and scaling model. |
| Section heading | Often `.title2` 22 pt or `.title3` 20 pt; screen-specific | Panel title 22/26 px, 700; subsection 17/22 px, 700 | Closest nominal size is 22, but weight, line box, scaling, and call site differ. |
| Main body | `.body` 17 pt / regular, Dynamic Type | 13/18 px / 400 | Web role is smaller at its token baseline and fixed-size. Community is a local exception at 15 px / 22.5 px. |
| Form labels | Shared Studio form 15 pt / semibold; other controls use semantic styles | Canonical field 12/15 px / 600; many local forms override it | Not a general match; Studio iOS’s 15 pt was intended to match measured web form labels, but canonical role is 12 px. |
| Inputs | Studio form 16 pt fixed; other native fields may use system control style | Often 16 px or inherited/local role | Similar-looking numbers do not establish metric or scaling parity. |
| Metadata | `.footnote` 13 pt or `.caption` 12 pt, depending on view | 10/13 px canonical metadata; local examples 11–13 px | Generally smaller web token baseline; app-specific exceptions exist. |
| Mentions | Accent + strongly emphasized | Accent + bold/link-specific rules where selector applies | Semantics align when the correct web component scope applies; CSS specificity/order and class coverage must be verified per surface. |
| Leading | System font leading unless a custom layout is introduced | Role line-height is tokenized; many other selectors declare their own or use `normal` | No universal conversion; compare computed line boxes for each shared component. |

## Screen and component coverage checklist

The following is the feature-level source coverage completed. Data-only models/repositories with no rendered text were scanned but have no independent typography entry. “Checked” means source declarations and relevant shared component styles were inspected; it does not mean visual simulator/browser validation.

| Area | iOS source inspected | Web source inspected | Coverage |
| --- | --- | --- | --- |
| Shared design system, app header, navigation | `DesignSystem/OSDesignSystem.swift`, `OSAppHeader.swift`, `OSExperienceComponents.swift`, `App/AppShellView.swift` | `canonical-system.css` shared type/button rules; `ApplicationShell.tsx`, `Topbar.tsx`, `Sidebar.tsx`, `SectionTabs.tsx` | Checked; runtime metrics unavailable |
| Authentication and onboarding | `Auth/AuthWelcomeView.swift`, auth-related rendered views | `components/AuthExperience.tsx`, `/login`, `/welcome`, account callback/recovery pages | Checked |
| Home / Discover | `Features/Home/HomeView.swift`, `HomeContent.swift` | `/`, Home components, catalog cards and shared type selectors | Checked |
| Community and posts | `Community/CommunityView.swift`, `CommunityPostPresentation.swift`, `CommunityBodyReferences.swift`, `ItemCommunitySection.swift` | `/community` routes, `components/Social.tsx`, `.social-row-*`, `.social-rich-*` | Checked; mention treatment traced |
| Public and owner profiles | `Features/Profile/PublicProfileView.swift`, `AccountProfileView.swift`, profile edit views | `/profile/[username]`, `/profile`, `PublicProfileApp.tsx`, profile CSS | Checked |
| Store, catalog, item details, videos | `Features/Item/ItemDetailView.swift`, `ItemVideoCard.swift`, `VideoDetailView.swift`, shared catalog cards | `/store`, category/item routes, `/videos`, catalog and artifact components | Checked |
| Library, playlists, reader, achievements | `Features/Library/LibraryView.swift`, `LibraryItemDetailView.swift`, `PlaylistDetailView.swift`, `LibraryExperienceViews.swift`, `AchievementsPanel.swift` | `/library`, category/search/playlists/reader routes, library detail components | Checked |
| Radio and player | `Features/Radio/RadioView.swift`, `Playback/PlaybackPresentationView.swift` | `/radio`, `components/GlobalMiniPlayer.tsx`, player controls | Checked |
| Calendar and events | `Features/Calendar/CalendarView.swift`, `EventDetailView.swift`, `EventRowCard.swift` | `/calendar`, `/events/[id]`, event components | Checked |
| Cart and checkout | `Features/Cart/CartView.swift`, `CartCheckoutSection.swift` | `/cart`, `/checkout`, checkout components | Checked |
| Account, settings, orders, admin | `Features/Account/AccountView.swift`, `OrdersView.swift`, `AdminView.swift`, `AppMenuDrawer.swift`, `AccountAchievementsView.swift` | account/you/settings/orders/admin routes and admin CSS selectors | Checked |
| Messages and notifications | `Features/Messages/MessageView.swift`, `Features/Notifications/NotificationView.swift` | `/inbox`, `/conversation/[id]`, `/notifications`, message and notification components | Checked |
| Studio and creator forms | `Features/Studio/CreatorStudioView.swift`, `StudioFormComponents.swift`, `StudioLiveItemEditorView.swift`, `StudioSupportingViews.swift`, event/video editors, artwork/tag/file pickers | `/studio` routes, Studio form components, music/book/game/asset/event/video forms | Checked; high density of local styles |
| Search | `Features/Search/SearchView.swift` | `/search`, search result components | Checked |
| Support and legal | `Features/Utilities/MemberUtilityViews.swift` | `/support`, support articles, `/legal/*`, `LegalPage.tsx` | Checked |
| Shared error and transient states | `OSExperienceComponents.swift`, auth/community feedback views | `src/app/error.tsx`, dialogs, status/empty/loading components | Checked |

### Complete Swift explicit-font modifier index

This is a grouped index of every explicit `.font(...)` call found in the 175 Swift files. Each entry gives the source-relative file, modifier expression, count, and source line(s). Semantic modifiers appear alongside raw sizes; preview fixture calls are included so they are not mistaken for live production UI. Line references correspond to the inspected checkout and can shift with later edits.

- `44OS/Auth/AuthWelcomeView.swift`: 1× `.font(.largeTitle.bold())` at L58; 1× `.font(.body)` at L63; 1× `.font(.subheadline.weight(.semibold))` at L84; 4× `.font(.title2.bold())` at L100, L300, L319, L341; 2× `.font(.footnote)` at L112, L369; 1× `.font(.subheadline)` at L133; 3× `.font(.system(size: 44))` at L299, L318, L340
- `44OS/DesignSystem/CatalogItemArtwork.swift`: 1× `.font(.system(size: 34, weight: .semibold))` at L44
- `44OS/DesignSystem/OSAppHeader.swift`: 2× `.font(.body.weight(.semibold))` at L92, L107
- `44OS/DesignSystem/OSDesignSystem.swift`: 1× `.font(.subheadline.weight(.semibold))` at L162
- `44OS/DesignSystem/OSExperienceComponents.swift`: 1× `.font(.title3.weight(.semibold))` at L249; 3× `.font(.subheadline)` at L253, L399, L767; 3× `.font(.body.weight(.semibold))` at L296, L345, L763; 7× `.font(.subheadline.weight(.semibold))` at L304, L314, L353, L500, L506, L687, L1225; 4× `.font(.footnote)` at L308, L357, L554, L692; 5× `.font(.body)` at L397, L828, L836, L851, L857; 3× `.font(.caption.weight(.semibold))` at L405, L769, L775; 2× `.font(.headline)` at L473, L485; 1× `.font(.headline.weight(.semibold))` at L549; 1× `.font(.footnote.weight(.semibold))` at L563; 1× `.font(.system(size: 22, weight: .regular))` at L589; 1× `.font(size > 60 ? .title3.bold() : .caption.bold())` at L650; 1× `.font(.subheadline.monospacedDigit())` at L801; 1× `.font(.footnote.monospacedDigit())` at L809; 1× `.font(.subheadline.weight(.semibold).monospacedDigit())` at L1128
- `44OS/DesignSystem/OSFeatureFoundationView.swift`: 1× `.font(.system(size: 28, weight: .semibold))` at L15; 1× `.font(.largeTitle.bold())` at L20; 1× `.font(.body)` at L26; 1× `.font(.caption.weight(.semibold))` at L31; 1× `.font(.footnote)` at L41
- `44OS/DesignSystem/OSM19PreviewFixtures.swift`: 1× `.font(.largeTitle)` at L32; 1× `.font(.title2.bold())` at L34; 1× `.font(.subheadline)` at L35; 1× `.font(.body)` at L99; 1× `.font(.title2)` at L102
- `44OS/DesignSystem/OSPlatformLinks.swift`: 1× `.font(.system(size: 12, weight: .bold))` at L77; 1× `.font(.system(size: 21, weight: .medium))` at L95
- `44OS/DesignSystem/OSRemoteImage.swift`: 1× `.font(.body.weight(.semibold))` at L79
- `44OS/Features/Account/AccountAchievementReleaseView.swift`: 1× `.font(.title2.weight(.bold))` at L100; 1× `.font(.subheadline)` at L120; 2× `.font(.headline)` at L145, L153
- `44OS/Features/Account/AccountAchievementsView.swift`: 1× `.font(.title3)` at L157; 1× `.font(.headline)` at L160; 2× `.font(.subheadline.weight(.semibold))` at L163, L230; 1× `.font(.body.weight(.semibold))` at L220; 1× `.font(.subheadline)` at L225; 1× `.font(.footnote.weight(.semibold))` at L239
- `44OS/Features/Account/AccountCredentialChange.swift`: 1× `.font(.system(size: StudioForm.labelSize, weight: .semibold))` at L55; 1× `.font(.footnote.weight(.semibold))` at L62; 2× `.font(.footnote)` at L165, L169
- `44OS/Features/Account/AccountView.swift`: 1× `.font(.title.bold())` at L183; 1× `.font(.largeTitle.bold())` at L205; 1× `.font(.title3)` at L209; 1× `.font(.subheadline)` at L231; 7× `.font(.subheadline.weight(.semibold))` at L238, L253, L290, L581, L595, L749, L770; 2× `.font(.title2.bold())` at L310, L332; 4× `.font(.footnote)` at L314, L627, L631, L871; 1× `.font(.footnote.weight(.semibold))` at L505; 1× `.font(.caption.bold())` at L609; 1× `.font(.caption)` at L773; 1× `.font(.footnote.bold())` at L780; 2× `.font(.body.weight(.semibold))` at L869, L876; 1× `.font(.system(size: StudioForm.labelSize, weight: .semibold))` at L924; 1× `.font(.caption.weight(.semibold))` at L937; 1× `.font(.title2)` at L989
- `44OS/Features/Account/AdminView.swift`: 1× `.font(.title.bold())` at L139
- `44OS/Features/Account/AppMenuDrawer.swift`: 2× `.font(.system(size: 17))` at L75, L154; 2× `.font(.system(size: 16, weight: .medium))` at L78, L158; 1× `.font(.system(size: 16, weight: .semibold))` at L117; 1× `.font(.system(size: 13))` at L121; 2× `.font(.system(size: 24, weight: .light))` at L128, L166; 1× `.font(.system(size: 12))` at L160
- `44OS/Features/Account/OrdersView.swift`: 1× `.font(.headline)` at L126; 1× `.font(.subheadline)` at L128; 1× `.font(.caption.weight(.semibold))` at L133; 2× `.font(.subheadline.weight(.semibold))` at L144, L169; 2× `.font(.caption)` at L146, L157; 1× `.font(.subheadline.monospacedDigit())` at L151; 1× `.font(.headline.monospacedDigit())` at L161
- `44OS/Features/Calendar/CalendarView.swift`: 3× `.font(.headline)` at L98, L202, L309; 1× `.font(.title2.bold())` at L134; 1× `.font(.caption.weight(.semibold))` at L152; 1× `.font(.subheadline.weight(isToday ? .bold : .regular))` at L177; 1× `.font(.subheadline)` at L311
- `44OS/Features/Calendar/EventDetailView.swift`: 1× `.font(.title2.weight(.bold))` at L119; 1× `.font(.body.weight(.bold))` at L143; 1× `.font(.headline)` at L234; 1× `.font(.subheadline)` at L238
- `44OS/Features/Calendar/EventRowCard.swift`: 1× `.font(.headline)` at L17; 1× `.font(.subheadline)` at L21
- `44OS/Features/Cart/CartCheckoutSection.swift`: 1× `.font(.headline)` at L48; 4× `.font(.footnote)` at L50, L79, L91, L142; 1× `.font(.subheadline.weight(.semibold))` at L191
- `44OS/Features/Cart/CartView.swift`: 3× `.font(.subheadline)` at L43, L137, L179; 3× `.font(.headline)` at L126, L172, L191; 1× `.font(.caption)` at L142; 1× `.font(.subheadline.weight(.semibold))` at L152; 1× `.font(.headline.monospacedDigit())` at L176; 1× `.font(.footnote)` at L193
- `44OS/Features/Community/CommunityPostPresentation.swift`: 2× `.font(.body)` at L190, L374; 1× `.font(.system(size: StudioForm.labelSize, weight: .semibold))` at L370; 2× `.font(.caption.weight(.semibold))` at L500, L572; 1× `.font(.subheadline.weight(.semibold))` at L563; 1× `.font(.caption)` at L567
- `44OS/Features/Community/CommunityView.swift`: 6× `.font(.subheadline.weight(.semibold))` at L242, L430, L915, L1371, L1935, L2193; 5× `.font(.subheadline)` at L443, L1729, L1939, L2199, L2342; 5× `.font(.body)` at L497, L712, L1948, L2215, L2238; 2× `.font(.system(size: StudioForm.labelSize, weight: .semibold))` at L877, L1964; 3× `.font(.caption)` at L917, L1373, L1696; 5× `.font(.footnote)` at L981, L1462, L1468, L1770, L1786; 1× `.font(.body.weight(.semibold))` at L1187; 1× `.font(.caption.weight(.semibold))` at L1281; 1× `.font(.title3)` at L1292; 1× `.font(.headline)` at L1727; 2× `.font(.footnote.weight(.semibold))` at L1777, L1793
- `44OS/Features/Community/ItemCommunitySection.swift`: 2× `.font(.subheadline.weight(.semibold))` at L51, L69; 1× `.font(.title2)` at L66; 1× `.font(.footnote)` at L72
- `44OS/Features/Home/HomeView.swift`: 5× `.font(.subheadline.weight(.semibold))` at L268, L643, L721, L822, L906; 4× `.font(.footnote)` at L416, L425, L442, L454; 1× `.font(.caption.weight(.bold))` at L812; 1× `.font(.title2.bold())` at L814
- `44OS/Features/Item/ItemDetailView.swift`: 1× `.font(.title.bold())` at L247; 3× `.font(.body)` at L250, L520, L535; 2× `.font(.footnote)` at L260, L585; 1× `.font(.title2.weight(.bold))` at L301; 1× `.font(.subheadline.monospacedDigit())` at L312; 2× `.font(.body.weight(.bold))` at L336, L344; 2× `.font(.body.weight(.semibold))` at L505, L749; 2× `.font(.headline)` at L580, L959; 1× `.font(.subheadline)` at L582; 1× `.font(.caption.weight(.semibold))` at L593; 1× `.font(.title2.bold())` at L914; 1× `.font(.title2)` at L956; 1× `.font(.caption)` at L960; 1× `.font(.footnote.bold())` at L964
- `44OS/Features/Item/ItemVideoCard.swift`: 2× `.font(.subheadline.weight(.semibold))` at L55, L141; 1× `.font(.system(size: 54))` at L95
- `44OS/Features/Library/AchievementsPanel.swift`: 2× `.font(.title3)` at L74, L102; 3× `.font(.headline)` at L77, L105, L108; 1× `.font(.subheadline)` at L79
- `44OS/Features/Library/AddCatalogTrackToPlaylistSheet.swift`: 1× `.font(.body.weight(.semibold))` at L94; 1× `.font(.subheadline)` at L97; 1× `.font(.footnote)` at L107
- `44OS/Features/Library/LibraryExperienceViews.swift`: 3× `.font(.footnote)` at L28, L48, L71
- `44OS/Features/Library/LibraryItemDetailView.swift`: 1× `.font(.title2.weight(.bold))` at L630; 2× `.font(.subheadline)` at L645, L904; 2× `.font(.body.weight(.bold))` at L666, L674; 1× `.font(.body)` at L870; 2× `.font(.footnote)` at L897, L909; 1× `.font(.subheadline.weight(.semibold))` at L901; 2× `.font(.headline)` at L917, L976; 2× `.font(.caption)` at L919, L977; 1× `.font(.caption.weight(.semibold))` at L924; 1× `.font(.title2)` at L973; 1× `.font(.footnote.bold())` at L981
- `44OS/Features/Library/LibraryView.swift`: 2× `.font(.footnote)` at L370, L554; 1× `.font(.system(size: 32, weight: .semibold))` at L537; 1× `.font(.subheadline.weight(.semibold))` at L549; 1× `.font(.system(size: 20, weight: .semibold))` at L591; 1× `.font(.body.weight(.semibold))` at L602; 1× `.font(.subheadline)` at L606
- `44OS/Features/Library/PlaylistDetailView.swift`: 1× `.font(.system(size: 56, weight: .semibold))` at L176; 2× `.font(.title2.weight(.bold))` at L194, L202; 2× `.font(.subheadline)` at L209, L278; 1× `.font(.body.weight(.semibold))` at L274; 2× `.font(.footnote)` at L284, L298; 1× `.font(.subheadline.weight(.semibold))` at L329
- `44OS/Features/Messages/MessageView.swift`: 2× `.font(.footnote)` at L115, L407; 6× `.font(.caption)` at L139, L416, L453, L482, L486, L756; 2× `.font(.subheadline.weight(.semibold))` at L180, L441; 1× `.font(.caption.weight(.semibold))` at L251; 1× `.font(.body.bold())` at L265; 3× `.font(.subheadline)` at L268, L283, L716; 1× `.font(.body.weight(conversation.isUnread ? .bold : .semibold))` at L279; 2× `.font(.caption2)` at L504, L582; 2× `.font(.body.weight(.bold))` at L542, L787; 1× `.font(.body)` at L588
- `44OS/Features/Notifications/NotificationView.swift`: 1× `.font(.subheadline.weight(.semibold))` at L259; 1× `.font(.body.weight(.semibold))` at L433; 1× `.font(.subheadline)` at L444; 1× `.font(.caption.weight(.semibold))` at L502
- `44OS/Features/Profile/AccountProfileEditView.swift`: 1× `.font(.system(size: StudioForm.headingSize, weight: .bold))` at L123; 2× `.font(.subheadline)` at L126, L219; 1× `.font(.footnote.weight(.semibold))` at L137; 1× `.font(.caption)` at L172; 1× `.font(.system(size: 42, weight: .bold))` at L274
- `44OS/Features/Profile/ProfileAvatarCropView.swift`: 1× `.font(.footnote)` at L46
- `44OS/Features/Profile/PublicProfileView.swift`: 1× `.font(.title.bold())` at L508; 1× `.font(.subheadline.weight(.semibold))` at L788; 1× `.font(.footnote)` at L790
- `44OS/Features/Radio/RadioView.swift`: 1× `.font(.subheadline.weight(.bold))` at L165; 2× `.font(.title3.weight(.semibold))` at L182, L190; 2× `.font(.title3.weight(.medium))` at L209, L217; 1× `.font(.footnote)` at L230; 1× `.font(.title2.weight(.semibold))` at L251; 1× `.font(.largeTitle.weight(.light))` at L384
- `44OS/Features/Search/SearchView.swift`: 2× `.font(.title3)` at L307, L484; 3× `.font(.headline)` at L311, L465, L489; 4× `.font(.subheadline)` at L312, L441, L466, L493; 2× `.font(.caption.bold())` at L315, L469
- `44OS/Features/Studio/CreatorStudioView.swift`: 4× `.font(.system(size: 22, weight: .bold))` at L303, L326, L363, L448; 2× `.font(.title3.weight(.semibold))` at L533, L571; 1× `.font(.largeTitle.weight(.semibold))` at L586; 7× `.font(.subheadline.weight(.semibold))` at L593, L1294, L1616, L1621, L1692, L1697, L1702; 10× `.font(.footnote)` at L597, L680, L715, L1114, L1149, L1312, L1326, L1487, L2625, L2760; 1× `.font(.footnote.weight(.medium))` at L602; 5× `.font(.caption)` at L689, L984, L1123, L1299, L1844; 4× `.font(.body.weight(.semibold))` at L733, L907, L1297, L1815; 5× `.font(.subheadline)` at L741, L911, L1370, L1493, L1817; 2× `.font(.title3)` at L903, L1811; 3× `.font(.caption.weight(.semibold))` at L1019, L1363, L1626; 2× `.font(.largeTitle)` at L2580, L2676; 2× `.font(.largeTitle.bold())` at L2590, L2686; 1× `.font(.title2.bold())` at L2756
- `44OS/Features/Studio/StudioArtworkPicker.swift`: 3× `.font(.subheadline)` at L100, L108, L118; 2× `.font(.system(size: 34, weight: .medium))` at L104, L114; 2× `.font(.title3.weight(.bold))` at L106, L116
- `44OS/Features/Studio/StudioEventEditorView.swift`: 1× `.font(.subheadline)` at L104; 1× `.font(.subheadline.weight(.semibold))` at L292
- `44OS/Features/Studio/StudioFilePicker.swift`: 1× `.font(.subheadline.weight(.semibold))` at L42; 2× `.font(.footnote)` at L90, L94
- `44OS/Features/Studio/StudioFormComponents.swift`: 1× `.font(.system(size: StudioForm.headingSize, weight: .bold))` at L96; 2× `.font(.subheadline)` at L103, L353; 2× `.font(.footnote)` at L128, L391; 2× `.font(.caption.weight(.semibold))` at L244, L301; 1× `.font(.title3)` at L348; 1× `.font(.system(size: StudioForm.labelSize, weight: .semibold))` at L386
- `44OS/Features/Studio/StudioLiveItemEditorView.swift`: 6× `.font(.footnote)` at L1160, L1190, L1391, L1806, L1856, L1871; 8× `.font(.subheadline.weight(.semibold))` at L1236, L1382, L1611, L1621, L1683, L1700, L1804, L1841; 2× `.font(.footnote.weight(.semibold))` at L1446, L1521; 1× `.font(.subheadline)` at L1587; 1× `.font(.body)` at L1741; 1× `.font(.caption)` at L1743; 1× `.font(.title3)` at L1783
- `44OS/Features/Studio/StudioSupportingViews.swift`: 4× `.font(.headline)` at L15, L35, L108, L128; 1× `.font(.title2)` at L29; 6× `.font(.subheadline)` at L36, L129, L218, L267, L362, L633; 1× `.font(.caption.weight(.semibold))` at L37; 1× `.font(.footnote.bold())` at L40; 1× `.font(.caption.weight(.bold))` at L123; 4× `.font(.caption)` at L126, L302, L412, L617; 3× `.font(.body)` at L196, L259, L354; 2× `.font(.subheadline.monospacedDigit())` at L212, L223; 5× `.font(.body.weight(.semibold))` at L216, L296, L308, L407, L417; 3× `.font(.title2.bold())` at L272, L370, L616; 2× `.font(.footnote)` at L298, L409
- `44OS/Features/Studio/StudioTagField.swift`: 3× `.font(.subheadline)` at L31, L50, L57; 1× `.font(.caption2.weight(.semibold))` at L34
- `44OS/Features/Studio/StudioVideoEditorView.swift`: 3× `.font(.subheadline)` at L74, L172, L179; 2× `.font(.subheadline.weight(.semibold))` at L197, L218
- `44OS/Features/Studio/StudioVideoLibrarySheets.swift`: 2× `.font(.footnote)` at L120, L148
- `44OS/Features/Utilities/MemberUtilityViews.swift`: 1× `.font(.subheadline)` at L83; 1× `.font(.body.weight(.semibold))` at L102; 1× `.font(.footnote)` at L105; 1× `.font(.footnote.bold())` at L111; 1× `.font(.largeTitle.bold())` at L142; 1× `.font(.title3)` at L145; 1× `.font(.title3.bold())` at L151
- `44OS/Playback/PlaybackPresentationView.swift`: 1× `.font(.subheadline.weight(.semibold))` at L64; 2× `.font(.caption)` at L67, L410; 1× `.font(.caption2)` at L123; 2× `.font(.title2.bold())` at L188, L289; 1× `.font(.headline)` at L192; 1× `.font(.subheadline)` at L196; 1× `.font(.footnote)` at L207; 2× `.font(.body.weight(.semibold))` at L257, L313; 2× `.font(.title2)` at L270, L302; 1× `.font(.caption.monospacedDigit())` at L368; 1× `.font(.system(size: 34, weight: .semibold))` at L473

### Web stylesheet typography-rule index

The following selector-level inventory expands the compact role summary above. It records every stylesheet rule with an explicit font declaration, plus its line-height, tracking, text treatment, color, and local text spacing declarations where present. Nested media conditions are shown so breakpoint overrides remain distinguishable. Rules without a font-related declaration are outside this index even if they only set layout spacing.

<details>
<summary>Expand the full selector inventory (804 rules)</summary>

- `src/app/globals.css:44` — `.team-hub-card`: padding: 28px; color: #fff; text-decoration: none.
- `src/app/globals.css:55` — `.team-hub-card > span`: color: #60a5fa; font-size: 12px; font-weight: 750; letter-spacing: .08em; text-transform: uppercase.
- `src/app/globals.css:56` — `.team-hub-card h2`: margin: 18px 0 10px; font-size: 28px.
- `src/app/globals.css:57` — `.team-hub-card p`: margin: 0; color: rgba(255,255,255,.62); line-height: 1.55.
- `src/app/globals.css:58` — `.team-hub-card strong`: margin-top: auto; padding-top: 26px; font-size: 14px.
- `src/app/globals.css:70` — `.team-filter-bar label > span`: color: rgba(255,255,255,.62); font-size: 13px; font-weight: 650.
- `src/app/globals.css:73` — `.team-creator-card`: gap: 18px; padding: 20px; color: #fff; text-decoration: none.
- `src/app/globals.css:85` — `.team-directory-avatar`: font-size: 28px; font-weight: 700.
- `src/app/globals.css:86` — `.team-creator-card h2`: margin: 2px 0 5px; font-size: 20px.
- `src/app/globals.css:87` — `.team-creator-card p`: margin: 0 0 10px; color: rgba(255,255,255,.56); font-size: 14px.
- `src/app/globals.css:88` — `.team-creator-card small`: margin: 0 0 12px; color: rgba(255,255,255,.7); line-height: 1.45.
- `src/app/globals.css:89` — `.team-creator-card strong`: color: #60a5fa; font-size: 12px.
- `src/app/globals.css:92` — `.team-release-card`: color: #fff; text-decoration: none.
- `src/app/globals.css:96` — `.team-release-art-empty`: color: rgba(255,255,255,.35); font-size: 32px; font-weight: 800.
- `src/app/globals.css:99` — `.team-release-card h2`: margin: 13px 3px 3px; font-size: 16px; white-space: nowrap.
- `src/app/globals.css:100` — `.team-release-card p`: margin: 0 3px 5px; color: rgba(255,255,255,.58); font-size: 14px; white-space: nowrap.
- `src/app/globals.css:101` — `.team-release-card small`: margin: 0 3px; color: rgba(255,255,255,.42); font-size: 12px.
- `src/app/globals.css:103` — `.team-brand-surface`: margin: 24px 0 80px; color: var(--brand-ink); font-family: 'Inter Variable', Inter, ui-sans-serif, system-ui, sans-serif.
- `src/app/globals.css:125` — `.team-brand-download`: padding: 0 19px; color: #fff; font: inherit; font-size: 14px; font-weight: 680.
- `src/app/globals.css:140` — `.team-brand-kit-message`: margin: 0; padding: 12px 32px; font-size: 13px.
- `src/app/globals.css:143` — `.team-brand-document h1`: margin: 0 0 18px; font-size: clamp(48px,7vw,82px); font-weight: 730; letter-spacing: -.045em; line-height: .98.
- `src/app/globals.css:144` — `.team-brand-document h1 + p`: margin-bottom: 48px; padding-bottom: 30px; color: rgba(26,26,26,.52); font-size: 14px.
- `src/app/globals.css:145` — `.team-brand-document h2`: margin: 90px 0 22px; padding-top: 10px; font-size: clamp(32px,4vw,48px); font-weight: 700; letter-spacing: -.035em; line-height: 1.03.
- `src/app/globals.css:146` — `.team-brand-document h3`: margin: 42px 0 14px; font-size: 22px; letter-spacing: -.02em.
- `src/app/globals.css:147` — `.team-brand-document p, .team-brand-document li`: font-size: 17px; line-height: 1.65.
- `src/app/globals.css:152` — `.team-brand-document code`: padding: .12em .35em; font-family: ui-monospace,SFMono-Regular,Menlo,monospace; font-size: .9em.
- `src/app/globals.css:158` — `.team-brand-logo-card figcaption`: gap: 16px; padding: 16px 18px 18px; font-size: 13px.
- `src/app/globals.css:159` — `.team-brand-logo-card figcaption span`: text-align: right.
- `src/app/globals.css:160` — `.team-brand-dev-reference`: margin: 8px 0 42px; color: #f4f3ee; font-family: system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif.
- `src/app/globals.css:172` — `.team-brand-dev-reference > header span`: font-size: 13px; font-weight: 760.
- `src/app/globals.css:173` — `.team-brand-dev-reference > header strong`: color: rgba(255,255,255,.48); font-size: 11px; font-weight: 600.
- `src/app/globals.css:175` — `.team-brand-dev-reference .team-brand-dev-section h3`: margin: 0 0 18px; color: #f4f3ee; font-size: 13px; font-weight: 650; letter-spacing: 0.
- `src/app/globals.css:176` — `.team-brand-dev-reference code`: padding: 0; color: rgba(255,255,255,.46); font: 400 10px/13px ui-monospace,SFMono-Regular,Menlo,monospace.
- `src/app/globals.css:180` — `.team-brand-dev-accents strong`: font-size: 12px.
- `src/app/globals.css:185` — `.team-brand-dev-material strong`: font-size: 13px.
- `src/app/globals.css:186` — `.team-brand-dev-material small`: color: rgba(255,255,255,.48); font-size: 10px; line-height: 13px.
- `src/app/globals.css:195` — `.team-brand-dev-radii span`: color: rgba(255,255,255,.72); font-size: 10px.
- `src/app/globals.css:200` — `.team-brand-dev-elevation strong`: font-size: 12px.
- `src/app/globals.css:201` — `.team-brand-dev-elevation small`: color: rgba(255,255,255,.46); font-size: 10px.
- `src/app/globals.css:204` — `.team-brand-dev-type > div > span`: color: rgba(255,255,255,.46); font-size: 10px.
- `src/app/globals.css:206` — `.team-brand-dev-type-page`: font: 700 26px/32px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif.
- `src/app/globals.css:207` — `.team-brand-dev-type-section`: font: 700 22px/26px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif.
- `src/app/globals.css:208` — `.team-brand-dev-type-card`: font: 600 13px/16px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif.
- `src/app/globals.css:209` — `.team-brand-dev-type-body`: font: 400 13px/18px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif.
- `src/app/globals.css:210` — `.team-brand-dev-type-meta`: font: 400 10px/13px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif.
- `src/app/globals.css:227` — `.team-release-card h2` (@media (max-width: 700px)): font-size: 14px.
- `src/app/globals.css:236` — `.team-brand-document h1` (@media (max-width: 700px)): font-size: 44px.
- `src/app/globals.css:238` — `.team-brand-document h2` (@media (max-width: 700px)): margin-top: 68px; font-size: 34px.
- `src/app/globals.css:239` — `.team-brand-document p, .team-brand-document li` (@media (max-width: 700px)): font-size: 16px.
- `src/app/globals.css:259` — `.admin-stat-link`: color: inherit; text-decoration: none.
- `src/app/globals.css:264` — `.admin-stat-label`: color: var(--os-color-ink-secondary); font-size: 12px; font-weight: 650.
- `src/app/globals.css:265` — `.admin-stat-card strong`: margin-top: 12px; color: var(--os-color-ink); font-size: 28px; letter-spacing: -.03em.
- `src/app/globals.css:266` — `.admin-stat-detail`: margin-top: 3px; color: var(--os-color-ink-secondary); font-size: 12px.
- `src/app/globals.css:268` — `.admin-hub-row`: text-decoration: none.
- `src/app/globals.css:269` — `.admin-hub-row-meta`: gap: 13px; color: var(--os-color-ink-secondary); font-size: 13px.
- `src/app/globals.css:270` — `.admin-hub-row-meta span`: color: var(--os-color-accent); font-size: 22px.
- `src/app/globals.css:275` — `.admin-system-status-row strong`: color: var(--os-color-ink); font-size: 13px.
- `src/app/globals.css:276` — `.admin-system-status-row small`: color: var(--os-color-ink-secondary); font-size: 11px.
- `src/app/globals.css:282` — `.admin-user-request-pill`: padding: 3px 10px; color: var(--os-color-ink-secondary); font-size: 11px; font-weight: 600; line-height: 1.
- `src/app/globals.css:294` — `.admin-filter-bar label > span`: color: var(--os-color-ink-secondary); font-size: 11px; font-weight: 650.
- `src/app/globals.css:297` — `.admin-record-heading`: color: var(--os-color-ink-secondary); font-size: 10px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase.
- `src/app/globals.css:298` — `.admin-record-row`: color: var(--os-color-ink-secondary); font-size: 12px; text-decoration: none.
- `src/app/globals.css:306` — `.admin-releases-load-more`: padding: 8px 0; color: var(--os-color-ink-secondary); font-size: 12px; text-align: center.
- `src/app/globals.css:307` — `.admin-release-artwork-empty`: color: var(--os-color-ink-secondary); font-size: 16px; font-weight: 700.
- `src/app/globals.css:312` — `.admin-user-copy strong`: color: var(--os-color-ink); font-size: 15px; font-weight: 650.
- `src/app/globals.css:313` — `.admin-user-copy small`: color: var(--os-color-ink-secondary); font-size: 13px.
- `src/app/globals.css:314` — `.admin-user-chevron`: color: var(--os-color-accent); font-size: 24px; line-height: 1; text-align: right.
- `src/app/globals.css:316` — `.admin-person-cell strong, .admin-content-cell strong`: color: var(--os-color-ink); font-size: 13px; white-space: nowrap.
- `src/app/globals.css:317` — `.admin-person-cell small, .admin-content-cell small, .admin-row-secondary small`: color: var(--os-color-ink-secondary); font-size: 11px; white-space: nowrap.
- `src/app/globals.css:319` — `.admin-avatar-empty`: color: var(--os-color-accent); font-size: 15px; font-weight: 700.
- `src/app/globals.css:324` — `.admin-row-count > span`: color: var(--os-color-accent); font-size: 21px.
- `src/app/globals.css:325` — `.admin-row-count > .admin-row-missing-date`: color: var(--os-color-ink-secondary); font-size: 11px.
- `src/app/globals.css:326` — `.admin-record-status`: padding: 5px 8px; color: var(--os-color-ink-secondary); font-size: 10px; font-weight: 700; line-height: 1; text-transform: capitalize; white-space: nowrap.
- `src/app/globals.css:332` — `.admin-pager > span`: color: var(--os-color-ink-secondary); font-size: 12px.
- `src/app/globals.css:335` — `.admin-back-row a`: color: var(--os-color-ink-secondary); font-size: 12px; text-decoration: none.
- `src/app/globals.css:339` — `.admin-person-hero h2, .admin-content-hero h2`: margin: 0; color: var(--os-color-ink); font-size: 21px.
- `src/app/globals.css:340` — `.admin-person-hero p, .admin-content-hero p`: margin: 5px 0 0; color: var(--os-color-ink-secondary); font-size: 12px.
- `src/app/globals.css:342` — `.admin-detail-eyebrow`: margin-bottom: 5px; color: var(--os-color-ink-secondary); font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase.
- `src/app/globals.css:346` — `.admin-fact-grid dt`: color: var(--os-color-ink-secondary); font-size: 10px; font-weight: 650.
- `src/app/globals.css:347` — `.admin-fact-grid dd`: margin: 0; overflow-wrap: anywhere; color: var(--os-color-ink); font-size: 12px.
- `src/app/globals.css:350` — `.admin-detail-note`: margin: 18px 0 0; padding-top: 16px; color: var(--os-color-ink-secondary); font-size: 12px; line-height: 1.5.
- `src/app/globals.css:351` — `.admin-review-description`: margin: 0 0 18px; color: var(--os-color-ink-secondary); font-size: 13px; line-height: 1.6.
- `src/app/globals.css:355` — `.admin-health-row strong`: color: var(--os-color-ink); font-size: 12px; text-transform: capitalize.
- `src/app/globals.css:356` — `.admin-health-row span`: color: var(--os-color-ink-secondary); font-size: 12px; text-align: right.
- `src/app/globals.css:358` — `.admin-history-row strong`: color: var(--os-color-ink); font-size: 12px; text-transform: capitalize.
- `src/app/globals.css:359` — `.admin-history-row p`: margin: 0; color: var(--os-color-ink-secondary); font-size: 12px; line-height: 1.45.
- `src/app/globals.css:360` — `.admin-history-row > span, .admin-history-row > time`: gap: 3px; color: var(--os-color-ink-secondary); font-size: 11px; text-align: right.
- `src/app/globals.css:361` — `.admin-history-row time`: color: var(--os-color-ink-secondary); font-size: 11px.
- `src/app/globals.css:363` — `.admin-copy-card p`: margin: 0; color: var(--os-color-ink-secondary); font-size: 13px; line-height: 1.65; white-space: pre-wrap.
- `src/app/globals.css:364` — `.admin-copy-card p strong`: margin-bottom: 5px; color: var(--os-color-ink); font-size: 11px.
- `src/app/globals.css:377` — `.admin-person-detail-page .admin-person-detail-facts dt`: color: var(--os-color-ink); font-size: 16px; font-weight: 600; line-height: 20px.
- `src/app/globals.css:378` — `.admin-person-detail-page .admin-person-detail-facts dd`: overflow-wrap: anywhere; color: var(--os-color-ink-secondary); font-size: 16px; line-height: 20px.
- `src/app/globals.css:381` — `.admin-content-detail-page .admin-content-detail-hero`: gap: 18px; padding: 0; text-align: center.
- `src/app/globals.css:386` — `.admin-content-detail-page .admin-content-detail-hero .view-album-title`: margin: 0; font-size: 34px; line-height: 1.08; text-align: center; white-space: normal.
- `src/app/globals.css:388` — `.admin-content-detail-page .admin-content-detail-hero .admin-content-detail-creator`: margin: 0; color: var(--os-color-ink); font-size: 22px; line-height: 28px; font-weight: 500.
- `src/app/globals.css:394` — `.admin-content-metadata-row dt`: color: var(--os-color-ink); font-size: 16px; font-weight: 600; line-height: 20px.
- `src/app/globals.css:395` — `.admin-content-metadata-row dd`: gap: 12px; margin: 0; color: var(--os-color-ink-secondary); font-size: 16px; line-height: 20px.
- `src/app/globals.css:397` — `.admin-content-metadata-row dd small`: color: var(--os-color-ink-secondary); font-size: 12px; line-height: 16px; text-align: right.
- `src/app/globals.css:400` — `.admin-content-metadata-rows-tracks .admin-content-metadata-row dt`: color: var(--os-color-ink-secondary); font-size: 15px; font-weight: 500.
- `src/app/globals.css:401` — `.admin-content-metadata-rows-tracks .admin-content-metadata-row dd`: color: var(--os-color-ink); font-size: 16px; font-weight: 600.
- `src/app/globals.css:404` — `.admin-release-artwork-empty`: font-size: 13px; font-weight: 700.
- `src/app/globals.css:408` — `.admin-detail-group h3`: margin: 0 0 8px; color: var(--os-color-ink); font-size: 14px.
- `src/app/globals.css:409` — `.admin-detail-group > p`: color: var(--os-color-ink-secondary); font-size: 12px.
- `src/app/globals.css:412` — `.admin-detail-group-row strong`: color: var(--os-color-ink); font-size: 12px.
- `src/app/globals.css:413` — `.admin-detail-group-row span`: color: var(--os-color-ink-secondary); font-size: 11px; text-align: right.
- `src/app/globals.css:415` — `.admin-detail-group-row > div span`: text-align: left.
- `src/app/globals.css:421` — `.admin-log-entry header strong`: color: var(--os-color-ink); font-size: 13px.
- `src/app/globals.css:422` — `.admin-log-entry time, .admin-log-entry footer`: color: var(--os-color-ink-secondary); font-size: 10px.
- `src/app/globals.css:423` — `.admin-log-entry code`: margin-top: 12px; color: var(--os-color-accent); font-size: 12px; overflow-wrap: anywhere.
- `src/app/globals.css:424` — `.admin-log-entry p`: margin: 10px 0; color: var(--os-color-ink-secondary); font-size: 12px; line-height: 1.5.
- `src/app/globals.css:426` — `.admin-log-entry footer button`: color: var(--os-color-accent); font: inherit.
- `src/app/globals.css:431` — `.admin-dialog h2`: margin: 0; color: var(--os-color-ink); font-size: 20px.
- `src/app/globals.css:432` — `.admin-dialog > p`: margin: 8px 0 20px; color: var(--os-color-ink-secondary); font-size: 13px; line-height: 1.55.
- `src/app/globals.css:434` — `.admin-dialog-field span`: color: var(--os-color-ink-secondary); font-size: 11px; font-weight: 650.
- `src/app/globals.css:435` — `.admin-dialog-field textarea, .admin-dialog-field input`: padding: 11px 12px; color: var(--os-color-ink); font: inherit.
- `src/app/globals.css:466` — `.admin-stat-card strong` (@media (max-width: 520px)): margin-top: 9px; font-size: 23px.
- `src/app/globals.css:476` — `.admin-health-row span, .admin-history-row > span, .admin-history-row > time` (@media (max-width: 520px)): text-align: left.
- `src/app/globals.css:510` — `.interactive-launch-close`: color: #f4f3ee; font-size: 27px; line-height: 1; text-decoration: none.
- `src/app/globals.css:534` — `.interactive-launch-state, .interactive-launch-overlay`: gap: var(--os-space-4); padding: var(--os-space-7); text-align: center.
- `src/app/globals.css:556` — `.interactive-launch-state h1`: margin: 0; font-size: clamp(1.75rem, 4vw, 3.25rem); line-height: 1.05.
- `src/app/globals.css:557` — `.interactive-launch-state ul`: margin: 0; padding-left: 1.25rem; text-align: left.
- `src/app/globals.css:592` — `.beat-tier-row small`: color: var(--os-color-ink-secondary); font-weight: 500.
- `src/app/globals.css:611` — `.beat-license-copy > strong`: color: var(--os-color-ink); font-size: 16px; line-height: 21px.
- `src/app/globals.css:612` — `.beat-license-copy > span`: color: var(--os-color-ink-secondary); font-size: 14px; line-height: 20px.
- `src/app/globals.css:614` — `.beat-license-price`: color: var(--os-color-ink); font-size: 18px; line-height: 24px; text-align: right.
- `src/app/globals.css:626` — `.information-dialog-header h2`: margin: 0; overflow-wrap: anywhere; color: var(--os-color-ink); font-size: 21px; line-height: 27px.
- `src/app/globals.css:627` — `.information-dialog-close`: padding: 0; color: var(--os-color-ink); font: 300 25px/1 var(--os-font-app).
- `src/app/globals.css:629` — `.information-dialog-body`: gap: 16px; padding: 20px; color: var(--os-color-ink-secondary); font-size: 15px; line-height: 22px.
- `src/app/globals.css:638` — `.beat-license-price` (@media (max-width: 700px)): text-align: left.
- `src/app/globals.css:645` — `input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), select, textarea, [contenteditable="true"]` (@media (max-width: 768px)): font-size: 16px !important.
- `src/app/globals.css:663` — `.legal-document p`: line-height: 1.75; color: var(--os-color-ink-secondary).
- `src/app/globals.css:683` — `.analytics-consent-copy p, .analytics-preferences-status`: margin: 0; color: var(--os-color-ink-secondary); font-size: 13px; line-height: 1.5.
- `src/app/globals.css:684` — `.analytics-consent-copy a`: color: var(--os-color-accent); font-size: 12px.
- `src/app/globals.css:697` — `.legal-links a, .login-status a`: color: inherit; text-decoration: underline.
- `src/app/globals.css:763` — `a, a:link, a:visited, a:active`: text-decoration: none; color: inherit.
- `src/app/globals.css:770` — `a:hover` (@media (hover: hover) and (pointer: fine)): text-decoration: none; color: inherit.
- `src/app/globals.css:890` — `.sidebar-logo`: text-decoration: none.
- `src/app/globals.css:897` — `.sidebar-clock`: font-family: var(--os-font-app); font-size: 15px; font-weight: 700; letter-spacing: 0; color: var(--os-color-ink); line-height: 1.
- `src/app/globals.css:929` — `.sidebar-item`: gap: 14px; text-align: left; padding: 10px 14px; color: var(--os-color-ink-secondary); text-decoration: none; font-size: 16px; font-weight: 540; letter-spacing: 0; text-transform: none.
- `src/app/globals.css:965` — `.sidebar-item-active`: color: var(--os-color-ink); font-weight: 620.
- `src/app/globals.css:1049` — `.sidebar-item-label`: line-height: 1.1.
- `src/app/globals.css:1159` — `.sidebar-section-label`: padding: 10px 14px 5px; color: var(--os-color-ink-muted); font-family: var(--os-font-app); font-size: 11px; font-weight: 740; letter-spacing: 0.08em; line-height: 1; text-transform: uppercase.
- `src/app/globals.css:1237` — `.music-player-open-target`: padding: 0; color: inherit; font: inherit; text-align: left.
- `src/app/globals.css:1280` — `.music-player-title, .music-player-subtitle, .music-player-sheet-copy a`: text-decoration: none.
- `src/app/globals.css:1300` — `.music-player-title, .music-player-subtitle`: white-space: nowrap; letter-spacing: 0.
- `src/app/globals.css:1309` — `.music-player-title`: color: var(--os-color-ink); font-size: 14px; font-weight: 720.
- `src/app/globals.css:1315` — `.music-player-subtitle`: color: var(--os-color-ink-secondary); font-size: 12px; font-weight: 560.
- `src/app/globals.css:1336` — `.music-player-button`: color: var(--os-color-ink-secondary); font-family: var(--os-font-app); font-size: 12px; font-weight: 680; letter-spacing: 0; padding: 0 12px.
- `src/app/globals.css:1384` — `.music-player-progress`: gap: 9px; color: var(--os-color-ink-muted); font-size: 11px; font-weight: 650; letter-spacing: 0.
- `src/app/globals.css:1649` — `.music-player-sheet-copy`: gap: 4px; text-align: center.
- `src/app/globals.css:1656` — `.music-player-sheet-copy h2, .music-player-sheet-copy p`: margin: 0; white-space: nowrap; letter-spacing: 0.
- `src/app/globals.css:1666` — `.music-player-sheet-copy h2`: font-size: 24px; line-height: 1.08; font-weight: 780.
- `src/app/globals.css:1672` — `.music-player-sheet-copy p`: color: var(--os-color-ink-secondary); font-size: 15px; font-weight: 560.
- `src/app/globals.css:1683` — `.music-player-sheet-times`: color: var(--os-color-ink-muted); font-size: 12px; font-weight: 650.
- `src/app/globals.css:1759` — `.music-player-queue-head`: gap: 12px; color: var(--os-color-ink-muted); font-size: 12px; font-weight: 720.
- `src/app/globals.css:1769` — `.music-player-queue-head span:first-child`: color: var(--os-color-ink); font-size: 14px; font-weight: 780.
- `src/app/globals.css:1795` — `.music-player-queue-play`: gap: 10px; color: inherit; font: inherit; text-align: left; padding: 7px 8px.
- `src/app/globals.css:1833` — `.music-player-queue-copy span:first-child`: color: var(--os-color-ink); font-size: 13px; font-weight: 720.
- `src/app/globals.css:1839` — `.music-player-queue-copy span:last-child`: color: var(--os-color-ink-muted); font-size: 12px; font-weight: 560.
- `src/app/globals.css:2078` — `.hub-section-title`: font-family: var(--os-font-app); font-size: var(--os-type-panel-title-size); line-height: var(--os-type-panel-title-line); font-weight: var(--os-type-panel-title-weight); color: var(--os-color-ink).
- `src/app/globals.css:2145` — `.achievement-toast-icon`: color: var(--os-color-ink); font-size: 12px; font-weight: 850; letter-spacing: 0.
- `src/app/globals.css:2163` — `.achievement-toast-eyebrow`: margin-bottom: 3px; font-size: 10px; font-weight: 850; letter-spacing: 0.13em; text-transform: uppercase; color: var(--os-color-accent).
- `src/app/globals.css:2172` — `.achievement-toast-copy strong`: color: var(--os-color-ink); font-size: 15px; line-height: 1.15; font-weight: 780.
- `src/app/globals.css:2180` — `.achievement-toast-copy p`: margin-top: 4px; color: var(--os-color-ink-secondary); font-size: 12px; line-height: 1.4.
- `src/app/globals.css:2216` — `.os-type-display, .os-type-page-title, .os-type-panel-title, .os-type-card-title, .os-type-body, .os-type-body-small, .os-type-meta, .os-type-eyebrow, .os-type-pill`: font-family: var(--os-font-app).
- `src/app/globals.css:2228` — `.os-type-display`: font-size: var(--os-type-display-size); line-height: var(--os-type-display-line); font-weight: var(--os-type-display-weight); letter-spacing: var(--os-type-display-track).
- `src/app/globals.css:2235` — `.os-type-page-title`: font-size: var(--os-type-page-title-size); line-height: var(--os-type-page-title-line); font-weight: var(--os-type-page-title-weight); letter-spacing: var(--os-type-page-title-track).
- `src/app/globals.css:2242` — `.os-type-panel-title`: font-size: var(--os-type-panel-title-size); line-height: var(--os-type-panel-title-line); font-weight: var(--os-type-panel-title-weight); letter-spacing: var(--os-type-panel-title-track).
- `src/app/globals.css:2249` — `.os-type-card-title`: font-size: var(--os-type-card-title-size); line-height: var(--os-type-card-title-line); font-weight: var(--os-type-card-title-weight); letter-spacing: var(--os-type-card-title-track).
- `src/app/globals.css:2256` — `.os-type-field-title`: font-size: var(--os-type-field-title-size); line-height: var(--os-type-field-title-line); font-weight: var(--os-type-field-title-weight); letter-spacing: var(--os-type-field-title-track); color: var(--os-color-ink).
- `src/app/globals.css:2264` — `.os-type-body`: font-size: var(--os-type-body-size); line-height: var(--os-type-body-line); font-weight: var(--os-type-body-weight); letter-spacing: var(--os-type-body-track).
- `src/app/globals.css:2271` — `.os-type-body-small`: font-size: var(--os-type-body-small-size); line-height: var(--os-type-body-small-line); font-weight: var(--os-type-body-small-weight); letter-spacing: var(--os-type-body-small-track).
- `src/app/globals.css:2278` — `.os-type-meta`: font-size: var(--os-type-meta-size); line-height: var(--os-type-meta-line); font-weight: var(--os-type-meta-weight); letter-spacing: var(--os-type-meta-track).
- `src/app/globals.css:2285` — `.os-type-eyebrow`: font-size: var(--os-type-eyebrow-size); line-height: var(--os-type-eyebrow-line); font-weight: var(--os-type-eyebrow-weight); letter-spacing: var(--os-type-eyebrow-track); text-transform: uppercase.
- `src/app/globals.css:2293` — `.os-type-pill`: font-size: var(--os-type-pill-size); line-height: var(--os-type-pill-line); font-weight: var(--os-type-pill-weight); letter-spacing: var(--os-type-pill-track); text-transform: uppercase.
- `src/app/globals.css:2492` — `.os-input-field`: padding: 0 var(--os-space-4); color: var(--os-input-text); font-family: var(--os-font-app).
- `src/app/globals.css:2557` — `.os-input-textarea`: padding: var(--os-space-4); color: var(--os-input-text); font-family: var(--os-font-app).
- `src/app/globals.css:2611` — `.os-button`: padding: 0 var(--os-button-pad-x); gap: var(--os-space-2); font-family: var(--os-font-app); font-size: var(--os-type-button-size); line-height: var(--os-type-button-line); font-weight: var(--os-type-button-weight); letter-spacing: var(--os-type-button-track); text-decoration: none; white-space: nowrap.
- `src/app/globals.css:2776` — `.os-pill`: padding: 0 var(--os-pill-pad-x); gap: var(--os-space-2); color: var(--os-pill-text); font-family: var(--os-font-app); font-size: var(--os-type-pill-size); line-height: var(--os-type-pill-line); font-weight: var(--os-type-pill-weight); letter-spacing: var(--os-type-pill-track); text-transform: uppercase; white-space: nowrap.
- `src/app/globals.css:2897` — `.product-tile`: text-decoration: none; color: inherit.
- `src/app/globals.css:2941` — `.product-tile-title`: font-size: 15px; font-weight: 620; color: var(--os-color-ink); line-height: 1.25.
- `src/app/globals.css:2952` — `.product-tile-subtitle`: font-size: 13px; font-weight: 520; color: var(--os-color-ink-secondary); line-height: 1.3; white-space: nowrap.
- `src/app/globals.css:2975` — `.app-empty-text`: padding: 48px 0; color: var(--os-color-ink-secondary); font-size: 15px; font-weight: 520; line-height: 1.5; text-align: center; margin: 0 auto.
- `src/app/globals.css:2990` — `.view-section-title`: font-family: var(--os-font-app); font-size: var(--os-type-panel-title-size); line-height: var(--os-type-panel-title-line); font-weight: var(--os-type-panel-title-weight); color: var(--os-color-ink); margin: 0 0 var(--os-space-7).
- `src/app/globals.css:3033` — `.view-track-number`: font-family: var(--os-font-app); font-size: 12px; font-weight: 680; color: var(--os-color-ink).
- `src/app/globals.css:3044` — `.view-track-play`: color: var(--os-color-ink-secondary); font-size: 11px.
- `src/app/globals.css:3184` — `.view-track-title`: font-size: 14px; font-weight: 650; color: var(--os-color-ink); white-space: nowrap.
- `src/app/globals.css:3197` — `.view-track-duration`: font-family: var(--os-font-app); font-size: 12px; font-weight: 620.
- `src/app/globals.css:3205` — `.library-empty-text`: color: var(--os-color-ink-muted); font-size: 15px; font-weight: 520; line-height: 1.5.
- `src/app/globals.css:3222` — `.library-achievement-icon`: color: var(--os-color-ink); font-size: 11px; font-weight: 760.
- `src/app/globals.css:3343` — `.os-topbar-tab`: padding: 0 18px; color: color-mix(in srgb, var(--os-color-ink) 74%, var(--os-color-ink-secondary)); font-family: var(--os-font-app); font-size: 14px; font-weight: 680; letter-spacing: 0; text-decoration: none; white-space: nowrap.
- `src/app/globals.css:3372` — `.os-topbar-tab-active`: color: var(--os-color-ink); font-weight: 760.
- `src/app/globals.css:3418` — `.os-topbar-back`: padding: 0; color: var(--os-color-ink); font-family: var(--os-font-app); font-size: 14px; font-weight: 680; text-decoration: none; gap: 6px.
- `src/app/globals.css:3447` — `.os-topbar-icon-button`: color: var(--os-color-ink); text-decoration: none.
- `src/app/globals.css:3512` — `.os-topbar-search-input`: font: inherit; font-size: 14px; color: var(--os-color-ink); padding: 0.
- `src/app/globals.css:3529` — `.os-topbar-search-clear`: color: var(--os-color-ink-muted); font-size: 15px; line-height: 1.
- `src/app/globals.css:3573` — `.page-search-control input`: padding: 0; color: var(--os-color-ink); font: inherit; font-size: 14px.
- `src/app/globals.css:3667` — `.store-filter-label`: color: var(--os-color-ink-muted); font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase.
- `src/app/globals.css:3681` — `.page-filter-option`: padding: 7px 10px; color: var(--os-color-ink-secondary); font: inherit; font-size: 14px; text-align: left.
- `src/app/globals.css:3706` — `.os-topbar-avatar`: font-size: 15px; font-weight: 700; color: var(--os-color-ink); text-decoration: none; padding: 0.
- `src/app/globals.css:3738` — `.os-topbar-notification-count`: padding: 0 5px; color: #fff; font-size: 10px; font-weight: 800; line-height: 1.
- `src/app/globals.css:3816` — `.os-topbar-cart-count`: padding: 0 7px; color: var(--os-color-canvas); font-size: 12px; font-weight: 760; line-height: 1.
- `src/app/globals.css:3851` — `.os-popover-item`: gap: 14px; padding: 11px 12px; color: var(--os-color-ink); text-decoration: none; font-size: 14px; font-weight: 650; text-align: left.
- `src/app/globals.css:3892` — `.os-copy-toast`: text-align: center.
- `src/app/globals.css:3936` — `.os-notification-item`: padding: 12px 14px; text-decoration: none; color: inherit.
- `src/app/globals.css:3951` — `.os-notification-title`: font-size: 13.5px; font-weight: 620; color: var(--os-color-ink); margin-bottom: 3px.
- `src/app/globals.css:3958` — `.os-notification-body`: font-size: 12px; font-weight: 520; color: var(--os-color-ink-secondary); line-height: 1.4.
- `src/app/globals.css:3965` — `.os-notification-empty`: padding: 32px 20px; text-align: center; color: var(--os-color-ink-muted); font-size: 13px.
- `src/app/globals.css:3979` — `.os-popover-text-button`: padding: 0; color: var(--os-color-ink-secondary); font-family: var(--os-font-app); font-size: 12px; font-weight: 700.
- `src/app/globals.css:4015` — `.os-notification-remove`: margin-top: 8px; color: var(--os-color-ink-muted); font-size: 18px; line-height: 1.
- `src/app/globals.css:4035` — `.os-popover-heading`: font-size: 15px; font-weight: 700; letter-spacing: 0; color: var(--os-color-ink).
- `src/app/globals.css:4042` — `.os-popover-footer-link`: padding: 10px 14px; text-align: center; font-size: 13px; font-weight: 620; color: var(--os-color-ink-secondary); text-decoration: none; margin-top: 4px.
- `src/app/globals.css:4078` — `.route-error-screen`: padding: 32px 24px; text-align: center.
- `src/app/globals.css:4239` — `.cart-row-price`: font-weight: 720; color: var(--os-color-ink); text-align: right.
- `src/app/globals.css:4246` — `.cart-row-remove-button`: padding: 0; color: var(--os-color-ink-secondary); font: inherit; font-size: 20px; line-height: 1.
- `src/app/globals.css:4321` — `.cart-row-item .dashboard-row-title` (@media (max-width: 780px)): font-size: 15px.
- `src/app/globals.css:4324` — `.cart-row-item .dashboard-row-subtitle` (@media (max-width: 780px)): font-size: 12px.
- `src/app/globals.css:4327` — `.cart-row-price` (@media (max-width: 780px)): font-size: 14px; text-align: right.
- `src/app/globals.css:4342` — `.cart-summary-actions .os-button` (@media (max-width: 780px)): white-space: normal; text-align: center; line-height: 1.15.
- `src/app/globals.css:4363` — `.sample-download-action`: color: var(--os-color-ink); font: inherit; text-decoration: none.
- `src/app/globals.css:4411` — `.native-reader-close`: color: inherit; font: inherit; font-size: 26px; line-height: 1; text-decoration: none.
- `src/app/globals.css:4416` — `.native-reader-page-count`: color: color-mix(in srgb, var(--reader-ink) 72%, transparent); font-size: 14px; white-space: nowrap.
- `src/app/globals.css:4436` — `.native-reader-bookmark-menu > span`: padding: 8px 6px; color: color-mix(in srgb, var(--reader-ink) 64%, transparent); font-size: 13px.
- `src/app/globals.css:4438` — `.native-reader-bookmark-row button`: text-align: left; padding: 0 10px.
- `src/app/globals.css:4439` — `.native-reader-bookmark-row button:last-child`: padding: 0; text-align: center.
- `src/app/globals.css:4440` — `.native-reader-controls button`: color: inherit; font: inherit.
- `src/app/globals.css:4448` — `.native-reader-controls button`: font-size: 22px.
- `src/app/globals.css:4449` — `.native-reader-offline`: padding: 8px 20px; color: #fff; text-align: center.
- `src/app/globals.css:4452` — `.native-reader-state`: gap: 20px; padding: 32px; text-align: center.
- `src/app/globals.css:4567` — `.checkout-summary-title`: font-weight: 720; font-size: 15px; color: var(--os-color-ink); line-height: 1.2.
- `src/app/globals.css:4593` — `.project-status-pill`: padding: 8px 16px; color: var(--os-color-ink); font-weight: 700; font-size: 13px; letter-spacing: 0.
- `src/app/globals.css:4639` — `.studio-item-row > .dashboard-row-copy`: text-align: left.
- `src/app/globals.css:4676` — `.dashboard-row-title`: font-size: 18px; font-weight: 720; line-height: 1.15.
- `src/app/globals.css:4682` — `.dashboard-row-subtitle, .dashboard-row-meta`: font-size: 13px; color: var(--os-color-ink-muted).
- `src/app/globals.css:4688` — `.dashboard-row-meta`: font-size: 14px; color: var(--os-color-ink-secondary).
- `src/app/globals.css:4702` — `.dashboard-status-pill`: padding: 7px 12px; color: var(--os-color-ink-secondary); font-size: 12px; font-weight: 700; text-transform: capitalize.
- `src/app/globals.css:4742` — `.dashboard-overview-card .dashboard-overview-card-inner, .dashboard-metric-card .dashboard-overview-card-inner`: text-align: center.
- `src/app/globals.css:4749` — `.dashboard-overview-card .os-type-page-title, .dashboard-metric-card .os-type-page-title`: line-height: 1.
- `src/app/globals.css:4754` — `.dashboard-overview-card .os-type-meta, .dashboard-metric-card .os-type-meta`: color: var(--os-color-ink-secondary); text-transform: uppercase.
- `src/app/globals.css:4785` — `.studio-create-button > span`: color: currentColor; font-size: 27px; font-weight: 360; line-height: 1.
- `src/app/globals.css:4818` — `.dashboard-empty`: color: var(--os-color-ink-secondary); font-size: 15px; font-weight: 520; line-height: 1.5; padding: 24px 26px.
- `src/app/globals.css:4854` — `.dashboard-field-label`: font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 640; color: var(--os-color-ink-muted).
- `src/app/globals.css:4867` — `.dashboard-price-input > .dashboard-price-prefix`: color: var(--os-color-ink-muted); font-weight: 700.
- `src/app/globals.css:5016` — `.dashboard-form-note`: color: var(--os-color-ink-secondary); font-size: 14px.
- `src/app/globals.css:5021` — `.dashboard-status`: padding: 14px 16px; font-size: 14px; font-weight: 650.
- `src/app/globals.css:5058` — `.radio-hero-copy`: text-align: center.
- `src/app/globals.css:5071` — `.radio-hero-title`: margin-left: auto; margin-right: auto; font-size: clamp(28px, 2.35vw, 34px); line-height: 1.06.
- `src/app/globals.css:5113` — `.radio-now-title-link`: color: inherit; text-decoration: none.
- `src/app/globals.css:5118` — `.radio-playlist-index`: color: var(--os-color-ink-muted); font-weight: 700; text-align: center.
- `src/app/globals.css:5157` — `.os-modal-title`: font-size: 28px; font-weight: 760; letter-spacing: 0.
- `src/app/globals.css:5163` — `.os-modal-copy`: color: var(--os-color-ink-secondary); font-size: 16px; line-height: 1.5.
- `src/app/globals.css:5290` — `.view-album-eyebrow`: gap: 11px; font-size: 12px; font-weight: 720; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255, 255, 255, 0.72).
- `src/app/globals.css:5308` — `.view-album-title`: font-size: clamp(32px, 3vw, 42px); font-weight: 780; letter-spacing: 0; line-height: 1.04; color: #fff; margin: 6px 0 4px.
- `src/app/globals.css:5330` — `.library-detail-header .view-album-title`: white-space: nowrap; font-size: 40px; line-height: 1.08; margin: 0.
- `src/app/globals.css:5364` — `.library-creator-chip`: gap: var(--os-space-3); color: rgba(255, 255, 255, 0.9); text-decoration: none; font-size: 15px; font-weight: 680.
- `src/app/globals.css:5379` — `.library-creator-avatar`: color: #fff; font-size: 12px; font-weight: 760.
- `src/app/globals.css:5420` — `.admin-content-detail-page .admin-content-detail-hero .view-album-title` (@media (max-width: 780px)): font-size: 22px; line-height: 27px; font-weight: 700.
- `src/app/globals.css:5421` — `.admin-content-detail-page .admin-content-detail-hero .admin-content-detail-creator` (@media (max-width: 780px)): font-size: 17px; line-height: 22px.
- `src/app/globals.css:5432` — `.view-album-title` (@media (max-width: 780px)): font-size: 40px.
- `src/app/globals.css:5480` — `body:is(.theme-dark, .theme-light) .os-topbar .os-topbar-tab.os-topbar-tab-section`: padding: 0 14px; color: var(--os-color-ink-secondary); font-weight: 600.
- `src/app/globals.css:5578` — `.social-profile-page .social-profile-main`: gap: 14px; margin: -34px auto 0; padding: 0 24px; text-align: center.
- `src/app/globals.css:5611` — `.social-profile-page .social-profile-name`: font-size: clamp(24px, 6vw, 34px); line-height: 1.12; letter-spacing: -0.02em; text-align: center.
- `src/app/globals.css:5621` — `.social-profile-page .social-profile-text .social-handle`: font-size: 16px; line-height: 1.3; text-align: center.
- `src/app/globals.css:5629` — `.social-profile-page .social-profile-bio`: margin: 0; line-height: 1.45.
- `src/app/globals.css:5635` — `.social-profile-page .social-profile-bio-center`: text-align: center.
- `src/app/globals.css:5639` — `.social-profile-page .social-profile-bio-left`: text-align: left.
- `src/app/globals.css:5760` — `body:is(.theme-dark, .theme-light) .store-app-page .app-header .ui44-type-page-title` (@media (max-width: 768px)): font-size: clamp(24px, 8vw, 32px); line-height: 1.1; white-space: nowrap.
- `src/app/globals.css:5787` — `.os-topbar .os-topbar-tab.os-topbar-tab-section`: padding: 0 14px; color: var(--os-color-ink-secondary); font-weight: 600.
- `src/app/globals.css:5838` — `.discover-feature`: color: #fff; text-decoration: none.
- `src/app/globals.css:5877` — `.discover-feature-eyebrow`: font-size: 11px; font-weight: 800; letter-spacing: .12em.
- `src/app/globals.css:5883` — `.discover-feature-copy > strong`: font-size: clamp(32px, 5vw, 68px); font-weight: 760; letter-spacing: -.045em; line-height: .96.
- `src/app/globals.css:5890` — `.discover-feature-copy > span:not(.discover-feature-eyebrow, .discover-feature-link)`: color: rgba(255, 255, 255, .82); font-size: clamp(14px, 1.3vw, 18px); line-height: 1.45.
- `src/app/globals.css:5897` — `.discover-feature-link`: margin-top: 6px; font-size: 13px; font-weight: 750.
- `src/app/globals.css:5930` — `.discover-creator-card`: color: var(--os-color-ink); text-decoration: none.
- `src/app/globals.css:5954` — `.discover-creator-main strong`: font-size: 15px; white-space: nowrap.
- `src/app/globals.css:5982` — `.admin-home-history-title`: color: var(--os-color-ink); font-size: 12px; line-height: 15px; font-weight: 700.
- `src/app/globals.css:5983` — `.admin-home-history-creator`: color: var(--os-color-ink-secondary); font-size: 12px; line-height: 17px.
- `src/app/globals.css:5984` — `.admin-home-history-meta`: color: var(--os-color-ink-secondary); font-size: 11px; line-height: 14px.
- `src/app/globals.css:5985` — `.admin-home-history-meta strong`: color: var(--os-color-ink-secondary); font-size: inherit; font-weight: 650.
- `src/app/globals.css:6002` — `.admin-home-preview-empty`: color: #fff; font-size: 28px; font-weight: 800.
- `src/app/globals.css:6119` — `.social-reply-drawer-row .social-avatar`: font-size: 13px.
- `src/app/globals.css:6152` — `.social-row`: padding: 20px 0 22px; color: inherit; text-decoration: none.
- `src/app/globals.css:6188` — `.social-avatar`: color: var(--os-color-ink); font-weight: 760.
- `src/app/globals.css:6208` — `.social-avatar-large`: font-size: 34px.
- `src/app/globals.css:6227` — `.social-author-name`: color: var(--os-color-ink); font-weight: 720.
- `src/app/globals.css:6232` — `.social-handle, .social-time`: color: var(--os-color-ink-muted); font-weight: 560.
- `src/app/globals.css:6243` — `.social-row-title`: margin: 0; color: var(--os-color-ink); font-size: 17px; font-weight: 720; line-height: 1.25; letter-spacing: 0.
- `src/app/globals.css:6252` — `.social-row-title-lg`: font-size: 26px; line-height: 1.15; font-weight: 760.
- `src/app/globals.css:6258` — `.social-row-body`: margin: 0; color: var(--os-color-ink-secondary); white-space: pre-wrap; line-height: 1.5; font-size: 15px.
- `src/app/globals.css:6266` — `.social-rich-link`: color: var(--os-color-ink); font-weight: 760; text-decoration: none.
- `src/app/globals.css:6285` — `.social-action`: color: inherit; font: inherit; font-weight: 620; font-size: 13px; gap: 6px.
- `src/app/globals.css:6320` — `.social-mention-option`: gap: 10px; padding: 10px 14px; text-align: left.
- `src/app/globals.css:6344` — `.social-mention-option .social-avatar`: font-size: 12px.
- `src/app/globals.css:6355` — `.social-mention-name`: color: var(--os-color-ink); font-size: 14px; font-weight: 680.
- `src/app/globals.css:6361` — `.social-mention-handle`: color: var(--os-color-ink-muted); font-size: 12px; font-weight: 620.
- `src/app/globals.css:6439` — `.profile-edit-label`: font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--os-color-ink-muted); font-weight: 620.
- `src/app/globals.css:6447` — `.profile-edit-input`: color: var(--os-color-ink); padding: 12px 14px; font: inherit; font-size: 16px.
- `src/app/globals.css:6481` — `.profile-edit-username-prefix`: padding-left: 14px; color: var(--os-color-ink-secondary); font: inherit; font-size: 16px.
- `src/app/globals.css:6489` — `.profile-edit-username-input`: padding: 12px 14px 12px 2px; color: inherit; font: inherit; font-size: 16px.
- `src/app/globals.css:6501` — `.profile-edit-textarea`: line-height: 1.5.
- `src/app/globals.css:6563` — `.item-community-composer-body`: color: var(--os-color-ink); font: inherit; font-size: 15px; line-height: 1.5; padding: 4px 2px.
- `src/app/globals.css:6618` — `.product-review-author`: gap: 9px; color: var(--os-color-ink-muted); font-size: 13px; font-weight: 640; text-decoration: none.
- `src/app/globals.css:6636` — `.product-review-avatar`: color: var(--os-color-ink-secondary); font-size: 10px; font-weight: 760.
- `src/app/globals.css:6657` — `.product-domain-meta`: gap: 10px; margin-top: 5px; color: var(--os-color-ink-muted); font-size: 13px; font-weight: 620; text-decoration: none.
- `src/app/globals.css:6668` — `.product-domain-meta a`: color: inherit; text-decoration: none.
- `src/app/globals.css:6778` — `.social-profile-text .app-detail-eyebrow, .social-profile-text .os-type-eyebrow`: font-size: 11px; letter-spacing: 0.14em; color: var(--os-color-ink-muted); margin: 0 0 2px.
- `src/app/globals.css:6786` — `.social-profile-name`: margin: 0; color: var(--os-color-ink); font-size: 56px; line-height: 0.9; letter-spacing: 0; font-weight: 780.
- `src/app/globals.css:6795` — `.social-profile-text .social-handle`: font-size: 15px; color: var(--os-color-ink-muted).
- `src/app/globals.css:6808` — `.social-profile-bio`: margin: 0; color: var(--os-color-ink-secondary); font-size: 15px; line-height: 1.55.
- `src/app/globals.css:6826` — `.social-profile-tabs button`: padding: 14px 16px; margin-bottom: -1px; font: inherit; font-size: 14px; font-weight: 620; color: var(--os-color-ink-muted); white-space: nowrap.
- `src/app/globals.css:6860` — `.social-artifact-card`: gap: 12px; color: inherit; text-decoration: none.
- `src/app/globals.css:6907` — `.social-inbox-conversation-row`: gap: 14px; padding: 12px 16px; text-align: left.
- `src/app/globals.css:6937` — `.social-inbox-row-copy strong`: color: var(--os-color-ink); font-size: 16px; font-weight: 650; line-height: 1.25; white-space: nowrap.
- `src/app/globals.css:6947` — `.social-inbox-unread .social-inbox-row-copy strong`: font-weight: 750.
- `src/app/globals.css:6951` — `.social-inbox-row-copy > span`: color: var(--os-color-ink-secondary); font-size: 14px; line-height: 1.35; white-space: nowrap.
- `src/app/globals.css:6961` — `.social-inbox-chevron`: color: var(--os-color-ink-secondary); font-size: 24px; line-height: 1.
- `src/app/globals.css:6994` — `.social-message`: padding: 10px 14px; color: var(--os-color-ink); line-height: 1.38; overflow-wrap: anywhere.
- `src/app/globals.css:7031` — `.social-compose-mobile-header h2`: margin: 0; font-size: 18px; line-height: 1.2.
- `src/app/globals.css:7037` — `.social-inbox-row-aside`: gap: 8px; color: var(--os-color-ink-secondary); font-size: 13px; font-weight: 650; white-space: nowrap.
- `src/app/globals.css:7047` — `.social-inbox-chevron`: font-size: 24px; line-height: 1.
- `src/app/globals.css:7070` — `.social-compose-result`: gap: 14px; padding: 10px 14px; color: inherit; text-align: left; font: inherit.
- `src/app/globals.css:7102` — `.social-compose-result-copy strong`: color: var(--os-color-ink); font-size: 15px; font-weight: 650; white-space: nowrap.
- `src/app/globals.css:7111` — `.social-compose-result-copy > span`: color: var(--os-color-ink-secondary); font-size: 13px; white-space: nowrap.
- `src/app/globals.css:7119` — `.social-compose-empty`: gap: 8px; padding: 20px; color: var(--os-color-ink-secondary); text-align: center.
- `src/app/globals.css:7134` — `.social-compose-empty strong`: color: var(--os-color-ink); font-size: 15px.
- `src/app/globals.css:7139` — `.social-compose-empty > span`: font-size: 13px.
- `src/app/globals.css:7188` — `.social-inbox-list .social-author-name` (@media (max-width: 860px)): font-size: 16px.
- `src/app/globals.css:7194` — `.social-inbox-list .social-note` (@media (max-width: 860px)): color: var(--os-color-ink-secondary); font-size: 14px; white-space: nowrap.
- `src/app/globals.css:7208` — `.social-row.social-message-thread-header` (@media (max-width: 860px)): gap: 6px; padding: 4px 0 12px; text-align: center.
- `src/app/globals.css:7348` — `.search-page-form input`: font-weight: 560.
- `src/app/globals.css:7357` — `.search-profile-row`: gap: var(--os-space-4); padding: var(--os-space-5); color: inherit; text-decoration: none.
- `src/app/globals.css:7385` — `.notification-art`: color: var(--os-color-ink); font-size: 18px; font-weight: 760.
- `src/app/globals.css:7442` — `.settings-swatch`: gap: var(--os-space-2); padding: 8px 16px 8px 10px; color: var(--os-color-ink-secondary); font-family: var(--os-font-app); font-size: 13px; font-weight: 560.
- `src/app/globals.css:7553` — `.welcome-eyebrow`: margin: 0; color: var(--os-color-accent); font: 700 12px/16px var(--os-font-app); letter-spacing: 0.12em.
- `src/app/globals.css:7560` — `.welcome-hero h1`: margin: 0; font: 720 clamp(38px, 5vw, 66px)/0.98 var(--os-font-app); letter-spacing: -0.045em.
- `src/app/globals.css:7567` — `.welcome-intro`: margin: 0; color: var(--os-color-ink-secondary); font: 500 clamp(17px, 1.8vw, 21px)/1.45 var(--os-font-app).
- `src/app/globals.css:7574` — `.welcome-status`: margin: 0; padding: 9px 12px; color: var(--os-color-ink-secondary); font: 600 13px/18px var(--os-font-app).
- `src/app/globals.css:7604` — `.welcome-guide-item h2, .welcome-desktop-note h2`: margin: 0; color: var(--os-color-ink); font: 700 22px/1.15 var(--os-font-app); letter-spacing: -0.025em.
- `src/app/globals.css:7612` — `.welcome-guide-item > p:last-child, .welcome-desktop-note > div > p:last-child`: margin: 0; color: var(--os-color-ink-secondary); font: 500 15px/1.55 var(--os-font-app).
- `src/app/globals.css:7636` — `.welcome-text-link`: color: var(--os-color-ink); font: 700 14px/20px var(--os-font-app); text-decoration: none.
- `src/app/globals.css:7652` — `.welcome-hero h1` (@media (max-width: 768px)): font-size: clamp(36px, 12vw, 50px).
- `src/app/globals.css:7703` — `.onboarding-tip-dismiss`: padding: 0; color: var(--os-color-ink); font: inherit; font-weight: 650.
- `src/app/globals.css:7772` — `.support-quick-card`: gap: var(--os-space-2); padding: var(--os-space-5); padding-right: calc(var(--os-space-5) + 24px); color: var(--os-color-ink); text-decoration: none.
- `src/app/globals.css:7785` — `.support-quick-title`: font-size: 18px; font-weight: 750; line-height: 1.25.
- `src/app/globals.css:7791` — `.support-card-arrow`: font-size: 28px; font-weight: 350; line-height: 1.
- `src/app/globals.css:7833` — `.support-category-copy h3`: font-size: 20px.
- `src/app/globals.css:7837` — `.support-category-copy p`: color: var(--os-color-ink-secondary); line-height: 1.5.
- `src/app/globals.css:7850` — `.support-category-links a, .support-related nav a`: gap: var(--os-space-3); padding: 13px 0; color: var(--os-color-ink); font-size: 14px; font-weight: 650; line-height: 1.35; text-decoration: none.
- `src/app/globals.css:7876` — `.support-article-row`: gap: var(--os-space-4); padding: var(--os-space-4) var(--os-space-5); color: var(--os-color-ink); text-decoration: none.
- `src/app/globals.css:7892` — `.support-article-row-title`: font-size: 17px; font-weight: 750.
- `src/app/globals.css:7949` — `.support-article-intro`: margin: 0; padding-bottom: var(--os-space-5); color: var(--os-color-ink-secondary); font-size: 18px; line-height: 1.55.
- `src/app/globals.css:7972` — `.support-article-section h2`: font-size: 21px; line-height: 1.25.
- `src/app/globals.css:7977` — `.support-article-section p, .support-article-section li`: color: var(--os-color-ink-secondary); font-size: 16px; line-height: 1.65.
- `src/app/globals.css:7999` — `.support-related h2`: margin: 0; font-size: 18px.
- `src/app/globals.css:8067` — `.social-compose-to-label`: color: var(--os-color-ink-muted); font-weight: 700.
- `src/app/globals.css:8072` — `.social-compose-to-input`: color: var(--os-color-ink); font: inherit.
- `src/app/globals.css:8081` — `.social-compose-recipient`: padding: 7px 12px; color: var(--os-color-ink); font: inherit; font-weight: 700.
- `src/app/globals.css:8099` — `.support-breadcrumbs`: gap: var(--os-space-2); margin: calc(var(--os-space-5) * -1) 0 var(--os-space-5); color: var(--os-color-ink-secondary); font-size: 13px; font-weight: 700.
- `src/app/globals.css:8138` — `.upload-preview-remove`: color: var(--os-color-canvas); font-size: 17px; line-height: 1.
- `src/app/globals.css:8163` — `.upload-state`: color: var(--os-color-ink-muted); font-size: 13px; font-weight: 700.
- `src/app/globals.css:8184` — `.studio-publication-status`: padding: 0; font-size: 13px; font-weight: 650; line-height: 1.2; text-transform: none.
- `src/app/globals.css:8280` — `.library-video-card`: gap: 10px; color: inherit; text-decoration: none.
- `src/app/globals.css:8305` — `.library-video-card-title`: font-weight: 600; white-space: nowrap.
- `src/app/globals.css:8318` — `.studio-visual-video-title`: font-size: 17px; font-weight: 600; white-space: nowrap.
- `src/app/globals.css:8319` — `.studio-visual-video-service`: color: var(--os-color-secondary); font-size: 15px; line-height: 1.25.
- `src/app/globals.css:8330` — `.studio-video-drawer-header h2`: margin: 0; font-size: 19px; text-align: center; white-space: nowrap.
- `src/app/globals.css:8339` — `.studio-video-picker-row`: gap: 14px; padding: 10px 12px; color: inherit; text-align: left.
- `src/app/globals.css:8342` — `.studio-video-picker-row > span:last-child`: color: var(--os-color-accent); font-weight: 600; white-space: nowrap.
- `src/app/globals.css:8343` — `.studio-video-picker-empty`: padding: 18px 8px; text-align: center.
- `src/app/globals.css:8396` — `.studio-video-release-title`: font-size: 15px; font-weight: 550; white-space: nowrap.
- `src/app/globals.css:8664` — `.login-email-summary`: gap: 16px; padding-bottom: 2px; color: var(--os-color-ink-secondary); font-size: 14px.
- `src/app/globals.css:8685` — `.login-email-summary button`: padding: 4px 0; color: var(--os-color-accent); font: inherit; font-weight: 650.
- `src/app/globals.css:8709` — `.account-confirmation-shell`: text-align: center.
- `src/app/globals.css:8713` — `.account-confirmation-eyebrow`: margin: 0 0 10px; color: var(--os-color-accent); font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase.
- `src/app/globals.css:8754` — `.login-copy .os-type-page-title` (@media (max-width: 768px)): font-size: clamp(30px, 8.75vw, 34px); line-height: 1.05; letter-spacing: -0.035em; white-space: nowrap.
- `src/app/globals.css:8865` — `.os-mobile-toolbar-menu button` (@media (max-width: 768px)): padding: 0 14px; color: var(--os-color-ink); font: 600 15px/20px var(--os-font-app); text-align: left; white-space: nowrap.
- `src/app/globals.css:8886` — `.os-mobile-toolbar-title` (@media (max-width: 768px)): margin: 0; color: var(--os-color-ink); font: 700 16px/20px var(--os-font-app); letter-spacing: -0.01em; text-align: center; white-space: nowrap.
- `src/app/globals.css:8923` — `.os-topbar-tab` (@media (max-width: 768px)): padding: 0 13px; font-size: 13px.
- `src/app/globals.css:8930` — `.os-topbar-back` (@media (max-width: 768px)): padding: 0; font-size: 13px; white-space: nowrap.
- `src/app/globals.css:9001` — `.app-header .ui44-type-page-title` (@media (max-width: 768px)): font-size: 22px; line-height: 28px; letter-spacing: 0.
- `src/app/globals.css:9036` — `.search-page > .app-empty-text` (@media (max-width: 768px)): padding: 6px 0 0; white-space: nowrap; font-size: 14px.
- `src/app/globals.css:9065` — `.product-tile-title` (@media (max-width: 768px)): font-size: 13px; line-height: 1.3; font-weight: 520.
- `src/app/globals.css:9071` — `.social-artifact-info .os-type-card-title` (@media (max-width: 768px)): font-size: 13px; line-height: 1.3; font-weight: 520.
- `src/app/globals.css:9077` — `.view-album-header` (@media (max-width: 768px)): gap: 16px; padding: 22px var(--os-detail-inset) 12px; text-align: center.
- `src/app/globals.css:9158` — `.view-album-title, .library-detail-header .view-album-title` (@media (max-width: 768px)): white-space: normal; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif; font-size: 34px; line-height: 41px; font-weight: 800; margin: 2px 0 0; text-align: center.
- `src/app/globals.css:9172` — `.library-creator-chip` (@media (max-width: 768px)): gap: 8px; font-size: 22px; line-height: 28px; font-weight: 500; color: rgba(255, 255, 255, 0.7).
- `src/app/globals.css:9184` — `.view-album-eyebrow` (@media (max-width: 768px)): gap: 8px; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif; font-size: 17px; line-height: 22px; font-weight: 500; letter-spacing: 0; margin-top: 0; text-transform: none.
- `src/app/globals.css:9213` — `.view-album-actions .os-button` (@media (max-width: 768px)): padding-left: 14px; padding-right: 14px; font-size: 17px; font-weight: 720; white-space: nowrap.
- `src/app/globals.css:9261` — `.view-track-number` (@media (max-width: 768px)): font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif; font-size: 20px; line-height: 25px; font-weight: 400; color: rgba(60, 60, 67, 0.64).
- `src/app/globals.css:9284` — `.view-track-title` (@media (max-width: 768px)): font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif; font-size: 22px; line-height: 28px; font-weight: 400.
- `src/app/globals.css:9291` — `.view-track-duration` (@media (max-width: 768px)): font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif; font-size: 15px; line-height: 20px; font-weight: 400; color: rgba(60, 60, 67, 0.64).
- `src/app/globals.css:9312` — `.radio-hero-title` (@media (max-width: 768px)): font-size: clamp(24px, 7vw, 31px).
- `src/app/globals.css:9346` — `.view-album-header .view-album-title` (@media (max-width: 768px)): font-size: 22px; line-height: 27px; font-weight: 700; margin-top: 0.
- `src/app/globals.css:9353` — `.view-album-header .library-creator-chip` (@media (max-width: 768px)): font-size: 17px; line-height: 22px; font-weight: 500.
- `src/app/globals.css:9359` — `.view-album-header .view-album-eyebrow` (@media (max-width: 768px)): font-size: 15px; line-height: 20px.
- `src/app/globals.css:9402` — `.view-tracklist-section .view-track-number` (@media (max-width: 768px)): font-size: 15px; line-height: 20px.
- `src/app/globals.css:9407` — `.view-tracklist-section .view-track-title` (@media (max-width: 768px)): font-size: 17px; line-height: 22px.
- `src/app/globals.css:9412` — `.view-tracklist-section .view-track-duration` (@media (max-width: 768px)): font-size: 15px; line-height: 20px.
- `src/app/globals.css:9419` — `.view-detail-single > .view-section:not(.view-tracklist-section) .view-section-title, .view-detail-single > .view-section:not(.view-tracklist-section) .item-community-header .view-section-title` (@media (max-width: 768px)): font-size: 22px; line-height: 28px; font-weight: 700; margin-bottom: 18px.
- `src/app/globals.css:9477` — `.notification-page-row .dashboard-row-title` (@media (max-width: 768px)): font: 600 13px/16px var(--os-font-app); letter-spacing: 0.
- `src/app/globals.css:9564` — `.music-player-title` (@media (max-width: 768px)): font-size: 15px.
- `src/app/globals.css:9568` — `.music-player-subtitle` (@media (max-width: 768px)): font-size: 13px.
- `src/app/globals.css:9636` — `.music-player-sheet-copy h2` (@media (max-width: 768px)): font-size: clamp(24px, 7vw, 34px).
- `src/app/globals.css:9640` — `.music-player-sheet-copy p` (@media (max-width: 768px)): font-size: 17px.
- `src/app/globals.css:9721` — `.mobile-dock-item` (@media (max-width: 768px)): gap: 3px; color: var(--os-color-ink-secondary); text-decoration: none.
- `src/app/globals.css:9747` — `.mobile-dock-label` (@media (max-width: 768px)): font-size: 10px; font-weight: 600; line-height: 12px; white-space: nowrap.
- `src/app/globals.css:9757` — `.mobile-dock-item-active .mobile-dock-label` (@media (max-width: 768px)): font-weight: 760.
- `src/app/globals.css:9767` — `.os-mobile-logo` (@media (max-width: 768px)): color: var(--os-color-ink); text-decoration: none.
- `src/app/globals.css:9815` — `.os-topbar-search-mobile-input` (@media (max-width: 768px)): padding: 0; color: var(--os-color-ink); font: 500 15px/20px var(--os-font-app).
- `src/app/globals.css:10066` — `.view-detail-single .hub-section-title, .view-detail-single .view-section-title` (@media (max-width: 768px)): font-size: 22px; line-height: 28px; font-weight: 700; letter-spacing: 0.
- `src/app/globals.css:10201` — `.music-player-queue-empty` (@media (max-width: 768px)): padding: 40px 16px; color: var(--os-color-ink-secondary); font-size: 15px; text-align: center.
- `src/app/globals.css:10258` — `.os-topbar-cart-count` (@media (max-width: 768px)): padding: 0 7px; font-size: 13px.
- `src/app/globals.css:10347` — `.dashboard-page > .settings-segment[role="tablist"] .settings-segment-item` (@media (max-width: 768px)): padding: 7px 9px; font-size: 12px; text-align: center.
- `src/app/globals.css:10558` — `body.theme-dark .community-app-page .social-author-name, body.theme-dark .social-thread-page .social-author-name` (@media (max-width: 768px)): font-weight: 760.
- `src/app/globals.css:10616` — `.music-player-radio-stop, .music-player-sheet-radio-stop`: color: var(--os-color-ink); font: inherit; font-weight: 700.
- `src/app/globals.css:10787` — `.search-page .hub-section-title` (@media (max-width: 768px)): font-size: 22px; line-height: 28px; font-weight: 700; letter-spacing: 0.
- `src/app/globals.css:10898` — `.profile-crop-header h2`: margin: 0; font-size: 16px; text-align: center.
- `src/app/globals.css:10904` — `.profile-crop-text-button`: padding: 7px 0; color: var(--os-color-ink-secondary); font: inherit; font-size: 14px; font-weight: 680.
- `src/app/globals.css:10958` — `.profile-crop-instruction`: margin: 0; color: var(--os-color-ink-muted); font-size: 13px; text-align: center.
- `src/app/globals.css:10965` — `.profile-crop-controls label`: gap: 14px; color: var(--os-color-ink-secondary); font-size: 13px; font-weight: 620.
- `src/app/globals.css:11038` — `.social-profile-name` (@media (max-width: 768px)): font-size: clamp(30px, 8.7vw, 34px); line-height: 1.1; letter-spacing: -0.025em; overflow-wrap: anywhere.
- `src/app/globals.css:11054` — `.social-profile-tabs button` (@media (max-width: 768px)): padding: 8px 14px; margin: 0; font-size: 14px.
- `src/app/globals.css:11694` — `body:is(.theme-dark, .theme-light) .page-compose-button > span` (@media (min-width: 769px)): font-size: 27px; font-weight: 360; line-height: 1.
- `src/app/globals.css:11923` — `body:is(.theme-dark, .theme-light) .studio-item-row` (@media (min-width: 769px)): color: inherit; text-decoration: none.
- `src/app/globals.css:12047` — `.external-link-service-name`: font-size: 12px; font-weight: 620.
- `src/app/globals.css:12102` — `.external-link-action`: gap: 7px; text-decoration: none.
- `src/app/globals.css:12109` — `.external-link-action-icon`: font-size: 0.9em.
- `src/app/globals.css:12120` — `.tag-select-control input`: color: var(--os-input-text); font: inherit.
- `src/app/globals.css:12122` — `.tag-select-pill`: gap: 6px; padding: 0 8px 0 11px; color: var(--os-pill-text); font-size: 13px; font-weight: 680.
- `src/app/globals.css:12123` — `.tag-select-pill button`: color: inherit; font-size: 17px; line-height: 1.
- `src/app/globals.css:12127` — `.tag-select-menu button`: padding: 0 12px; color: var(--os-color-ink); text-align: left; font: inherit.
- `src/app/globals.css:12130` — `.tag-select-empty`: padding: 10px 12px; color: var(--os-color-ink-muted); font-size: 13px.
- `src/app/globals.css:12132` — `body:is(.theme-dark, .theme-light) .store-clear-filters`: text-align: center.
- `src/app/globals.css:12289` — `.radio-page .radio-hero-title` (@media (min-width: 769px)): font-size: clamp(22px, 1.75vw, 26px).
- `src/app/globals.css:12321` — `.section-tab` (@media (min-width: 769px)): padding: 0 18px; color: var(--os-color-ink-secondary); font: 600 14px/18px var(--os-font-app); text-decoration: none.
- `src/app/globals.css:12564` — `.section-tab` (@media (max-width: 768px)): padding: 0 14px; color: var(--os-color-ink-secondary); font: 600 13px/16px var(--os-font-app); text-decoration: none.
- `src/app/globals.css:12642` — `body:is(.theme-dark, .theme-light) .store-app-page .app-header .ui44-type-page-title` (@media (max-width: 768px)): font: 700 22px/28px var(--os-font-app); letter-spacing: 0.
- `src/app/globals.css:12647` — `body:is(.theme-dark, .theme-light) .store-app-page > .app-section .hub-section-title` (@media (max-width: 768px)): font-size: 22px; line-height: 28px; letter-spacing: 0.
- `src/app/globals.css:12699` — `.radio-page .radio-hero-title` (@media (max-width: 768px)): font-size: clamp(22px, 6vw, 28px).
- `src/app/globals.css:12703` — `.store-shelf-action.os-button` (@media (max-width: 768px)): padding: 0; color: var(--os-color-ink); font-size: 0.
- `src/app/globals.css:12793` — `.dashboard-page :is(.dashboard-overview-card, .dashboard-metric-card) .os-type-meta` (@media (max-width: 768px)): font-size: 9px; line-height: 1.1; letter-spacing: 0.04em; white-space: nowrap.
- `src/app/globals.css:12800` — `.dashboard-page :is(.dashboard-overview-card, .dashboard-metric-card) .os-type-page-title` (@media (max-width: 768px)): font-size: clamp(24px, 8vw, 32px).
- `src/app/globals.css:12804` — `.studio-item-row .studio-publication-status` (@media (max-width: 768px)): padding: 0; font-size: 13px; line-height: 1.1; margin-top: 2px.
- `src/app/globals.css:12844` — `:is(.hub-section-title, .view-section-title)` (@media (max-width: 768px)): font-size: 24px; line-height: 29px; letter-spacing: -0.02em.
- `src/app/globals.css:12850` — `.store-app-page .hub-section-title, .admin-section-panel .hub-section-title, .view-detail-single .hub-section-title, .view-detail-single .view-section-title` (@media (max-width: 768px)): font-size: 24px; line-height: 29px.
- `src/app/globals.css:12879` — `.store-item-detail-page .view-track-row .view-track-more` (@media (max-width: 768px)): padding: 0; color: var(--os-color-ink); font: 700 16px/1 var(--os-font-app); letter-spacing: 2px.
- `src/app/globals.css:12914` — `.store-item-detail-page .item-community-new-post` (@media (max-width: 768px)): color: var(--os-color-accent); font: 600 17px/22px var(--os-font-app); text-decoration: none; white-space: nowrap.
- `src/app/globals.css:13018` — `.dashboard-form-section > .hub-section-head .hub-section-title` (@media (max-width: 768px)): font-size: 32px; line-height: 1.12.
- `src/app/globals.css:13267` — `.event-studio-row .dashboard-row-copy`: text-decoration: none.
- `src/app/globals.css:13272` — `.calendar-toolbar h2`: margin: 0; text-align: center.
- `src/app/globals.css:13277` — `.calendar-weekdays span`: padding: 10px; color: var(--os-color-ink-secondary); font-size: 12px; text-align: center.
- `src/app/globals.css:13281` — `.calendar-day-number`: margin-bottom: 6px; font-size: 12px.
- `src/app/globals.css:13283` — `.calendar-entry > a`: gap: 3px; color: inherit; text-decoration: none.
- `src/app/globals.css:13284` — `.calendar-month .calendar-entry`: padding: 5px 6px; margin-bottom: 5px; font-size: 12px.
- `src/app/globals.css:13286` — `.calendar-entry-source`: color: var(--os-color-ink-secondary); font-size: 11px.
- `src/app/globals.css:13288` — `.calendar-entry-cancelled strong`: text-decoration: line-through.
- `src/app/globals.css:13290` — `.calendar-state`: padding: 40px; text-align: center; color: var(--os-color-ink-secondary).
- `src/app/globals.css:13292` — `.calendar-entry-actions a`: color: var(--os-color-accent); text-decoration: underline.
- `src/app/globals.css:13314` — `.calendar-mobile-month-heading h2` (@media (max-width: 700px)): margin: 0; text-align: center; font-size: 22px; line-height: 1.25; font-weight: 700.
- `src/app/globals.css:13321` — `.calendar-mobile-month-heading button` (@media (max-width: 700px)): padding: 0; color: var(--os-color-ink); font-size: 34px; line-height: 1.
- `src/app/globals.css:13339` — `.calendar-mobile-weekdays span` (@media (max-width: 700px)): color: var(--os-color-ink-secondary); font-size: 12px; font-weight: 600.
- `src/app/globals.css:13358` — `.calendar-mobile-day` (@media (max-width: 700px)): padding: 0; color: var(--os-color-ink); font-size: 16px.
- `src/app/globals.css:13382` — `.calendar-mobile-selected-day h2, .calendar-mobile-date-group h2` (@media (max-width: 700px)): margin: 0; color: var(--os-color-ink-secondary); font-size: 16px; line-height: 1.35; font-weight: 650.
- `src/app/globals.css:13393` — `.calendar-mobile-row` (@media (max-width: 700px)): gap: 16px; padding: 16px; color: var(--os-color-ink); text-decoration: none.
- `src/app/globals.css:13415` — `.calendar-mobile-row-copy strong` (@media (max-width: 700px)): color: var(--os-color-ink); font-size: 16px; line-height: 1.35; font-weight: 650.
- `src/app/globals.css:13425` — `.calendar-mobile-row-copy > span` (@media (max-width: 700px)): color: var(--os-color-ink-secondary); font-size: 14px; line-height: 1.35; white-space: nowrap.
- `src/app/globals.css:13435` — `.calendar-mobile-view .calendar-state` (@media (max-width: 700px)): padding: 32px 12px; text-align: center; color: var(--os-color-ink-secondary).
- `src/app/globals.css:13458` — `body:is(.theme-light, .theme-dark) .studio-create-popover .page-filter-option` (@media (max-width: 768px)): padding: 7px 10px; font-size: 14px.
- `src/app/globals.css:13582` — `.view-merch-purchase-header .view-album-title`: font-size: clamp(34px, 4vw, 58px); line-height: 1.02.
- `src/app/globals.css:13630` — `.merch-options-unavailable`: color: var(--os-color-ink-secondary); font-size: 14px; line-height: 1.65.
- `src/app/globals.css:13734` — `.merch-option-group legend`: margin-bottom: 10px; color: var(--ui44-text-secondary, #a9a9a9); font-size: 0.82rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em.
- `src/app/globals.css:13743` — `.merch-option-group legend strong`: margin-left: 8px; color: var(--ui44-text-primary, #fff); text-transform: none; letter-spacing: normal.
- `src/app/globals.css:13756` — `.merch-option-button`: padding: 9px 13px; color: var(--ui44-text-primary, #fff); font: inherit.
- `src/app/globals.css:13819` — `.merch-variant-selection span`: font-weight: 650.
- `src/app/globals.css:13830` — `.view-merch-purchase-header` (@media (max-width: 900px)): gap: 28px; padding: 24px var(--os-detail-inset) 42px; text-align: left.
- `src/app/globals.css:13871` — `body:is(.theme-dark, .theme-light) .dashboard-page .studio-item-row > .studio-item-copy`: text-align: left.
- `src/app/globals.css:13885` — `body:is(.theme-dark, .theme-light) .dashboard-page .studio-item-row > .studio-item-copy > *`: text-align: left.
- `src/app/globals.css:13939` — `.social-inbox-conversation-route .social-message`: padding: 9px 13px; font-size: 15px; line-height: 20px.
- `src/app/globals.css:14013` — `body:is(.theme-dark, .theme-light) .os-topbar .os-topbar-tab.os-topbar-tab-section`: padding: 0 14px; color: var(--os-color-ink-secondary); font-weight: 600.
- `src/styles/44-ui/canonical-system.css:159` — `.playlist-index-heading h1, .playlist-add-heading h1`: margin: 0; font-size: clamp(1.5rem, 5vw, 2rem).
- `src/styles/44-ui/canonical-system.css:197` — `.playlist-tile`: gap: 6px; padding: 14px; color: inherit; text-decoration: none.
- `src/styles/44-ui/canonical-system.css:319` — `.playlist-create-title`: padding: 10px 0; color: var(--os-text-primary); font-size: 1.5rem.
- `src/styles/44-ui/canonical-system.css:330` — `.playlist-detail-hero`: gap: 8px; padding: 8px 0 24px; text-align: center.
- `src/styles/44-ui/canonical-system.css:351` — `.playlist-detail-hero h1`: font-size: clamp(1.5rem, 5vw, 2rem).
- `src/styles/44-ui/canonical-system.css:353` — `.playlist-edit-helper`: margin-top: 18px !important; text-align: left.
- `src/styles/44-ui/canonical-system.css:387` — `.playlist-track-more`: letter-spacing: 2px.
- `src/styles/44-ui/canonical-system.css:412` — `.playlist-detail-page .playlist-track-row .view-track-number`: color: var(--os-text-secondary); text-align: left.
- `src/styles/44-ui/canonical-system.css:427` — `.playlist-detail-page .playlist-track-more`: color: var(--os-text-primary); text-align: right.
- `src/styles/44-ui/canonical-system.css:440` — `.playlist-remove-button`: color: white; font-size: 1.25rem.
- `src/styles/44-ui/canonical-system.css:450` — `.playlist-catalog-track > button`: color: var(--os-accent, #4da3ff); font-size: 2rem.
- `src/styles/44-ui/canonical-system.css:464` — `.playlist-add-track-link`: color: var(--os-accent, #4da3ff); font-weight: 700; text-decoration: none.
- `src/styles/44-ui/canonical-system.css:482` — `.playlist-picker-heading h2`: margin: 0; font-size: 1.25rem.
- `src/styles/44-ui/canonical-system.css:483` — `.playlist-picker-heading button`: color: inherit; font-size: 1.6rem.
- `src/styles/44-ui/canonical-system.css:485` — `.playlist-picker-list button`: padding: 12px 14px; color: inherit; text-align: left.
- `src/styles/44-ui/canonical-system.css:528` — `.ui44-input`: padding: 0 16px; color: var(--44ui-input-text); font-family: var(--os-font-app); font-size: 16px; line-height: 1.2.
- `src/styles/44-ui/canonical-system.css:641` — `.ui44-button`: padding: 0 22px; color: var(--44ui-button-text); font: 700 15px/1 var(--os-font-app).
- `src/styles/44-ui/canonical-system.css:746` — `.ui44-button-audit-item > span, .ui44-symbol-audit-item > span`: color: var(--os-color-ink-secondary); font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase.
- `src/styles/44-ui/canonical-system.css:809` — `.ui44-symbol-plus`: font-size: 27px; font-weight: 360; line-height: 1.
- `src/styles/44-ui/canonical-system.css:837` — `.ui44-symbol-menu-item`: gap: 12px; padding: 0 14px; color: var(--44ui-input-text); font: 500 14px/1.2 var(--os-font-app); text-align: left; white-space: nowrap.
- `src/styles/44-ui/canonical-system.css:871` — `.ui44-symbol-menu-check`: color: var(--os-color-accent); font-weight: 800.
- `src/styles/44-ui/canonical-system.css:996` — `.ui44-panel-content-form-field > span`: color: var(--44ui-text-secondary); font: 600 var(--44ui-type-field-label-size)/var(--44ui-type-field-label-line) var(--44ui-font-app); letter-spacing: normal; text-transform: none.
- `src/styles/44-ui/canonical-system.css:1003` — `.ui44-list-row`: padding: var(--44ui-row-y) var(--44ui-row-x); color: var(--os-color-ink); font: inherit; text-align: left.
- `src/styles/44-ui/canonical-system.css:1112` — `.ui44-row-artwork`: color: rgba(255, 255, 255, 0.78); font-size: 13px; font-weight: 800.
- `src/styles/44-ui/canonical-system.css:1132` — `.ui44-row-achievement-icon`: font-size: 19px.
- `src/styles/44-ui/canonical-system.css:1148` — `.ui44-row-check`: color: var(--44ui-button-text); font-size: 15px; font-weight: 850.
- `src/styles/44-ui/canonical-system.css:1206` — `.ui44-row-action`: gap: 6px; padding: 0 10px; color: var(--os-color-ink-secondary); font: 650 12px/1 var(--os-font-app).
- `src/styles/44-ui/canonical-system.css:1287` — `.ui44-review-avatar`: color: var(--os-color-ink); font-size: 10px; font-weight: 800.
- `src/styles/44-ui/canonical-system.css:1308` — `.ui44-detail-value`: color: var(--44ui-text-primary); overflow-wrap: anywhere; text-align: right.
- `src/styles/44-ui/canonical-system.css:1319` — `.ui44-track-number`: color: var(--44ui-text-secondary); font: 400 var(--44ui-type-meta-size)/var(--44ui-type-meta-line) var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:1328` — `.ui44-track-play`: font-size: 13px.
- `src/styles/44-ui/canonical-system.css:1365` — `.ui-audit-page-mobile .ui44-track-number`: font-size: var(--44ui-type-subheadline-size); line-height: var(--44ui-type-subheadline-line).
- `src/styles/44-ui/canonical-system.css:1370` — `.ui44-track-title`: font-weight: 400.
- `src/styles/44-ui/canonical-system.css:1379` — `.ui-audit-page-mobile .ui44-detail-value`: text-align: left.
- `src/styles/44-ui/canonical-system.css:1389` — `.ui44-detail-value` (@media (max-width: 520px)): text-align: left.
- `src/styles/44-ui/canonical-system.css:1405` — `.ui44-type-audit`: font-family: var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:1478` — `.ui44-type`: margin: 0; font-family: var(--44ui-font-app); font-kerning: normal; letter-spacing: normal; overflow-wrap: anywhere.
- `src/styles/44-ui/canonical-system.css:1487` — `.ui44-type-page-title`: font-size: var(--44ui-type-page-title-size); line-height: var(--44ui-type-page-title-line); font-weight: 700.
- `src/styles/44-ui/canonical-system.css:1488` — `.ui44-type-section-title`: font-size: var(--44ui-type-section-title-size); line-height: var(--44ui-type-section-title-line); font-weight: 700.
- `src/styles/44-ui/canonical-system.css:1489` — `.ui44-type-subsection-title`: font-size: var(--44ui-type-subsection-title-size); line-height: var(--44ui-type-subsection-title-line); font-weight: 700.
- `src/styles/44-ui/canonical-system.css:1490` — `.ui44-type-headline`: font-size: var(--44ui-type-headline-size); line-height: var(--44ui-type-headline-line); font-weight: 600.
- `src/styles/44-ui/canonical-system.css:1491` — `.ui44-type-body`: font-size: var(--44ui-type-body-size); line-height: var(--44ui-type-body-line); font-weight: 400.
- `src/styles/44-ui/canonical-system.css:1492` — `.ui44-type-callout`: font-size: var(--44ui-type-callout-size); line-height: var(--44ui-type-callout-line); font-weight: 500.
- `src/styles/44-ui/canonical-system.css:1493` — `.ui-audit-page-mobile .ui44-type-callout`: font-weight: 400.
- `src/styles/44-ui/canonical-system.css:1494` — `.ui44-type-subheadline`: font-size: var(--44ui-type-subheadline-size); line-height: var(--44ui-type-subheadline-line); font-weight: 400.
- `src/styles/44-ui/canonical-system.css:1495` — `.ui44-type-meta`: font-size: var(--44ui-type-meta-size); line-height: var(--44ui-type-meta-line); font-weight: 400.
- `src/styles/44-ui/canonical-system.css:1496` — `.ui44-type-caption`: font-size: var(--44ui-type-caption-size); line-height: var(--44ui-type-caption-line); font-weight: 500.
- `src/styles/44-ui/canonical-system.css:1497` — `.ui-audit-page-mobile .ui44-type-caption`: font-weight: 400.
- `src/styles/44-ui/canonical-system.css:1498` — `.ui44-type-field-label`: font-size: var(--44ui-type-field-label-size); line-height: var(--44ui-type-field-label-line); font-weight: 600.
- `src/styles/44-ui/canonical-system.css:1499` — `.ui44-type-control`: font-size: var(--44ui-type-control-size); line-height: var(--44ui-type-control-line); font-weight: 600.
- `src/styles/44-ui/canonical-system.css:1512` — `.ui44-type-audit .os-type-page-title`: font: 700 var(--44ui-type-page-title-size)/var(--44ui-type-page-title-line) var(--44ui-font-app); letter-spacing: normal.
- `src/styles/44-ui/canonical-system.css:1513` — `.ui44-type-audit .os-type-section-title`: font: 700 var(--44ui-type-subsection-title-size)/var(--44ui-type-subsection-title-line) var(--44ui-font-app); letter-spacing: normal.
- `src/styles/44-ui/canonical-system.css:1514` — `.ui44-type-audit .os-type-card-title`: font: 600 var(--44ui-type-headline-size)/var(--44ui-type-headline-line) var(--44ui-font-app); letter-spacing: normal.
- `src/styles/44-ui/canonical-system.css:1515` — `.ui44-type-audit .os-type-body, .ui44-type-audit .os-type-body-small`: font: 400 var(--44ui-type-body-size)/var(--44ui-type-body-line) var(--44ui-font-app); letter-spacing: normal; color: var(--44ui-text-secondary).
- `src/styles/44-ui/canonical-system.css:1517` — `.ui44-type-audit .os-type-meta`: font: 400 var(--44ui-type-meta-size)/var(--44ui-type-meta-line) var(--44ui-font-app); letter-spacing: normal; color: var(--44ui-text-secondary).
- `src/styles/44-ui/canonical-system.css:1519` — `.ui44-type-audit .ui44-button, .ui44-type-audit .ui44-symbol-menu-item, .ui44-type-audit .ui44-input`: font-family: var(--44ui-font-app); font-size: var(--44ui-type-control-size); line-height: var(--44ui-type-control-line).
- `src/styles/44-ui/canonical-system.css:1527` — `.ui44-type-audit .ui44-button, .ui44-type-audit .ui44-symbol-menu-item`: font-weight: 600.
- `src/styles/44-ui/canonical-system.css:1529` — `.ui44-type-audit .ui44-input`: font-weight: 400.
- `src/styles/44-ui/canonical-system.css:1616` — `.ui44-type-inventory-item code, .ui44-type-specimen-meta code`: color: var(--44ui-text-primary); font: 500 var(--44ui-type-caption-size)/var(--44ui-type-caption-line) ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; overflow-wrap: anywhere.
- `src/styles/44-ui/canonical-system.css:1623` — `.ui44-type-inventory-sources`: color: var(--44ui-text-secondary); font: 400 var(--44ui-type-caption-size)/var(--44ui-type-caption-line) var(--44ui-font-app); overflow-wrap: anywhere.
- `src/styles/44-ui/canonical-system.css:1638` — `.ui44-type-audit .ui-audit-foundation-variant > span, .ui44-type-audit .ui44-button-audit-item > span, .ui44-type-audit .ui44-symbol-audit-item > span, .ui44-type-audit .ui44-control-example > span`: color: var(--44ui-text-secondary); font: 600 var(--44ui-type-field-label-size)/var(--44ui-type-field-label-line) var(--44ui-font-app); letter-spacing: normal; text-transform: none.
- `src/styles/44-ui/canonical-system.css:1648` — `.ui44-type-audit code`: font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace.
- `src/styles/44-ui/canonical-system.css:1749` — `body`: font-family: var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:1866` — `.ui44-identity-avatar`: color: var(--44ui-text-primary, var(--os-color-ink)); font-size: 11px; font-weight: 700.
- `src/styles/44-ui/canonical-system.css:1912` — `.ui44-track-audit-list .view-track-row`: color: inherit; text-align: left.
- `src/styles/44-ui/canonical-system.css:1941` — `.ui44-player-sheet-audit > button`: color: var(--os-color-ink); font-size: 24px.
- `src/styles/44-ui/canonical-system.css:1992` — `.hub-section-title`: margin: 0; font: 700 22px/26px var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:2000` — `.view-section-title`: margin-bottom: var(--44ui-header-content-gap); font: 700 22px/26px var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:2042` — `:where(.dashboard-row-title, .social-row-title)`: color: var(--os-color-ink); font: 600 13px/16px var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:2048` — `:where( .dashboard-row-subtitle, .dashboard-row-meta, .social-row-meta, .product-review-author, .product-domain-meta, .product-domain-meta-link )`: color: var(--os-color-ink-secondary); font: 400 11px/14px var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:2061` — `:where( .social-row-body, .product-review-copy > p, .product-update-row > p, .view-description )`: color: var(--os-color-ink-secondary); font: 400 13px/18px var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:2072` — `.studio-publication-status`: margin: 0; font: 600 11px/14px var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:2175` — `.studio-paid-download-toggle strong`: color: var(--os-color-ink-primary); font: 600 13px/18px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:2180` — `.studio-paid-download-toggle small`: color: var(--os-color-ink-secondary); font: 400 12px/17px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:2194` — `.studio-paid-download-required strong`: color: var(--os-color-ink-primary); font: 600 13px/18px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:2199` — `.studio-paid-download-required small`: color: var(--os-color-ink-secondary); font: 400 12px/17px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:2219` — `:where( .dashboard-field-label, .profile-edit-label, .external-link-service-name )`: color: var(--os-color-ink-secondary); font: 600 12px/15px var(--44ui-font-app); letter-spacing: 0; text-transform: none.
- `src/styles/44-ui/canonical-system.css:2230` — `:where( .os-input-field, .profile-edit-input, .dashboard-field > input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), .dashboard-field > select, .dashboard-field > textarea, .social-message-form input, .social-message-form textarea, .item-community-composer input, .item-community-composer textarea, .social-feed-composer input, .social-feed-composer textarea, .social-reply-drawer-form input, .social-reply-drawer-form textarea )`: color: var(--44ui-input-text); font: 400 13px/18px var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:2306` — `.os-button, .os-button-compact, .os-button-large`: font: 600 13px/16px var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:2389` — `body:is(.theme-dark, .theme-light) :is(.os-type-display, .os-type-page-title)`: margin: 0; color: var(--44ui-text-primary); font: 700 var(--44ui-type-page-title-size)/var(--44ui-type-page-title-line)
    var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:2398` — `body:is(.theme-dark, .theme-light) :is(.os-type-panel-title, .hub-section-title, .view-section-title)`: color: var(--44ui-text-primary); font: 700 var(--44ui-type-section-title-size)/var(--44ui-type-section-title-line)
    var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:2406` — `body:is(.theme-dark, .theme-light) .os-type-section-title`: color: var(--44ui-text-primary); font: 700 var(--44ui-type-subsection-title-size)/var(--44ui-type-subsection-title-line)
    var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:2413` — `body:is(.theme-dark, .theme-light) :is(.os-type-card-title, .dashboard-row-title, .social-row-title)`: font: 600 var(--44ui-type-headline-size)/var(--44ui-type-headline-line)
    var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:2420` — `body:is(.theme-dark, .theme-light) .os-type-body`: font: 400 var(--44ui-type-body-size)/var(--44ui-type-body-line)
    var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:2426` — `body:is(.theme-dark, .theme-light) .os-type-body-small`: font: 500 var(--44ui-type-callout-size)/var(--44ui-type-callout-line)
    var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:2432` — `body:is(.theme-dark, .theme-light) .os-type-meta`: font: 400 var(--44ui-type-meta-size)/var(--44ui-type-meta-line)
    var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:2438` — `body:is(.theme-dark, .theme-light) .os-type-field-title`: font: 600 var(--44ui-type-field-label-size)/var(--44ui-type-field-label-line)
    var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:2490` — `body:is(.theme-dark, .theme-light) :is(.ui44-pill, .os-pill, .tag-select-pill)`: gap: 6px; padding: 0 10px; color: var(--44ui-text-secondary); font: 500 var(--44ui-type-caption-size)/var(--44ui-type-caption-line)
    var(--44ui-font-app); letter-spacing: 0; text-transform: none; white-space: nowrap.
- `src/styles/44-ui/canonical-system.css:2510` — `body:is(.theme-dark, .theme-light) :is( .ui44-badge, .dashboard-status-pill, .project-status-pill, .admin-status-pill, .admin-section-badge )`: padding: 0 10px; color: var(--44ui-text-secondary); font: 500 var(--44ui-type-caption-size)/var(--44ui-type-caption-line)
    var(--44ui-font-app); letter-spacing: 0; text-transform: none; white-space: nowrap.
- `src/styles/44-ui/canonical-system.css:2550` — `body:is(.theme-dark, .theme-light) :is(.ui44-swatch, .settings-swatch)`: padding: 0 14px 0 10px; color: var(--44ui-text-secondary); font: 600 var(--44ui-type-control-size)/var(--44ui-type-control-line)
    var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:2625` — `body:is(.theme-dark, .theme-light) :is(.ui44-state, .app-empty-text, .dashboard-empty, .calendar-state)`: color: var(--44ui-text-secondary); font: 400 var(--44ui-type-body-size)/var(--44ui-type-body-line)
    var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:2636` — `body:is(.theme-dark, .theme-light) :is(.dashboard-empty, .calendar-state)`: padding: var(--44ui-panel-inset); text-align: center.
- `src/styles/44-ui/canonical-system.css:2650` — `body:is(.theme-dark, .theme-light) .ui44-state-loading`: color: transparent; font-size: 0; line-height: 0.
- `src/styles/44-ui/canonical-system.css:2754` — `body:is(.theme-dark, .theme-light) .community-v11-composer-heading h2`: margin: 0; color: var(--os-color-ink); font: 700 20px/24px var(--44ui-font-app); text-align: center.
- `src/styles/44-ui/canonical-system.css:2763` — `body:is(.theme-dark, .theme-light) :is(.community-v11-composer-cancel, .community-v11-composer-post)`: padding: 0 18px; color: var(--os-color-ink); font: 600 16px/20px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:2789` — `body:is(.theme-dark, .theme-light) .community-v11-composer-field-label`: gap: 12px; color: var(--os-color-ink); font: 700 18px/24px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:2821` — `body:is(.theme-dark, .theme-light) .community-v11-composer > textarea`: padding: 16px; font: 400 17px/24px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:2838` — `body:is(.theme-dark, .theme-light) .community-v11-composer-label`: color: var(--os-color-ink); font: 700 18px/24px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:2843` — `body:is(.theme-dark, .theme-light) .community-v11-composer-picker`: gap: 8px; padding: 0 14px; color: var(--os-color-ink-secondary); font: 400 17px/22px var(--44ui-font-app); text-align: left.
- `src/styles/44-ui/canonical-system.css:2869` — `body:is(.theme-dark, .theme-light) .community-v11-composer-picker-icon`: color: var(--os-color-ink-secondary); font-size: 22px; text-align: center.
- `src/styles/44-ui/canonical-system.css:2875` — `body:is(.theme-dark, .theme-light) .community-v11-composer-chevron`: color: var(--os-color-ink-secondary); font-size: 18px; letter-spacing: -5px.
- `src/styles/44-ui/canonical-system.css:2897` — `body:is(.theme-dark, .theme-light) .community-v11-composer-picker-menu input, body:is(.theme-dark, .theme-light) .community-v11-composer-picker-menu button`: padding: 10px 12px; color: var(--os-color-ink); font: 400 16px/20px var(--44ui-font-app); text-align: left.
- `src/styles/44-ui/canonical-system.css:2946` — `body:is(.theme-dark, .theme-light) .community-new-page-layer .community-new-composer > textarea`: margin: 0; padding: 16px; color: var(--os-color-ink); font: 400 17px/24px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:2984` — `body:is(.theme-dark, .theme-light) .community-new-page-layer .community-v11-composer-clear`: padding: 0; color: var(--os-color-ink-secondary); font: 400 24px/24px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:3019` — `body:is(.theme-dark, .theme-light) .community-new-page-layer .community-v11-composer-image-preview button`: color: #fff; font: 400 24px/28px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:3033` — `body:is(.theme-dark, .theme-light) .community-new-page-layer .community-v11-composer-upload-status`: color: var(--os-color-ink-secondary); font: 400 14px/20px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:3038` — `body:is(.theme-dark, .theme-light) .community-new-page-layer .community-v11-composer-chevron`: letter-spacing: normal.
- `src/styles/44-ui/canonical-system.css:3067` — `body:is(.theme-dark, .theme-light) .community-v11-composer-picker-empty`: padding: 14px 12px; color: var(--os-color-ink-muted); font: 400 14px/20px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:3147` — `body:is(.theme-dark, .theme-light) .social-profile-page .social-attached-item-card` (@media (max-width: 768px)): column-gap: 12px; margin-top: 4px; padding: 8px; color: var(--os-color-ink); text-decoration: none.
- `src/styles/44-ui/canonical-system.css:3191` — `body:is(.theme-dark, .theme-light) .social-profile-page .social-attached-item-title` (@media (max-width: 768px)): color: var(--os-color-ink); font: 600 15px/19px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:3196` — `body:is(.theme-dark, .theme-light) .social-profile-page .social-attached-item-type` (@media (max-width: 768px)): color: var(--os-color-ink-muted); font: 400 13px/17px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:3565` — `body:is(.theme-dark, .theme-light) :is(.ui44-status, .dashboard-status, .login-status, .settings-status)`: padding: 12px 14px; color: var(--44ui-text-secondary); font: 500 var(--44ui-type-callout-size)/var(--44ui-type-callout-line)
    var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:3616` — `body:is(.theme-dark, .theme-light) .ui44-calendar-entry`: color: var(--44ui-text-primary); font-family: var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:3621` — `body:is(.theme-dark, .theme-light) :is(.ui44-external-link, .external-link-action, .calendar-entry-actions a)`: color: inherit; text-decoration: none.
- `src/styles/44-ui/canonical-system.css:3642` — `body:is(.theme-dark, .theme-light) :is(.ui44-pill, .os-pill, .tag-select-pill, .ui44-badge, .dashboard-status-pill, .project-status-pill)` (@media (max-width: 768px)): font: 400 var(--44ui-type-caption-size)/var(--44ui-type-caption-line)
      var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:3665` — `body:is(.theme-dark, .theme-light) :is(.ui44-button, .os-button)`: padding: 0 22px; color: var(--44ui-button-text); font: 600 13px/16px var(--44ui-font-app); letter-spacing: 0; text-align: center; text-decoration: none.
- `src/styles/44-ui/canonical-system.css:3712` — `body:is(.theme-dark, .theme-light) :is( .ui44-symbol-button, .page-filter-button, .page-compose-button, .os-topbar-icon-button, .os-topbar-back, .os-icon-button )`: padding: 0; color: var(--os-color-ink); line-height: 1; text-decoration: none.
- `src/styles/44-ui/canonical-system.css:3820` — `body:is(.theme-dark, .theme-light) :is(.ui44-button, .os-button)` (@media (max-width: 768px)): font: 600 17px/22px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:3861` — `body:is(.theme-dark, .theme-light) .ui44-route-state`: padding: 80px var(--44ui-page-inset); color: var(--os-color-ink-muted); text-align: center.
- `src/styles/44-ui/canonical-system.css:3906` — `body:is(.theme-dark, .theme-light) :is( .dashboard-form-note, .dashboard-field > .os-type-body-small, .dashboard-form-step > .os-type-body-small, .settings-field-head > .os-type-body-small, .ui44-form-help )`: color: var(--os-color-ink-secondary); font: 400 12px/16px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:3961` — `body:is(.theme-dark, .theme-light) .cart-item-link`: color: inherit; text-decoration: none.
- `src/styles/44-ui/canonical-system.css:4098` — `body:is(.theme-dark, .theme-light) .ui44-community-content`: gap: 6px; color: inherit; text-decoration: none.
- `src/styles/44-ui/canonical-system.css:4106` — `body:is(.theme-dark, .theme-light) :is( .dashboard-form-note, .dashboard-field > .os-type-body-small, .dashboard-form-step > .os-type-body-small, .settings-field-head > .os-type-body-small, .ui44-form-help )` (@media (max-width: 768px)): font: 400 15px/20px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:4142` — `body:is(.theme-dark, .theme-light) .ui44-catalog-card`: padding: 0; color: inherit; text-decoration: none.
- `src/styles/44-ui/canonical-system.css:4190` — `body:is(.theme-dark, .theme-light) .ui44-catalog-title`: color: var(--os-color-ink); font: 600 13px/16px var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:4207` — `body:is(.theme-dark, .theme-light) .ui44-catalog-subheadline`: color: var(--44ui-text-secondary, var(--os-color-ink-secondary)); font: 400 11px/14px var(--44ui-font-app); letter-spacing: 0; white-space: nowrap.
- `src/styles/44-ui/canonical-system.css:4216` — `body:is(.theme-dark, .theme-light) .ui44-catalog-meta`: color: var(--44ui-text-secondary, var(--os-color-ink-secondary)); font: 400 10px/13px var(--44ui-font-app); letter-spacing: 0; white-space: nowrap.
- `src/styles/44-ui/canonical-system.css:4259` — `body:is(.theme-dark, .theme-light) .ui44-catalog-title` (@media (max-width: 768px)): font: 600 13px/16px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:4263` — `body:is(.theme-dark, .theme-light) .ui44-catalog-subheadline` (@media (max-width: 768px)): font: 400 15px/20px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:4267` — `body:is(.theme-dark, .theme-light) .ui44-catalog-meta` (@media (max-width: 768px)): font: 400 13px/18px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:4417` — `body:is(.theme-dark, .theme-light) .social-row.ui44-list-row-community .ui44-community-author-line .social-avatar`: font-size: 10px.
- `src/styles/44-ui/canonical-system.css:4424` — `body:is(.theme-dark, .theme-light) .social-row.ui44-list-row-community .social-row-meta`: gap: 8px; font: 400 11px/14px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:4429` — `body:is(.theme-dark, .theme-light) .social-row.ui44-list-row-community .social-author-name`: font-weight: 700.
- `src/styles/44-ui/canonical-system.css:4433` — `body:is(.theme-dark, .theme-light) .social-row.ui44-list-row-community .ui44-community-body`: margin: 0; color: var(--44ui-text-secondary); font: 400 13px/18px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:4445` — `body:is(.theme-dark, .theme-light) .social-row.ui44-list-row-community .ui44-row-action`: gap: 6px; margin: 0; padding: 0 10px; font: 650 12px/1 var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:4498` — `body:is(.theme-dark, .theme-light) .community-app-page.community-v11-page .social-attached-item-card` (@media (min-width: 769px)): column-gap: 14px; margin-top: 4px; padding: 10px; color: var(--os-color-ink); text-decoration: none.
- `src/styles/44-ui/canonical-system.css:4554` — `body:is(.theme-dark, .theme-light) .community-app-page.community-v11-page .social-attached-item-title` (@media (min-width: 769px)): color: var(--os-color-ink); font: 650 16px/21px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:4561` — `body:is(.theme-dark, .theme-light) .community-app-page.community-v11-page .social-attached-item-type` (@media (min-width: 769px)): color: var(--os-color-ink-muted); font: 400 14px/19px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:4586` — `body:is(.theme-dark, .theme-light) .social-row.ui44-list-row-community .social-row-meta` (@media (max-width: 768px)): font: 400 15px/20px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:4590` — `body:is(.theme-dark, .theme-light) .social-row.ui44-list-row-community .ui44-community-body` (@media (max-width: 768px)): font: 400 17px/24px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:4627` — `body:is(.theme-dark, .theme-light) .ui44-input`: padding: 0 16px; color: var(--44ui-input-text); font: 400 13px/18px var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:4731` — `body:is(.theme-dark, .theme-light) .ui44-native-input`: color: var(--44ui-input-text); font: 400 13px/18px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:4753` — `body:is(.theme-dark, .theme-light) .ui44-input` (@media (max-width: 768px)): font: 400 17px/24px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:4766` — `body:is(.theme-dark, .theme-light) .ui44-native-input` (@media (max-width: 768px)): font: 400 17px/24px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:4784` — `:where( .os-popover-item, .page-filter-option, .library-filter-option, .tag-select-menu button )`: font: 500 13px/16px var(--44ui-font-app); letter-spacing: 0; white-space: nowrap.
- `src/styles/44-ui/canonical-system.css:4899` — `.view-track-title, .ui44-overflow-track-title`: color: var(--os-color-ink); font: 400 13px/16px var(--44ui-font-app); letter-spacing: 0; white-space: nowrap.
- `src/styles/44-ui/canonical-system.css:4910` — `.view-track-duration`: color: var(--os-color-ink-secondary); font: 400 10px/13px var(--44ui-font-app); text-align: right.
- `src/styles/44-ui/canonical-system.css:4953` — `.product-tile-title`: font: 600 13px/16px var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:4958` — `.product-tile-subtitle`: font: 400 11px/14px var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:4965` — `body:is(.theme-dark, .theme-light) .product-tile-creator.ui44-catalog-subheadline`: font: 400 12px/16px var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:5064` — `body:is(.theme-dark, .theme-light) :is( .os-popover-item, .page-filter-option, .library-filter-option, .tag-select-menu button, .social-mention-option )`: font: 500 13px/16px var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:5166` — `body:is(.theme-dark, .theme-light) .os-account-menu-copy strong`: color: var(--os-color-ink); font: 650 14px/18px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:5171` — `body:is(.theme-dark, .theme-light) .os-account-menu-copy span`: color: var(--os-color-ink-secondary); font: 400 12px/16px var(--44ui-font-app); white-space: nowrap.
- `src/styles/44-ui/canonical-system.css:5328` — `body:is(.theme-dark, .theme-light) .login-creator-request strong`: color: var(--44ui-text-primary); font: inherit; font-weight: 650.
- `src/styles/44-ui/canonical-system.css:5334` — `body:is(.theme-dark, .theme-light) .login-creator-request small`: color: var(--44ui-text-secondary); font-size: var(--44ui-type-caption-size); line-height: var(--44ui-type-caption-line).
- `src/styles/44-ui/canonical-system.css:5740` — `.hub-section-title, .store-app-page .hub-section-title, .admin-section-panel .hub-section-title, .view-detail-single .hub-section-title, .view-detail-single .view-section-title, .dashboard-form-section > .hub-section-head .hub-section-title` (@media (max-width: 768px)): font: 700 28px/34px var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:5750` — `.view-section-title` (@media (max-width: 768px)): font: 700 28px/34px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:5754` — `:where(.dashboard-row-title, .social-row-title)` (@media (max-width: 768px)): font: 600 17px/22px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:5758` — `:where( .dashboard-row-subtitle, .dashboard-row-meta, .social-row-meta, .product-review-author, .product-domain-meta, .product-domain-meta-link )` (@media (max-width: 768px)): font: 400 15px/20px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:5769` — `:where( .social-row-body, .product-review-copy > p, .product-update-row > p, .view-description )` (@media (max-width: 768px)): font: 400 17px/24px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:5778` — `.studio-publication-status` (@media (max-width: 768px)): font: 400 15px/20px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:5787` — `:where( .dashboard-field-label, .profile-edit-label, .external-link-service-name )` (@media (max-width: 768px)): font: 600 15px/20px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:5795` — `:where( .os-input-field, .profile-edit-input, .dashboard-field > input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), .dashboard-field > select, .dashboard-field > textarea, .social-message-form input, .social-message-form textarea )` (@media (max-width: 768px)): font: 400 17px/24px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:5808` — `.os-button, .os-button-compact, .os-button-large` (@media (max-width: 768px)): font: 600 17px/22px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:5824` — `:where( .os-popover-item, .page-filter-option, .library-filter-option, .tag-select-menu button )` (@media (max-width: 768px)): font: 400 16px/21px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:5857` — `.view-track-title, .view-tracklist-section .view-track-title, .ui44-overflow-track-title` (@media (max-width: 768px)): font: 400 15px/20px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:5863` — `.view-track-duration, .view-tracklist-section .view-track-duration` (@media (max-width: 768px)): font: 400 13px/18px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:5933` — `.music-player-sheet-copy h2` (@media (max-width: 768px)): font: 700 22px/28px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:5937` — `.music-player-sheet-copy p` (@media (max-width: 768px)): font: 400 15px/20px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6000` — `body:is(.theme-dark, .theme-light) .ui44-track-index`: color: var(--os-color-ink-secondary); font: 500 10px/13px var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:6007` — `body:is(.theme-dark, .theme-light) :is(.ui44-track-title, .ui44-overflow-track-title.ui44-track-title)`: color: var(--os-color-ink); font: 400 13px/16px var(--44ui-font-app); letter-spacing: 0; white-space: nowrap.
- `src/styles/44-ui/canonical-system.css:6018` — `body:is(.theme-dark, .theme-light) .ui44-track-duration`: color: var(--os-color-ink-secondary); font: 400 10px/13px var(--44ui-font-app); letter-spacing: 0; text-align: right.
- `src/styles/44-ui/canonical-system.css:6076` — `body:is(.theme-dark, .theme-light) .ui44-track-index` (@media (max-width: 768px)): font: 400 13px/18px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6080` — `body:is(.theme-dark, .theme-light) :is(.ui44-track-title, .ui44-overflow-track-title.ui44-track-title)` (@media (max-width: 768px)): font: 400 15px/20px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6085` — `body:is(.theme-dark, .theme-light) .ui44-track-duration` (@media (max-width: 768px)): font: 400 13px/18px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6129` — `body:is(.theme-dark, .theme-light) .ui44-composed-field.ui44-composed-field-editor > .ui44-textarea.ui44-input.ui44-input-bare`: padding: 0; color: var(--44ui-input-text); font: 400 13px/18px var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:6220` — `body:is(.theme-dark, .theme-light) :is( .os-input-field, .os-input-textarea, .profile-edit-input, .ui44-input, .dashboard-field > input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), .dashboard-field > select, .dashboard-field > textarea, .social-message-form input, .social-message-form textarea )`: font: 400 13px/18px var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:6242` — `body:is(.theme-dark, .theme-light) :is( .os-input-field, .os-input-textarea, .profile-edit-input, .ui44-input, .dashboard-field > input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), .dashboard-field > select, .dashboard-field > textarea, .social-message-form input, .social-message-form textarea )` (@media (max-width: 768px)): font: 400 17px/24px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6256` — `body:is(.theme-dark, .theme-light) .ui44-composed-field.ui44-composed-field-editor > .ui44-textarea.ui44-input.ui44-input-bare` (@media (max-width: 768px)): font: 400 17px/24px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6320` — `body:is(.theme-dark, .theme-light) .ui44-detail-list .view-row-label`: font: 600 13px/16px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6324` — `body:is(.theme-dark, .theme-light) .ui44-detail-list .view-row-value`: font: 500 13px/18px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6378` — `body:is(.theme-dark, .theme-light) .community-app-page .page-compose-button > span` (@media (max-width: 768px)): font-size: 27px; font-weight: 360; line-height: 1.
- `src/styles/44-ui/canonical-system.css:6426` — `body:is(.theme-dark, .theme-light) .product-details-section :is(.view-row-label, .view-row-value)` (@media (max-width: 768px)): margin: 0; text-align: left; white-space: normal; overflow-wrap: anywhere.
- `src/styles/44-ui/canonical-system.css:6437` — `body:is(.theme-dark, .theme-light) .ui44-detail-list .view-row-label, body:is(.theme-dark, .theme-light) .ui44-detail-list .view-row-value` (@media (max-width: 768px)): font-size: 15px; line-height: 20px.
- `src/styles/44-ui/canonical-system.css:6453` — `body:is(.theme-dark, .theme-light) .ui44-list-row`: gap: 16px; margin: 0; padding: var(--44ui-row-y) var(--44ui-row-x); color: inherit; font-family: var(--44ui-font-app); text-align: left; text-decoration: none.
- `src/styles/44-ui/canonical-system.css:6535` — `body:is(.theme-dark, .theme-light) .ui44-list-row-title`: color: var(--os-color-ink); font: 600 13px/16px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6540` — `body:is(.theme-dark, .theme-light) .ui44-list-row-secondary, body:is(.theme-dark, .theme-light) .ui44-list-row-body, body:is(.theme-dark, .theme-light) .ui44-row-status`: color: var(--os-color-ink-secondary); font: 400 11px/14px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6549` — `body:is(.theme-dark, .theme-light) .ui44-list-row:not(.ui44-list-row-achievement) :is( .dashboard-row-title, .view-row-value, .checkout-summary-title, .social-author-name, .product-review-author, .product-domain-head h3, .social-structured-title, .profile-event-row strong )`: color: var(--os-color-ink); font: 600 13px/16px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6565` — `body:is(.theme-dark, .theme-light) .ui44-list-row:not(.ui44-list-row-achievement) :is( .dashboard-row-subtitle, .dashboard-row-meta, .view-row-label, .product-domain-meta, .social-handle, .social-note, .social-structured-metrics, .profile-event-row time, .profile-event-row span )`: color: var(--os-color-ink-secondary); font: 400 11px/14px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6582` — `body:is(.theme-dark, .theme-light) .ui44-list-row:not(.ui44-list-row-achievement) :is(.social-row-body, .product-domain-body, .profile-event-row p)`: color: var(--os-color-ink); font: 400 13px/18px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6695` — `body:is(.theme-dark, .theme-light) .ui44-list-row-title` (@media (max-width: 768px)): font: 600 17px/22px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6699` — `body:is(.theme-dark, .theme-light) .ui44-list-row-secondary, body:is(.theme-dark, .theme-light) .ui44-list-row-body, body:is(.theme-dark, .theme-light) .ui44-row-status` (@media (max-width: 768px)): font: 400 15px/20px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6705` — `body:is(.theme-dark, .theme-light) .ui44-list-row:not(.ui44-list-row-achievement) :is( .dashboard-row-title, .view-row-value, .checkout-summary-title, .social-author-name, .product-review-author, .product-domain-head h3, .social-structured-title, .profile-event-row strong )` (@media (max-width: 768px)): font: 600 17px/22px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6720` — `body:is(.theme-dark, .theme-light) .ui44-list-row:not(.ui44-list-row-achievement) :is( .dashboard-row-subtitle, .dashboard-row-meta, .view-row-label, .product-domain-meta, .social-handle, .social-note, .social-structured-metrics, .profile-event-row time, .profile-event-row span )` (@media (max-width: 768px)): font: 400 15px/20px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6736` — `body:is(.theme-dark, .theme-light) .ui44-list-row:not(.ui44-list-row-achievement) :is(.social-row-body, .product-domain-body, .profile-event-row p)` (@media (max-width: 768px)): font: 400 17px/24px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6813` — `body:is(.theme-dark, .theme-light) .ui44-achievement-icon`: color: var(--os-color-ink); font: 700 11px/14px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6832` — `body:is(.theme-dark, .theme-light) .ui44-achievement-copy`: gap: 4px; text-align: left.
- `src/styles/44-ui/canonical-system.css:6839` — `body:is(.theme-dark, .theme-light) .ui44-achievement-title`: color: var(--os-color-ink); font: 600 13px/16px var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:6846` — `body:is(.theme-dark, .theme-light) .ui44-achievement-secondary`: color: var(--os-color-ink-secondary); font: 400 11px/14px var(--44ui-font-app); letter-spacing: 0.
- `src/styles/44-ui/canonical-system.css:6865` — `body:is(.theme-dark, .theme-light) .ui44-achievement-check`: color: var(--os-color-canvas); font: 600 15px/1 var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6928` — `body:is(.theme-dark, .theme-light) .ui44-achievement-toast-eyebrow`: margin: 0; color: var(--os-color-accent); font: 500 10px/13px var(--44ui-font-app); letter-spacing: 0; text-transform: none.
- `src/styles/44-ui/canonical-system.css:6936` — `body:is(.theme-dark, .theme-light) .ui44-achievement-toast-title`: color: var(--os-color-ink); font: 600 13px/16px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6941` — `body:is(.theme-dark, .theme-light) .ui44-achievement-toast-body`: margin: 0; color: var(--os-color-ink-secondary); font: 400 11px/14px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6953` — `body:is(.theme-dark, .theme-light) .ui44-achievement-title` (@media (max-width: 768px)): font: 600 17px/22px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6957` — `body:is(.theme-dark, .theme-light) .ui44-achievement-secondary` (@media (max-width: 768px)): font: 400 15px/20px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6970` — `body:is(.theme-dark, .theme-light) .ui44-achievement-toast-eyebrow` (@media (max-width: 768px)): font: 500 12px/16px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6974` — `body:is(.theme-dark, .theme-light) .ui44-achievement-toast-title` (@media (max-width: 768px)): font: 600 17px/22px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6978` — `body:is(.theme-dark, .theme-light) .ui44-achievement-toast-body` (@media (max-width: 768px)): font: 400 15px/20px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:6993` — `body:is(.theme-dark, .theme-light) :is(.dashboard-field-label, .profile-edit-label, .external-link-service-name)`: font: 600 12px/15px var(--44ui-font-app); letter-spacing: 0; text-transform: none.
- `src/styles/44-ui/canonical-system.css:7001` — `body:is(.theme-dark, .theme-light) :is(.dashboard-field-label, .profile-edit-label, .external-link-service-name)` (@media (max-width: 768px)): font: 600 15px/20px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:7025` — `body:is(.theme-dark, .theme-light) .ui44-paper-menu-item`: gap: 10px; padding: 0 14px; color: inherit; font: 500 13px/16px var(--44ui-font-app); letter-spacing: 0; text-align: left; text-decoration: none.
- `src/styles/44-ui/canonical-system.css:7093` — `body:is(.theme-dark, .theme-light) .ui44-segmented-item`: padding: 0 14px; color: var(--os-color-ink-secondary); font: 600 13px/16px var(--44ui-font-app); text-align: center.
- `src/styles/44-ui/canonical-system.css:7144` — `body:is(.theme-dark, .theme-light) .ui44-segmented-tabs > [role="tab"]`: padding: 0 14px; color: var(--os-color-ink-secondary); font: 600 13px/16px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:7189` — `body:is(.theme-dark, .theme-light) .ui44-paper-menu-item` (@media (max-width: 768px)): font: 500 17px/22px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:7198` — `body:is(.theme-dark, .theme-light) .ui44-segmented-item, body:is(.theme-dark, .theme-light) .ui44-segmented-tabs > [role="tab"]` (@media (max-width: 768px)): font: 600 15px/20px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:7214` — `body:is(.theme-dark, .theme-light) .ui44-paper-menu .ui44-paper-menu-item` (@media (max-width: 768px)): font: 500 17px/22px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:7511` — `body:is(.theme-dark, .theme-light) .you-mobile-identity`: gap: 8px; padding-top: 16px; text-align: center.
- `src/styles/44-ui/canonical-system.css:7519` — `body:is(.theme-dark, .theme-light) .you-mobile-avatar-link`: color: var(--os-color-ink); text-decoration: none.
- `src/styles/44-ui/canonical-system.css:7529` — `body:is(.theme-dark, .theme-light) .you-mobile-avatar-link .social-avatar`: font-size: 16px.
- `src/styles/44-ui/canonical-system.css:7539` — `body:is(.theme-dark, .theme-light) .you-mobile-identity h1`: margin: 0; overflow-wrap: anywhere; color: var(--os-color-ink); font: 700 26px/32px var(--44ui-font-app); letter-spacing: -0.025em; text-align: center.
- `src/styles/44-ui/canonical-system.css:7572` — `body:is(.theme-dark, .theme-light) .you-navigation-copy strong`: color: var(--os-color-ink); font: 650 15px/20px var(--44ui-font-app); white-space: nowrap.
- `src/styles/44-ui/canonical-system.css:7580` — `body:is(.theme-dark, .theme-light) .you-navigation-copy span`: color: var(--os-color-ink-secondary); font: 400 13px/18px var(--44ui-font-app); white-space: nowrap.
- `src/styles/44-ui/canonical-system.css:7588` — `body:is(.theme-dark, .theme-light) .you-navigation-chevron`: color: var(--os-color-ink-muted); font: 300 26px/1 var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:7648` — `body:is(.theme-dark, .theme-light) .os-popover-footer-link.ui44-paper-menu-item`: text-align: center.
- `src/styles/44-ui/canonical-system.css:7743` — `body:is(.theme-dark, .theme-light) .external-item-flat-link`: padding: 0; color: var(--os-color-ink-secondary); font: 500 13px/18px var(--44ui-font-app); letter-spacing: 0; text-transform: none.
- `src/styles/44-ui/canonical-system.css:7864` — `body:is(.theme-dark, .theme-light) .ui44-type.ui44-type-page-title`: font: 700 var(--44ui-type-page-title-size)/var(--44ui-type-page-title-line)
    var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:7869` — `body:is(.theme-dark, .theme-light) .ui44-type.ui44-type-section-title`: font: 700 var(--44ui-type-section-title-size)/var(--44ui-type-section-title-line)
    var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:7874` — `body:is(.theme-dark, .theme-light) .ui44-type.ui44-type-subsection-title`: font: 700 var(--44ui-type-subsection-title-size)/var(--44ui-type-subsection-title-line)
    var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:7879` — `body:is(.theme-dark, .theme-light) .ui44-type.ui44-type-headline`: font: 600 var(--44ui-type-headline-size)/var(--44ui-type-headline-line)
    var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:7884` — `body:is(.theme-dark, .theme-light) .ui44-type.ui44-type-body`: font: 400 var(--44ui-type-body-size)/var(--44ui-type-body-line)
    var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:7889` — `body:is(.theme-dark, .theme-light) .ui44-type.ui44-type-callout`: font: 500 var(--44ui-type-callout-size)/var(--44ui-type-callout-line)
    var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:7894` — `body:is(.theme-dark, .theme-light) .ui44-type.ui44-type-subheadline`: font: 400 var(--44ui-type-subheadline-size)/var(--44ui-type-subheadline-line)
    var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:7899` — `body:is(.theme-dark, .theme-light) .ui44-type.ui44-type-meta`: font: 400 var(--44ui-type-meta-size)/var(--44ui-type-meta-line)
    var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:7904` — `body:is(.theme-dark, .theme-light) .ui44-type.ui44-type-caption`: font: 500 var(--44ui-type-caption-size)/var(--44ui-type-caption-line)
    var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:7909` — `body:is(.theme-dark, .theme-light) .ui44-type.ui44-type-field-label`: font: 600 var(--44ui-type-field-label-size)/var(--44ui-type-field-label-line)
    var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:7914` — `body:is(.theme-dark, .theme-light) .ui44-type.ui44-type-control`: font: 600 var(--44ui-type-control-size)/var(--44ui-type-control-line)
    var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:7961` — `body:is(.theme-dark, .theme-light) .dashboard-status-pill.studio-publication-status`: padding: 0; font: 400 var(--44ui-type-subheadline-size)/var(--44ui-type-subheadline-line)
    var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:8003` — `body:is(.theme-dark, .theme-light) :is(.ui44-type.ui44-type-callout, .ui44-type.ui44-type-caption, .os-type-body-small)` (@media (max-width: 768px)): font-weight: 400.
- `src/styles/44-ui/canonical-system.css:8037` — `body:is(.theme-dark, .theme-light) :is( .ui44-detail-list .ui44-list-row.ui44-list-row-detail .view-row-label, .ui44-list-row.ui44-list-row-detail .ui44-detail-label )`: color: var(--os-color-ink); font-weight: 600.
- `src/styles/44-ui/canonical-system.css:8048` — `body:is(.theme-dark, .theme-light) :is( .ui44-detail-list .ui44-list-row.ui44-list-row-detail .view-row-value, .ui44-list-row.ui44-list-row-detail .ui44-detail-value )`: color: var(--os-color-ink-secondary); font-weight: 400.
- `src/styles/44-ui/canonical-system.css:8274` — `body:is(.theme-dark, .theme-light) .social-thread-page .social-reply-view-all`: padding: 8px var(--os-row-inset-x) 14px
    calc(var(--os-row-inset-x) + var(--44ui-avatar-inline) + 14px); color: var(--os-color-ink); font-size: var(--os-font-size-body); font-weight: 600; text-decoration: none.
- `src/styles/44-ui/canonical-system.css:8553` — `body:is(.theme-dark, .theme-light) .social-profile-page .social-profile-tabs > [role="tab"]`: margin: 0; padding: 0 18px; color: var(--os-color-ink-secondary); font: 600 14px/18px var(--44ui-font-app); white-space: nowrap.
- `src/styles/44-ui/canonical-system.css:8729` — `body:is(.theme-dark, .theme-light) .social-profile-page .social-profile-tabs > [role="tab"]` (@media (max-width: 768px)): font-size: 15px.
- `src/styles/44-ui/canonical-system.css:8757` — `body:is(.theme-dark, .theme-light) .social-post-row.ui44-list-row-community .social-row-body` (@media (max-width: 768px)): font: 400 15px/21px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:8800` — `body:is(.theme-dark, .theme-light) .social-inbox-conversation-route .social-message-thread-header.ui44-list-row-profile`: gap: 6px; padding: 8px 12px 12px; text-align: center.
- `src/styles/44-ui/canonical-system.css:8812` — `body:is(.theme-dark, .theme-light) .social-inbox-conversation-route .social-message-thread-header .social-message-profile-link`: gap: 6px; text-align: center; color: inherit; text-decoration: none.
- `src/styles/44-ui/canonical-system.css:8849` — `body:is(.theme-dark, .theme-light) .social-inbox-conversation-route .social-message-form .social-message-send`: padding: 0; color: #fff; font-size: 20px; line-height: 1.
- `src/styles/44-ui/canonical-system.css:9050` — `body:is(.theme-dark, .theme-light) .community-v11-members-panel h2` (@media (min-width: 1100px)): margin: 0 0 18px; color: var(--os-color-ink); font: 700 18px/24px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:9061` — `body:is(.theme-dark, .theme-light) .community-v11-member` (@media (min-width: 1100px)): gap: 12px; color: inherit; text-decoration: none.
- `src/styles/44-ui/canonical-system.css:9089` — `body:is(.theme-dark, .theme-light) .community-v11-member-copy strong` (@media (min-width: 1100px)): color: var(--os-color-ink); font: 650 14px/18px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:9094` — `body:is(.theme-dark, .theme-light) .community-v11-member-copy small, body:is(.theme-dark, .theme-light) .community-v11-members-empty` (@media (min-width: 1100px)): margin: 0; color: var(--os-color-ink-muted); font: 400 13px/17px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:9101` — `body:is(.theme-dark, .theme-light) .community-v11-members-view-all` (@media (min-width: 1100px)): margin-top: 20px; padding-bottom: 4px; color: var(--os-color-accent); font: 700 14px/20px var(--44ui-font-app); text-decoration: none.
- `src/styles/44-ui/canonical-system.css:9110` — `body:is(.theme-dark, .theme-light) .community-v11-members-view-all:hover` (@media (min-width: 1100px)): text-decoration: underline.
- `src/styles/44-ui/canonical-system.css:9154` — `body:is(.theme-dark, .theme-light) .community-v11-opening .community-intent-tab` (@media (min-width: 769px)): font: 600 14px/18px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:9186` — `body:is(.theme-dark, .theme-light) .community-intent-tab`: padding: 0 14px; color: var(--os-color-ink-secondary); font: 600 13px/16px var(--44ui-font-app); text-decoration: none.
- `src/styles/44-ui/canonical-system.css:9244` — `body:is(.theme-dark, .theme-light) .community-v11-composer-heading h2`: margin: 0; color: var(--os-color-ink); font: 700 22px/26px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:9250` — `body:is(.theme-dark, .theme-light) .community-v11-composer-close`: color: var(--os-color-ink-secondary); font: 300 28px/1 var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:9264` — `body:is(.theme-dark, .theme-light) .community-v11-composer > textarea`: padding: 14px 16px; color: var(--os-color-ink); font: 400 16px/23px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:9290` — `body:is(.theme-dark, .theme-light) .community-composer-intent`: padding: 0 14px; color: var(--os-color-ink-secondary); font: 600 13px/16px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:9316` — `body:is(.theme-dark, .theme-light) .community-composer-helper, body:is(.theme-dark, .theme-light) .community-composer-audience`: margin: 0; color: var(--os-color-ink-muted); font: 500 12px/16px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:9353` — `body:is(.theme-dark, .theme-light) .community-reference-group-label`: padding: 9px 12px 5px; color: var(--os-color-ink-muted); font: 700 11px/14px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:9380` — `body:is(.theme-dark, .theme-light) .community-intent-label`: color: var(--os-color-accent); font: 700 11px/14px var(--44ui-font-app); white-space: nowrap.
- `src/styles/44-ui/canonical-system.css:9386` — `body:is(.theme-dark, .theme-light) .social-rich-reference[data-reference-kind="item"]`: color: var(--os-color-accent); text-decoration: none.
- `src/styles/44-ui/canonical-system.css:9395` — `body:is(.theme-dark, .theme-light) .social-rich-reference[data-reference-kind="person"]`: color: var(--os-color-accent); text-decoration: none.
- `src/styles/44-ui/canonical-system.css:9764` — `body:is(.theme-dark, .theme-light) .os-mobile-search-overlay-field input` (@media (max-width: 768px)): padding: 0; color: var(--os-color-ink); font: 500 16px/22px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:9790` — `body:is(.theme-dark, .theme-light) .os-mobile-search-suggestion` (@media (max-width: 768px)): gap: 12px; padding: 8px 4px; color: var(--os-color-ink); font: 500 16px/22px var(--44ui-font-app); text-align: left.
- `src/styles/44-ui/canonical-system.css:9826` — `body:is(.theme-dark, .theme-light) .os-mobile-search-suggestion-secondary` (@media (max-width: 768px)): color: var(--os-color-ink-muted); font-weight: 500.
- `src/styles/44-ui/canonical-system.css:9832` — `body:is(.theme-dark, .theme-light) .os-mobile-search-status` (@media (max-width: 768px)): padding: 18px 4px; color: var(--os-color-ink-muted); font: 500 14px/20px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:9839` — `body:is(.theme-dark, .theme-light) .community-edited-label`: margin-left: auto; color: var(--os-color-ink-muted); font: 500 11px/14px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:9880` — `body:is(.theme-dark, .theme-light) .community-report-body h2`: color: var(--os-color-ink); font: 700 22px/27px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:9885` — `body:is(.theme-dark, .theme-light) .community-report-body p, body:is(.theme-dark, .theme-light) .community-report-body label > span`: color: var(--os-color-ink-secondary); font: 500 13px/18px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:9896` — `body:is(.theme-dark, .theme-light) .community-report-body small`: color: var(--os-color-ink-muted); font: inherit.
- `src/styles/44-ui/canonical-system.css:9915` — `body:is(.theme-dark, .theme-light) .social-row-show-more`: padding: 0; color: var(--os-color-ink); font: 700 13px/16px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:9931` — `body:is(.theme-dark, .theme-light) .community-v11-page .app-header .ui44-type-page-title` (@media (max-width: 768px)): font: 700 32px/36px var(--44ui-font-app); letter-spacing: -0.025em.
- `src/styles/44-ui/canonical-system.css:10094` — `body:is(.theme-dark, .theme-light) :is(.community-v11-page, .community-thread-v11) .social-avatar` (@media (max-width: 768px)): font-size: 11px.
- `src/styles/44-ui/canonical-system.css:10103` — `body:is(.theme-dark, .theme-light) :is(.community-v11-page, .community-thread-v11) .social-row-meta` (@media (max-width: 768px)): gap: 4px; font: 400 13px/18px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:10113` — `body:is(.theme-dark, .theme-light) :is(.community-app-page.community-v11-page, .community-thread-v11) .social-row.ui44-list-row-community .social-author-name` (@media (max-width: 768px)): font: 600 13px/18px var(--44ui-font-app); white-space: nowrap.
- `src/styles/44-ui/canonical-system.css:10151` — `body:is(.theme-dark, .theme-light) :is(.community-v11-page, .community-thread-v11) .social-time` (@media (max-width: 768px)): margin-left: auto; font: 400 13px/18px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:10160` — `body:is(.theme-dark, .theme-light) :is(.community-v11-page, .community-thread-v11) .community-intent-label` (@media (max-width: 768px)): margin-left: 0; font: 600 13px/18px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:10197` — `body:is(.theme-dark, .theme-light) :is(.community-app-page.community-v11-page, .community-thread-v11) .social-row.ui44-list-row-community .ui44-community-body` (@media (max-width: 768px)): font: 400 15px/21px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:10210` — `body:is(.theme-dark, .theme-light) :is(.community-app-page.community-v11-page, .community-thread-v11) .social-row.ui44-list-row-community .social-actions .ui44-row-action` (@media (max-width: 768px)): font: 400 13px/18px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:10231` — `body:is(.theme-dark, .theme-light) :is(.community-v11-page, .community-thread-v11) .ui44-community-body` (@media (max-width: 768px)): margin-top: 0; color: var(--os-color-ink); font: 400 16px/23px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:10338` — `body:is(.theme-dark, .theme-light) .community-thread-replies-heading h1`: margin: 0; color: var(--os-color-ink); font: 700 24px/29px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:10344` — `body:is(.theme-dark, .theme-light) .community-thread-replies-heading span`: color: var(--os-color-ink-muted); font: 600 13px/18px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:10390` — `body:is(.theme-dark, .theme-light) .community-thread-reply-context`: color: var(--os-color-accent); font: 600 12px/16px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:10395` — `body:is(.theme-dark, .theme-light) .community-thread-reply .social-row-body`: margin: 0; color: var(--os-color-ink); font: 400 15px/22px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:10465` — `body:is(.theme-dark, .theme-light) .community-thread-branch-controls button`: padding: 0 8px; color: var(--os-color-ink-secondary); font: 650 12px/16px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:10480` — `body:is(.theme-dark, .theme-light) .community-thread-empty`: gap: 7px; padding: 28px; text-align: center.
- `src/styles/44-ui/canonical-system.css:10490` — `body:is(.theme-dark, .theme-light) .community-thread-empty strong`: color: var(--os-color-ink); font: 700 17px/22px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:10495` — `body:is(.theme-dark, .theme-light) .community-thread-empty span`: margin-bottom: 8px; color: var(--os-color-ink-muted); font: 400 14px/20px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:10501` — `body:is(.theme-dark, .theme-light) .community-thread-permalink`: color: var(--os-color-ink-muted); font: 600 11px/14px var(--44ui-font-app); text-decoration: none.
- `src/styles/44-ui/canonical-system.css:10534` — `body:is(.theme-dark, .theme-light) .community-thread-composer-context`: gap: 12px; padding: 2px 8px; color: var(--os-color-ink); font: 600 12px/16px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:10549` — `body:is(.theme-dark, .theme-light) .community-thread-composer-context button`: color: var(--os-color-ink-secondary); font: 400 20px/1 var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:10569` — `body:is(.theme-dark, .theme-light) .community-thread-composer-input.ui44-textarea`: padding: 11px 14px; color: var(--os-color-ink); font: 400 15px/21px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:10591` — `body:is(.theme-dark, .theme-light) .community-thread-composer-gate`: color: var(--os-color-ink); font: 650 13px/18px var(--44ui-font-app); text-align: center; text-decoration: none.
- `src/styles/44-ui/canonical-system.css:10669` — `body:is(.theme-dark, .theme-light) .community-thread-replies-heading h1` (@media (max-width: 768px)): font: 700 19px/24px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:10890` — `body:is(.theme-dark, .theme-light) .community-thread-composer-input.ui44-textarea` (@media (max-width: 768px)): font-size: 16px.
- `src/styles/44-ui/canonical-system.css:10924` — `body:is(.theme-dark, .theme-light) .community-app-page.community-v11-page .social-rich-link` (@media (max-width: 768px)): color: var(--os-color-accent) !important; font-weight: 700.
- `src/styles/44-ui/canonical-system.css:10929` — `body:is(.theme-dark, .theme-light) .community-app-page.community-v11-page .social-attached-item-card` (@media (max-width: 768px)): column-gap: 12px; margin-top: 4px; padding: 8px; color: var(--os-color-ink); text-decoration: none.
- `src/styles/44-ui/canonical-system.css:10974` — `body:is(.theme-dark, .theme-light) .community-app-page.community-v11-page .social-attached-item-title` (@media (max-width: 768px)): color: var(--os-color-ink); font: 600 15px/19px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:10979` — `body:is(.theme-dark, .theme-light) .community-app-page.community-v11-page .social-attached-item-type` (@media (max-width: 768px)): color: var(--os-color-ink-muted); font: 400 13px/17px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:10998` — `body:is(.theme-dark, .theme-light) .community-app-page.community-v11-page .community-post-tag` (@media (max-width: 768px)): gap: 4px; margin-left: auto; color: var(--os-color-ink-muted); font: 400 15px/20px var(--44ui-font-app); white-space: nowrap.
- `src/styles/44-ui/canonical-system.css:11009` — `body:is(.theme-dark, .theme-light) .community-app-page.community-v11-page .community-post-tag .community-intent-label` (@media (max-width: 768px)): color: var(--os-color-ink-muted) !important; font: 400 15px/20px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:11116` — `.library-sort-options .ui44-paper-menu-item`: gap: 10px; text-align: left.
- `src/styles/44-ui/canonical-system.css:11117` — `.library-sort-options .ui44-paper-menu-item > span`: text-align: center.
- `src/styles/44-ui/canonical-system.css:11179` — `.library-music-release-header h1` (@media (max-width: 700px)): font-size: 22px.
- `src/styles/44-ui/canonical-system.css:11207` — `body:is(.theme-dark, .theme-light) :is(.ui44-button, .os-button), body:is(.theme-dark, .theme-light) :is(.ui44-button, .os-button):is(:link, :visited)`: padding: 15px 16px !important; color: var(--os-color-ink) !important; font: 600 16px/22px var(--os-font-app) !important; letter-spacing: 0; text-align: center !important; text-decoration: none.
- `src/styles/44-ui/canonical-system.css:11273` — `body:is(.theme-dark, .theme-light) .calendar-toolbar .os-button` (@media (max-width: 700px)): padding: 0 !important; font-size: 0 !important.
- `src/styles/44-ui/canonical-system.css:11293` — `body:is(.theme-dark, .theme-light) .ui44-action-button, body:is(.theme-dark, .theme-light) .ui44-action-button:is(:link, :visited)`: padding: 0 16px !important; color: var(--os-color-ink) !important; font: 600 16px/22px var(--os-font-app) !important; text-align: center !important; text-decoration: none !important; white-space: nowrap.
- `src/styles/44-ui/canonical-system.css:11408` — `body:is(.theme-dark, .theme-light) .ui44-flat-track-list .view-track-more`: padding: 0; color: var(--os-color-ink); font: 700 16px/1 var(--os-font-app); letter-spacing: 2px.
- `src/styles/44-ui/canonical-system.css:11464` — `body:is(.theme-dark, .theme-light) .item-community-section .item-community-new-post`: color: var(--os-color-accent); font: 600 15px/1.3 var(--os-font-app); text-decoration: none; white-space: nowrap.
- `src/styles/44-ui/canonical-system.css:11471` — `body:is(.theme-dark, .theme-light) .item-community-empty-state`: gap: 8px; padding: 28px 18px; text-align: center.
- `src/styles/44-ui/canonical-system.css:11505` — `body:is(.theme-dark, .theme-light) .library-achievement-trophy-heading`: gap: 12px; color: var(--os-color-ink); font: 600 17px/1.25 var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:11587` — `body:is(.theme-dark, .theme-light) .library-achievement-row .ui44-achievement-title`: font: 600 16px/1.3 var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:11591` — `body:is(.theme-dark, .theme-light) .library-achievement-row .ui44-achievement-secondary`: margin-top: 3px; font: 400 13px/1.35 var(--44ui-font-app); white-space: nowrap.
- `src/styles/44-ui/canonical-system.css:11642` — `body:is(.theme-dark, .theme-light) .studio-overview-copy`: gap: 3px; text-align: left.
- `src/styles/44-ui/canonical-system.css:11650` — `body:is(.theme-dark, .theme-light) .studio-overview-title`: color: var(--os-color-ink); font: 600 16px/20px var(--44ui-font-app); white-space: nowrap.
- `src/styles/44-ui/canonical-system.css:11660` — `body:is(.theme-dark, .theme-light) .studio-overview-subtitle`: color: var(--os-color-ink-secondary); font: 400 13px/17px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:11670` — `body:is(.theme-dark, .theme-light) .studio-overview-secondary`: color: var(--os-color-ink-secondary); font: 400 12px/16px var(--44ui-font-app); white-space: nowrap.
- `src/styles/44-ui/canonical-system.css:11744` — `body:is(.theme-dark, .theme-light) .studio-artwork-prompt`: gap: 9px; padding: 24px; text-align: center.
- `src/styles/44-ui/canonical-system.css:11763` — `body:is(.theme-dark, .theme-light) .studio-artwork-prompt strong`: font: 700 22px/1.2 var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:11767` — `body:is(.theme-dark, .theme-light) .studio-artwork-prompt small`: color: var(--os-color-ink-secondary); font: 400 15px/1.3 var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:11852` — `body:is(.theme-dark, .theme-light) .studio-achievement-setting-copy strong`: color: var(--os-color-ink); font: 600 15px/20px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:11857` — `body:is(.theme-dark, .theme-light) .studio-achievement-setting-copy span`: color: var(--os-color-ink-secondary); font: 400 13px/18px var(--44ui-font-app).
- `src/styles/44-ui/canonical-system.css:11874` — `body:is(.theme-dark, .theme-light) .studio-overview-status`: color: var(--os-color-ink-secondary); font: 500 12px/16px var(--44ui-font-app); white-space: nowrap.

</details>

## Source index

### iOS

- Shared type conventions and spacing: `44OS/DesignSystem/OSDesignSystem.swift`, `OSAppHeader.swift`, `OSExperienceComponents.swift`.
- Dynamic Type environment and accessibility-test overrides: `44OS/App/AppShellView.swift`.
- Studio fixed typography and field gaps: `44OS/Features/Studio/StudioFormComponents.swift`.
- Community text segments, mentions, and URL emphasis: `44OS/Features/Community/CommunityBodyReferences.swift` and `CommunityView.swift`.
- Screen-level overrides are catalogued in the “Files with explicit Swift `.font(...)` modifiers” table above.

### Web

- Authored CSS sources: `src/app/globals.css` and `src/styles/44-ui/canonical-system.css`.
- CSS assembly: `scripts/application-css.mjs` and `scripts/prepare-surface-css.mjs`; the generated public sheet is a build artifact and is not the source of truth.
- Shared typography component API: `src/components/ui44/Typography.tsx`.
- Rendered text components: `src/components/Social.tsx`, `PublicProfileApp.tsx`, `SectionTabs.tsx`, and feature-specific route/components listed in the screen coverage table.

## Items to verify in a later parity pass

1. Re-run the iOS audit on a booted simulator with the normal **Large** text setting, recording the exact device/runtime and any accessibility-size comparison.
2. Capture computed styles on a matching iPhone-width browser viewport after the CSS is loaded. Record both viewport CSS pixels and device pixel ratio.
3. Compare page titles, body copy, form labels/inputs, list rows, metadata, buttons, profile text, and Community mentions as matched component pairs. Do not assume an equal point/pixel number means equal rendered size.
4. Keep semantic text scaling/accessibility behavior as a separate acceptance dimension from default-size visual matching.
5. Prefer consolidating local overrides only after each screen’s source values and visual role have been verified against the iOS baseline.
