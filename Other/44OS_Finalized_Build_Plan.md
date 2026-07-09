# 44OS — Finalized Build Plan
Supersedes conflicting notes in `44OS_FOUNDATION.md` / `44OS_UI.md` where indicated below. Read this document first; where it disagrees with those two files, this document wins. Update those two files to match once each item ships.

Written to be usable by any developer or coding agent (Claude Code, Codex, or a human) — no assumed prior conversation context needed.

---

## 0. Finalized Decisions (replace prior conflicting docs)

- **Dock order:** Home, Library, Community, Radio, Support (bottom cluster), Settings (bottom cluster). Library moves to the second position, immediately after Home.
- **Services:** removed from the Dock. Surface Services under Home navigation and as a creator Dashboard section instead.
- **Resources:** removed as a standalone Dock destination. Its function is absorbed into Community going forward (see Section 2). Do not build out Resources as its own app.
- **Merch:** becomes a real, functional category under Home/Library — not a placeholder. See Section 1.
- **Questions & Collaboration:** become real structured objects with their own data shape, not just tagged posts in the general feed. See Section 2. This is a genuine schema change — write reviewed SQL to `Other/`, do not run it without explicit user approval and a backup, per the Foundation doc's existing Supabase safety rule.
- **Radio:** full build, including a real admin curation dashboard. This is the single highest-priority item in this plan. See Section 3.
- **Support:** becomes a real Steam/Spotify-style help center, not a placeholder. See Section 4.
- **Settings:** full functional pass — every visible control must actually work. See Section 5.
- **Messages:** must be fully functional end-to-end. See Section 6.
- **Account:** full functional pass — email change, password change, standard account security flows. See Section 7.
- **Onboarding tooltips:** a lightweight, dismissible contextual tips system introduced across the app. See Section 8.
- **Desktop packaging:** research and propose the best approach to ship Windows/Mac apps (Electron or alternative). See Section 9.

Progress snapshot as of July 9, 2026:

- Radio v1: completed.
- Questions & Collaboration: completed.
- Merch v1: completed.
- Messages: in progress.
- Account, Support, Settings, Tooltips, Desktop packaging research, and Evaluation/QA: pending.

**Recommended build order:** Radio (Section 3) → Questions/Collaboration (Section 2) → Merch (Section 1) → Account (Section 7) → Support (Section 4) → Settings (Section 5) → Messages (Section 6) → Onboarding tooltips (Section 8) → Desktop packaging research (Section 9) → Evaluation/testing pass (Section 10).

---

## 1. Merch — Local-Fulfillment Marketplace

**Goal:** Creators can sell physical merchandise without 44 handling shipping, inventory, or global logistics. Local/regional fulfillment only, handled entirely by the creator.

User stories:

- As a creator, I want to list a merch item with a photo, title, description, and price, so I can sell physical goods through my profile.
- As a creator, I want to mark my merch as local-delivery-only (no shipping infrastructure implied), so buyers understand fulfillment expectations upfront.
- As a buyer, I want to pay for a merch item and have my delivery address shared with the creator, so they can fulfill the order themselves.
- As a creator, I want to see the buyer's delivery address once payment clears, so I can produce/source and deliver the item.
- As a creator, I want to mark an order as "Completed" once delivered, so the order lifecycle closes cleanly.
- As a buyer, I want to confirm "Order Received" and optionally leave a review, so trust builds around reliable creators.

Acceptance criteria:

- Merch listing form: image upload, title, description, price, currency (region-aware per existing Settings > Region behavior).
- Order flow: buyer pays (existing cart/checkout flow) → creator sees order in their Dashboard with buyer's delivery address revealed only after payment → creator fulfills locally → creator marks Completed → buyer confirms Received.
- No shipping calculator, no carrier integration, no global delivery promise anywhere in copy or UI. Explicit local-market framing.
- Order status states needed: Paid → In Progress → Completed → Received (buyer-confirmed). Keep this simple — do not over-engineer a full logistics state machine.
- Reviews for merch reuse the existing `product_reviews` pattern already used for Home/Store items — no new review system needed.
- This uses/extends the existing `products` table (already supports merch as an item type per Foundation doc section 6) — check before adding new tables.

---

## 2. Community — Questions & Collaboration as Real Objects

**Goal:** Questions and Collaboration stop being tagged posts inside the general feed and become their own structured, purpose-built surfaces. This also replaces the standalone Resources app — practical how-to knowledge lives here instead.

User stories:

- As a user with a specific practical question (mastering settings, distributor rules, etc.), I want to post it as a Question with tags, so it's discoverable and answerable, not lost in a chronological feed.
- As a user, I want to sort Questions by Unanswered, Most Voted, or Recent, so I can find what's useful quickly.
- As a user, I want to upvote a question or an answer, so the best information rises visibly.
- As the original asker, I want to mark one answer as Accepted, so future visitors know what worked.
- As a user looking to collaborate, I want to post a Collaboration listing with a clear "Open/Filled" status and role needed, so people understand at a glance whether it's still relevant.
- As a user interested in a Collaboration listing, I want a single clear "Respond" action, so reaching out is frictionless.
- As a user posting in general Feed, I want a gentle nudge if my post looks like a question, so it ends up somewhere it can actually be found later.

Acceptance criteria:

- New/updated data shape for Questions: title, tags, vote_count, answer_count, has_accepted_answer, created_at, author. Separate from generic `posts`.
- New/updated data shape for Collaboration: title, status (Open/Filled), role/project type tag, created_at, author.
- Question card UI shows vote count and answer count directly on the card — this is the primary wayfinding mechanism, not onboarding copy.
- Collaboration card UI shows a status pill and a single "Respond" button.
- Community tab subheads: Questions gets something like "Ask something specific. Get an answer from someone who's solved it." Collaboration gets something like "Looking for a collaborator — or looking to be found."
- Feed-to-Questions nudge: lightweight heuristic (message ends in "?" plus relevant keywords) triggers a dismissible inline suggestion to repost in Questions instead. Not a hard block.
- Migration note: existing `#question`/`#collaboration` tagged posts in the current `posts` table need a decision on whether they're preserved as historical Feed content or migrated into the new structure. Do not auto-migrate — flag for explicit approval.
- Write the schema change as a reviewed SQL file in `Other/` first. Do not run it without explicit approval and a backup, per Foundation doc section 6.

---

## 3. Radio — Full Build (Highest Priority)

**Goal:** A working 44 Radio app that feels like a real, continuous station — playlist-driven, scheduled in "blocks," admin-curated for now, creator-submittable later.

### 3a. Listener experience

User stories:

- As a listener, I want to hit Play and hear whatever is "currently playing" on 44 Radio, synced with everyone else listening at the same time.
- As a listener, I want to see the current track title and artist while it plays.
- As a listener, I want to click the artist name and land on their profile.
- As a listener, I want to see a simple schedule of named blocks (e.g. "Night Block," "Quiet Block") so the station feels structured, even if the underlying mechanism is just an ordered/shuffled playlist.

Acceptance criteria:

- Playback uses virtual synced-playback: Supabase stores an ordered playlist with durations and a fixed schedule start timestamp. Client calculates elapsed time since that timestamp to determine current track + offset, then starts Howler.js playback at that exact position. No dedicated streaming server (Icecast/Shoutcast) required for this version.
- Joining mid-track works smoothly — crossfade-in acceptable, hard cut is an acceptable fallback if crossfade isn't feasible in v1.
- Now-playing UI: track title, artist name (linked to profile), minimal player controls consistent with the existing persistent Music player bar pattern.
- Schedule/blocks: a simple named-block system (e.g., time-of-day ranges mapped to a block label and a specific playlist or shuffle set). This can be config-driven rather than a complex scheduling engine — the goal is the *feeling* of structure, not a broadcast scheduling system.

### 3b. Admin curation (you, as admin, for now)

User stories:

- As the admin, I want a Radio section under Dashboard where I can upload tracks specifically for Radio play.
- As the admin, I want to reorder tracks in the Radio playlist.
- As the admin, I want a "Shuffle" action that randomizes play order.
- As the admin, I want to assign tracks to named blocks (Night Block, Quiet Block, etc.) so the schedule has real structure behind it.

Acceptance criteria:

- Admin-only Dashboard section, gated the same way other creator/admin-only Dashboard sections are gated in the existing app registry pattern (`src/lib/osApps.ts` auth/creator gating).
- Upload, reorder, and shuffle actions operate on the Supabase-backed Radio playlist table(s).
- Block assignment is simple metadata on each playlist entry (a block label field), not a separate scheduling system.
- Future-facing note (not required for v1): the data model should not actively block a later feature where non-admin creators submit tracks for Radio consideration — but do not build that submission flow now.

---

## 4. Support — Real Help Center

**Goal:** Replace the current placeholder with an actual Steam/Spotify-style help center: browsable categories, searchable questions and answers, covering the whole platform.

User stories:

- As a user, I want to search or browse help topics by category (account/login, orders, Library, Dock/Settings, Radio, creator uploads, troubleshooting), so I can self-serve instead of contacting support.
- As a user with an unresolved issue, I want a clear path to escalate/contact, so I'm not stuck if self-service doesn't cover my case.

Acceptance criteria:

- Support content organized by category matching Foundation doc section on Support's intended scope: account/login, orders, Library saves/purchases/downloads, Dock/settings, creator uploads, Radio, troubleshooting, contact/escalation.
- Simple question-and-answer format per topic — matches the standard pattern used by Spotify/Wix-style help centers (browsable article list, each article a single clear Q + A, searchable by keyword).
- Search or clear categorization required once content volume grows — a flat unsearchable wall of text is not acceptable.
- This is a content-and-structure task as much as a UI task — initial article content will need to be drafted (can be done collaboratively, doesn't require new engineering beyond the display structure).

---

## 5. Settings — Full Functional Pass

**Goal:** Every visible Settings control actually works. No dead toggles, no cosmetic-only options.

Acceptance criteria:

- Audit all four tabs (System, Dock, Region, Account) against what's actually wired to persistence vs. what's currently cosmetic.
- System/appearance controls (theme, accent color, typography, accessibility options) must persist correctly per-user and apply consistently across sessions.
- Dock tab: landing app choice, visible apps, must reflect the finalized Dock set from Section 0 (Home, Library, Community, Radio — Services and Resources removed from user-facing Dock toggle list).
- Region: defaults from login/location where available, reset returns to detected home country/currency (already specified in UI doc — verify it's actually functional, not just specified).
- Reset Defaults button present and functional on every settings page, bottom right, per existing UI doc placement rule.
- This is a QA/completion pass more than new feature work — the goal is closing the gap between "specified" and "actually functional."

---

## 6. Messages — Full Functional Pass

**Goal:** Direct messaging works end-to-end, not just as a schema placeholder.

Acceptance criteria:

- Users can start a new conversation with another user (from their profile or elsewhere in Community).
- Users can send/receive messages in real time or near-real time.
- Conversation list shows existing conversations, most recent activity first.
- Uses existing `conversations`, `conversation_members`, `messages` tables already defined in Foundation doc section 6 — verify what's built vs. stubbed before adding new schema.
- Basic unread-state indication (even simple — a dot or count is enough for v1).

---

## 7. Account — Full Functional Pass

**Goal:** Standard account security controls work the way they do on any normal platform.

Acceptance criteria:

- Change email (with appropriate confirmation flow).
- Change password (with appropriate current-password verification or reset-flow parity).
- These fields belong in Account settings per existing UI doc rule (identity fields like display name/avatar/bio stay in Profile/Edit Profile, not Account).
- Should reuse existing Supabase Auth capabilities rather than build custom auth logic.

---

## 8. Onboarding Tooltips — Lightweight Contextual Guidance

**Goal:** Teach key interactions contextually instead of via a tutorial, matching how Mac/Steam-style products teach behavior.

Examples of tips to include:
- "Right-click an item to pin it to your Dock."
- "Click and hold... [any other genuinely non-obvious interaction discovered during QA]."

Acceptance criteria:

- Each tip is dismissible with a "Don't show again" action, persisted per-user so it doesn't reappear.
- Tips are contextual — shown near the relevant control, not as a blocking modal or forced tour sequence.
- Should be a small reusable primitive (a tooltip/coach-mark component) rather than one-off implementations per tip.

---

## 9. Desktop Packaging — Research Task

**Goal:** Determine the best way to ship 44OS as a Windows and Mac desktop app.

Acceptance criteria (this is a research/recommendation deliverable, not a build task yet):

- Compare Electron vs. Tauri vs. any other lightweight shell option, specifically for wrapping the existing Next.js web app.
- Preserve existing web routing, auth, and deep-link behavior in the recommendation.
- Direct-download distribution (not app-store distribution) is the intended model — factor that into the comparison.
- Deliver a short written recommendation with tradeoffs before any implementation begins.

---

## 10. Evaluation & Testing Phase (after all above is complete)

Once Sections 1–9 are built:

- Run a full internal QA pass across Home, Library, Community, Radio, Support, Settings, Messages, Account, and Merch flows.
- Invite external testers/early creators.
- Collect feedback, do final tweaks.
- Prepare for public launch/publishing.

---

## Notes for whoever builds this (Claude Code, Codex, or otherwise)

- Read `44OS_FOUNDATION.md` and `44OS_UI.md` in full before touching any file.
- This document supersedes those two docs wherever they conflict, per the decisions in Section 0. Update those two docs to match once each item ships — don't leave them stale.
- Any Supabase schema change: write reviewed SQL to `Other/`, do not run it, wait for explicit user approval and a backup, per the existing Supabase safety rule.
- Run `npm run build` after any production-facing change.
- Services should remain out of the Dock and can be organized under Home navigation plus Dashboard where needed.
