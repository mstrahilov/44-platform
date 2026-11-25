# 44OS Studio add/edit parity checklist

Working reference: the completed web create flows in `/studio/products/new`,
`/studio/videos/new`, and `/studio/events/new`.

## Route map

| Category | Web add | Web edit | iOS add/edit surface |
| --- | --- | --- | --- |
| Music | `studio/products/new?section=music` | `studio/products/[id]?section=music` | `StudioLiveItemEditorView` (`.music`) |
| Video | `studio/videos/new` | `studio/videos/[id]` | `StudioVideoEditorView` |
| Book | `studio/products/new?section=books` | `studio/products/[id]?section=books` | `StudioLiveItemEditorView` (`.books`) |
| Game | `studio/products/new?section=games` | `studio/products/[id]?section=games` | `StudioLiveItemEditorView` (`.games`) |
| Event | `studio/events/new` | `studio/events/[id]` | `StudioEventEditorView` |

## Shared parity requirements

- Artwork is the first content block, with the category artwork ratio and the
  same horizontal inset on add and edit.
- Details follows artwork and uses the same title, item type, date, and
  description labels/placeholders on both platforms.
- Optional sections are ordered consistently and start disabled on add; edit
  restores the persisted enabled state.
- Related-release fields use the single-select picker and selected-release row.
- Date/date-time controls use the shared picker components and empty-state
  placeholders.
- Add uses cancel/discard plus save/publish; edit keeps back/delete actions but
  uses the same content layout and save control.
- Rights confirmation appears on every applicable create flow and is retained
  as an edit-only acknowledgement where required by the existing contract.

## Category audit (implementation pass)

### Music

- Web add: artwork, Details, tracks, Links, Visuals, Achievements, Paid
  Download, rights confirmation.
- Web edit: artwork, Details, Track Count/Tracks, Links, Visuals, Achievements,
  and Paid Download now use the same add-form structure. Edit-only lifecycle
  controls remain below the shared content.
- iOS: artwork, Details, Tracks, Links, Visuals, Achievements, and Paid
  Download share `StudioLiveItemEditorView`; the Music title placeholder is
  standardized to “Enter release title”.

### Video

- Web add/edit share `StudioVideoEditor`; edit additionally exposes attachment
  management and delete controls by design.
- iOS uses `StudioVideoEditorView`; its single-release picker uses square
  artwork, a primary title, and a secondary item type, with edit-only
  attachment management retained.

### Book

- Web add uses artwork, Details, inline Book file (PDF), Related Release, Paid
  Download, and rights confirmation.
- Web edit now places artwork, Details, and the inline Book file (PDF) upload
  in the same order as add; Paid Download uses the same toggle/pricing layout.
- iOS uses the shared live editor; Book file (PDF) is inline in Details and
  Related Release uses the same single-select picker as Video/Game.

### Game

- Web add uses artwork, Details, inline Unity WebGL export (ZIP), Visuals,
  Related Release, locked Paid Download, and rights confirmation.
- Web edit now matches add for artwork, Details, and inline Unity WebGL export
  (ZIP); the edit-only delete action remains without a management panel.
- iOS uses the shared live editor; the Game build file is inline in Details,
  Related Release uses the single-select picker, and Paid Download remains
  intentionally locked off.

### Event

- Web add/edit share `studio/events/[id]` with artwork, Details, date/time,
  conditional location fields, Related Release, and edit-only management.
- iOS uses `StudioEventEditorView`; artwork, Details sizing, date/time,
  conditional location fields, and the single music-release Related Release
  picker now mirror web. Event relation persistence uses the dedicated
  `creator_event_related_items` RPC/table contract.

## Verification checklist

- [x] Web Music add/edit
- [x] Web Video add/edit
- [x] Web Book add/edit
- [x] Web Game add/edit
- [x] Web Event add/edit
- [x] iOS Music add/edit
- [x] iOS Video add/edit
- [x] iOS Book add/edit
- [x] iOS Game add/edit
- [x] iOS Event add/edit
- [x] Typecheck and production build
- [x] Confirm no data or permission contract regressions (only existing
  owner-checked RPCs and the already-migrated event relation RPC are used)

## Intentional differences

- Edit pages retain delete/archive, review-state, and attachment-management
  controls that do not belong on a clean add form.
- Video edit retains multi-release attachment management because an existing
  video can already be attached to more than one release; add remains a
  single-release flow.
- Game paid download is displayed but locked off by the existing product rule.
- Event edit retains only the standalone Delete Event action; create retains
  the cancel/discard guard. The former `/studio/events` management page now
  redirects to `/studio`.
