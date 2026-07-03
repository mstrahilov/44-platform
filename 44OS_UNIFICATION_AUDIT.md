# 44OS Unification Audit

Sweep of pages that break from the 44OS UI system defined in [Other/44OS_UI_GUIDELINES.md](Other/44OS_UI_GUIDELINES.md) and demonstrated in [src/app/studio/44os/page.tsx](src/app/studio/44os/page.tsx). Each entry lists what's off and what to replace it with.

Legend
- **P0** = system-wide primitive; fixing once ripples everywhere.
- **P1** = page-level violation of tokens/components.
- **P2** = small cleanup (single style prop, inline color).

---

## Already done in this pass
- Global `--os-color-paper` and `--os-paper-bg` swapped from `#fbfaf6` → `#ffffff`. No other `#fbfaf6` references remain in the codebase (checked `.css`/`.tsx`/`.ts`).

---

## P0 — System primitives to normalize first

### 1. Retire the legacy `.input` class in favor of `os-input-field` / `os-input-textarea`
Guidelines say inputs must use `os-input-field`, `os-input-textarea`, `os-input-search`, or `os-input-upload`. The old `.input` class (defined in [src/app/globals.css:1114](src/app/globals.css)) is still used in **61 places across 10 files**:
- [src/app/account/page.tsx](src/app/account/page.tsx)
- [src/app/settings/page.tsx](src/app/settings/page.tsx)
- [src/app/dashboard/posts/new/page.tsx](src/app/dashboard/posts/new/page.tsx)
- [src/app/dashboard/preferences/page.tsx](src/app/dashboard/preferences/page.tsx)
- [src/app/dashboard/products/new/page.tsx](src/app/dashboard/products/new/page.tsx)
- [src/app/dashboard/products/[id]/page.tsx](src/app/dashboard/products/[id]/page.tsx)
- [src/app/dashboard/resources/new/page.tsx](src/app/dashboard/resources/new/page.tsx)
- [src/app/dashboard/resources/[id]/page.tsx](src/app/dashboard/resources/[id]/page.tsx)
- [src/app/dashboard/services/new/page.tsx](src/app/dashboard/services/new/page.tsx)
- [src/app/dashboard/services/[id]/page.tsx](src/app/dashboard/services/[id]/page.tsx)

**Fix:** replace `className="input"` with `className="os-input-field"` (or `os-input-textarea` for `<textarea>`), then delete the `.input` block from `globals.css`.

### 2. Retire `dashboard-flat` wrapper on editor forms
`dashboard-flat` is a legacy wrapper used only on dashboard editor pages. Editors should sit inside the standard `dashboard-editor` + `dashboard-section` rhythm shown in [studio/44os](src/app/studio/44os/page.tsx). Used in:
- [src/app/dashboard/posts/new/page.tsx](src/app/dashboard/posts/new/page.tsx)
- [src/app/dashboard/products/new/page.tsx](src/app/dashboard/products/new/page.tsx), [src/app/dashboard/products/[id]/page.tsx](src/app/dashboard/products/[id]/page.tsx)
- [src/app/dashboard/resources/new/page.tsx](src/app/dashboard/resources/new/page.tsx), [src/app/dashboard/resources/[id]/page.tsx](src/app/dashboard/resources/[id]/page.tsx)
- [src/app/dashboard/services/new/page.tsx](src/app/dashboard/services/new/page.tsx), [src/app/dashboard/services/[id]/page.tsx](src/app/dashboard/services/[id]/page.tsx)

**Fix:** replace with `dashboard-section` (or drop entirely if the section wrapper isn't needed).

### 3. Retire `SystemPanel` in favor of `PageShell` + `dashboard-header` + tabs
`SystemPanel` ([src/components/SystemPanel.tsx](src/components/SystemPanel.tsx)) is an older shell used only by three pages, none of which use `PageShell` or `os-type-display`. This is the single biggest source of "this page feels different":
- [src/app/library/page.tsx](src/app/library/page.tsx)
- [src/app/notifications/page.tsx](src/app/notifications/page.tsx)
- [src/app/settings/page.tsx](src/app/settings/page.tsx)

**Fix:** rebuild each of these on `PageShell` with a `dashboard-header` (display type + one-line copy) and `.settings-segment` tabs, matching Community / Dashboard / Friends.

### 4. Standardize hub heroes
`HubHero` ([src/components/Ui.tsx:230](src/components/Ui.tsx)) already outputs `os-type-display` — good. But the `app-hero` / `app-hero-title` / `app-hero-copy` classes it wraps around should be verified against the `dashboard-header` rhythm on non-dashboard hubs. If `HubHero` is producing different spacing than `dashboard-header`, unify them. Files using `HubHero`:
- [src/app/page.tsx](src/app/page.tsx), [src/app/store/[category]/page.tsx](src/app/store/[category]/page.tsx)
- [src/app/services/page.tsx](src/app/services/page.tsx), [src/app/services/browse/page.tsx](src/app/services/browse/page.tsx), [src/app/services/browse/[category]/page.tsx](src/app/services/browse/[category]/page.tsx)
- [src/app/resources/page.tsx](src/app/resources/page.tsx), [src/app/resources/browse/page.tsx](src/app/resources/browse/page.tsx), [src/app/resources/browse/[category]/page.tsx](src/app/resources/browse/[category]/page.tsx)
- All `dashboard/*/new` and `[id]` editors listed under P0-2.

**Fix:** decide — either make `HubHero` render a `dashboard-header` internally, or replace it everywhere. Either way, one hero pattern across Store / Services / Resources / Community / Library / Dashboard.

---

## P1 — Page-level violations

### [src/app/dashboard/posts/new/page.tsx](src/app/dashboard/posts/new/page.tsx)
- **Lines 90, 92, 93, 95:** field labels rendered as `<div style={{ marginBottom: 8, fontWeight: 700 }}>`. Replace with `<div className="os-type-card-title" style={{ marginBottom: 8 }}>` per guidelines.
- **Line 96:** error message uses `color: '#ff9b9b'`, hardcoded, and `fontSize: 14, fontWeight: 600` inline. Replace color with `var(--os-color-danger)` and drop the inline font styles (use `os-type-body-small`).
- **Line 98:** `fontSize: 14` inline. Replace with `os-type-body-small`.
- Uses `.input` (P0-1) and `dashboard-flat` (P0-2).

### [src/app/library/item/[kind]/[id]/page.tsx](src/app/library/item/[kind]/[id]/page.tsx)
- **Line 269:** `<span style={{ fontWeight: 700 }}>` on creator name. Replace with an `os-type` token or a small utility class — inline `fontWeight` shouldn't exist in a leaf.
- **Line 287:** description uses `fontSize: 16, lineHeight: 1.72` inline on top of `os-type-body`. Drop the overrides — the token already defines these.
- **Lines 403, 464:** `<h1 className="os-type-display" style={{ color: '#fff' }}>` for resource and service hero titles. Hardcoded white breaks dark mode. Replace with a token (introduce `--os-color-ink-on-hero` if the hero always has a dark image, otherwise remove).

### [src/app/product/[id]/page.tsx](src/app/product/[id]/page.tsx)
- **Line 109:** `<span style={{ fontWeight: 700 }}>` on creator name — same fix as above.
- **Line 112:** `color: canClaimToLibrary ? '#7cff4f' : '#fff'` hardcodes accent + white. Replace with `var(--os-color-accent)` / a proper hero ink token.
- **Line 126:** duplicate description inline overrides — same fix as `library/item`.

### [src/app/service/[id]/page.tsx](src/app/service/[id]/page.tsx)
- **Line 68:** `<span style={{ fontWeight: 700 }}>` on creator name.
- **Line 89:** same duplicate description overrides.

### [src/app/dashboard/settings/page.tsx](src/app/dashboard/settings/page.tsx)
- **Lines 20, 21, 32:** hardcoded `fontSize: 42`, `fontWeight: 780`, `fontSize: 18` on the empty-state hero. Replace with `os-type-display` / `os-type-body`. This page also skips `dashboard-header` — it should adopt the standard header rhythm.

### [src/app/library/page.tsx](src/app/library/page.tsx)
- Uses `SystemPanel` instead of `PageShell` (P0-3).
- Single hardcoded font style at line ~ (fontSize inline).
- No `os-type-display` — Library hub currently has no display-tier title.
- Cards should visually align with Store cards per guidelines.

### [src/app/notifications/page.tsx](src/app/notifications/page.tsx)
- Uses `SystemPanel` instead of `PageShell` (P0-3).
- Should follow the `dashboard-list-surface` row pattern for each notification.

### [src/app/settings/page.tsx](src/app/settings/page.tsx)
- Uses `SystemPanel` instead of `PageShell` (P0-3).
- Uses `.input` (P0-1).
- Should adopt `.settings-segment` for the section switcher and `dashboard-list-row` for individual settings rows.

### [src/app/account/page.tsx](src/app/account/page.tsx)
- Uses `.input` (P0-1). Otherwise the page structure is fine.

### Legacy redirect stubs (no action needed, keep as-is)
Purely `redirect()`-only files — no UI, no change needed:
- `collection/page.tsx`, `collection/[category]/page.tsx`, `collection/item/[kind]/[id]/page.tsx`
- `library/[category]/page.tsx`
- `dashboard/orders/page.tsx`, `dashboard/analytics/page.tsx`
- `studio/page.tsx`
- `profile/page.tsx`, `profile/[username]/page.tsx`, `community/[slug]/page.tsx` (thin client redirect wrappers)

---

## P2 — Small cleanups

### [src/app/studio/44os/page.tsx](src/app/studio/44os/page.tsx) — reference page itself
- **Lines 89, 108, 134, 178, 213:** uses `os-type-panel-content` (not in the guidelines list). Should be `os-type-panel-title` or `os-type-section-title`. Small inconsistency in the reference itself.
- **Line 183:** placeholder `linear-gradient(135deg, #d8b04c, #141414)` — acceptable since it's a stand-in for artwork, but worth calling out.

### Community thread / dashboard list pages
Several `dashboard/*` list pages (`posts`, `products`, `resources`, `services`, `payouts`, `preferences`, `page.tsx`) have one lingering `fontSize`/`fontWeight` each. Should be swept during the same pass as the P1 edits — they'll all be one-line replacements to an `os-type-*` class.

### Global sweep to run after P0 lands
```
# should return 0 results when unification is complete
grep -rnE 'className="input"' src/app
grep -rn "dashboard-flat" src/app
grep -rn "SystemPanel" src/app
grep -rnE "fontSize:\s*['\"]?[0-9]|fontWeight:\s*[0-9]" src/app
grep -rnE "background:\s*['\"]?#[0-9a-f]{3,6}|color:\s*['\"]?#[0-9a-f]{3,6}" src/app
```

---

## Suggested order of work
1. Kick off with the two easy globals: retire `.input` (P0-1) and `dashboard-flat` (P0-2) — mechanical replaces across ~10 dashboard files. This alone removes ~half the inline-style noise on editor pages.
2. Unify hub heroes (P0-4) — one decision, small blast radius, unlocks consistency across Store / Services / Resources hubs.
3. Rebuild `library`, `notifications`, `settings` on `PageShell` (P0-3). This is the biggest visible jump.
4. Sweep P1 pages for hardcoded fonts/colors on hero titles and creator lines.
5. Fix `os-type-panel-content` → `os-type-panel-title` in the reference page so it matches the guidelines it's documenting.

Awaiting green light before making any of these changes.
