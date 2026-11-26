# Studio Web–iOS Audit

Status: completed source audit; implementation is intentionally not included.

Canonical platform: completed web Studio experience. The iOS side is compared as it exists in the production live editor routes. DEBUG/preview-only editors are called out separately and are not treated as the production baseline.

## 1. Scope and methodology

This audit covers New and Edit flows for Music, Video, Book, Asset (Beat and Sample Pack), Game, and Event.

The audit was performed by tracing route entry points, render trees, shared components, state defaults, validation, upload handlers, picker data sources, and repository/domain calls in both repositories. Visible copy is recorded from source wherever possible. Behavior that cannot be established statically is marked **Needs verification**.

No application code, CSS, database schema, Supabase data, deployment target, or backend contract is changed by this document.

### Route and source map

| Platform | Entry points | Primary implementation |
|---|---|---|
| Web | `/studio/products/new?section=music|books|games`, `/studio/products/[id]` | `src/app/studio/products/new/page.tsx`, `src/app/studio/products/[id]/page.tsx` |
| Web | `/studio/videos/new`, `/studio/videos/[id]` | `src/components/StudioVideoEditor.tsx` |
| Web | `/studio/assets/new`, `/studio/assets/[id]`; beats routes redirect here | `src/components/AssetStudioForm.tsx` |
| Web | `/studio/events/[id]` where `id=new` is the create case; `/studio/events` redirects to `/studio` | `src/app/studio/events/[id]/page.tsx` |
| iOS | Studio `+` menu and catalog edit destinations | `44OS/Features/Studio/CreatorStudioView.swift`, `StudioLiveItemEditorView.swift` |
| iOS | Dedicated video flow | `44OS/Features/Studio/StudioVideoEditorView.swift` |
| iOS | Dedicated event flow | `44OS/Features/Studio/StudioEventEditorView.swift` |

## 2. Cross-platform conventions

These are the web expectations used for every comparison:

- Artwork is the first content control, with the shared artwork surface, consistent aspect ratio, padding, and upload behavior.
- New pages use `New …`; edit pages use `Edit …`. The toolbar uses the shared close/back control and checkmark save action.
- Editors should open at the top. Loading should not briefly show misleading zero-value cards or empty content. Exact iOS scroll restoration is **Needs verification**.
- Digital Studio pricing exposes one visible `Price (USD)` field. Market/global/local selectors are hidden. Existing local pricing remains preserved in backend data and is not silently discarded on edits. Merch pricing remains a separate case.
- Related Release uses the standardized section title and description, toggle defaults, paper picker, release artwork, single selection where defined, `Change` after selection, and truncation within available width.
- Video previews use a landscape YouTube thumbnail. Long titles use ellipsis rather than overflowing.
- Rights confirmation is explicit on creation flows where applicable. Existing rights, file paths, attachment relationships, and Supabase/RPC contracts remain unchanged.
- Delete actions are contextual, full-width/floating where applicable, and do not retain obsolete management panels or duplicate bottom save/cancel controls.
- Date-only and date-time pickers use the standardized visual treatment. Event date/time requires time; other content types use date only.

## 3. Music audit

### Web canonical behavior

**New route:** `/studio/products/new?section=music` → `products/new/page.tsx`.

Order and copy:

1. Artwork upload.
2. `Details` — `Add the item’s core details.`
3. `Title` — `Enter release title`.
4. `Item Type` — `Select item type`.
5. `Release Date` — custom date-only picker, `Select release date`.
6. `Track Count` — 1–30, default `1`.
7. `Tracks` — `Add each track title and audio file.`
8. Track cards: `Track 1`, `Enter title`, `Upload audio`; cards share the glass panel and divider treatment.
9. `Links` toggle — `Link to this release on other platforms.`
10. `Visuals` toggle — `Add YouTube videos to this release.`; select existing or add new video.
11. `Achievements` toggle — `Enable achievements for this release.`.
12. `Paid Download` toggle — `Set prices for downloadable files.`; visible `Price (USD)` when paid.
13. Rights confirmation.

Toolbar: `New Music`/`Edit Music`; close/back on the leading side and a checkmark save action on the trailing side. Artwork is square and uploaded through the shared image upload surface. Validation requires a non-empty title, supported item type, release date, track metadata/files, and rights confirmation as applicable. The date field is date-only. Track uploads use the public/audio pipeline and accept the configured audio formats. Music has no Related Release section; its related-content behavior is the `Visuals` section for attached YouTube videos. Loading uses the shared Studio loading state; exact initial scroll position is **Needs verification**.

The New form starts with one track row; Edit hydrates the existing count and rows. Paid Download is optional/off by default for New and shows one `Price (USD)` input when enabled. Existing local price/currency values remain backend data but are not visible in the digital form.

**Edit route:** `/studio/products/[id]` with music item. It keeps the same artwork/details/tracks/links/visuals/achievements/paid-download ordering, loads existing values, opens at the top, and uses the top checkmark to save. Delete/archive is a contextual floating action; obsolete bottom Cancel/Save controls and management panels are not part of the canonical web layout.

### iOS current behavior

Production uses `StudioLiveItemEditorView` with `New Music`/`Edit Music`, artwork first, shared `StudioFormSection`, native graphical date sheet, track count/tracks, links, videos, achievements, pricing, rights, and edit archive action. iOS uses a checkmark toolbar in this live editor, but pricing still exposes `Market`, `Global Price`, and optional `Local Price`. Track rows currently use `Enter track title` and the shared iOS file picker. Edit uses an archive action rather than the canonical contextual delete treatment. Exact top-scroll behavior is **Needs verification**. DEBUG preview uses a separate legacy Form and bottom save controls.

DEBUG preview editors in `CreatorStudioView.swift` use an older Form-based layout with separate download/market controls and bottom actions; they are legacy unless a DEBUG build is intentionally in scope.

### Music mismatches

| Area | Web canonical behavior | iOS current behavior | Required iOS change | Reusable component candidate | Priority |
|---|---|---|---|---|---|
| Pricing | One visible USD price; local values hidden/preserved | Market selector plus Global/Local fields | Hide market/local controls while preserving stored values | Shared digital pricing section | P0 |
| Track copy | `Enter title`, `Upload audio` | `Enter track title` and native picker title | Match web copy and spacing | Shared track row | P1 |
| Section styling | Standard web glass/divider panels | Native `StudioFormSection` styling differs | Align spacing, panel/divider, and labels | Shared Studio section/card | P1 |
| Edit delete | Contextual floating delete/archive action | Music archive action is separate from other edit archive panels | Match contextual full-width action and copy | Shared edit destructive action | P1 |
| Initial scroll | Starts at top | `ScrollView` has no explicit reset contract | Verify and add top reset if reproducible | Editor scroll coordinator | P2 |
| DEBUG surface | Not applicable | Legacy Form editor remains in DEBUG | Confirm whether DEBUG preview is supported; otherwise label legacy | N/A | P2 |

## 4. Video audit

### Web canonical behavior

**Standalone routes:** `/studio/videos/new` and `/studio/videos/[id]` → `StudioVideoEditor.tsx`.

Order and copy:

1. Landscape `Video thumbnail preview` surface. Empty URL shows the glass landscape placeholder; valid YouTube URL resolves `maxresdefault.jpg` with `hqdefault.jpg` fallback.
2. `Details` — `Add the video’s core details.`.
3. `YouTube link` — `Paste a YouTube video URL`; HTTPS YouTube validation.
4. `Related Release` — `Attach this video to a related release.` with toggle, optional single selection, `Select Release`, selected artwork/title, and `Change`.
5. Edit-only full-width `Delete Video`; no `Video Management` panel.

The picker is the paper `StudioReleasePicker`, artwork-first with truncated title/type. Standalone video selection is restricted to creator Music and Game items. Embedded “Add New Video” from release Visuals locks the current release, hides the change affordance, and keeps the same Related Release visual section. Metadata enrichment is asynchronous and does not block save.

Toolbar titles are `New Video` and `Edit Video`; standalone forms use close/back plus a checkmark. There is no user-editable date field; YouTube published metadata is enriched asynchronously. There is no file upload or rights checkbox. Loading shows a centered status before the editor; editor scroll should start at the top.

### iOS current behavior

`StudioVideoEditorView` has `New Video`/`Edit Video`, Details, HTTPS-like YouTube URL validation, and edit-only `Attached Releases`. New standalone creation can select from `attachableItems`; the source does not establish the same Music/Game filter as web. No landscape thumbnail preview is rendered. New related release uses `Attach this video to a release (optional).`; embedded release context is locked, but copy and row styling differ. Edit uses a potentially multi-row attachment section with detach buttons and `Attach to a Release`. Delete is inside `Video Management`. Dedicated iOS toolbar uses text `Save`, and discard uses the native confirmation dialog. There are no file uploads or rights controls. Loading and initial scroll are **Needs verification**.

### Video mismatches

| Area | Web canonical behavior | iOS current behavior | Required iOS change | Reusable component candidate | Priority |
|---|---|---|---|---|---|
| Thumbnail | Landscape thumbnail/placeholder above Details | No thumbnail surface | Add URL-driven landscape preview with fallback | Shared YouTube thumbnail view | P0 |
| Related Release edit | One toggle-controlled related release | `Attached Releases` list with attach/detach controls | Use one standardized toggle and single selected release | Shared Related Release section | P0 |
| Picker filter | Music and Game items only | `attachableItems` source is broader/unclear | Filter to Music and Game | Shared attachable-release query | P0 |
| Picker design | Paper picker, artwork-first, truncation | Native List sheet, square thumbnails | Match artwork, truncation, and selection presentation | Shared release picker | P1 |
| Embedded context | Related Release section shown; release locked; no Change | Locked row exists but copy/layout differs | Match section title, description, and locked row | Locked Related Release variant | P1 |
| Edit delete | Floating `Delete Video` | `Video Management` panel | Remove management panel; use contextual action | Shared edit destructive action | P1 |
| Toolbar/discard | Checkmark toolbar and standardized discard | Text `Save`, native Keep Editing/Discard Changes dialog | Match toolbar and discard treatment | Shared editor chrome/dialog | P1 |

## 5. Book audit

### Web canonical behavior

**Routes:** `/studio/products/new?section=books` and `/studio/products/[id]`.

Order and copy:

1. Artwork, book aspect ratio.
2. `Details` — `Add the item’s core details.`.
3. `Title` — `Enter book title`.
4. `Item Type` — `Select item type`.
5. `Release Date` — `Select release date`.
6. `Description` — `Enter description`.
7. `Book file (PDF)` with `Upload`.
8. `Related Release` — `Attach this item to a related release.`; toggle, single music release, paper picker, `Select Release`/`Change`.
9. `Paid Download` — `Set prices for downloadable files.`; one visible `Price (USD)` when enabled.
10. Rights confirmation for New.

No obsolete bottom Cancel/Save pair or management section appears on Edit. The legacy Native Reader fields in `StudioNativeContentFields.tsx` are not part of the canonical web Book form unless a route explicitly invokes them; status is **Needs verification**.

Toolbar titles are `New Book` and `Edit Book`; artwork uses the book aspect ratio and the shared image upload surface. Title, item type, description, and PDF are required/validated according to the form; the date is date-only. Related Release is optional and single-select. Paid Download is optional/off by default and exposes only `Price (USD)` when enabled. Rights confirmation is New-only. Edit opens at the top and uses the contextual delete action.

### iOS current behavior

Production uses `StudioLiveItemEditorView` with artwork, Details, item type/date/description, inline protected book file, optional related items, pricing, and creation rights. Existing books retain optional video editing because of the current `showsVideosSection` rule; this differs from the canonical scope and needs confirmation. Existing books use the shared non-music archive panel. iOS pricing exposes Market/local controls. The native date sheet is date-only; the protected PDF picker is private. Toolbar is checkmark-based in this live editor, while edit deletion remains an archive-panel action.

### Book mismatches

| Area | Web canonical behavior | iOS current behavior | Required iOS change | Reusable component candidate | Priority |
|---|---|---|---|---|---|
| Pricing | One visible USD price | Market plus local pricing | Hide selector/local field; preserve data | Shared digital pricing section | P0 |
| Related Release | Standard single-release toggle/picker | Related item section with native sheet | Match copy, toggle, picker, artwork, truncation | Shared Related Release section | P1 |
| Existing videos | Canonical Book flow does not add unrelated video controls | Existing books retain optional video section | Confirm whether legacy video editing is required; otherwise hide | Conditional media section | P1 |
| Edit delete | Contextual delete action | Shared archive management panel for non-music edits | Replace panel with contextual full-width action | Shared edit destructive action | P1 |
| Native Reader | Not visible in canonical web form | Native content state/model exists | Keep backend capability, hide UI unless explicitly required | Native content gate | P2 |

## 6. Asset audit (Beat and Sample Pack)

### Web canonical behavior

**Routes:** `/studio/assets/new`, `/studio/assets/[id]`; `/studio/beats/*` redirects to the asset routes. Implementation: `AssetStudioForm.tsx`.

Common order:

1. Artwork.
2. `Details` — `Add the item’s core details.`.
3. `Title` — `Enter asset title`.
4. `Item Type` — `Select item type`.

#### Beat variant

- `BPM`, numeric and validated 40–240.
- `Beat Pricing` with `Select beat pricing`, `Free`, and `Paid license`.
- Free: `Audio File` and `Upload file`; no license tier section.
- Paid: `Audio Preview` and `Upload file`.
- `Licenses` — `Choose the license tiers and prices to offer.`.
- Tiers are Basic License — `Non-exclusive license (MP3)`, Premium License — `Non-exclusive license (WAV)`, and Exclusive License — `Exclusive license (WAV + stems)`.
- Each enabled tier has `Price (USD)` and one upload: `MP3 file`, `WAV file`, or `WAV + Stems (ZIP)` with `Upload file`.
- Trackout remains backend-compatible but is not a visible tier.
- Key, Mode, and Time Signature are not visible in the canonical web UI.

#### Sample Pack variant

- `Sample Pack Pricing` with `Select sample pack pricing`, `Free`, and `Paid`.
- `Price (USD)` appears only for Paid.
- `Sample Preview Count` appears only for Sample Pack item type.
- `Sample Pack File (ZIP)` with `Upload file` appears after pricing is chosen.
- `Sample Previews` cards use the shared track-card panel/divider treatment: `Sample Preview 1`, `Enter title`, `Upload audio`.
- Beat-only fields and Beat Pricing do not render for Sample Pack.
- Sample Pack-only fields do not render for Beat.
- Rights confirmation closes the form.

Toolbar titles are `New Asset` and `Edit Asset`; artwork is the first upload. The current web Asset Details form has no visible date picker. Beat BPM is numeric and constrained to 40–240. Sample Pack pricing/count/file controls render only for Sample Pack. Beat and Sample Pack uploads are private where specified. There is no Related Release or Paid Download toggle section separate from the asset pricing model. Loading uses `Loading Asset Studio…`; initial scroll is **Needs verification**.

### iOS current behavior

Production `CreatorStudioView` routes Add Asset to `StudioAssetPlaceholderView`, so the live Asset form is unavailable from the production `+` menu. `StudioLiveItemEditorView` contains partial Beat/Sample Pack support when reached through `.beats`/`.samplePacks`: Beat has a separate Sound section with BPM, Key, Mode, Time Signature, Samples, and disclosure; Preview and Private Files are separate sections; `StudioBeatTier` still includes Free and Trackout. Sample Pack has an item subtype/date flow, protected archive, and `Sample Previews` with `Enter sample title`, `Public Audio`, reorder/remove controls, and an `Add Preview` action. This also means iOS currently exposes a Release Date in the asset editor that the current web Asset Details form does not. iOS pricing and old DEBUG asset forms expose market selectors. Toolbar is checkmark-based in the live editor; loading and scroll behavior are **Needs verification**.

### Asset mismatches

| Area | Web canonical behavior | iOS current behavior | Required iOS change | Reusable component candidate | Priority |
|---|---|---|---|---|---|
| Add Asset route | Functional New Asset form | Production route is placeholder | Route Add Asset to functional Beat/Sample Pack editor | Shared asset editor entry | P0 |
| Beat fields | BPM only from sound metadata; no Key/Mode/Time Signature UI | Sound exposes BPM, Key, Mode, Time Signature, Samples | Remove Key, Mode, Time Signature from UI while retaining backend fields | Beat details section | P0 |
| Beat pricing | `Beat Pricing`: Free/Paid license | License section includes Free and Trackout tiers | Move Free/Paid choice above uploads; hide Free tier and Trackout tier | Beat pricing state machine | P0 |
| Beat preview | Free uses Audio File; Paid uses Audio Preview | Tagged Preview section | Match contextual labels and upload controls | Contextual audio upload | P1 |
| License tiers | Basic/Premium/Exclusive only | Basic/Premium/Trackout/Exclusive/Free | Show only canonical three paid tiers; preserve old data server-side | License tier cards | P0 |
| License files | MP3, WAV, WAV + stems ZIP, one upload each | Premium requires MP3+WAV; Exclusive/Trackout require all files | Match visible labels and per-tier upload model | License upload row | P1 |
| Sample Pack pricing | Conditional `Sample Pack Pricing`, Free/Paid | Pricing model is not aligned with web | Add conditional pricing dropdown and USD field | Asset pricing section | P0 |
| Preview count | Only Sample Pack; count drives cards | Preview list with Add Preview and no canonical count control | Add Sample Preview Count and synchronize card count | Shared track/sample list | P1 |
| Preview cards | Glass panel/dividers, `Enter title`, `Upload audio` | `Enter sample title`, `Public Audio`, reorder/remove actions | Match labels, panel, divider, spacing, and upload button | Shared preview card list | P1 |
| Conditional visibility | Beat fields and Sample Pack fields never overlap | Subtype logic exists but entry route is unavailable | Verify all conditional transitions in live editor | Asset subtype renderer | P0 |
| Pricing visibility | One USD field; local hidden | Market/local fields remain in live/legacy forms | Hide selectors and preserve local backend values | Shared digital pricing section | P0 |

## 7. Game audit

### Web canonical behavior

**Routes:** `/studio/products/new?section=games`, `/studio/products/[id]`.

Order and copy:

1. Artwork.
2. `Details` — `Add the item’s core details.`.
3. `Title` — `Enter game title`.
4. `Release Date` — `Select release date`.
5. `Description` — `Enter description`.
6. `Unity WebGL export (ZIP)` with `Upload file`.
7. `Related Release` — `Attach this item to a related release.`; single music release picker.
8. Paid Download remains visibly disabled/off because games are not sold through the item-level digital pricing control.
9. Rights confirmation on New.

Edit uses the same fields, top checkmark save, related-release component, and contextual `Delete Game`; no Item Tags, game-state preview text, bottom Cancel/Save pair, or management panel.

Game title/date/description are validated as text/date inputs; the date picker is date-only. The WebGL ZIP is a private upload. Games have no rights section on Edit and no Related Release picker change affordance after selection beyond the standardized component. Loading and initial scroll should match the shared editor contract.

### iOS current behavior

Production uses `StudioLiveItemEditorView` with game title/date/description, Unity WebGL ZIP, Related Release, disabled Paid Download, creation rights, and a non-music archive management panel on edit. The source also contains legacy DEBUG Game UI with Item Tags and the “desktop-only and free during this private submission phase” text. The live editor uses a checkmark toolbar and native date sheet; the private file picker currently uses shared iOS button copy that needs comparison with web.

### Game mismatches

| Area | Web canonical behavior | iOS current behavior | Required iOS change | Reusable component candidate | Priority |
|---|---|---|---|---|---|
| Edit delete | Floating `Delete Game` | `Release Management` archive panel | Replace panel with contextual delete action | Shared edit destructive action | P1 |
| Related Release | Standard single-release picker | Similar data model, native picker styling | Match web toggle, picker, artwork, truncation | Shared Related Release section | P1 |
| Legacy fields | No Item Tags or game-state preview text | DEBUG editor still exposes both | Remove from supported production surface; document DEBUG status | N/A | P1 |
| File control | Inline `Unity WebGL export (ZIP)` / `Upload file` | Protected download field exists but button copy uses `Add` in shared picker | Match title and button copy | Shared protected-file field | P1 |
| Pricing | Disabled/off paid download | Disabled/off section exists | Confirm exact copy and disabled state | Shared game pricing state | P2 |

## 8. Event audit

### Web canonical behavior

**Route:** `src/app/studio/events/[id]/page.tsx`, with `id=new` for creation.

Order and copy:

1. Event artwork upload.
2. `Details` — `Add the event’s core details.`.
3. `Title` — `Enter event title`, max 120.
4. `Description` — `Enter description`, max 280.
5. `Start date and time` — custom paper date/time picker.
6. `End date and time` — same component; end must be after start.
7. `Event location` — `Select event location`, Venue or Online; legacy Hybrid is retained only when already stored.
8. Venue address or Online URL appears conditionally.
9. `Related Release` — `Attach this item to a related release.`; optional toggle, single music release, standardized picker.
10. Edit-only contextual full-width `Delete Event`; no Event Management heading.

Event persistence uses the existing creator-event domain/RPC functions. The web route does not add a rights confirmation section.

Toolbar titles are `New Event` and `Edit Event`; close/back and checkmark save are shared. Artwork is an event-cover upload. Title and description are text inputs with 120/280-character limits. Start/end use date-time pickers, unlike every other content type. There are no event file uploads and no rights checkbox. Loading is route-level and must not expose empty event cards; initial scroll is **Needs verification**.

### iOS current behavior

`StudioEventEditorView` has New/Edit titles, artwork, Details, title/description limits, start/end `StudioDateTimeSelector`, location choice, conditional venue/online fields, Related Release, and edit-only `Event Management`. Date/time uses a native graphical SwiftUI sheet with `.date` and `.hourAndMinute`. Dedicated toolbar uses text `Save`; discard/delete use native confirmation dialogs. There are no event uploads or rights controls. Loading related releases and initial scroll are **Needs verification**.

### Event mismatches

| Area | Web canonical behavior | iOS current behavior | Required iOS change | Reusable component candidate | Priority |
|---|---|---|---|---|---|
| Date/time picker | Standardized paper calendar with vertically integrated time controls | Native graphical DatePicker sheet | Match shared visual treatment while retaining date+time semantics; confirm platform feasibility | Shared date-time picker | P1 |
| Related Release | Standard toggle/picker and copy | Similar toggle, native picker | Match picker artwork, truncation, spacing, and defaults | Shared Related Release section | P1 |
| Delete | Floating `Delete Event` | `Event Management` panel | Remove management heading/panel | Shared edit destructive action | P1 |
| Toolbar/discard | Checkmark toolbar and standardized discard | Text `Save` and native confirmation | Match editor chrome/dialog behavior | Shared editor chrome/dialog | P1 |
| Location conditionals | Venue address or Online URL with current web labels | Same broad branches; Hybrid legacy retained | Verify exact copy and legacy Hybrid handling | Shared conditional location fields | P2 |

## 9. Shared component and data-model inventory

### Web components

- `UploadField`, artwork surfaces, and private-item storage controls.
- `StudioDateInput` and `StudioDateTimeInput` for paper date/time pickers.
- `StudioReleasePicker` and `StudioRelatedItemsField` for single-release selection, artwork, truncation, and `Change`.
- `StudioVideoEditor` and `StudioVisualsEditor` for YouTube URL validation, thumbnail preview, and embedded locked-release creation.
- `StudioNativeContentFields` for tracks/sample previews.
- `StudioPricingFields` for USD-only digital pricing presentation.
- `StudioRightsPanel` for rights confirmation.
- Domain functions in `studioPublishing`, `nativeContent`, `releaseFeatures`, `creatorCommerce`, and `events`.

### iOS components

- `StudioLiveItemEditorView` for Music/Book/Asset/Game live forms.
- `StudioVideoEditorView`, `StudioEventEditorView` for dedicated flows.
- `StudioFormSection`, `StudioField`, `StudioDropdown`, `StudioDateSelector`, and `StudioDateTimeSelector`.
- `StudioArtworkPicker`, `StudioFilePicker`, and resumable/private upload types.
- `SelectReleaseForVideoSheet`, `StudioReleaseArtworkThumbnail`, and related-item picker code.
- `StudioMarketPricing`, `StudioBeat`, `StudioNativeContent`, `StudioTracks`, and `StudioRepository`.

### Backend invariants to preserve

- Existing Supabase tables, RPCs, storage buckets, private file paths, release/video/event attachment relationships, track/sample preview persistence, and local pricing columns.
- iOS repository calls and web domain functions remain contract-compatible.
- Existing local prices may remain in storage even when their UI is hidden.
- Legacy Trackout/local/native-reader records must not be destructively migrated as part of UI alignment.

## 10. Prioritized implementation sequence

1. Shared editor chrome, USD-only pricing presentation, Related Release component, artwork/title truncation, and loading/top-scroll primitives.
2. Music New/Edit.
3. Video New/Edit and embedded Add New Video.
4. Book New/Edit.
5. Asset New/Edit, Beat first and Sample Pack second.
6. Game New/Edit.
7. Event New/Edit and date-time picker styling.
8. Full cross-content regression and backend-preservation verification.

## 11. Acceptance criteria

### Music

- New/Edit iOS matches web order, copy, artwork, tracks, links, visuals, achievements, paid download, rights, toolbar, and delete behavior.
- Only USD is visible for digital pricing; local values survive edits.
- Track rows use `Enter title` and `Upload audio`.

### Video

- New/Edit shows the landscape YouTube preview and validates HTTPS YouTube URLs.
- Related Release is optional, single-select, Music/Game-filtered, truncated, and uses the same picker for standalone and embedded flows.
- Embedded release is locked; edit without a release shows `Select Release` instead of opening a picker automatically.
- Delete and discard match the shared editor behavior.

### Book

- Artwork/details/date/description/PDF/Related Release/paid download/rights match web.
- No obsolete market selector, management panel, duplicate bottom actions, or unsupported legacy fields appear.

### Asset

- Add Asset is functional in production.
- Beat and Sample Pack controls are mutually conditional.
- Beat shows BPM, Beat Pricing, Audio File/Audio Preview, and only Basic/Premium/Exclusive paid tiers.
- Sample Pack shows Sample Pack Pricing, Sample Preview Count, ZIP upload, and panelized preview cards.
- Key, Mode, Time Signature, Free License tier, and Trackout tier are not visible.

### Game

- WebGL ZIP is inline with the Details fields; Related Release is standardized and single-select.
- Paid Download remains disabled/off as canonical.
- Item Tags, preview-state prose, management panels, and duplicate bottom actions are absent.

### Event

- Artwork, details, date/time, location conditionals, Related Release, save, discard, and delete match web.
- Date-only forms remain date-only; Event alone supports time.
- End time must follow start time.

## 12. Risks, dependencies, and confirmation items

- The iOS repository contains substantial pre-existing uncommitted work. Implementation must avoid resetting, cleaning, or attributing unrelated edits to this audit.
- Confirm whether DEBUG preview editors must remain supported. They are materially behind the production web canonical forms.
- Confirm whether iOS should use a custom paper date/time surface or a carefully styled native sheet where platform conventions constrain parity.
- Verify local-price preservation after hiding the iOS selector; do not clear stored local values merely because the field is no longer shown.
- Verify whether any existing Book video attachments require edit-only preservation despite being absent from the canonical New Book flow.
- Verify initial scroll position on every iOS editor after navigation and after returning from a picker.

## 13. Proposed GOAL breakdown

Each GOAL should implement one content type, run focused tests, and wait for user verification before moving on:

1. **Music parity:** New/Edit Music, shared pricing/toolbar/scroll foundations, tracks, links, visuals, achievements, rights, delete.
2. **Video parity:** thumbnail preview, URL validation, Related Release single-selection/filtering, embedded locked context, edit/delete/discard.
3. **Book parity:** artwork/details/PDF, Related Release, paid download, rights, edit actions.
4. **Asset parity:** production Add Asset route; Beat state machine and license tiers; Sample Pack pricing/count/previews; conditional rendering.
5. **Game parity:** WebGL upload, Related Release, disabled paid download, rights, edit/delete cleanup.
6. **Event parity:** date/time picker, location conditionals, Related Release, toolbar/discard/delete.
7. **Regression goal:** cross-platform smoke verification, local-price preservation, attachment/file persistence, truncation, loading, and top-scroll checks.

Recommended verification after each GOAL: Swift syntax check, focused unit/UI tests for the touched flow, `git diff --check`, and manual New/Edit verification in the iOS simulator. No schema, Supabase-data, or deployment changes are included.
