# Archived 44 UI Master Audit and Migration Ledger

- Status: **Complete — canonical migration, owner review, and legacy retirement approved**
- Audit date: July 15, 2026
- Documentation consolidation and archive: July 15, 2026
- Current UI wave: **Wave 9 complete; system locked July 15, 2026**
- Audited branch and base commit: `main` at `b849c7fb7ecb0fee85c5b398808486df59eeba6b`
- Worktree authority: the release-candidate migration shown by `git status --short` at audit close
- Production deployment: **explicitly authorized by the owner after audit close; release evidence lives in `Other/44OS_MILESTONES.md`**

This is the archived checklist for the completed 44 UI migration. It records
the approved target, source implementation, route inventory, canonical
cascade, visual-review record, and cleanup evidence. The owner completed the
page-by-page desktop/mobile review and authorized release on July 15, 2026.
The active visual contract is `Other/44OS_UI.md`.

## 1. Scope, precedence, and method

### Source precedence

1. This document is the authoritative UI migration target, inventory,
   sequencing roadmap, and checklist.
2. `Other/44OS_UI.md` remains the broader visual and interaction contract.
3. `Other/44OS_FOUNDATION.md` and `Other/44OS_MILESTONES.md` govern platform
   architecture and platform-level sequencing.
4. `/44OS_UI` is the responsive living system reference and visual target.
5. Actual source wins over documentation for claims about what is currently
   rendered, imported, referenced, or overridden.

When an older document conflicts with the active migration, the target in the
master registry and `/44OS_UI` wins. A migrated
implementation is not considered approved until the owner has reviewed it
locally.

### Included

- All 44 production/source `page.tsx` surfaces, including signed-in, creator,
  admin, feature-flagged, reader, launch, Radio, and payment-disabled routes.
- Global Shell, Dock, Topbar, menus, player, dialogs, notifications, and
  context providers that render UI outside route content.
- Every shared component under `src/components` that emits or controls visual
  markup, including currently unreferenced component candidates.
- `src/app/globals.css` and every stylesheet in `src/styles/44-ui`.
- Desktop, light/dark appearance, 430px, 390px, 320px, hover/pointer states,
  reduced motion, keyboard/focus, loading, empty, error, content, disabled,
  signed-out, fan, creator, and admin states where applicable.

### Excluded as migration targets

- `/44OS_UI`: responsive target/reference surface only.
- `Other/Interactable Demo`: explicitly excluded in full, including the Unity
  export and its support files.
- Backend behavior, database contracts, product copy changes, deployment, and
  new feature activation.

### Audit method

- Enumerated the `src/app/**/page.tsx` graph and followed static imports and
  re-exports through `src/components`.
- Parsed production TSX to count native controls, forms, class attributes,
  inline styles, `ui44` component instances, and dynamic class expressions.
- Parsed all three active CSS files to count rules, declarations, custom
  properties, classes, media blocks, keyframes, and `!important` declarations.
- Read selector groups and their cascade context, traced `className` values,
  class-related variables/helpers, DOM selector APIs, and dynamic class
  prefixes, and proved exact-selector shadowing before removal.
- Reconciled the result with the former UI handoff and family sub-audits before
  their July 15 consolidation into this ledger, plus the responsive reference page.

## 2. Status vocabulary

Implementation, review, and cleanup are deliberately independent.

| Axis | Allowed value | Meaning |
| --- | --- | --- |
| Implementation | `legacy` | Production still relies on the old component/rule family. |
| Implementation | `mixed` | New tokens/components and legacy markup or overrides both affect the result. |
| Implementation | `migrated` | Every known production instance uses the intended new primitive/rules. |
| Implementation | `specialized-retain` | The surface intentionally remains outside the generic panel/component family. |
| Implementation | `audit-only` | It exists only to demonstrate or inspect the target system. |
| Review | `unreviewed` | No current owner visual approval. |
| Review | `changes-requested` | Owner feedback requires repair before approval. |
| Review | `approved` | Owner accepted the family at the required routes and sizes. |
| Cleanup | `blocked-by-reference` | Live or compatibility references still require the rule/component. |
| Cleanup | `ready-after-approval` | Source references are gone, but owner approval or explicit retirement authorization is still required. |
| Cleanup | `retired` | References are gone, retirement was authorized, and old source was removed. |

No `migrated` status implies `approved`. No `approved` status authorizes cleanup
unless the cleanup axis is also ready or the owner explicitly authorizes the
retirement pass.

## 3. Executive source census

### Route and component baseline

| Measure | Current result |
| --- | ---: |
| All `page.tsx` files | 45 |
| Production/source route surfaces | 44 |
| Reference route surfaces | 1 (`/44OS_UI`) |
| Production-reachable TSX files scanned | 97 |
| Shared component TSX files, including `ui44` | 43 |
| Native `<button>` elements in production-reachable TSX | 177 |
| Raw `<input>` elements outside the canonical primitive definition | 0 |
| Raw `<textarea>` elements outside the canonical primitive definition | 0 |
| Raw `<select>` elements outside the canonical primitive definition | 0 |
| `Ui44TextInput` production instances | 55 |
| `Ui44Textarea` production instances | 15 |
| `Ui44SelectInput` production instances | 19 |
| `Ui44CheckboxInput` production instances | 2 |
| `Ui44RangeInput` production instances | 4 |
| `Ui44FileInput` production instances | 2 |
| Native `<form>` elements in production TSX | 23 |
| Inline `style` attributes in production TSX | 9 dynamic/runtime-data occurrences; 0 static style objects |
| Production `className` attributes | 1,584 |
| Conservative source tokens retained by the class scanner | 1,155 |
| Dynamic/template class prefixes resolved by the scanner | 24 |

The former input sub-audit reported 59 inputs. The post-retirement source
census finds 63 semantic input instances: 55 standard/date inputs, two
checkboxes, four ranges, and two files. All render through an explicit `ui44`
primitive. The 15 textareas and 19 selects do as well, leaving no raw
`input`, `textarea`, or `select` tag in production route/component source
outside `ui44/Inputs.tsx`.

The class scanner deliberately over-collects literal text from class/icon
helpers, SVG paths, CSS-variable strings, and DOM selector APIs so a live
dynamic selector cannot be deleted by mistake. Its token total is therefore a
retention boundary, not a missing-class count. The decisive orphan check is the
all-source CSS result: every retained class selector is referenced by
production source, a reference route, a documented dynamic prefix, or an
external/runtime state contract.

### CSS baseline

| Measure | Current result |
| --- | ---: |
| Active CSS files | 3: production globals, canonical system, responsive system reference |
| CSS rules | 2,677 |
| CSS selectors | 3,025 |
| CSS declarations | 9,282 |
| Custom-property definitions, including contextual repeats | 609 |
| Unique custom-property names | 288 |
| Unique `--os-*` names | 208 |
| Unique `--44ui-*` names | 73 |
| Other custom-property names | 7 |
| Unique CSS class names | 1,178 |
| `!important` declarations | 51 total: 49 production, 2 reference-only |
| Media-query blocks | 220 |
| Unique media conditions | 20 |
| Keyframes | 13 |
| Fully unreferenced CSS rules/selectors across production and reference source | 0 / 0 |
| Exact-selector/context declarations shadowed by a later declaration | 0 |

The retained production-unused rules belong to the responsive reference route or
their canonical specimen APIs. Dynamic classes, pseudo-elements, server
states, third-party/editor markup, and feature-flagged routes are preserved by
the source-aware audit rather than guessed from a rendered happy path.

### Current canonical-component adoption

| New primitive | Production instances | Current source | Status |
| --- | ---: | --- | --- |
| `Ui44SelectInput` | 19 | Store filters, Settings, Studio Item new/edit, Event editor, Updates, and Sample Preview controls | `migrated` / `unreviewed` |
| `Ui44SectionArrow` | 4 call sites | `StoreApp`, Store Item similar section, `HubSection` default action | `migrated` / `unreviewed` |
| `Ui44OverflowTrackTitle` | 3 call sites | Store Item tracks, Library Item tracks, Sample Pack previews | `migrated` / `unreviewed` |
| `Ui44TextInput` | 55 | Auth, Settings, Studio, Search, Community, Inbox, profile, Store/Library, Support, shared editors | `migrated` / `unreviewed` |
| `Ui44Textarea` | 15 | Community, thread replies, Studio, Inbox, profile, reviews/questions, updates | `migrated` / `unreviewed` |
| `Ui44CheckboxInput` | 2 | Studio item attestation and feature control | `migrated` / `unreviewed` |
| `Ui44RangeInput` | 4 | Player timeline/volume and profile crop | `migrated` / `unreviewed` |
| `Ui44FileInput` | 2 | Profile photo and shared upload field | `migrated` / `unreviewed` |
| `Ui44Button` | 0 | Reference pages only | `audit-only` |
| `Ui44Text` | 0 | Reference pages and `ui44` internals only | `audit-only` |
| `Ui44Panel` component API | 10 direct production instances | Admin, Radio setup, Studio overview/gates, Payouts, and Studio Radio; all former `GlassPanel` calls | `migrated` / `unreviewed` |
| Glass/list class contract | 63 additional explicit Glass sites plus canonical list/row emitters | Ordinary panels plus dashboard, Studio, settings, notification, product, Community, Inbox, cart/checkout, profile, and detail row families | `migrated` / `unreviewed` |
| `Ui44PageHeader`, `Ui44FormGrid`, `Ui44FormField`, `Ui44IdentityAvatar` | 0 | Reference pages only | `audit-only` |

## 4. Contradiction and reconciliation ledger

| ID | Conflict | Resolution for this migration |
| --- | --- | --- |
| CON-01 | `44OS_UI.md` retains older 42px mobile-title language; the canonical registry/reference scale defines 34/41. | Use 34/41 for the canonical mobile page-title role. Record any intentionally larger hero as specialized. |
| CON-02 | `44OS_UI.md` says track titles do not marquee; the canonical `Ui44OverflowTrackTitle` behavior permits movement for an overflowing playing/hovered/focused/tapped title. | This ledger wins for the active migration. Non-engaged titles ellipsize; engaged overflowing titles may move and must honor reduced motion. |
| CON-03 | Older player guidance assigned Paper broadly while later guidance called for a theme-aware player pass. | **Resolved in Wave 6:** the mini player is a theme-aware Glass control surface; expanded Now Playing is the owner-approved sole non-dropdown Paper exception on desktop and mobile. Radio remains a separate specialized composition. |
| CON-04 | Several `proposed-*.css` files described themselves as audit-only while all five were imported globally. | **Resolved in Wave 8:** production values moved into `canonical-system.css`; all five proposed files and imports were retired. |
| CON-05 | The former input sub-audit said migrated, while the audit baseline retained Community regressions and unverified corrective overrides. | Wave 1 replaced every raw production control with an explicit `ui44` primitive and repaired the reply/new-post cascades. FAM-17–21 are now `migrated` but remain `unreviewed` until owner approval. |
| CON-06 | The former Paper-menu sub-audit said migrated while legacy selectors, positioning exceptions, and unreviewed routes remained. | Wave 5 now separates the axes: implementation is `migrated`, visual review is `unreviewed`, and legacy cleanup is only `ready-after-approval`. |
| CON-07 | The former `UiAuditPage` called itself a proposal even though its token layer affected production. | **Resolved:** `/44OS_UI` is a reference-only living registry that renders the real canonical tokens/classes/components and labels source ownership explicitly. |
| CON-08 | `canonical-system.css` was named canonical but contained repeated high-specificity compatibility overrides and audit-example rules. | **Resolved in Wave 8 and the `/44OS_UI` follow-up:** route layout lives in `system-reference.css`; orphaned former audit rules were retired; exact shadowed declarations are zero. |
| CON-09 | Input counts in the earlier audit no longer match source. | This ledger's source counts supersede copied totals; re-run counts after every migration wave. |

## 5. Canonical target registry

### Materials, geometry, and elevation

| Target | Light value | Dark value | Desktop | Mobile | Intended use |
| --- | --- | --- | ---: | ---: | --- |
| Paper material | `#ffffff` | `#1c1e1b` | 24px radius | 16px radius | Dropdowns, menus, popovers, and their floating selection lists only |
| Glass material | Mobile/base light Glass `rgba(255,255,255,.18)` | Mobile/base dark Glass `rgba(255,255,255,.03)` | Desktop Control Surface fill, `color-mix(in srgb, var(--os-color-ink) 8%, transparent)`, shared with Search/Notifications/symbol controls and exposed through `--44ui-material-glass`; 24px radius | Approved base Glass material and optical behavior; 16px radius | Every ordinary content/form panel, including Community, achievements, Studio rows, dialogs, Product Details, and Release Details |
| Uniform border | `rgba(0,0,0,.16)` | `rgba(255,255,255,.14)` | 1px | 1px | All normal panel families |
| Input radius | theme-independent | theme-independent | 16px | 12px | Standard fields; search retains pill exception |
| Menu item radius | theme-independent | theme-independent | 17px | 12px | Inset Paper-menu highlights |
| Flat elevation | `none` | `none` | same | same | Every Glass panel, Glass dialog, Glass toast, and Glass player surface |
| Raised elevation | `0 18px 48px rgba(0,0,0,.16)` | `0 20px 54px rgba(0,0,0,.38)` | same | same | Paper menus/popovers/context menus/player sheets and catalog/media cards |
| Scrim | `rgba(0,0,0,.32)` | `rgba(0,0,0,.44)` | same | same | Modal/player overlay |

Invariants: neutral uniform borders only; no gradient, one-sided, or inset
panel borders. Glass is the sole ordinary panel material, including Tracklists,
sample-preview lists, Product Details, and Release Details. Paper is restricted to dropdown/menu
content and floats above the owning control. Modal sheets use Glass or a
documented specialized material plus the strongest elevation and scrim;
highlights stay inside the panel radius.

### Spacing and target geometry

| Relationship/token | Desktop | Mobile | Narrow mobile (≤420px) |
| --- | ---: | ---: | ---: |
| Page inset / `--44ui-page-inset` | `clamp(44px, 4.4vw, 72px)` | 18px | 14px |
| Section gap / `--44ui-section-gap` | 48px | 40px | 40px |
| Title to description | 8px | 8px | 8px |
| Header to content / `--44ui-header-content-gap` | 20px | 16px | 16px |
| Form/empty panel inset / `--44ui-panel-inset` | 24px | 16px | 16px |
| Panel content gap / `--44ui-panel-content-gap` | 20px | 16px | 16px |
| Row inset X / `--44ui-row-x` | 24px | 16px | 16px |
| Standard row inset Y / `--44ui-row-y` | 20px | 16px | 16px |
| Compact track row inset Y | 14px | 11px | 11px |
| Interactive target / `--44ui-target` | 44px minimum | 44px minimum | 44px minimum |
| Inline identity avatar | 34px | 34px | 34px |

Fields use a 12-column desktop grid: short spans 4, medium 6, wide 8, and
full spans 12. At 769–900px, short and three-column fields relax to 6 columns.
At 768px and below, all fields stack to full width.

### Typography

System stack only:
`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
No bundled or downloaded SF Pro files. Allowed weights are 400, 500, 600,
and 700. Letter spacing is normal. Labels use sentence case.

| Semantic role | Desktop | Mobile | Canonical API |
| --- | --- | --- | --- |
| Page title | 26/32, 700 | 34/41, 700 | `Ui44Text variant="page-title"` |
| Major section title | 22/26, 700 | 28/34, 700 | `section-title` |
| Subsection title | 17/22, 700 | 22/28, 700 | `subsection-title` |
| Headline/card title | 13/16, 600 | 17/22, 600 | `headline` |
| Body | 13/18, 400 | 17/24, 400 | `body` |
| Callout | 12/15, 500 | 16/21, 400 | `callout` |
| Subheadline | 11/14, 400 | 15/20, 400 | `subheadline` |
| Meta | 10/13, 400 | 13/18, 400 | `meta` |
| Caption | 10/13, 500 | 12/16, 400 | `caption` |
| Field label | 12/15, 600 | 15/20, 600 | `field-label` |
| Control | 13/16, 600 | 17/22, 600 | `control` |

Semantic tones: primary, secondary, tertiary, placeholder, disabled, success,
warning, danger, accent, and inherit. Status meaning must not rely on color
alone.

### Inputs, buttons, symbols, menus, rows, and identity

| Family | Approved target | Required behavior |
| --- | --- | --- |
| Standard text entry | `Ui44TextInput` / `.ui44-input`; production compatibility uses `.os-input-field` and `.profile-edit-input` | 44px control height, shared material/border/type, hover only on fine pointer, visible focus, 16px-safe mobile text |
| Long text | Canonical textarea behavior | Standalone textarea may own the field surface; composed editor uses one outer surface and a bare transparent inner editor |
| Native select | `Ui44SelectInput` | Persistent CSS caret, same field geometry/type, full-width wrapper where its grid cell requires it |
| Search | Composed canonical input | Pill geometry, one focus surface, expands left in right-side topbar position |
| Tag entry | Specialized composed input | Preserve tokens/chips; input shell uses input material and result list uses Paper |
| Button | `Ui44Button` variants `default`, `destructive`, `unavailable` | Matches field height; desktop destructive neutral at rest/red on hover; mobile destructive red at rest; unavailable disabled/gray |
| Symbol | Neutral 44px icon-button surface | Open equals hover; add/filter icon does not turn into X; accent only when a filter is actually active |
| Section action | `Ui44SectionArrow` | Compact trailing arrow with accessible label; replaces generic “View All” pills where approved |
| Paper menu | Paper panel plus canonical item geometry | Content-sized within viewport; right triggers align right, left triggers align left; Escape/outside/focus/keyboard preserved |
| Content panel | `Ui44Panel`; `glass` is the only content-panel variant | No nested cards; uniform border; approved inset/gap/elevation |
| Content row | `Ui44ListRow` and domain variants | 44px target, canonical insets/dividers/type; leading/copy/trailing columns remain collision-safe |
| Track row | Glass panel with rows plus overflow-aware title | Compact inset; title ellipsizes until engaged; duration fixed; reduced motion disables movement |
| Inline identity | `Ui44IdentityAvatar size="inline"` | 34px for Community, reviews, messages, notifications, creator attribution |
| Hero identity | Responsive specialized avatar | Preserve existing large profile/hero treatment |
| Modal/sheet | Glass or theme-aware specialized sheet plus scrim | Strongest elevation, focus/keyboard dismissal, no hidden Dock collision; Paper remains dropdown-only |

### Specialized exceptions

| Surface | Target disposition |
| --- | --- |
| App environment and `.app-shell` | Retain as the single environment/shell-glass system. Do not map to content panels. |
| Sidebar/Dock | Retain specialized navigation geometry and current app registry ownership. Audit spacing/focus only. |
| Topbar | Retain specialized shell position; migrate its controls and menus through symbol/Paper families. |
| Product/item hero | Retain responsive media/identity composition; consume canonical text/actions where applicable. |
| Radio | Remain card-free and titleless in its live state. |
| PDF reader | Retain route-local immersive toolbar/stage and entitlement behavior. |
| Interactive launch | Retain immersive isolated runtime and Desktop Required mobile state. |
| Music player | Retain playback composition; separately migrate the desktop surface and mobile bottom-sheet contract. |
| Calendar | Retain desktop month/mobile agenda mode change; migrate its ordinary header, controls, rows, and surface tokens. |

## 6. Current component-family registry

This is the primary migration checklist. Route matrices in Sections 10 and 11
provide the exhaustive page coverage; the source-component register in Section
7 provides the implementation owners.

| ID | Family | Current implementation and coverage | Desktop current state | Mobile current state | Target/disposition | Implementation | Review | Cleanup |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FAM-01 | Environment and app shell | `.app-environment*`, `.app-frame`, `.app-shell`, `SystemShell` on every normal route | Unified framed glass window | Full viewport shell with safe areas | Specialized retain | `specialized-retain` | `approved` for existing shell; not reopened by this migration | `retired` |
| FAM-02 | Sidebar and Dock | `Sidebar`, `osApps`, `.sidebar*`, `.mobile-dock*`, `.mobile-nav*` | Expanded/compact navigation rail | Five fixed Dock destinations; optional slide-over markup remains source-owned | Specialized retain; canonical focus/target checks only | `specialized-retain` | `unreviewed` in final system sweep | `retired` |
| FAM-03 | Topbar structure | `Topbar`, `TopbarContext`, `.os-topbar*`; all search/cart/back/bell/avatar triggers resolve to the 44px symbol contract and all transient menus resolve to Paper | Specialized navigation composition with canonical controls | Specialized containment and safe-area composition with canonical controls | Retain shell structure; consume canonical symbols, targets, focus, and Paper | `specialized-retain` | `unreviewed` | `retired` |
| FAM-04 | Page headers | `HubHero`, `.ui44-page-header*`, canonicalized auth/error/Inbox/Community headings | 26/32 title plus 13/18 supporting copy | 34/41 title with responsive action containment | Canonical page-header behavior; route composition may remain source-owned | `migrated` | `unreviewed` | `retired` |
| FAM-05 | Section headers/actions | `SectionHeader`, `HubSection`, `.ui44-section-header*`, `Ui44SectionArrow` | 22/26 title, canonical copy/action grid, 44px trailing action | 28/34 title and collision-safe stacked/wrapped actions | Canonical section header and approved trailing navigation | `migrated` | `unreviewed` | `retired` |
| FAM-06 | Typography | Production-scoped canonical type variables, `Ui44Text`, and compatibility aliases now share one role registry | Canonical 26/32 through 10/13 roles and semantic tones | Canonical 34/41 through 12/16 roles; older page declarations cannot win | `Ui44Text` roles and semantic tones with compatibility aliases during cleanup | `migrated` | `unreviewed` | `retired` |
| FAM-07 | Page and section spacing | `.app-page`, `.dashboard-page`, `.social-shell`, `.view-hub`, semantic source-layout classes | Canonical page/section/panel relationships; no static JSX style objects | Same relationships with mobile tokens and one-column form collapse | `--44ui-*` relationships and shared containers | `migrated` | `unreviewed` | `retired` |
| FAM-08 | Paper panels | Nine explicit source emitters cover account, notifications, context, filters/create, tags, mentions, and editor selection lists | Canonical Paper, 24px radius, floating elevation, content/variant width | Canonical Paper, 16px radius, viewport clamp | `.ui44-paper-menu`; dropdown/menu/selection content only | `migrated` | `unreviewed` | `retired` |
| FAM-09 | Glass panels | `Ui44Panel` and explicit canonical Glass class sites cover dashboard/form/list/social/calendar/settings/dialog surfaces plus Product and Release Details. Profile posts and Support resolve through the same canonical desktop recipe. | Canonical 24px Glass aliases the 8% OS Control Surface fill and uses the same uniform border and content elevation as Profile, Community, and Support. It does not alter the environment gradient. | Canonical 16px Glass retains the approved base material (`rgba(255,255,255,.18)` light, `.03` dark) inside the shared page gutter; ordinary panels do not use full-bleed exceptions | `Ui44Panel variant="glass"`; sole ordinary content panel | `migrated` | `unreviewed` | `retired` |
| FAM-11 | Catalog cards and shelves | `ProductCard` on Home/Store/category/Search/related Items; `LibraryCard` on Library/category; `SocialArtifactCard` on public-profile artifact tabs; canonical `ProductGrid`/`ArtifactGrid`; source-only `Shelf` has the same grid contract | Transparent artwork-first link; four columns, three at 769–1080px, 20px gap; 16px media radius; canonical Raised elevation; 13/16 title, 11/14 subheadline, 10/13 metadata | Two columns; 18px gap at 430px and 14px at 420px and below; 12px media radius; 17/22 title, 15/20 subheadline, 13/18 metadata | Retain domain aspect ratios, links, context menus, ordering, and actions; consume `.ui44-catalog-*` text/elevation/focus/motion/grid grammar | `migrated` | `unreviewed` | `retired` |
| FAM-12 | Generic rows and lists | 38 static row-class occurrences across 36 JSX row expressions in 22 production files and 28 owning list-surface emitters; Studio, settings, notifications, updates/reviews/questions, details, Inbox/search/profile, cart/checkout, events, Community structured/reply rows, bonuses/files, and moderation | Canonical 20px/24px inset, 44px minimum target, transparent static rows, uniform dividers, explicit dashboard/detail/profile/notification/Studio/cart/checkout/Inbox/social variants; only declared interactive rows receive hover/pointer/focus feedback | Canonical 16px inset and 17/22 headline plus 15/20 secondary roles; wide-action/event rows stack; 430/390/320 checks show no horizontal overflow. Compact checkout-summary rows intentionally retain zero horizontal inset because the owning summary panel supplies it. | `Ui44ListRow` grammar plus domain variants | `migrated` | `unreviewed` | `retired` |
| FAM-13 | Track and sample rows | Three source emitters: Store release Tracklist, Library release Tracklist, and Store/Library Sample Pack previews; all use `.ui44-track-list`, `.ui44-track-row*`, and `Ui44OverflowTrackTitle` | Glass list with rows, 44/minmax/54px columns (sample trailing column is content-sized), 14px/16px inset, 13/16 title, 10/13 duration, explicit selected/hover/focus/disabled states | 38/minmax/48px columns, 11px/14px inset, 15/20 title, 13/18 duration; equal 18px/14px page gutters and no overflow | Canonical Glass track-list/interactive-row grammar plus overflow-aware title; retain playback, queue, progress, context-menu, and download behavior | `migrated` | `unreviewed` | `retired` |
| FAM-14 | Achievements | Library display rows, Studio selectable rows, shared `AchievementIconGlyph`, and runtime `AchievementToast` | Glass list with 44/minmax/auto columns, 44px glyph, 20px/24px inset, 13/16 title, 11/14 description, completion check or 44px checkbox target; floating Glass toast | 16px row inset, 17/22 title, 15/20 description, collision-safe trailing state/control; toast is viewport-contained below Topbar | `.ui44-achievement-*` display/choice/toast grammar; retain real glyph masks and unlock/checkbox/toast behavior | `migrated` | `unreviewed` | `retired` |
| FAM-15 | Community posts/replies | `SocialPostRow` plus thread replies, question/collaboration rows, accepted answers/responses, reviews, and profile/search consumers now use the approved post/row/identity/type/action grammar | Glass feed with 24px row insets, 34px identity, 13/18 copy, 44px actions, and explicit interactive/static states | Contained Glass feed with 16px row insets, 17/24 post copy, canonical nested-row type, and zero measured overflow | `Ui44CommunityPostRow` grammar with real domain links/reactions/delete behavior plus declared reply/structured variants | `migrated` | `unreviewed` | `retired` |
| FAM-16 | Inline and hero identity | 14 explicit `.ui44-identity-avatar*` source occurrences cover social, review, Library, notification, and profile ownership; hero identity remains declared specialized | Canonical 34px inline identity; route-owned hero scale | Canonical 34px inline identity; specialized profile hero reflows | Canonical inline avatar plus specialized hero identity | `migrated` | `unreviewed` | `retired` |
| FAM-17 | Standard text inputs | 55 `Ui44TextInput` instances; no raw production tags outside the primitive | Canonical 44px material, 13/18 type, 16px radius, and one focus outline | 17/24 type, 12px radius, full-width stacking, no horizontal overflow | `Ui44TextInput` | `migrated` | `unreviewed` | `retired` |
| FAM-18 | Standalone textareas | 15 `Ui44Textarea` instances; no raw production tags outside the primitive | Canonical standalone surface; route-specific compact height retained where intentional | 17/24 type, 12px radius, full-width/resize behavior retained | `Ui44Textarea`; no nested raised field | `migrated` | `unreviewed` | `retired` |
| FAM-19 | Composed editors/composers | Search, Community new post, thread replies, Inbox recipient, review/question, tag, Topbar | One owning shell; bare inner controls; Community new post retains approved Glass composition | Same ownership; Community/reply composers verified at 430/390/320 with no overflow | One canonical outer field surface; bare inner input/editor | `migrated` | `unreviewed` | `retired` |
| FAM-20 | Native selects | 15 `Ui44SelectInput` instances | Persistent caret and shared field | Persistent caret and shared field | Keep `Ui44SelectInput` | `migrated` | `unreviewed` | `retired` |
| FAM-21 | Specialized inputs | 2 `Ui44CheckboxInput`, 4 `Ui44RangeInput`, 2 `Ui44FileInput`; date/datetime use `Ui44TextInput`; switches/tag chips retain semantic components | Domain geometry retained with canonical accent/type/focus hooks | 17px-safe date/file text and 44px range target; domain geometry retained | Retain semantic geometry; map colors/type/focus to canonical tokens | `migrated` | `unreviewed` | `retired` |
| FAM-22 | Default buttons | `.os-button` primary/secondary/ghost/glass and link variants | Canonical 44px pill; 13/16 desktop type | Canonical 44px pill; 17/22 mobile type | `Ui44Button default` behavior through the canonical semantic hook | `migrated` | `unreviewed` | `retired` |
| FAM-23 | Destructive/unavailable buttons | danger/destructive/disabled classes and confirm actions | Neutral destructive rest, red fine-pointer hover; unavailable gray | Red destructive rest; unavailable gray | `Ui44Button destructive/unavailable` through the canonical semantic hook | `migrated` | `unreviewed` | `retired` |
| FAM-24 | Symbol/icon buttons | Filter/add/search/bell/back/more/cart, route-specific tool buttons | Canonical 44px neutral symbol trigger; open equals hover | Same 44px target/material; applied filter alone uses accent | Canonical symbol family; menu items/editor tools remain FAM-25/specialized | `migrated` | `unreviewed` | `retired` |
| FAM-25 | Paper menus/popovers | Account, notification, context, filters, Studio create, tag/mention autocomplete, editor tools; 8 segmented radiogroups; 2 segmented tab emitters; Support disclosure | 44px items, 13/16 type, Escape/outside/focus return, local positioning | 44px items, 17/22 type, 16px Paper radius, contained segments/tabs/disclosures | `.ui44-paper-menu`, `.ui44-paper-menu-item`, `.ui44-segmented*`, `.ui44-disclosure*` | `migrated` | `unreviewed` | `retired` |
| FAM-26 | Tabs, segments, pills, badges | Settings segments/swatches/switches, profile/notification tabs, and route status chips now declare canonical semantic classes at source | 44px tabs/segments/switches; normalized compact pill/badge grammar | 44px targets; intentional horizontal tab scrolling remains contained | Preserve semantic controls; normalize type/material/target | `migrated` | `unreviewed` | `retired` |
| FAM-27 | Dialogs, sheets, scrims, toasts | Confirm and crop dialogs use the shared dialog-focus hook and canonical scrim/surface/actions; setup gate and toasts retain declared specialized ownership | 24px modal surface/elevation; initial focus, trap, Escape, scrim dismiss, and focus return | 16px contained dialog/sheet geometry with the same dismissal/focus contract | Canonical scrim/elevation/focus/dismiss behavior with declared toast exceptions | `migrated` | `unreviewed` | `retired` |
| FAM-28 | Empty/loading/error/status | Shared empty/centered primitives and route-local loading/error/success/warning emitters use `.ui44-state*`/`.ui44-status*` plus status or alert semantics | Quiet text states by default; no decorative card unless content owns one | Same semantic grammar with responsive route containment | Shared semantic state primitives; no decorative card by default | `migrated` | `unreviewed` | `retired` |
| FAM-29 | Forms and desktop columns | 15 explicit `.ui44-form-grid` source occurrences cover Studio editors, Settings, and profile forms; canonical fields/actions already cover auth, Admin, checkout, and Community | Named grids resolve to the canonical 12-column layout | Every canonical grid collapses to one column with no measured overflow | Canonical form-grid/field grammar plus source-owned domain sections | `migrated` | `unreviewed` | `retired` |
| FAM-30 | Artwork/media/external links | Static preview/material/link layout uses `.ui44-media-preview*` and `.ui44-external-link`; nine remaining inline-style occurrences are classified runtime values (art URLs, crop transform, menu position, playback progress, and authored colors) | Domain geometry and dynamic data remain source-owned | Responsive domain geometry and dynamic data remain source-owned | Retain dynamic media values; canonicalize static spacing/material/type | `specialized-retain` | `unreviewed` | `retired` |
| FAM-31 | Music player | `MusicPlayer`, bar, expanded sheet, queue, timeline/volume | Square theme-aware Glass mini player; full-width Paper expanded sheet | Theme-aware mini player; full-width Paper expanded sheet above Dock | Expanded Paper is the sole non-dropdown Paper exception; Radio remains FAM-32 | `migrated` | `unreviewed` | `retired` |
| FAM-32 | Radio | `RadioPage` plus shared player | Card-free centered workspace | Full-bleed between Topbar and Dock | Specialized retain | `specialized-retain` | `unreviewed` in final route sweep | `retired` |
| FAM-33 | PDF reader | `BookReader`, route-local reader classes | Sidebar retained; content pane becomes reader | Full viewport portrait/compact landscape | Specialized retain | `specialized-retain` | Prior product approval retained; final regression pass pending | `retired` |
| FAM-34 | Interactive launch | `/launch/[itemId]`, immersive route classes | Full rounded app window runtime | Full-viewport Desktop Required state | Specialized retain | `specialized-retain` | Runtime export acceptance remains external | `retired` |
| FAM-35 | Calendar/events | Calendar uses canonical page header, Glass surface, toolbar, month/agenda rows, external links, and semantic states; Studio event forms use the canonical form grid | Month grid with 44px controls | Agenda mode, 16px panel radius, equal gutters, and stacked fields | Retain responsive mode switch; canonicalize every ordinary family | `migrated` | `unreviewed` | `retired` |
| FAM-36 | Focus, hover, motion | One final focus-visible authority, composed-field focus-within ring, fine-pointer hover guards, touch-safe active states, and global reduced-motion fallback | Hover-only feedback is capability-gated; one 2px focus language | No hover-only affordance on coarse pointers; motion collapses under user preference | One visible focus language; capability-based hover; reduced motion | `migrated` | `unreviewed` | `retired` |

## 7. Shared source-component register

Route consumers below are direct or transitively resolved through page imports
and re-exports. “No live consumer” means no current production route resolves
to the component; it remains an orphan candidate until runtime/dynamic imports
are ruled out. Logic-only exports in a visual file are retained with that file.

| ID | Source / exports | Production consumers | Family and disposition | Implementation / review / cleanup |
| --- | --- | --- | --- | --- |
| CMP-01 | `AchievementIconGlyph.tsx` — `AchievementIconGlyph` | Library Item, notifications, profile, settings, Store Item, Studio Item forms, global toast | FAM-14/FAM-30; retain real glyph behavior | `migrated` / `unreviewed` / `retired` |
| CMP-02 | `AchievementToast.tsx` — `AchievementToast` | Global shell and achievement-aware routes | FAM-27; migrate surface/type only | `migrated` / `unreviewed` / `retired` |
| CMP-03 | `ArticleContent.tsx` — `ArticleContent` | None | Retired in Wave 8 after import-graph proof | `retired` |
| CMP-04 | `BookReader.tsx` — `BookReader` | `/reader/:itemId` | FAM-33 specialized retain | `specialized-retain` / prior approval / `retired` |
| CMP-05 | `CommunitySetupGate.tsx` | Community, new post, thread, Inbox, profile | FAM-27 modal | `migrated` / `unreviewed` / `retired` |
| CMP-06 | `ConfirmDialog.tsx` | Studio Item edit | FAM-27/FAM-23 | `migrated` / `unreviewed` / `retired` |
| CMP-07 | `ContextMenu.tsx` — provider/menu/copy toast | Global shell and every context-menu consumer | FAM-25/FAM-27 | `migrated` / `unreviewed` / `retired` |
| CMP-08 | `DashboardReleaseFeatures.tsx` alias | None | Retired in Wave 8 after import-graph proof | `retired` |
| CMP-09 | `ExternalLinkActions.tsx` | Store Item, Library Item, public profile | FAM-24/FAM-30 | `migrated` / `unreviewed` / `retired` |
| CMP-10 | `ExternalLinksEditor.tsx` | Profile edit, Studio Item new/edit | FAM-17/FAM-29/FAM-30 | `migrated` / `unreviewed` / `retired` |
| CMP-11 | `FilterPopover.tsx` | Home/Store, Library, Community families | FAM-24/FAM-25 | `migrated` / `unreviewed` / `retired` |
| CMP-12 | `InboxApp.tsx` | `/inbox` | FAM-12/FAM-16/FAM-19/FAM-24 | `migrated` / `unreviewed` / `retired` |
| CMP-13 | `ItemCommunitySection.tsx` | None | Empty placeholder retired in Wave 8 | `retired` |
| CMP-14 | `ItemQuestionsSection.tsx` | None | Hidden orphan retired in Wave 8; future activation must use the canonical row contract | `retired` |
| CMP-15 | `LegalPage.tsx` | Three feature-flagged legal routes | FAM-04/FAM-05/FAM-06 | `migrated` / `unreviewed` / `retired` |
| CMP-16 | `LibraryApp.tsx` | Library root/category | FAM-04/FAM-11/FAM-20/FAM-25 | `migrated` / `unreviewed` / `retired` |
| CMP-17 | `LibraryDetailPrimitives.tsx` | Store Item and Library Item | FAM-05/FAM-12/FAM-14/FAM-23/FAM-30 | `migrated` / `unreviewed` / `retired` |
| CMP-18 | `LibraryItemDetail.tsx` | Library Item | FAM-11–14/FAM-30/FAM-31 | `migrated` / `unreviewed` / `retired` |
| CMP-19 | `MerchApp.tsx` | None | Obsolete duplicate retired in Wave 8 | `retired` |
| CMP-20 | `MobileMenuContext.tsx` | Global shell | FAM-02 state provider; retain | `specialized-retain` / `unreviewed` / `retired` |
| CMP-21 | `MusicPlayer.tsx` | Global shell, Radio, Store/Library Item | FAM-13/FAM-31/FAM-32 | `migrated` / `unreviewed` / `retired` |
| CMP-22 | `OnboardingTip.tsx` | Inbox | FAM-27/FAM-28 | `migrated` / `unreviewed` / `retired` |
| CMP-23 | `ProductReviewsSection.tsx` | Store Item | FAM-15/FAM-19 | `migrated` / `unreviewed` / `retired` |
| CMP-24 | `ProductUpdatesSection.tsx` | Library Item | FAM-12/FAM-15 | `migrated` / `unreviewed` / `retired` |
| CMP-25 | `ProfileEditApp.tsx` | Profile edit | FAM-16–19/FAM-29/FAM-30 | `migrated` / `unreviewed` / `retired` |
| CMP-26 | `ProfileImageCropDialog.tsx` | Profile edit | FAM-21/FAM-27/FAM-30 | `migrated` / `unreviewed` / `retired` |
| CMP-27 | `PublicProfileApp.tsx` | Public profile | FAM-11/FAM-15/FAM-16/FAM-30 | `migrated` / `unreviewed` / `retired` |
| CMP-28 | `ReleaseFeatureBadges.tsx` | None | Orphan retired in Wave 8 | `retired` |
| CMP-29 | `RichEditor.tsx` | None | Orphan retired in Wave 8; current update flows use canonical textarea/editor surfaces | `retired` |
| CMP-30 | `SamplePackExperience.tsx` | Store/Library Sample Pack Item | FAM-13/FAM-21/FAM-30/FAM-31 | `migrated` / `unreviewed` / `retired` |
| CMP-31 | `Sidebar.tsx` | Global shell | FAM-02 | `specialized-retain` / `unreviewed` / `retired` |
| CMP-32 | `Social.tsx` — rich text, avatar, author, post/profile/artifact rows | Community, thread, Inbox, profile, search | FAM-12/FAM-15/FAM-16/FAM-24 | `migrated` / `unreviewed` / `retired` |
| CMP-33 | `StoreApp.tsx` | Home, Store root/category | FAM-04/FAM-05/FAM-11/FAM-20/FAM-25 | `migrated` / `unreviewed` / `retired` |
| CMP-34 | `StudioCreatorUpdates.tsx` | None | Orphan retired in Wave 8; current update flows use route pages | `retired` |
| CMP-35 | `StudioNativeContentFields.tsx` | Studio Item new/edit | FAM-20/FAM-21/FAM-29/FAM-30 | `migrated` / `unreviewed` / `retired` |
| CMP-36 | `StudioReleaseFeatures.tsx` | Studio Item new/edit | FAM-14/FAM-21/FAM-26/FAM-29 | `migrated` / `unreviewed` / `retired` |
| CMP-37 | `SystemShell.tsx` | Global shell | FAM-01 route-marker behavior | `specialized-retain` / `approved` baseline / `retired` |
| CMP-38 | `TagMultiSelect.tsx` | Studio Item new/edit | FAM-19/FAM-25 | `migrated` / `unreviewed` / `retired` |
| CMP-39 | `ThemeSync.tsx` | Global shell | Theme state; retain | `specialized-retain` / `approved` baseline / `retired` |
| CMP-40 | `Topbar.tsx` | Global shell | FAM-03/FAM-19/FAM-24/FAM-25 | `migrated` / `unreviewed` / `retired` |
| CMP-41 | `TopbarContext.tsx` | Global shell and contextual routes | Logic provider; retain | `specialized-retain` / `approved` behavior baseline / `retired` |
| CMP-42 | `Ui.tsx` — eight reachable domain helpers | Most ordinary application routes | Canonicalized shared route/catalog helpers; former `GlassPanel` wrapper retired | `migrated` / `unreviewed` / `retired` |
| CMP-43 | `UiSystemReferencePage.tsx` | `/44OS_UI` only | Responsive living system reference, generated component/token/class indexes, and live canonical specimens | `audit-only` / owner target reference / `retired` |
| CMP-44 | `UploadField.tsx` | Studio Item new/edit | FAM-21/FAM-29/FAM-30 | `migrated` / `unreviewed` / `retired` |
| CMP-45 | `ui44/Controls.tsx` — button, menu/search/back/cart symbols, section arrow | Section arrow only in production; other exports reference-only | Canonical target control API | `migrated` / `unreviewed` / `retired` |
| CMP-46 | `ui44/Inputs.tsx` — text/textarea/select/checkbox/range/file | 55 text, 15 textarea, 19 select, 2 checkbox, 4 range, and 2 file production instances | Canonical input API, including `field`/`bare` ownership for composed controls | `migrated` / `unreviewed` / `retired` |
| CMP-47 | `ui44/OverflowTrackTitle.tsx` | Store/Library tracklists and Sample Pack previews | Canonical overflow behavior | `migrated` / `unreviewed` / `retired` |
| CMP-48 | `ui44/Spacing.tsx` — panels, sections, list/domain rows | No production instances | Canonical target layout/row API | `audit-only` / `unreviewed` / `retired` |
| CMP-49 | `ui44/System.tsx` — page header, form grid/field, identity | No production instances | Canonical target system API | `audit-only` / `unreviewed` / `retired` |
| CMP-50 | `ui44/Typography.tsx` — semantic text/tone system | No production instances outside `ui44`/reference | Canonical target typography API | `audit-only` / `unreviewed` / `retired` |

## 8. Native-control and inline-override census

### Input primitives

These are current semantic production instances derived from the reachable
source graph. Every row is emitted by `ui44/Inputs.tsx`; no raw native input,
textarea, or select remains in route/shared-component source.

| Canonical primitive | Count | Source coverage | Status |
| --- | ---: | --- | --- |
| `Ui44TextInput` | 55 | Auth, Settings, Studio, Search, Community, Inbox, profile, Store/Library, Support, and shared editors | `migrated` |
| `Ui44CheckboxInput` | 2 | Studio attestation and feature controls | `migrated` |
| `Ui44RangeInput` | 4 | Player timeline/volume and profile crop | `migrated`, browser-range specialization retained |
| `Ui44FileInput` | 2 | Profile photo and shared upload field | `migrated`, browser-file specialization retained |
| **Semantic input instances** | **63** | — | — |
| `Ui44Textarea` | 15 | Community, thread replies, Studio, Inbox, profile, reviews/questions, and updates | `migrated` |
| `Ui44SelectInput` | 19 | Store filters, Settings, Studio Item/Event/Update editors, and Sample Preview controls | `migrated` |

### Button-family census

All 177 production native buttons are accounted for by their owning source and
canonical intent. The old per-family snapshot was retired because it became
stale whenever a route gained or lost one action; `audit:ui-cleanup` now owns
the exact aggregate. Ordinary, destructive, unavailable, circular symbol,
Community/social, menu/filter, toggle/segment, upload/crop, row, Shell,
reader, and player actions remain mapped to FAM-22–25 or their documented
specialized family.

### Current production source accounting

The per-file audit-time table was retired with Wave 8 because it retained rows
for deleted components. The permanent `audit:ui-cleanup` command now derives
this aggregate directly from the production-reachable TypeScript graph:

| Measure | Current result |
| --- | ---: |
| Native buttons | 177 |
| Raw inputs outside `ui44/Inputs.tsx` | 0 |
| Raw textareas outside `ui44/Inputs.tsx` | 0 |
| Raw selects outside `ui44/Inputs.tsx` | 0 |
| Native forms | 23 |
| `className` attributes | 1,584 |
| Dynamic inline styles | 9 |
| Direct `Ui44Panel` instances | 10 |

### Inline-style ledger

Wave 4 removed every static JSX style object. The nine remaining occurrences
are runtime data:

| Source | Count | Classification |
| --- | ---: | --- |
| `src/app/radio/page.tsx` | 1 | Dynamic hero artwork/color CSS values |
| `src/app/settings/page.tsx` | 1 | Dynamic accent swatch value |
| `src/components/AchievementIconGlyph.tsx` | 1 | Dynamic mask URL CSS property |
| `src/components/ContextMenu.tsx` | 1 | Measured pointer coordinates |
| `src/components/LibraryDetailPrimitives.tsx` | 1 | Dynamic release artwork URL CSS property |
| `src/components/MusicPlayer.tsx` | 2 | Runtime progress CSS property in bar and sheet |
| `src/components/ProfileImageCropDialog.tsx` | 1 | Runtime crop transform/scale |
| `src/components/ui44/OverflowTrackTitle.tsx` | 1 | Measured overflow distance/duration CSS properties |
| **Total** | **9** | **Dynamic only; zero static overrides** |

### Dynamic class-expression resolution

| Source expression | Resolved class space / family |
| --- | --- |
| `admin-stat-card-${tone}` | Admin stat tone variants; FAM-12/FAM-28 |
| `publicationClass` in Studio overview | Studio publication metadata/status classes; FAM-12/FAM-28 |
| `coverClasses` in Library detail primitives | Detail artwork shape/availability classes; FAM-30 |
| `music-player-icon-${name}` | Finite player icon-name union; FAM-31 |
| `playerClassName` | Bar visibility/radio/expanded finite states; FAM-31 |
| Sidebar `app.iconClass` / `item.iconClass` | Central `osApps` and pinned-item icon-mask values; FAM-02 |
| Store active-filter `className` | Two known placement classes for header/mobile active-filter rows; FAM-04/FAM-25 |
| Topbar local `className` | Finite topbar tab/control class chosen by helper; FAM-03/FAM-24 |
| `product-tile-art-${shape}` | `square`, `book`, or `portrait`; FAM-11/FAM-30 |
| `app-header ${className}` | Route-supplied header modifier; FAM-04 |

The static scanner also surfaced 41 strings without a direct CSS class
definition. Comparison/data literals (`Shuffle`, `Upload`, `achievement`,
`book`, `cancelled`, `deliver`, `filled`, `global`, `large`, `lg`, `link`,
`local`, `portrait`, `profile`, `published`, `ship`, `square`, `success`) are
not class gaps. The remaining structural tokens are retained as explicit
follow-up candidates in CLEAN-08; none may be removed or invented around until
their rendered element is inspected in its owning route.

## 9. Cascade and token ledger

### Import order and exact stylesheet census

`src/app/layout.tsx` imports `globals.css` followed by
`canonical-system.css`. `/44OS_UI` additionally imports
`system-reference.css`; production routes do not parse that route-owned file.

| Order | Stylesheet | Lines | Rules | Selectors | Declarations | Custom-property definitions | `!important` | Media blocks | Keyframes | Classification |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | `src/app/globals.css` | 11,178 | 1,745 | 1,983 | 6,227 | 336 | 27 | 133 | 11 | Active route/domain composition and specialized Shell, Dock, Radio, reader, launch, and player layout |
| 2 | `src/styles/44-ui/canonical-system.css` | 6,161 | 787 | 889 | 2,595 | 273 | 22 | 82 | Canonical tokens, primitives, semantic hooks, responsive behavior, and documented specialized variants |
| route-only | `src/styles/44-ui/system-reference.css` | 447 | 145 | 153 | 460 | 0 | 2 | 5 | 0 | Responsive `/44OS_UI` arrangement and labeling only |
| **Total** | **3 files** | **17,786** | **2,677** | **3,025** | **9,282** | **609** | **51** | **220** | **13** | — |

The 288 unique custom-property names comprise 208 `--os-*`, 73
`--44ui-*`, and seven specialized local names. Contextual theme, accent,
breakpoint, and component definitions are intentionally counted separately in
the 640-definition total.

### Current cascade classification

- `globals.css` owns active application composition and the documented
  specialized families. It contains zero fully unreferenced rules or selectors.
- `canonical-system.css` owns the new system registry and production
  primitives. Supported reference-only APIs remain here only when `/44OS_UI`
  renders and documents them.
- `system-reference.css` owns only `/44OS_UI` arrangement and labels. It is not
  imported by the root layout and does not redefine the product primitives it
  demonstrates.
- Exact selector + conditional-context analysis reports zero declarations
  shadowed by a later declaration across the production cascade.
- Source-aware class analysis reports zero all-source unused rules/selectors,
  zero unreachable components, and zero unreferenced component exports.
- The 20 unique media conditions are active responsive, capability, reduced
  motion, print, or platform contexts. None is retained solely as historical
  breakpoint debt.
- The 49 production `!important` declarations are intentional authorities for
  accessibility hiding, iOS input zoom prevention, route-shell visibility,
  canonical focus, reduced motion, and narrowly scoped reviewed states. The two
  remaining declarations are isolated to the responsive reference route.

Names such as `os-*`, `dashboard-*`, `view-*`, and `social-*` that
remain in source are active semantic/domain hooks. They consume the canonical
token and primitive contracts and are not alternate material or component
systems. Obsolete variants within those families were removed by Wave 8.

## 10. Desktop route matrix

Each of the 44 production `page.tsx` routes appears exactly once. Desktop
visual review means 1,280px and 1,440px, both light and dark where supported.
The source currently bootstraps dark/ocean, so light-theme rows remain required
contract coverage even where current runtime access is incomplete.

| Route | Access / role | Required source states | Current families / specialized composition | Review |
| --- | --- | --- | --- | --- |
| `/` | Public | loading, content, empty/error dependencies | Shell, Home grids/cards, player | `unreviewed` |
| `/account/recovery` | Public; M13 flag | request, success, invalid/error | Auth form, inputs, buttons | `unreviewed` |
| `/admin` | Admin | loading, metrics/content, error | Admin specialized workspace, forms, rows | `unreviewed` |
| `/calendar` | Public | loading, empty, error, events | Calendar/event specialized rows | `unreviewed` |
| `/cart` | Public/signed-in | empty, line items, updating/error | Rows, totals panel, buttons | `unreviewed` |
| `/checkout` | Public/signed-in | free, paid/disabled, success, error | Form grid, fields, totals, actions | `unreviewed` |
| `/community` | Public; compose when signed in | loading, empty, error, posts | Community hero, composer, post panels | `unreviewed` |
| `/community/collaboration` | Public | loading, empty, error, posts | Community list/post rows | `unreviewed` |
| `/community/moderation` | Moderator; M13 flag | loading, queue empty/content, error | Moderation rows/actions | `unreviewed` |
| `/community/new` | Signed-in | edit, validation, submitting, error | Composer/form fields, Paper menus | `unreviewed` |
| `/community/questions` | Public | loading, empty, error, posts | Community list/post rows | `unreviewed` |
| `/community/thread/:id` | Public; reply when signed in | loading, not found/error, thread, replies, compose | Thread hero, Paper list, reactions, composer | `unreviewed` |
| `/inbox` | Signed-in | loading, empty, error, conversation | Split inbox, composer, menus | `unreviewed` |
| `/launch/:itemId` | Signed-in/entitled | loading, blocked/error, launch | Specialized interactive launch | `unreviewed` |
| `/legal/copyright` | Public; M13 flag | content | Reader/legal typography | `unreviewed` |
| `/legal/privacy` | Public; M13 flag | content | Reader/legal typography | `unreviewed` |
| `/legal/terms` | Public; M13 flag | content | Reader/legal typography | `unreviewed` |
| `/library` | Signed-in or signed-out prompt | loading, empty, error, content | Library app, filters, cards/rows | `unreviewed` |
| `/library/:category` | Signed-in or signed-out prompt | loading, empty, error, content | Library app, category filters/cards | `unreviewed` |
| `/library/item/:id` | Signed-in/entitled | loading, not found/error, item states | Detail hero, metadata, rows, player/reader actions | `unreviewed` |
| `/login` | Signed-out | sign in, sign up, validation, loading/error | Auth panel, inputs, actions | `unreviewed` |
| `/notifications` | Signed-in | loading, empty, error, content | Notification rows/navigation | `unreviewed` |
| `/profile` | Signed-in | redirect | No visual surface beyond transition | `unreviewed` |
| `/profile/edit` | Signed-in | loading, edit, crop dialog, save/error | Form fields, identity, modal | `unreviewed` |
| `/profile/:username` | Public | loading, not found/error, content, owner actions | Profile hero, tabs, posts/items | `unreviewed` |
| `/radio` | Public | loading, offline/error, playing/paused | Specialized Radio/player composition | `unreviewed` |
| `/reader/:itemId` | Sample or entitled | loading, blocked/error, sample/full reader | Specialized reader | `unreviewed` |
| `/search` | Public | initial, loading, empty, error, results | Search input, filters, result rows/cards | `unreviewed` |
| `/settings` | Signed-in | loading, sections, save/error | Settings rows, fields, segmented controls | `unreviewed` |
| `/store` | Public | loading, empty/error, shelves/content | Store hero, filters, cards, player | `unreviewed` |
| `/store/:category` | Public | loading, empty/error, grid/content | Store filters, cards | `unreviewed` |
| `/store/item/:identifier` | Public; purchase/review auth gates | loading, not found/error, item, reviews/updates | Detail hero, panels, rows, actions | `unreviewed` |
| `/studio` | Creator | loading, empty, metrics/content, error | Studio dashboard specialized family | `unreviewed` |
| `/studio/earnings` | Creator | loading, empty/content, error | Metrics, date/range controls, rows | `unreviewed` |
| `/studio/events` | Creator | loading, empty/content, error | Event rows, create menu | `unreviewed` |
| `/studio/events/:id` | Creator | loading, edit, validation/save/error | Studio form grid, fields, actions | `unreviewed` |
| `/studio/orders` | Creator | loading, empty/content, update/error | Order rows, filters, actions | `unreviewed` |
| `/studio/payouts` | Creator | loading, empty/content, error | Metrics, payout rows/actions | `unreviewed` |
| `/studio/products/new` | Creator | edit, validation, upload, submitting/error | Multi-section form, fields, upload, tracks | `unreviewed` |
| `/studio/products/:id` | Creator | loading, not found/error, edit/save | Multi-section form, fields, menus, tracks | `unreviewed` |
| `/studio/radio` | Creator | unavailable/placeholder or content/error | Specialized Studio Radio panel | `unreviewed` |
| `/studio/updates/new` | Creator | edit, validation, submitting/error | Rich editor/form/actions | `unreviewed` |
| `/studio/updates/:id` | Creator | loading, not found/error, edit/save | Rich editor/form/actions | `unreviewed` |
| `/support` | Public | content, action/error destinations | Support typography, link/action rows | `unreviewed` |

The reference-only route is `/44OS_UI`. It is a responsive target specimen and
generated source registry, not a migration target and not part of the 44-route production count.
The Unity demo is intentionally absent from the audit.

## 11. Mobile route matrix

Every production route is exercised at 430px, 390px, and 320px. Each row also
requires safe-area behavior, keyboard/focus behavior where a form exists, Dock
containment, no horizontal overflow, and the same loading/empty/error/content
state set named in the desktop matrix.

| Route | Mobile behavior / exception | Required states | Review |
| --- | --- | --- | --- |
| `/` | Flat mobile hierarchy, compact cards/shelves, Dock and player coexist | loading, content, empty/error dependencies | `unreviewed` |
| `/account/recovery` | Single-column auth form; 16px editable text; 44px targets | request, success, invalid/error | `unreviewed` |
| `/admin` | Stacked admin metrics/actions; tables contain or reflow | loading, content, error | `unreviewed` |
| `/calendar` | Event rows stack without clipped dates/actions | loading, empty, error, events | `unreviewed` |
| `/cart` | Line items and totals stack; persistent actions avoid Dock | empty, content, updating/error | `unreviewed` |
| `/checkout` | One-column form and totals; keyboard-safe actions | free, paid/disabled, success, error | `unreviewed` |
| `/community` | Approved mobile post composition and single-surface composer | loading, empty, error, posts/compose | `unreviewed` |
| `/community/collaboration` | Full-width post rows, contained metadata/actions | loading, empty, error, posts | `unreviewed` |
| `/community/moderation` | Moderation actions wrap/stack with 44px targets | loading, empty/content, error | `unreviewed` |
| `/community/new` | Single-column composer; menus stay in viewport; keyboard safe | edit, validation, submitting/error | `unreviewed` |
| `/community/questions` | Full-width question rows, contained metadata/actions | loading, empty, error, posts | `unreviewed` |
| `/community/thread/:id` | Single-column thread, reply list, composer above Dock | loading, error, content/replies | `unreviewed` |
| `/inbox` | List/detail navigation collapses to one pane; composer keyboard safe | loading, empty, error, conversation | `unreviewed` |
| `/launch/:itemId` | Explicit **Desktop Required** experience; no interactive launch | loading, blocked/error, desktop-required | `unreviewed` |
| `/legal/copyright` | Reader-width collapses to safe gutters and mobile type scale | content | `unreviewed` |
| `/legal/privacy` | Reader-width collapses to safe gutters and mobile type scale | content | `unreviewed` |
| `/legal/terms` | Reader-width collapses to safe gutters and mobile type scale | content | `unreviewed` |
| `/library` | Mobile filters/menu, contained cards/rows, signed-out prompt | loading, empty, error, content | `unreviewed` |
| `/library/:category` | Category context retained; single-column content/filter flow | loading, empty, error, content | `unreviewed` |
| `/library/item/:id` | Detail hero stacks; actions, metadata, track rows stay contained | loading, error, item states | `unreviewed` |
| `/login` | Single-column auth; no iOS zoom; keyboard-safe submit | modes, validation, loading/error | `unreviewed` |
| `/notifications` | Horizontally scrollable navigation only where intentional; full rows | loading, empty, error, content | `unreviewed` |
| `/profile` | Redirect without visible stale layout | redirect | `unreviewed` |
| `/profile/edit` | One-column fields; crop dialog fits 320px and safe area | loading, edit/crop, save/error | `unreviewed` |
| `/profile/:username` | Hero/identity stack; tabs intentionally scroll; content contained | loading, error, content/owner | `unreviewed` |
| `/radio` | Fixed listening panel and Dock/player safe-area coordination | loading, offline/error, playing/paused | `unreviewed` |
| `/reader/:itemId` | Dedicated reader chrome, safe gutters, sample/full gating | loading, blocked/error, sample/full | `unreviewed` |
| `/search` | Full-width search; filters/results stack; keyboard safe | initial, loading, empty/error, results | `unreviewed` |
| `/settings` | Single-column settings rows/fields; segmented controls contain | loading, content, save/error | `unreviewed` |
| `/store` | Mobile filter affordance; shelves/cards contained beside player | loading, empty/error, content | `unreviewed` |
| `/store/:category` | Single-column grid at 320px; active filter visible | loading, empty/error, content | `unreviewed` |
| `/store/item/:identifier` | Hero/actions/panels stack; reviews and updates contain | loading, error, item/reviews/updates | `unreviewed` |
| `/studio` | Metrics/cards stack; creator actions stay reachable | loading, empty/content, error | `unreviewed` |
| `/studio/earnings` | Metrics and range controls stack; tables contain | loading, empty/content, error | `unreviewed` |
| `/studio/events` | Event list/actions stack; create menu stays in viewport | loading, empty/content, error | `unreviewed` |
| `/studio/events/:id` | One-column editor; keyboard-safe actions | loading, edit, save/error | `unreviewed` |
| `/studio/orders` | Order data reflows without horizontal page overflow | loading, empty/content, update/error | `unreviewed` |
| `/studio/payouts` | Metrics/rows/actions stack with minimum targets | loading, empty/content, error | `unreviewed` |
| `/studio/products/new` | One-column editor, contained uploads/tracks, keyboard safe | edit, validation, upload, submit/error | `unreviewed` |
| `/studio/products/:id` | One-column editor; Paper menus and tracks contain | loading, error, edit/save | `unreviewed` |
| `/studio/radio` | Placeholder or creator panel fits safe-area hierarchy | unavailable/content/error | `unreviewed` |
| `/studio/updates/new` | Rich editor toolbar contains/scrolls intentionally; keyboard safe | edit, validation, submit/error | `unreviewed` |
| `/studio/updates/:id` | Rich editor and actions contain at all three widths | loading, error, edit/save | `unreviewed` |
| `/support` | Safe gutters, readable type, 44px action targets | content, destination error | `unreviewed` |

## 12. Cleanup ledger

The owner authorized the local retirement sweep on July 15, 2026. Removal was
bounded by the production/reference import graph, class-expression analysis,
exact cascade proof, and a clean regression gate. Active semantic hooks are
part of the canonical contract; they are not retained compatibility debt.

| ID | Candidate | Owning family / source | Current finding | Removal evidence required | Cleanup |
| --- | --- | --- | --- | --- | --- |
| CLEAN-01 | Five `proposed-*` global imports | Registry / `layout.tsx` | Values consolidated into `canonical-system.css`; five files/imports deleted | Zero missing imports; reference build clean | `retired` |
| CLEAN-02 | Legacy text-entry selectors and corrective overrides | FAM-17–20 | Every control uses an explicit primitive; obsolete rules pruned | Zero raw inputs/textareas/selects outside the primitive definition | `retired` |
| CLEAN-03 | Old Paper-menu/popover/select selectors | FAM-20/FAM-25 | Unreferenced variants removed; active positioning hooks are canonical menu composition | Zero all-source orphan rules | `retired` |
| CLEAN-04 | Old button/icon-button/action variants | FAM-15/FAM-16 | Unreferenced variants removed; active semantic intent hooks consume canonical control tokens | Zero all-source orphan rules; focus/disabled contracts retained | `retired` |
| CLEAN-05 | Legacy panel/card/material specificity layers | FAM-09–14 | Old Glass wrapper and material rule removed; all ten callers use `Ui44Panel`; obsolete card/panel rules pruned | Canonical panel signature unchanged in regression matrix | `retired` |
| CLEAN-06 | Raw/local type sizes and earlier title helpers | FAM-05/FAM-06 | Obsolete helpers pruned; retained semantic type hooks map to canonical roles | Zero unreferenced or exact-shadowed declarations | `retired` |
| CLEAN-07 | Inline static form/grid/spacing styles | FAM-21/FAM-22 | Nine runtime-data styles; zero static JSX style objects | Machine census recorded above | `retired` |
| CLEAN-08 | Unresolved class and CSS orphan candidates | All | Source-aware string/template/dynamic-prefix resolution implemented | Zero all-source unused rules/selectors | `retired` |
| CLEAN-09 | Unreferenced shared-component candidates | Component registry | Eight files and 17 dead exports removed; former `GlassPanel` wrapper retired | Zero unreachable components; zero unreferenced component exports | `retired` |
| CLEAN-10 | UI-reference rules embedded in production CSS | Reference UI | Route arrangement lives in `system-reference.css`; former Desktop/Mobile audit-only rules were removed from the production cascade | Production imports only globals + canonical; `/44OS_UI` build clean | `retired` |
| CLEAN-11 | Superseded breakpoint and theme overrides | Responsive families | 266 exact-selector/context shadowed declarations removed; retained 19 media conditions are active | Zero exact-shadowed declarations; responsive regression clean | `retired` |
| CLEAN-12 | `!important` specificity debt | All | Remaining 49 production declarations are intentional accessibility, focus, visibility, specialized-shell, and state authorities; two are reference-only | Obsolete Studio achievement overrides removed without visual change | `retired` |
| CLEAN-13 | Canonical-file audit examples and temporary aliases | Registry | Reference route CSS separated; active semantic hooks documented as canonical API | Zero all-source orphan rules | `retired` |
| CLEAN-14 | Legacy/specialized player material rules | FAM-31 | Exact-shadowed player declarations removed; active player/Radio rules remain specialized | Player build and representative route regression clean | `retired` |
| CLEAN-15 | Final legacy stylesheet contraction | Entire cascade | 23,587 to 17,786 CSS lines; seven files to three | CLEAN-01–14 resolved; final gates below | `retired` |

## 13. Ordered migration queue

This order is authoritative after audit review. A wave changes only its named
family, reports the exact review routes, and pauses for approval before cleanup
or the next visually dependent wave.

Wave status vocabulary mirrors the platform milestone discipline: `not
started`, `ready`, `in progress`, `review`, `changes requested`, `approved`,
and `complete`. Implementation and cleanup remain separate; a visually
approved wave is not complete until its eligible legacy source is retired and
the gates pass again.

| Wave | Scope | Status | Required deliverable and review gate | Cleanup unlocked |
| ---: | --- | --- | --- | --- |
| 1 | Inputs and composers (FAM-17–21 plus input-related dialog states) | `complete` | Canonical primitives and owner desktop/mobile review complete | Retired in Wave 8 |
| 2 | Buttons and icon controls (FAM-22–24) | `complete` | Canonical intent mapping and owner desktop/mobile review complete | Retired in Wave 8 |
| 3 | Panels, cards, lists, and rows (FAM-08–14) | `complete` | Glass, rows, cards, lists, and specialized boundaries owner-approved | CLEAN-05 retired |
| 4 | Form layout, labels, help/error text, and inline overrides (FAM-21–23) | `complete` | Canonical form hierarchy and typography owner-approved | CLEAN-07 retired |
| 5 | Menus, disclosure, filters, and segmented controls (FAM-24/FAM-25) | `complete` | Paper transient surfaces and navigation controls owner-approved | CLEAN-03 retired |
| 6 | Specialized player decision (FAM-31) | `complete` | Glass mini-player, transparent expanded player, queue, Dock boundary, and Radio separation owner-approved | CLEAN-14 retired |
| 7 | Route-wide desktop/mobile QA and family reconciliation | `complete` | Owner completed the page-by-page desktop/mobile review and final bounded corrections | CLEAN-11 retired |
| 8 | Legacy retirement | `complete` | Import graph, source-aware class census, exact cascade audit, bounded deletion, canonical `Ui44Panel` cutover, regression checks, and build gates complete | CLEAN-01–15 retired |
| 9 | Final system lock | `complete` | Owner page-by-page desktop/mobile review complete; canonical system locked | Release authorized |

### Per-wave operating loop

1. Capture the owning source list and representative desktop/mobile baseline.
2. Correct the canonical primitive or token only when the registry has a real
   gap; demonstrate any new variant at desktop and mobile widths on `/44OS_UI` first.
3. Migrate every source instance in the wave without unrelated restyling.
4. Re-run the source census, lint, typecheck, build, and focused interaction
   checks.
5. Move the wave to `review` and provide the owner one exact route/state/width
   checklist.
6. Apply review changes within the same wave. After approval, remove only
   legacy rules proven unreferenced by that wave, re-run gates, and mark it
   `complete` before beginning the next wave.

Design gaps discovered during a wave are logged in the relevant FAM entry and
added to the responsive reference page before production use. They are not filled by a
new page-local token or selector.

## 14. Validation, acceptance, and audit record

### Source-accounting acceptance

| Check | Source-backed result |
| --- | --- |
| Production route uniqueness | 45 source page routes; `/44OS_UI` listed separately as the responsive reference |
| Shared visual components | 43 component files; zero unreachable components and zero unreferenced component exports |
| Native controls | 176 buttons; 55 text inputs, 15 textareas, 20 selects, two checkboxes, four ranges, and two file inputs emitted through `ui44` primitives; zero raw production input/textarea/select tags outside the primitive definition; 23 forms |
| Markup styling | 1,585 `className` attributes; nine classified runtime inline values; zero static JSX style objects |
| CSS cascade | Three owned files; 2,755 rules, 3,108 selectors, 9,573 declarations, and 600 custom-property definitions; zero all-source unused rules/selectors and zero exact-shadowed declarations |
| Theme/state context | Light/dark/accent, responsive, hover/focus/disabled/open, reduced-motion, loading/empty/error/content, auth/role/flag coverage recorded |
| Design gaps | No unresolved canonical variant was improvised during cleanup; future gaps must be documented in a FAM entry and reference API before implementation |

### Worktree snapshot

Wave 8 began against the dirty working tree at commit
`b849c7fb7ecb0fee85c5b398808486df59eeba6b`. Existing migration work was
preserved throughout the retirement and review passes. The release candidate
contains both the owner's migration work and the bounded cleanup; final
deployment evidence belongs to the active milestone document.

### Command record

The final result is recorded after documentation links are applied:

| Command | Result |
| --- | --- |
| `npm run audit:ui-cleanup` | **PASS** (98 production-reachable TSX files; zero unreachable components, dead exports, all-source CSS orphans, or exact-shadowed declarations) |
| `git diff --check` | **PASS** (exit 0; no whitespace errors) |
| `npm run lint` | **PASS** (exit 0; ESLint reported no findings) |
| `npm run typecheck` | **PASS** (exit 0; Next route types generated and `tsc --noEmit` passed) |
| `npm run build` | **PASS** (exit 0; Next.js 16.2.9/Turbopack compiled, TypeScript passed, and 38/38 static pages generated) |
| `npm run test:observability` | **PASS** (structured request errors remain sanitized) |
| `npm run test:hardening-contract` | **PASS** (12 storage, abuse, review, observability, and domain-boundary invariants) |
| `npm run test:security` | **PASS** (nine pgTAP files; 178 assertions) |
| `SMOKE_BASE_URL=http://127.0.0.1:3100 npm run test:smoke` | **PASS** (health, headers, primary routes, redirects, and hidden-surface isolation) |
| `npm run test:schema-replay` | **KNOWN PRE-EXISTING RUNBOOK DEFECT**: the empty replay reaches `20260714010000`, whose production-account assertion requires the ØLSTEN profile. A disposable profile fixture allowed that deployed migration and every remaining migration through `20260714031000` to apply; repository SQL was not rewritten. |

### Wave 1 implementation and review record — July 15, 2026

- Implementation: **migrated** for FAM-17–21.
- Review: **unreviewed**; owner approval has not been inferred.
- Cleanup at that checkpoint: **blocked-by-reference**. Wave 8 later retired the obsolete source and reclassified active semantic hooks as canonical.
- Source census at that checkpoint: 51 `Ui44TextInput`, 17 `Ui44Textarea`, 15
  `Ui44SelectInput`, two `Ui44CheckboxInput`, four `Ui44RangeInput`, and
  three `Ui44FileInput` instances. Current totals are recorded above. Raw production `input`, `textarea`, and
  `select` tags outside the primitive definition: zero.
- Composed ownership: Search, Topbar search, tag entry, Inbox recipient,
  thread/nested replies, item review/question, and Community post composers
  each have one owning surface and a bare inner control.
- Community correction: the new-post composer remains the approved Glass
  composition, with a transparent inner textarea and 16px mobile panel inset.
- Reply correction: the top-level thread reply resets the obsolete two-column
  mobile grid and uses one canonical editor surface; no narrow left column or
  overflowing actions remain.

Rendered local checks used the signed-in development state and did not submit
or save data:

| Route/state | Widths checked | Result |
| --- | --- | --- |
| `/community/thread/i-am-currently-looking-to-start-building-and-creating-my-own-soundscape-0cd1d6c0`, reply open/focused | 1,280; 430; 390; 320 | One shell, transparent textarea, contained actions, zero document overflow |
| `/community`, new post compact and expanded/focused | 1,280; 430; 390; 320 | One Glass panel, transparent textarea, 16px mobile inset, 17/24 mobile type, zero document overflow |
| `/search`, focused query | 1,280 | One pill shell, bare inner input, one focus outline, no legacy focus shadow |
| `/settings`, account and region/currency fields | 1,280; 390 | 44px fields, 16/12px radii, 13/18 and 17/24 type, zero overflow |
| `/studio/products/new?section=music`, standard/select/tag/upload/attestation states | 1,280 | Canonical standard controls; tag entry is one composed surface with one focus outline |
| `/inbox`, existing message and New Message recipient states | 1,280; 390 | Standalone message textarea and composed recipient render with canonical ownership and zero overflow |
| `/profile/edit`, display/username/bio/link fields | 1,280 | Standard/textarea fields match; username prefix wrapper now owns the canonical composed surface |

Owner review gate for Wave 1:

1. On `/community`, inspect the compact new-post field, open it, and inspect
   the expanded field on desktop and a 390px mobile viewport.
2. On the thread route above, open **Reply** and inspect the field/buttons on
   desktop and at 390px. This is the regression shown in the July 15 captures.
3. On `/settings`, focus Email and inspect both selects; then inspect the same
   panel at 390px.
4. On `/studio/products/new?section=music`, inspect Title, Release Date,
   Price, Item Type, tag search, artwork/audio upload, and attestation.
5. On `/profile/edit`, inspect Display name, the `@` username composition,
   Bio, external links, and photo selection.
6. On `/inbox`, open **New Message** and inspect the recipient search plus the
   disabled message field; do not send a message.
7. In a signed-out state, inspect `/login` and `/account/recovery`; these
   cannot be visually exercised from the signed-in review session without
   changing account state.

This was the original Wave 1 review gate. Its cleanup dependency was resolved
by the later owner-authorized Wave 8 retirement pass.

### Wave 3A implementation and review record — July 15, 2026

This bounded subwave establishes the approved panel ownership rule without
claiming that the later card and generic-row work is complete:

- Glass is the default ordinary content panel. Source now has 50 explicit
  `ui44-panel-glass` sites across 30 production files, plus ten direct
  `Ui44Panel` consumers. Explicit `clip` and `visible` overflow variants keep
  list dividers contained while allowing form autocomplete/dropdown content to
  escape when required.
- The former transparent panel family had five production sites: Tracklists
  (Store, Library, and Sample Pack) and Product/Release
  Details (Store and Library). It was 16px, uniformly bordered,
  shadowless, and clipped.
- Paper remains the dropdown/menu/popover material. No new Paper content panel
  was introduced in this subwave.
- Shell, Dock, Radio, heroes, reader, interactive launch, and music player
  compositions remain specialized rather than generic panel families.
- `SocialPostRow` now uses the Community composition approved on the UI
  reference pages while retaining real avatars, creator links, thread routing,
  reaction state, reply counts, delete behavior, keyboard access, and context
  menus. It is consumed by Community, thread, public profile, and Search.
- All 11 Studio `page.tsx` files now assign every ordinary list/form panel to
  Glass, including the two Item track editors following the owner correction
  recorded in Wave 3B below.
- The former mobile full-bleed Community feed/thread, Item Tracklist, and
  Library achievement rules are superseded by one gutter contract. At 430px
  panels use 18px symmetric sides; at 390px and 320px they use 14px symmetric
  sides, matching the new-post composer. Ordinary detail sections use the same
  inset, so Tracklist, Product/Release Details, achievements, and reviews align.

Rendered signed-in checks did not submit or save data:

| Route/state | Widths checked | Result |
| --- | --- | --- |
| `/community`, populated feed | 1,280; 390 | Glass is 24px desktop/16px mobile; rows use 24px/16px insets, 34px avatars, 13/18 and 17/24 copy, 44px actions, and zero document overflow |
| `/store/item/here-comes-the-feeling`, Tracklist and Product Details | 1,280 | Both lists now use the canonical Glass-with-Rows surface with clipped overflow and zero document overflow |
| `/studio/products/new?section=music`, Details with tag menu open | 1,280 | Glass form reports visible overflow; the Paper tag listbox opens fully and document overflow remains zero |
| `/studio` and loaded static subpages | 390 | Metrics, Events empty, Orders empty, Payouts empty, Update form, and available list states use 16px Glass with equal 14px sides and zero overflow |
| `/studio/products/new?section=music`, Glass form/achievements and Glass Tracks | 1,280; 430; 390; 320 | Glass is 24px desktop/16px mobile, including Tracks; equal 18px/14px mobile gutters and zero overflow |
| Community/thread, Store/Library Item, Settings, Calendar, Cart, Checkout, Inbox, Search, profile edit, and Legal sample routes | 390 | Every visible canonical ordinary panel is contained by its page gutter; no document overflow |

Implementation is `migrated` for FAM-09 and FAM-10 and remains `mixed` for
FAM-15 because nested reply/review row variants are separate later work.
Review is `unreviewed`; cleanup remains `blocked-by-reference`. Wave 3 stays
`in progress` until cards and the remaining list/row families are migrated.

### Wave 3B review corrections — July 15, 2026

- Product/Release Details now use canonical Glass ownership and retain canonical
  24px desktop and 16px mobile row insets with explicit label/value roles.
- Static review rows no longer advertise a row-level hover state; their real
  author and action controls retain independent interaction feedback.
- Studio track editors moved to Glass on both create and edit routes. Store,
  Library, and Sample Pack Tracklists now use the same Glass family.
- The desktop Studio overview uses the approved compact density: 112px metric
  panels and 72px release artwork/rows instead of the older oversized layout.
- Mobile Community hides the closed compact composer and exposes the same
  44px header plus trigger as desktop; opening it reveals the full Glass
  composer without submitting data.
- Expanded Now Playing remains a specialized family but is now edge-to-edge
  Paper on desktop and mobile. Mobile removes the opaque scrim so the themed
  page background remains visible above the sheet. The desktop mini player
  has square edges.

Rendered signed-in checks covered `/community` at 390px, `/studio` and
`/studio/products/new` at 1,440px, `/store/item/here-comes-the-feeling` at
1,440px, the mobile expanded player at 390px, and the desktop mini player at
1,440px. `git diff --check`, lint, typecheck, and build all pass; build again
generated 39/39 static pages. Review remains `unreviewed`, and legacy cleanup
remains `blocked-by-reference`.

### Wave 3C implementation and review record — July 15, 2026

Wave 3C closes the generic list/row portion of FAM-12 and the remaining
structured-row work in FAM-15 without claiming that catalog cards, track/sample
rows, or achievements are complete:

- The production class contract now has 28 owning `ui44-list-surface`
  emitters and 38 `ui44-list-row` class occurrences across 36 JSX row
  expressions in 22 files. Repeated mapped data expands those expressions
  into the real Studio, settings, notification,
  update/review/question, detail, Inbox/search/profile, cart/checkout, event,
  Community, bonus/file, and moderation rows.
- The canonical row baseline is a 44px minimum target, transparent static
  material, uniform adjacent dividers, 20px/24px desktop insets, and 16px
  mobile insets. Dashboard, Studio, detail, settings, notification, profile,
  update/review, reply/structured, cart, checkout, Inbox, radio, and event
  variants declare only the grid behavior their content requires.
- Static rows do not receive a row-level pointer or hover treatment.
  `ui44-list-row-interactive` exclusively owns pointer, hover, and
  `:focus-visible` feedback; selected/current rows use the declared accent
  state; unavailable rows retain the disabled state. Notification navigation
  also has Enter/Space keyboard behavior, while its dismiss control stops row
  navigation.
- Wide-action and event rows stack on mobile. The compact checkout summary is
  the one documented inset exception: the row keeps vertical rhythm and zero
  horizontal inset because the owning summary panel already supplies the
  horizontal padding.
- Community question/collaboration branches, accepted answers/responses, and
  thread replies now use Glass list owners plus declared interactive/static
  variants. Product review rows are explicitly static; real links and action
  controls retain their own feedback.
- Wave 3C temporarily tested the neutral Control Surface fill on desktop
  Glass and Glass-with-rows. After Wave 3D review, the owner requested a return
  to the original base Glass token (`rgba(255,255,255,.18)` light, `.03` dark).
  This is retained as historical evidence and is superseded by the later
  desktop Glass reconciliation below. The environment gradient and mobile
  material were never changed.
- The former transparent panel source sites were consolidated into Glass; the
  Unity demo remains excluded.

Read-only rendered checks used the signed-in development state and did not
submit, save, dismiss, purchase, or send data:

| Route/state | Widths checked | Result |
| --- | --- | --- |
| `/community`, populated feed and structured source branches | 1,440; 430; 390 | Canonical Glass/list ownership, 24px/16px insets, declared interactive rows, unchanged mobile material, zero document overflow |
| `/studio`, populated release and overview rows | 1,440; 430 | 72px release artwork, 20px/24px desktop row inset, interactive row contract, desktop canonical Glass fill, zero overflow |
| `/studio/orders`, `/studio/earnings`, `/studio/events`, `/studio/radio` | 1,440; 390 | Empty/access states remained contained; source emitters carry the canonical dashboard/radio variants for populated states |
| `/store/item/here-comes-the-feeling`, details and reviews | 1,440; 390; 320 | Seven static detail rows and visible review rows use 20px/24px desktop and 16px mobile insets; row cursor is non-interactive; zero overflow |
| `/cart` and `/checkout`, two line items | 1,440; 390; 320 | Canonical cart and compact-summary variants contain artwork, totals, and removal targets with zero overflow |
| `/settings` | 1,440; 390; 320, dark and light | Static 44px rows use 20px/24px desktop and 16px mobile insets; both desktop and mobile use the canonical base Glass tokens; zero overflow |
| `/search?q=olsten` and `/inbox` | 390; 320 | Profile/conversation rows use 16px insets, 44px minimum targets, explicit pointer/selected states, and zero overflow |
| Representative generic-row routes | 430; 390; 320 | Document and row bounds report zero horizontal overflow at every required mobile width |

Implementation is `migrated` for FAM-12 and FAM-15. Review remains
`unreviewed`; cleanup remains `blocked-by-reference`, and no legacy rule is
removed by this subwave. Wave 3 remains `in progress` because FAM-11 cards,
FAM-13 track/sample rows, and FAM-14 achievements are separate pending
subwaves.

A read-only ledger assertion also compared source routes with both matrices:
all three sets contain the same 44 unique routes, with no duplicates, missing
entries, or extras. It counted 50 CMP rows and confirmed that the
`globals.css` classification ranges form a gap-free partition from line 1
through line 16,736.

This audit deliberately stops after those source and build gates. It does not
request visual approval, mark any unreviewed family approved, migrate a
component, delete a rule, or deploy.

### Wave 3D implementation and review record — July 15, 2026

Wave 3D closes the implementation portion of FAM-11 without changing Item
identity, catalog ordering, domain aspect ratios, links, context menus, or
actions:

- One `.ui44-catalog-*` contract now owns the live artwork-first card wrapper,
  media, copy, headline, subheadline/metadata, grid, and shelf behavior.
  `ProductCard`, the parallel Library emitter, and public-profile artifacts
  all opt into it at their source boundary. The source-only `Shelf` helper also
  emits the canonical grid class; it has no current production consumer.
- Card wrappers stay transparent and shadowless. Only artwork carries the
  16px desktop/12px mobile radius and canonical content elevation. Fine-pointer
  hover alone receives scale/floating elevation; keyboard focus receives a
  visible media outline; reduced-motion removes transform and filter motion.
- Desktop grids use four columns, three from 769–1080px, and a 20px gap.
  Mobile grids use two columns, an 18px gap at 430px, and a 14px gap at 420px
  and below. Existing square, 2:3 book, 3:4 merch, landscape, and wide aspect
  classes remain authoritative.
- Typography is exact: 13/16 headline, 11/14 subheadline, and 10/13 metadata
  on desktop; 17/22, 15/20, and 13/18 respectively on mobile. The profile
  metadata inline color was removed and replaced by the semantic class.
- Shared production coverage is Home, Store, Store category, Search, related
  Items, Library, Library category, and the Music/Books/Sample Packs/Merch
  tabs on public profiles. The former source-only `MerchApp` duplicate was retired in Wave 8.
- After the card pass, the owner requested that the temporary desktop
  Control Surface experiment be removed from FAM-09. At that point Desktop
  Glass and Glass-with-rows returned to `rgba(255,255,255,.18)` in light and
  `.03` in dark. This historical decision is superseded by the later desktop
  Glass reconciliation below. No gradient, mobile material, panel geometry,
  or catalog-card rule changed in either correction.

Read-only rendered checks used the signed-in development state and did not
submit, save, dismiss, purchase, or send data:

| Route/state | Widths checked | Result |
| --- | --- | --- |
| `/store`, populated catalog, dark and light | 1,280; 430; 390; 320 | 4/2-column grammar, exact type/radius/elevation, transparent wrappers, and zero document overflow |
| `/library`, three populated category bands | 1,280 | 16 cards across three canonical grids; Library's parallel emitter carries the complete card contract and zero overflow |
| `/profile/olsten44`, populated Music tab | 1,280; 390; 320 | Profile artifacts now match the catalog grammar, use semantic metadata, and report zero overflow |
| `/search?q=here`; `/store/item/here-comes-the-feeling`, related Items | 1,280 | Shared `ProductCard` renders two Search results and four related Items through canonical grids with zero overflow |
| `/studio`, metrics; `/settings`, Glass-with-rows | 1,280, dark and light | Historical pre-reconciliation check: Desktop Glass resolved to `.03` dark and `.18` light with canonical elevation/radius and zero overflow |

Source assertions find no unmarked live `product-tile`, `app-grid`,
`app-shelf`, `social-artifact-card`, or `social-card-grid` emitter. Lint,
typecheck, `git diff --check`, and the production build pass. Implementation is
`migrated` for FAM-11; review remains `unreviewed`; cleanup remains
`blocked-by-reference`. Wave 3 remains `in progress` because FAM-13 track and
sample rows plus FAM-14 achievements are separate pending subwaves.

### Wave 3E implementation and review record — July 15, 2026

Wave 3E closes the implementation portion of FAM-13:

- Store release Tracklists, Library release Tracklists, and Sample Pack
  previews now declare one `.ui44-track-*` source contract. Glass owns the
  list surface; the row owns only interaction/selection, stable columns,
  leading playback, overflow-aware title, duration, and optional download.
- Desktop uses 44/minmax/54px columns, 12px gaps, 14px/16px insets, 13/16
  titles, and 10/13 durations. Sample rows allow their trailing action group
  to size to real download content without compressing the title incorrectly.
- Mobile uses 38/minmax/48px columns, 10px gaps, 11px/14px insets, 15/20
  titles, and 13/18 durations. The Glass panel remains aligned to the shared
  18px gutter at 430px and 14px gutters at 390/320px.
- Selected/current rows use the declared state, fine-pointer hover is
  capability-gated, keyboard focus is visible, unavailable sample previews
  expose `aria-disabled`, and current rows expose `aria-pressed`.
- Long-title motion engages only for active/tapped titles, keyboard-focused
  rows, or fine-pointer hover. Reduced motion disables the animation and
  preserves ellipsis.
- Playback, queue, progress persistence, context menus, download destinations,
  durations, and Item identity were not changed.

Rendered signed-in checks covered the populated Store release and Sample Pack
routes at 1,280px and 430/390/320px. All report canonical geometry and zero
document overflow; the 390px visual pass confirms selected/equalizer and
inactive rows remain collision-free above the mini player. Source assertions,
`git diff --check`, lint, typecheck, and the production build pass; build again
generated 39/39 static pages. FAM-13 is `migrated`, review remains
`unreviewed`, and cleanup remains `blocked-by-reference`.

### Wave 3F implementation and review record — July 15, 2026

Wave 3F closes the implementation portion of FAM-14 and therefore the
implementation portion of Wave 3:

- Library achievement display rows and Studio selectable achievement rows now
  share `.ui44-achievement-*` leading/copy/trailing geometry. Library rows are
  explicitly static; Studio labels retain their real checkbox behavior and
  receive capability-gated hover plus `:focus-within` feedback.
- Both surfaces use a 44px glyph, 44/minmax/auto columns, 14px gaps,
  20px/24px desktop insets, 13/16 titles, and 11/14 descriptions. Mobile uses
  16px insets, 17/22 titles, and 15/20 descriptions. Library unlocked rows
  expose a completion check; Studio controls retain a 44px target.
- `AchievementIconGlyph` retains the dynamic mask URL as the required inline
  value. Locked glyphs use secondary opacity; unlocked glyphs use the
  canonical accent treatment. The older forced black Studio tile remains only
  as cleanup evidence and is explicitly superseded by the canonical rule.
- `AchievementToast` retains its live-region, 4.2-second lifecycle, and real
  glyph data while moving to a floating Glass surface with canonical type,
  elevation, blur, mobile containment, and reduced-motion behavior.
- Unlock evaluation, playback signals, reward data, checkbox state, and toast
  triggering were not changed.

Rendered signed-in checks covered `/library/item/a71a5513-76f6-4fb8-9529-f7dbfb1ad1ba`
and `/studio/products/new?section=music` at 1,280px plus 430/390/320px where
applicable. Library copy now occupies the intended middle column instead of
being pushed to the far right; Studio rows report a 44px glyph and 44px
control target. Every measured state has zero document overflow. The runtime
toast was not artificially triggered because that would mutate achievement
progress; its source/lifecycle, responsive CSS, live-region semantics, and
reduced-motion rules were asserted directly. `git diff --check`, lint,
typecheck, and the production build pass; build generated 39/39 static pages.
FAM-14 is `migrated`, review remains `unreviewed`, and cleanup remains
`blocked-by-reference`.

### Wave 2 implementation and review record — July 15, 2026

Wave 2 closes the implementation portion of FAM-22 through FAM-24 without
changing player, reader, menu-item, editor, toggle, row, Shell, or Radio
composition:

- One canonical action contract now owns both `.ui44-button` and the live
  `.os-button` compatibility family. Default actions are 44px pills with
  13/16 desktop and 17/22 mobile type. Primary, secondary, ghost, and Glass
  names no longer produce competing visual systems.
- Destructive actions rest neutral on desktop and turn red only on a
  fine-pointer hover; mobile destructive actions declare red at rest.
  Unavailable/disabled actions use the semantic gray treatment in both
  themes. Every state retains a visible two-pixel focus ring.
- Add, filter, search, notifications, cart, and back triggers share the 44px
  circular Glass symbol contract. Production Community, Studio,
  `FilterPopover`, and Topbar emitters now declare their canonical symbol
  intent at source. Open equals neutral hover; only a genuinely applied
  filter receives the accent border.
- Add and filter glyphs retain their identity while open. No plus-to-X
  rotation or filter morph remains. Hover behavior is capability-gated and
  reduced-motion removes control transitions.
- The current source census is 177 production native buttons. Every production
  instance remains assigned to an ordinary, destructive/unavailable, symbol,
  Community/social, menu/filter/editor, toggle/segment, upload/crop, row,
  Shell, reader, or player family. The permanent audit owns the exact aggregate;
  the Wave 2 per-family snapshot is historical and no longer used as a live
  counter.

Rendered checks covered Community symbols at 1,280px and 390px, Checkout
default/unavailable actions and Topbar symbols at 1,280px and 390px, and the
desktop/mobile reference destructive states. Default, unavailable,
destructive, applied/open symbol, and mobile typography all resolve to the
declared values; every checked route reports zero horizontal overflow. The
390px Community visual pass confirms the add/filter pair remains aligned with
the canonical post gutter and does not collide with the Topbar or mini player.
Source assertions, `git diff --check`, lint, typecheck, and the production
build pass; the build generated 39/39 static pages. FAM-22 through FAM-24 are
`migrated`, review remains `unreviewed`, and cleanup remains
`blocked-by-reference` until the consolidated Wave 7 review.

### Wave 4 implementation and review record — July 15, 2026

Wave 4 closes the form-composition and inline-override implementation pass:

- Creator, Settings, auth, Checkout, Profile edit, Inbox, Upload, Community
  new-post, status, loading, and creator-access compositions now express their
  layout through semantic source classes and the shared 12-column grammar.
  Desktop two-/three-column spans collapse to one column at mobile widths.
- Field labels are cascade-locked to 12/15 at 600 weight on desktop and 15/20
  on mobile. Help/note copy is 12/16 desktop and 15/20 mobile. Error/status
  spacing, action groups, tall textareas, upload controls, and creator gates
  share canonical token relationships rather than local numbers.
- The original 104 inline-style audit fell to 12 during Wave 4 and to nine
  after orphan/editor retirement. Every remaining occurrence is runtime data:
  artwork/mask URLs, menu coordinates, player progress, crop transform,
  settings color, overflow measurement, or Radio hero data. Static JSX style
  objects are zero.
- The environment gradient, user data, form semantics, save/submit behavior,
  validation, file upload behavior, crop logic, player progress, and dynamic
  artwork/color values were not changed.

Rendered signed-in checks covered `/studio/products/new?section=music`,
`/settings`, `/checkout`, `/community/new`, and `/profile/edit` at 1,280px and
390px; the dense Studio editor additionally passed 430px and 320px. The
desktop editor reports a 12-column/20px-gap grid, mobile reports one-column
collapse, exact label/help metrics, and all routes report zero horizontal
overflow. The 390px New Post visual pass confirms the Glass form, tall
textarea, help copy, and action group remain aligned above the mini player.
Source assertions, `git diff --check`, lint, typecheck, and the production
build pass. FAM-07/form composition is `migrated`, review remains
`unreviewed`, and CLEAN-07 was subsequently retired by Wave 8.

### Wave 5 implementation and review record — July 15, 2026

Wave 5 closes FAM-08/FAM-25 implementation while retaining route-specific
trigger placement and content structure:

- Nine explicit `.ui44-paper-menu` source emitters cover Topbar account and
  notification popovers, the global context menu, shared filter popovers,
  Studio create, tag results, Community mention results, and the source-only
  rich-editor selection menus. Every selectable command/result uses the
  canonical 44px item contract or its declared compatibility alias.
- Paper resolves to the exact light/dark material, floating elevation, 24px
  desktop/16px mobile radius, 17px desktop/12px mobile item radius, and
  viewport containment. Menu item type is 13/16 desktop and 17/22 mobile.
  The context-copy status toast is explicitly floating Glass, preserving the
  rule that Paper is for dropdown/menu/selection content only.
- Shared filters close on outside interaction or Escape and return focus to
  their trigger. Topbar account/notification/search popovers do the same.
  Tag results add Escape return plus Arrow Up/Down traversal. Context menus
  clamp to the viewport, focus the first enabled command, and restore the
  previous focus target when closed.
- Eight one-of-many settings/creator groups are semantic radiogroups with 15
  declared radio choices. The same canonical segmented surface owns selected,
  hover, focus, and mobile containment. Profile and notification tabs use the
  canonical segmented-tab variant; Support categories use explicit disclosure
  trigger/content/`aria-controls` ownership.
- Reader bookmarks remain FAM-33 specialized; the orphan `RichEditor` was retired in Wave 8, and no account choice, filter selection, notification,
  context action, preference, or support state was mutated during checks.

Rendered checks covered Community filter and Topbar account menus at 1,280px
and 390px, Studio tag results at 390px, Settings segments at 1,280/390/320px,
Support disclosure at 390px, and a populated Community context menu at
1,280px. Menus report the exact material/radii/type/44px items, Escape focus
return succeeds, context focus/clamping succeeds, all segmented groups remain
contained, and every route reports zero horizontal overflow. Source
assertions, `git diff --check`, lint, typecheck, and the production build pass;
the build generated 39/39 static pages. FAM-08/FAM-25 are `migrated`, review
remains `unreviewed`, and CLEAN-03 is `ready-after-approval` pending the
consolidated Wave 7 review.

### Wave 6 implementation and review record — July 15, 2026

Wave 6 resolves the player-material contradiction and closes FAM-31
implementation:

- The desktop mini player is a square, theme-aware Glass control surface. Its
  bottom-left Shell seam and all other corners resolve to zero radius; it no
  longer inherits the former floating Paper treatment.
- Expanded Now Playing is the owner-approved sole non-dropdown Paper
  exception on desktop and mobile. It spans the complete content overlay,
  uses zero radius, leaves the surrounding environment visible, and keeps the
  persistent Dock outside its owned safe area.
- The expanded sheet is an `aria-modal` dialog with body scroll lock, an
  internal Tab loop, Escape close, and focus restoration to the opening mini
  player control. All transport, minimize, queue, and remove actions retain a
  minimum 44px target and a two-pixel focus-visible ring.
- Queue visibility is exposed with `aria-pressed`; its rows retain the
  canonical 56px minimum. Player timeline/volume remain dynamic range values,
  and the previously migrated overflow-title family supplies reduced-motion
  behavior without a new player-local animation rule.
- Radio remains FAM-32 specialized. The global player deliberately returns no
  bar for Radio playback; the `/radio` composition keeps its independent
  surface and was not collapsed into FAM-31.
- The environment gradient, playback state, queue contents, volume, shuffle,
  repeat, and user data were not mutated during the implementation pass.

Rendered signed-in checks covered the mini and expanded player on
`/community` at 1,280px and 430/390/320px and the independent `/radio`
composition at 1,280px. Desktop mini-player radius/material, full overlay
width, Paper material, body scroll lock, dialog ownership, queue state,
Escape focus return, mobile Dock boundary, and zero horizontal overflow all
resolve to the declared contract. The browser reports the correct translucent
Glass color for the mini player; its standard `backdrop-filter` computed value
is `none` in this local Chromium build even though the canonical blur and
WebKit blur declarations are present, so CLEAN-14 retains a computed-style
proof requirement before retirement. Source assertions, `git diff --check`,
lint, typecheck, and the production build pass. FAM-31 is `migrated`, review
remains `unreviewed`, and CLEAN-14 is `ready-after-approval` pending the
consolidated Wave 7 review.

### Wave 7 route-wide QA and consolidated review record — July 15, 2026

Wave 7 closes the implementation-side QA pass without approving or retiring
any family:

- The production census resolves to exactly 44 `page.tsx` routes plus the
  reference surface. Its former split desktop/mobile routes were checked
  separately at that checkpoint and are now consolidated into responsive
  `/44OS_UI`; the excluded Unity demo was neither enumerated nor opened.
- Every production route was rendered at 1,440px, 1,280px, 430px, 390px, and
  320px: 220 route/viewport checks in total. Every check reported zero
  horizontal document overflow and the browser console reported no warning or
  error entries.
- The signed-in creator baseline exercised public, account, commerce,
  Community, Library, Studio, Radio, reader, launch, player, and editor
  compositions. `/login` correctly redirected the signed-in session to
  `/store`; `/profile` exercised its redirect surface. The concrete dynamic
  routes used a live Community thread, Store item, and profile plus stable
  audit identifiers for Library/launch/reader/Studio surfaces.
- Role- and flag-limited source routes remain represented, not omitted.
  `/admin` rendered the non-admin gate, while `/account/recovery` and
  `/community/moderation` rendered their unavailable 404 states. The three
  legal routes also rendered their currently unavailable 404 state. Their
  privileged/enabled content variants remain source-audited because this pass
  did not mutate the signed-in role, feature flags, preferences, or data.
- Runtime appearance is deliberately forced to `theme-dark` by
  `THEME_BOOTSTRAP` in `src/app/layout.tsx`; it also removes stored theme
  preferences on load. Consequently, a truthful per-route light visual matrix
  cannot be reached in the current product. Light tokens and shared
  `body:is(.theme-dark, .theme-light)` cascade ownership are source-present,
  but enabling a product light state is a separate design/runtime decision.
  This is a documented gap, not an improvised QA-only override.
- Minimum-target inspection separated real owning targets from misleading
  element boxes. Hidden file inputs, 20px checkboxes inside label targets,
  bare inputs inside 44px composed fields, and 26px visual switch tracks retain
  their declared specialized geometry. Remaining small chrome, settings
  swatch/toggle, notification-tab, and Support-link boxes belong to the still
  open FAM-02/FAM-26/FAM-28 families; they are recorded for later work and are
  not silently restyled during route QA.
- CLEAN-11 is now `ready-after-approval`. No selector, token, component, or
  legacy rule was retired, and Wave 8 was not started.

Source route assertions, `git diff --check`, lint, typecheck, and the
production build pass at the end of this wave. All migrated families remain
`unreviewed`; the owner review below is the single approval gate for Waves
1–7.

#### Desktop owner-review correction pass — July 15, 2026

The first owner page-by-page review covered desktop only. Its requested
corrections are implemented; review remains open until the owner completes the
next desktop check and the separate mobile pass.

- Settings Theme/Landing App segments and creator profile content tabs now use
  pill containers and pill choices. Member profiles and creators with only one
  available content family do not render a redundant profile tab selector.
  Profile-edit Cancel/Save actions align to the right.
- Community feed and thread panels compute to the same material, border, and
  elevation as Profile posts. Heart and bubble hover retain transparent hit
  areas while their glyph fills; the labeled main-thread Reply owns exactly one
  highlight; owner trash actions reach the far-right edge.
- Store active filters render once below the header divider. Store/Library
  Tracklists, Sample Pack preview lists, and Product/Release Details all use
  Glass-with-Rows. Desktop play controls are
  centered, paused active tracks show pause, and playing active tracks use the
  equalizer.
- Similar Items are constrained to the same creator, category, and experience.
  Reviews use a plus trigger, circular identity, and delete-only ownership with
  a right-aligned trash action. Store release headers retain the creator link
  without its avatar. External release links are flat/no-lift and appear in
  Spotify, Apple Music, YouTube, Bandcamp order.
- Locked Library achievement glyphs use white on dark and black on light;
  unlocked Library glyphs retain accent. Studio achievement artwork stays
  neutral white/black without accent. Radio actions read Play Radio/Stop Radio.
- The desktop mini player omits previous, next, and queue, keeping the primary
  transport and close control; artwork and close resolve to equal 18px edge
  insets. The notification popover resolves to 204px (40% narrower than its
  former 340px width) and centers its footer action.
- Music release new/edit forms place Item Type, Release Date, and Track Count in
  one three-column row; Tags remain full width; Market then Price use two
  columns and Global + Local adds Local Price as the third. Artwork previews
  hide the upload/status row while retaining their removal control.

Rendered checks covered `/settings`, the signed-in creator profile,
`/profile/edit`, `/community`, the audited live thread, `/store`,
`/store/item/here-comes-the-feeling`, the audited Library item, `/radio`,
`/studio/products/new?section=music`, and an existing Studio release at
1,440px. A 390px regression check covered the Library Tracklist and Sample Pack
preview list. Checked routes reported zero horizontal overflow. The Profile
and Community surfaces returned the same computed material/border/elevation;
Store play alignment was centered to 0px delta; the mini-player edge insets
were 18px/18px; and release grids resolved to 4/4/4, 6/6, then 4/4/4 spans.
`git diff --check`, lint, typecheck, and the production build pass; the build
generated 39/39 static pages. At that checkpoint the environment gradient was
unchanged and Wave 8 had not started; the retirement record below supersedes
that status.

#### Desktop Glass material reconciliation — July 15, 2026

The owner identified a visible desktop mismatch between the approved Profile
post/Support surface and the darker Glass used by Studio and other migrated
panels. The correction was made at the material boundary instead of replacing
route markup one surface at a time:

- Profile posts are emitted by `PublicProfileApp` as a semantic
  `section.social-feed`; Support emits native `aside.support-sidebar` and
  `article.support-reader`. Community emits an explicit
  `.ui44-panel.ui44-panel-glass` list surface, while Studio metrics use the
  shared `Ui44Panel` primitive, which emits the canonical classes directly.
- The mismatch was not caused by the shadow, border, opacity, a pseudo-element,
  a nested panel, or the environment. Profile and Support already resolved to
  `--os-control-surface-bg`, while the later canonical ui44 rule resolved
  migrated panels through the darker base `--44ui-material-glass` token.
- At desktop widths, `--44ui-material-glass` now aliases
  `--os-control-surface-bg`: `color-mix(in srgb, var(--os-color-ink) 8%,
  transparent)`. Community no longer requires a route-only material exception.
  The base light/dark values remain the approved mobile material.
- A complete rendered-stack comparison covered background image/color,
  uniform border, radius, box shadow, backdrop/filter, opacity, blend/isolation,
  overflow, pseudo-elements, ancestors, and overlapping elements. Profile,
  Community, Support, and Studio now compute the same fill, dark border
  `rgba(255,255,255,.14)`, Flat elevation (`none`), no filter/backdrop,
  opacity `1`, and no extra
  painted ancestor or pseudo-element. Their only intentional differences are
  component geometry and content layout: Profile/Support retain a 28px
  compatibility radius, while canonical Glass uses 24px.
- Source census finds 63 explicit production `ui44-panel-glass` class strings
  plus 10 direct `Ui44Panel` call sites. The reference audit
  page adds one class string in one additional file. Every audited production
  Glass emitter either crosses that canonical boundary or is one of the
  Profile/Support semantic references above.
- Fresh desktop checks covered `/community`, `/profile/olsten44`, `/support`,
  `/studio`, `/studio/products/new?section=music`, `/calendar`, `/cart`,
  `/checkout`, `/settings`, and `/store/item/here-comes-the-feeling`. Every
  visible canonical panel returned the one approved computed signature and
  zero horizontal overflow.
- Mobile regression checks at 390px covered Community, Studio, the new-music
  editor, and the Store item. They retained `rgba(255,255,255,.03)` in dark
  appearance and reported zero horizontal overflow.
- A stale Safari CSS chunk briefly displayed the former darker recipe while a
  fresh in-app browser showed the corrected stack. The local server was
  restarted and Safari cache-bypass guidance was recorded. This was a cache
  incident, not a second material variant.

The environment gradient, Shell, mobile material, route data, and component
behavior were not changed. Review remains `unreviewed` until the owner finishes
the desktop and mobile page-by-page passes; the later Wave 8 cleanup is complete.
Final gates pass: `git diff --check`, `npm run lint`, `npm run typecheck`, and
`npm run build`; the production build generated 39/39 static pages.

#### Final family reconciliation — July 15, 2026

The final source pass closes or explicitly reclassifies every family that was
previously recorded as `mixed` or `legacy`:

- Topbar, Sidebar, Dock, Radio, reader, launch, hero identity, and dynamic
  media geometry are documented specialized compositions. Their ordinary
  controls, type, focus, menus, and static materials still consume the
  canonical system.
- `HubHero`/`SectionHeader` now emit canonical page/section structure and
  `Ui44Text` roles. Production type tokens are global rather than scoped to the
  reference route, so desktop resolves to 26/32 page and 22/26 section titles,
  while mobile resolves to 34/41 and 28/34.
- Fourteen explicit identity-avatar occurrences cover inline social, review,
  Library, notification, and profile contexts. Settings/profile/notification
  segments, tabs, switches, swatches, pills, and badges declare their canonical
  roles at source and preserve 44px interactive targets.
- Confirm and crop dialogs share canonical scrim/surface/actions plus initial
  focus, focus trap, Escape/scrim dismissal, and focus restoration. Empty,
  loading, error, success, and warning emitters use canonical state/status
  classes with `status` or `alert` semantics as appropriate.
- Fifteen explicit form-grid occurrences cover the responsive Studio,
  Settings, and profile column layouts. Static media-preview/external-link
  layout is canonical. Exactly 12 production inline-style occurrences remain,
  all classified runtime values: media URLs, authored colors, crop transform,
  menu coordinates, playback progress, or a shared dynamic style API.
- Calendar owns canonical page-header, Glass, toolbar, month/agenda, event,
  external-link, and state classes. Desktop retains month view; mobile retains
  agenda view and the shared one-column event-form contract.
- Hover-only feedback is confined to fine-pointer capability rules; the source
  analyzer reports zero unguarded hover-only rules. A final 2px
  `focus-visible` language and composed-field `focus-within` ring own keyboard
  focus, and the global reduced-motion fallback collapses nonessential motion.

Fresh checks confirm nine dynamic inline-style occurrences, 15 canonical form
grids, 14 identity ownership occurrences, two canonical modal surfaces, 17
explicit route-local loading-state emitters plus shared status-aware loading
primitives, and zero remaining `mixed` or `legacy` family-registry rows.
`git diff --check`, `npm run lint`, `npm run typecheck`, and `npm run build`
pass; the production build generated 39/39 static pages. Review remains
`unreviewed`; the Wave 8 record below supersedes the earlier cleanup status.

#### Wave 8 legacy-retirement record — July 15, 2026

The owner authorized a local-only retirement sweep after the consolidated
implementation review. The sweep preserved the dirty worktree and excluded
the Unity demo completely.

- The active CSS surface contracted from 23,587 lines, 3,368 rules, 3,875
  selectors, and seven globally related files at the Wave 8 start to 18,124
  lines, 2,657 rules, 3,014 selectors, and three owned files.
- Five `proposed-*` files were consolidated into `canonical-system.css` and
  deleted. Reference-only layout moved out of production globals; the later
  `/44OS_UI` consolidation replaced the temporary split-page stylesheet with
  `system-reference.css`.
- The source-aware audit removed 672 fully unreferenced rules, 240
  unreferenced custom-property definitions, and 266 declarations shadowed by
  the exact same later selector/property/conditional context.
- Eight unreachable component files and 17 unreferenced component exports were
  deleted. The old `GlassPanel` wrapper was then retired and all ten callers
  moved to the real `Ui44Panel` primitive.
- Studio's old forced achievement material and its compensating `!important`
  overrides were removed; the before/after computed icon signature was exact.
- The final graph has 44 production pages, 43 component files, zero unreachable
  components, zero unreferenced component exports, zero all-source unused CSS
  rules/selectors, and zero exact-shadowed declarations.
- Retained semantic names such as `os-*`, `dashboard-*`, `view-*`, and
  `social-*` are live domain hooks consuming the canonical registry. Retained
  Shell, Dock, Topbar, Radio, reader, launch, and player rules are documented
  specialized families, not an alternate UI system.
- Fourteen representative light-theme desktop/mobile signatures across
  Community, Profile, Studio, Settings, Store Item, Calendar, and Radio were
  byte-for-byte equal in computed geometry/material/type before and after the
  exact-shadow cleanup, with zero horizontal overflow.

No environment-gradient declaration, backend behavior, route contract, user
data, commit, push, or deployment was changed by the retirement sweep.

#### Living `/44OS_UI` reference follow-up — July 15, 2026

The temporary desktop/mobile audit routes were retired in favor of one public,
responsive `/44OS_UI` reference. The page renders the canonical material,
color, elevation, typography, spacing, radii, input, control, menu, Shell,
navigation, settings, identity, catalog, row, state, dialog, player, Radio,
reader, and interactive-launch families at the current viewport. It also
generates searchable A–Z indexes for production CSS custom properties, class
selectors, and exported UI components directly from the current source files.

The route owns only `system-reference.css` for documentation layout and labels;
its specimens consume the real production tokens/classes/components. Removing
the former routes exposed and retired 41 audit-only orphan CSS rules plus the
now-unused custom-property definitions they owned. The permanent audit returns
zero unreachable components, zero dead component exports, zero all-source CSS
orphans, and zero exact-shadowed production declarations. The responsive
reference does not authorize production deployment or replace page-by-page
owner review.

#### Consolidated owner visual-review checklist

Review the following focused set rather than replaying all 220 automated
checks. Unless a narrower size is named, compare desktop at 1,440px and mobile
at 390px; use 320px once for the densest form and row compositions.

- [x] **Foundations and inputs:** `/settings`, `/profile/edit`, `/login` in an
  available signed-out session, and `/studio/products/new?section=music` —
  field material, label/help/error rhythm, focus, stacking, and keyboard-safe
  actions.
- [x] **Community:** `/community`, the audited live Community thread, and
  `/community/new` — plus-trigger composition, post identity/type/actions,
  reply field, mention/results Paper, and even mobile page gutters.
- [x] **Catalog and commerce:** `/store`, `/store/music`,
  `/store/item/here-comes-the-feeling`, `/cart`, and `/checkout` — artwork-first
  cards, Glass Tracklist and Glass Release Details, delete-only reviews, Glass rows,
  totals, and 320px containment.
- [x] **Library and achievements:** `/library`, `/library/music`, and the
  audited Library item — cards, filters, track/sample rows, achievement rows,
  glyphs, completion state, and toast placement.
- [x] **Studio:** `/studio`, `/studio/earnings`, `/studio/events`,
  `/studio/orders`, `/studio/payouts`, and the new product/update editors —
  unified desktop Control Surface Glass material, row hierarchy, form grids, uploads,
  track-entry surfaces, menus, and mobile gutters.
- [x] **Buttons and transient UI:** add/filter/search/bell/cart/account symbols,
  destructive/unavailable buttons, context menus, Paper dropdowns, segmented
  controls, Support disclosure, Escape/outside close, and focus return.
- [x] **Player:** mini player and expanded Now Playing from `/community` at
  desktop and mobile — Glass mini bar, transparent expanded workspace,
  environment visibility, queue, focus loop, Escape return, and Dock boundary.
- [x] **Specialized compositions:** `/radio`, the audited reader, and audited
  launch route — confirm their specialized materials and navigation remain
  independent of generic Glass panels.
- [x] **Narrow regression pass:** `/community`, Store item, `/settings`, and the
  Studio product editor at 320px — no clipped controls, full-bleed panels, or
  horizontal page scroll.
- [x] **Unavailable variants:** recovery, moderation, legal, and admin gated
  states are source-audited and accepted; activating them remains a separate
  product decision.
- [x] **Light appearance decision:** owner approved the current account-driven
  light and dark behavior during the final page-by-page review.

Wave 8 cleanup and Wave 9 owner review are complete. The owner explicitly
authorized commit, push, and production deployment after this audit closed.

### Documentation consolidation record

On July 15, 2026, the former `44_UI_HANDOFF.md`, `44_UI_INPUT_AUDIT.md`, and
`44_UI_PAPER_MENU_AUDIT.md` were retired after their target rules, evidence,
statuses, and cleanup gates were consolidated here. `44OS_NEXT_WORK_PLAN.md`
was also retired as an unreferenced snapshot superseded by
`44OS_MILESTONES.md` and this UI roadmap. The Operations runbook, M11 payment
model, and interactive contract remain because the Foundation and Milestones
documents actively depend on their specialized technical detail.
