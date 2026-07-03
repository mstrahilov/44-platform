# 44 Platform Codex Handoff

Use this file to bring a fresh Codex chat up to speed quickly.

## Project
- Local folder: `/Users/miro/Studio/44 CORPORATION/44-platform`
- App: Next.js 16 / Supabase platform called 44.
- Goal: a unified 44OS-style app for Store, Services, Resources, Community, Library, Dashboard, Settings, profiles, friends, and messaging.

## Current State
- Production build has been passing with `npm run build`.
- Supabase is the backend.
- Read [Other/supabase-current-system-reference.sql](/Users/miro/Studio/44%20CORPORATION/44-platform/Other/supabase-current-system-reference.sql) for the current expected Supabase shape.
- Read [Other/44OS_UI_GUIDELINES.md](/Users/miro/Studio/44%20CORPORATION/44-platform/Other/44OS_UI_GUIDELINES.md) for the 44OS visual and interaction system.
- Open `/studio/44os` while signed in as a creator/admin tester for the hidden visual reference page.
- Runnable SQL files still kept in `Other/` are current functional migrations/reference scripts.
- Old reset, seed, import, one-off repair, and obsolete taxonomy SQL files were removed to keep future chats from chasing old history.
- The app now uses `Library` as the user-facing name. `Collection` routes may remain only for compatibility.
- New users are created as `creator` profiles by default so testers can access Dashboard immediately.

## Auth / Onboarding
- `/login` has Sign Up and Log In tabs.
- Sign Up collects name, email, and password, and passes name into Supabase metadata.
- Email-link login exists as a secondary action.
- Confirmation redirect remains `/account`.
- `/account` is the post-confirmation community setup page.
- Community setup completion rule is username + avatar URL.

## 44OS UI Direction
- Treat [Other/44OS_UI_GUIDELINES.md](/Users/miro/Studio/44%20CORPORATION/44-platform/Other/44OS_UI_GUIDELINES.md) as the source of truth for typography, buttons, inputs, cards, lists, dropdowns, profile/community patterns, and responsive principles.
- Keep layouts unified across Store, Services, Resources, Community, Library, Dashboard, and Settings.
- Avoid one-off page CSS unless truly necessary.

## Community
- Community tabs: Feed, Friends, Local, Updates, Questions, Collaboration.
- New Post category picker:
  - `General` is first and default.
  - General maps to the existing database discussion category (`discussions` or legacy `discussion`).
  - General is for regular social posts where people can talk about anything.
- New Post tag section label is `Tag`.
- Tagging writes to `post_subjects`; do not rename it to `post_tags`.
- `post_tags` is reserved for future hashtag tagging.

## Profiles / Social
- Public profile cover/header should not overlap the avatar/name/bio/actions.
- Public profiles show tabs: Posts, Releases, Services, Resources.
- No public follower/following counts.
- Friends are the preferred relationship model.
- In post rows, only the avatar links to the profile. Username/handle is display-only. The post title/body links to the thread.

## Dashboard
- Dashboard is creator tooling.
- Overview top cards: Products, Services, Resources.
- No visible Orders tab.
- Payouts route may remain `/dashboard/payouts`, but user-facing copy should say Earnings and Sold Items.

## Library
- Use `Library` everywhere user-facing.
- Avoid new `Collection` naming.
- Existing compatibility routes may remain if needed for old links.

## Build / Verification
- Run `npm run build` before handing off production-ready changes.
- Be careful with `useSearchParams()` in app routes: wrap content in `Suspense` when needed to avoid Vercel build issues.

## Suggested Fresh Chat Prompt
Paste this into a new Codex chat:

> We are working in `/Users/miro/Studio/44 CORPORATION/44-platform`, a Next.js 16 + Supabase app called 44. Please read `CODEX_HANDOFF.md`, `Other/supabase-current-system-reference.sql`, and `Other/44OS_UI_GUIDELINES.md` first, then inspect the current files before editing. Use `/studio/44os` as the hidden visual UI reference page. Preserve the 44OS unified UI direction, keep Library as the user-facing name, keep Community General posts mapped to the existing discussions/discussion category, keep post_subjects behavior unchanged, and run `npm run build` after any production-facing change. Do not undo existing user changes.
