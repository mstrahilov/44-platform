# 44OS Foundation

This document is the architectural and operational source of truth for 44OS. It describes how the live system works now. It is not a project diary.

The complete handoff is intentionally limited to five files:

- `44OS_FOUNDATION.md` — product, architecture, data, security, providers, and operations.
- `44OS_UI.md` — visual, interaction, responsive, and accessibility rules.
- `44OS_MILESTONES.md` — only current work and its completion criteria.
- `44OS_DESKTOP_APPLICATIONS.md` — the detailed cross-session tracker for the active Mac and Windows website-shell milestone.
- `44OS_BRANDING.md` — the canonical private source for company, product, writing, logo, color, typography, social, outreach, and approval guidance.

Read Foundation, then UI, then Milestones before making production-facing changes. Read the Desktop Applications tracker before desktop-shell work. When a decision changes, update every affected handoff file in the same change. Do not recreate other retired proposal, research, setup, or runbook documents.

## Current production baseline

Recorded July 20, 2026:

- `https://44os.com` is the permanent light editorial front door, `https://www.44os.com` permanently redirects to it, and `https://app.44os.com` is the canonical application origin. All three hosts use the same GitHub-backed Vercel project and release.
- Legacy apex application paths permanently redirect to the identical path and query on `app.44os.com`. Apex `/api/*` remains a non-public compatibility surface for delayed provider delivery and rollback; it is never redirected. Both host health checks pass against Supabase.
- The app is Next.js App Router with React 19 and strict TypeScript. Supabase owns authentication and application data; Vercel hosts the app.
- Linked Supabase history contains the reviewed forward migration chain through `20260720060000_application_origin_email_links.sql`. Never rewrite an applied migration; add a reviewed forward migration.
- The worktree contains the backward-compatible Team candidate `20260721010000_team_workspace_and_brand_system.sql`. It has passed local replay and security tests but is not production truth until the owner approves the guide/assets and the migration is deliberately applied.
- The latest recorded full database gate passed clean replay, linked lint, and 22 pgTAP files with 543 assertions. Lint, strict typecheck, production build, launch smoke, mobile safe-area checks, analytics contract, commerce contract, hardening contract, and `git diff --check` also passed for the recorded release.
- Public Member signup and eligible purchase presentation are enabled. Creator promotion, paid-sale eligibility, fulfillment confirmation, and payout eligibility remain server-authoritative.
- Two controlled low-value digital orders completed the live payment/refund path. The latest Admin reconciliation checked both orders with zero mismatches. Refunded access was revoked without deleting order or Library history.
- All eight launch Merch Items are synchronized, imaged, reviewed, and published: 44 T-Shirt, Sweatshirt, Hoodie, Windbreaker, Beanie, Hat, Bag, and Satchel. Legacy 44 Tote was removed after dependency checks.
- Printful catalog import, quotes, and non-charging draft creation are enabled. Signed webhooks are configured. 44OS has no provider-confirmation action; the owner confirms manufacturing only inside Printful.
- Hosted Supabase Auth mail and application transactional mail are live through Resend. `support@44os.com` is the monitored iCloud mailbox. Support web intake, newsletter synchronization, and newsletter delivery remain off.
- Consent-gated analytics code is deployed but inert because no production Google measurement ID is configured.
- The internal sanitized operational-error sink and Admin Errors view are active. Proven external alert delivery and distinct primary/backup responders are not yet assigned.
- Wise payout infrastructure exists but batching, operator recording, reconciliation, and payout execution remain disabled; the payout emergency stop remains on.
- Licensed Beats, creator Merch, international physical shipping, automated Printful confirmation, newsletters, and interactive runtime Items remain disabled or deferred.
- Production releases flow through GitHub `main` into the linked Vercel project. Direct Vercel rebuilds may apply a reviewed environment revision to the same GitHub commit, but source changes must still be committed and pushed through GitHub.

Open launch work belongs in `44OS_MILESTONES.md`; only the active desktop milestone may expand into `44OS_DESKTOP_APPLICATIONS.md`. Do not repeat an accepted production journey unless relevant code, configuration, provider state, or evidence changed.

## Product model

44 is the parent creative company. `forty four` is the recorded operator name; `44OS` is the platform brand. Final public legal copy still requires the exact registered entity spelling/type and public business address.

44OS is a web-first creative operating system for fans, creators, collaborators, and clients. It should feel like a durable creative library and operating environment rather than an ad-driven social network.

Primary applications:

- **Home** — the application `Discover` front door at `https://app.44os.com/`; active catalog filtering changes its workspace identity to `Browse`.
- **Store** — public discovery and acquisition at `/store`.
- **Library** — the signed-in user’s saved, owned, purchased, and unlocked Items.
- **Community** — posts, questions, collaboration, replies, follows, and creator/fan connection.
- **Radio** — public live listening through the shared player. Playable tracks automatically append to the canonical playlist when their Music Item becomes published; draft, non-Music, and streaming-disabled Items never enter rotation.
- **Studio** — creator publishing and catalog management under `/studio`.
- **Calendar** — creator Events and upcoming published releases.
- **Admin** — server-authoritative Home curation, People, Content, Errors, Payments, Email, and Fulfillment operations.
- **Team** — a staged private workspace for Admins and explicitly granted Members or Creators. Team is an additional audited permission, never a fourth profile role.
- **Settings, Search, Support, Inbox, Orders, and profiles** — account and platform utilities.

Product language:

- `Item` is the permanent domain noun. The canonical table is `catalog_items`, the application type is `Item`, and the universal key is `item_id`.
- User-facing copy says Browse, Library, Item, release, Music, Book, Sample Pack, Merch, Creator Update, earnings, and orders.
- Do not present “Collection” as the Library model.
- Resources and the old Services/Projects workflow are not part of the active application.
- Store is discovery; Library is the durable record of a person’s relationship with an Item.

Core principles:

- Creator-first and fan-respecting: no ad-first design, dark patterns, or algorithmic addiction loops.
- Technology stays hidden while useful capability remains visible.
- Catalog, identity, access, payments, and history use permanent internal IDs.
- Provider state never becomes platform identity or silently overwrites 44OS history.
- Advanced or unaccepted features fail closed and remain hidden.

## Stack and code ownership

- Framework: Next.js App Router, React 19, strict TypeScript.
- Styling: `src/app/globals.css` plus `src/styles/44-ui/canonical-system.css`, using `--os-*` tokens.
- Backend: Supabase via `@supabase/supabase-js`.
- Deployment: one Vercel project with explicit origins `https://44os.com` (marketing) and `https://app.44os.com` (application).
- Host routing: `src/proxy.ts` owns marketing/app selection, permanent legacy redirects, API exemptions, reserved routes, and the server-only `MARKETING_SITE_ENABLED` rollback switch.
- Root layout: `src/app/layout.tsx` selects an isolated marketing or application layout from the trusted host-routing header. The marketing branch must never load the application shell, player, authentication state, push prompt, analytics consent, or commerce UI.
- App/navigation registry: `src/lib/osApps.ts`.
- Store routes: `src/lib/experience.ts` and `src/lib/storeRoutes.ts`.
- Library routes: `src/lib/libraryRoutes.ts`.
- Platform data access: typed services in `src/lib/domain` or narrowly scoped server/infrastructure modules. Pages, cards, and forms should not introduce direct table/RPC access.
- Public catalog ordering: `comparePublicCatalogItems`.

The production layout imports only the two canonical stylesheets above. `/44OS_UI` is the living component/token/class reference. Do not restore retired proposal stylesheets, legacy component trees, or a second visual system.

## Shell, navigation, and playback

44OS is one persistent operating-system shell. Navigation changes the workspace; it does not rebuild the surrounding environment.

Shell ownership:

- `SystemShell` owns global shell behavior.
- `Sidebar` renders the desktop Dock from `osApps.ts`.
- `Topbar` and `TopbarContext` own back navigation, Search, Cart, Notifications, and account menus.
- `MusicPlayer` owns the only audio element and persistent queue/player UI.
- `ContextMenu` is the shared right-click primitive.

Navigation rules:

- Desktop signed in: Library, Home, Radio, Community, Support, Settings, plus approved pinned Items.
- Desktop signed out: Home, Radio, Community, Support, Log In.
- Mobile: Home, Library, Radio, Community, Search.
- Studio opens from the owner profile or account menu and is not a Dock app.
- Notifications are a Topbar control. Inbox and Profile are account-menu surfaces.
- Settings is in the mobile account menu rather than the mobile Dock.
- Every route maps to exactly one owning app through `getActiveOSAppId`.

Playback rules:

- The shared DOM audio element is the only playback engine. Never introduce a second player for previews or Radio.
- Normalize media URLs before deciding to reload; avoid competing `load()`/`play()` paths.
- Standard queues persist after storage hydration. Live Radio queues do not persist and resynchronize from the canonical playlist.
- Visibility, BFCache restore, and reconnect may trigger one bounded refresh without duplicating listeners or requests.
- Repeated cards must not independently fetch the same session or ownership state.
- Audio and Supabase responses must never be blindly cached by a service worker.

## Canonical routes

Public application routes below are canonical on `https://app.44os.com`:

- `/` — `Discover` front door; active catalog filtering uses the `Browse` workspace identity and the route does not redirect.
- `/store` and `/store/[category]` — Store and Music, Books, Sample Packs, or Merch categories.
- `/store/item/[identifier]` — public Item detail, resolving slug first with ID fallback.
- `/cart`, `/checkout` — acquisition flow.
- `/community`, `/community/questions`, `/community/collaboration`, `/community/thread/[id]` — Community.
- `/radio`, `/calendar`, `/support`, `/support/[slug]`, `/search`, `/login`.

Signed in:

- `/library`, `/library/[category]`, `/library/item/[id]`.
- `/profile`, `/profile/[username]`, `/profile/edit`.
- `/inbox`, `/conversation/[id]`, `/notifications`, `/orders`, `/settings`.
- `/studio` and its Music, Book, Sample Pack, Beat, Event, Update, earnings, payout, and order routes.
- `/reader/[itemId]` for entitled Books.
- `/launch/[itemId]` for an enabled interactive build.
- `/admin` and its bounded operational routes for administrators.

Path-level compatibility redirects are centralized in `next.config.ts` and must go directly to one canonical destination. Host-level compatibility belongs in `src/proxy.ts`: apex application pages preserve path/query while moving to the app origin, `www` moves to the apex, `/api/*` stays executable on both hosts, and marketing `/download` remains reserved/not found until real installers exist. Current path compatibility includes Browse to Store, Collection to Library, Product to Store Item, Dashboard to Studio, Assets to Sample Packs, and old category routes to their Store equivalents. Removed Resources and Services/Projects routes intentionally return not found.

Private routes, previews, Admin, Studio, Library, Checkout, Orders, launch sessions, and protected asset URLs must not become search results.

## Data and authorization model

Permanent Item identity is shared across Store, Library, Community, Studio, commerce, and future interactive experiences.

Item lifecycle is `draft` → `published` → `archived`:

- Creator removal is archival, not hard deletion.
- Archival hides active Store/Studio presentation while preserving IDs, assets, Library relationships, entitlements, achievements, orders, and audit history.
- Direct anonymous/authenticated Item deletion is revoked.
- Service-role hard deletion is emergency maintenance only.
- During trusted testing, approved creators save directly; server validation decides whether a valid Item is published. Creators do not receive Draft/Published switches.
- The submission-review schema exists but creator-facing review remains disabled until explicitly activated.

Core data roles:

- `catalog_items`, `item_categories`, capabilities, members, Tags, tracks, assets, external links, videos, and Events describe Items and creators.
- `library_entries` owns Library visibility and organization.
- `catalog_offers` describes acquisition options; `offer_entitlements` declares rights.
- `entitlements` is access authority; `entitlement_events` is the immutable grant/revoke audit.
- Commerce orders, items, addresses, attempts, events, terms, grants, adjustments, and earnings are server-authoritative ledgers.
- `content_entries` and typed detail tables own Community posts, questions, collaboration, reviews, Creator Updates, replies, reactions, and moderation evidence.
- `item_play_events` is the append-only creator analytics source for validated playback starts across Store, Library, and Radio.
- `home_shelf_entries` owns exact ordered editorial slots; its public RPC returns only eligible published Items. Admin Home replacement is atomic and appends immutable before/after snapshots to `admin_home_shelf_events`.
- Admin role, Home shelf, Item lifecycle, offer lifecycle, email, payout, and provider operations append immutable audit records.
- The staged `team_access_grants` table owns current Team permission and `team_access_events` owns immutable grant/revoke history. Admins inherit Team access. Grants never promote a Creator, change seller setup, or affect payouts.
- The staged Team Creator and release RPCs return published public facts only. Account email, country, Auth metadata, drafts, archives, private files, sales, payouts, moderation, Support, and Admin activity remain outside this boundary.
- The staged `team-brand` bucket is private. Service-role/Admin operations register versioned ZIP metadata and Team downloads receive only a short-lived signed URL after bearer authentication and server-authoritative access verification.

RLS and reviewed RPCs remain the browser boundary. Service-role credentials, provider credentials, private tax forms, payout destinations, raw Auth data, and signing secrets never enter browser code.

## Team workspace and brand governance

The private Team workspace is deployed at `/team`, `/team/brand`, `/team/creators`, and `/team/releases`. The feature flag is server-only, and production authorization fails closed at the database and authenticated API boundaries. Admins inherit access; Members and Creators require an explicit audited grant.

`Other/44OS_BRANDING.md` is the canonical guide. The file is packaged for one authenticated no-store API route and is not embedded in the public client bundle. The client renders a restricted Markdown subset without raw HTML or scripts. `/team` is noindex, nofollow, noarchive, disallowed by robots, and absent from the sitemap.

An Admin grant requires a 3–500 character reason, preserves the target Member or Creator role, creates immutable history, and queues one idempotent in-app notification and transactional email. Revocation is immediate and does not send a revocation email. Delivery failure never rolls back authorization.

The Brand Kit build is private and versioned. The current archive is explicitly provisional and is not registered for production download. It contains black/white marks, white-on-black 44OS application icons, self-hosted Inter and the SIL Open Font License, palette/type tokens, editable SVG social templates, logo-use guidance, and a SHA-256 manifest. It cannot be registered as the current production kit until the owner approves the source masters.

## Store, Library, Community, and Studio behavior

Acquisition is capability-based:

- Public listening does not require a purchase or Library entry.
- `Add to Library` is a free save backed by a zero-cost offer and server-issued entitlement.
- `Buy Download` is a separate paid offer and never changes whether public listening is allowed.
- Physical Merch uses `Add to Cart` and is not placed in Library as though it were digital content.
- Browser prices are display hints. Checkout recalculates active offers and eligibility on the server.
- Account Country determines display currency. Global USD prices use cached daily exchange rates for display; an eligible creator-local offer uses its independently stored local amount and currency. Missing rates fall back to showing USD rather than relabeling an unconverted number.
- Paid Download actions appear only while the current buyer has the matching visible Library entry and active file entitlement. Refund/revocation removes access without deleting history.

Format behavior:

- Music uses the shared player, tracks, optional downloads, eight v1 achievements, named YouTube embeds, and an optional Overachiever Item unlock.
- Books are PDF-only for this release. Reading and Library collection are always free; creators may optionally sell the protected PDF as a paid download. The protected full PDF powers the Library reader. Store does not expose a separate sample-reader surface. Page, progress, appearance, and bookmarks synchronize server-side.
- Sample Packs are paid downloadable products with a required positive price. They use a protected full ZIP plus optional public audio previews and protected individual samples. Preview audio uses the shared player.
- Studio add/edit forms use versioned account-and-Item-scoped device-local recovery. Save, Cancel, or removal clears recovered data.
- Forms expose one canonical Description for Books and Sample Packs. Music descriptions are preserved but not edited in the current Music form.
- Community uses canonical thread pages, server-backed loading/error states, reporting/moderation audit, Item Questions, reviews, and Creator Updates.
- Profiles connect identity, posts, Items, Events, follows, messaging, and approved external destinations.
- Usernames preserve the capitalization selected at registration or in Edit Profile. Identity, availability, mentions, and `/profile/[username]` resolution remain case-insensitive, so capitalization variants can never create separate accounts and existing links continue to resolve.

The v1 music achievements are Front to Back, No Skips, Nightbird, Heavy Rotation, Joined the Orbit, Left Your Mark, Signal Boost, and Overachiever. Clients submit bounded evidence; server evaluation grants achievements and reward Items. Book achievements and generic speculative bonus-feature editors remain hidden.

## Events, external reach, and interactive content

Creator external links use validated platform registries and atomic owner sync RPCs. Only approved HTTPS destinations are accepted. Item and profile links remain ordered and owner-managed.

Creator Events are source-owned records with format, timezone-aware start/end, venue/destination fields, and cancellation state. Times are stored as UTC instants plus an IANA timezone. Calendar is a read model over visible creator Events and optional upcoming published releases; it is not a separately writable content source and does not control publication.

Interactive infrastructure uses one `interactive_builds` manifest per canonical Item:

- Only an Admin-reviewed build on an approved exact HTTPS origin may launch.
- Entitled launches use expiring opaque sessions whose tokens are stored only as hashes.
- The isolated build runs in a sandboxed iframe and receives no 44OS credentials or signing secret.
- Browser progress is bounded and untrusted. Only signed server events can issue achievements.
- Replay protection uses signed event IDs, timestamps, nonces, and constant-time HMAC verification.
- Mobile/narrow devices do not request a session in the current phase.

Infrastructure is complete, but real Unity/WebGL runtime acceptance is still open. Interactive Items remain disabled until that acceptance passes.

## Authentication and email

Supabase Auth sends branded account mail through Resend:

- Visible sender: `44OS <accounts@44os.com>`.
- Authorization/link domain: `auth.44os.com`.
- Canonical Site URL: `https://app.44os.com`.
- Allowed redirects: localhost development, exact application root/Settings/recovery destinations, and temporary legacy apex/`www` compatibility destinations.
- Email confirmation and secure two-address email change are enabled.
- Custom SMTP uses `smtp.resend.com:465`; Auth is limited to 30 emails/hour.
- OTPs are eight digits and expire after 3,600 seconds.
- Repository-controlled templates cover confirmation, invitation, magic link, email change, recovery, reauthentication, password changed, and email changed.
- Password-changed and email-address-changed notices are enabled; unrelated phone/sign-in/MFA notices are off.
- Open/click tracking and Resend Receiving remain off.

The recorded production acceptance passed confirmation, explicit resend, magic link, recovery/password replacement, direct password change, secure email change, and the related security notices using an owner-controlled real inbox. Passwords, links, codes, and full headers are never recorded.

Application email uses a separate durable outbox and Resend adapter as `support@44os.com`:

- Templates are Welcome, verified purchase, refund/cancellation, verified fulfillment/tracking, and support acknowledgement.
- Signed Stripe or Printful evidence—not browser redirects—queues commerce mail.
- Stable event keys and provider idempotency prevent duplicate delivery.
- Signed webhook events are idempotent and out-of-order safe; bounce/complaint suppression is durable.
- Ambiguous delivery outside the provider idempotency window freezes for Admin reconciliation rather than blind retry.
- Transactional delivery is enabled and accepted for the recorded purchase/refund messages.
- `support@44os.com` is the human support channel. The in-app support intake remains disabled and must not be presented as active.
- Newsletter consent is explicit, independently revocable, and locally authoritative. Newsletter synchronization and delivery remain disabled.
- Newly generated application and Admin email actions use `https://app.44os.com`. Previously generated links remain valid through permanent apex deep-link redirects.

## Buyer payments and physical fulfillment

Stripe receives all customer money. Checkout is authenticated, Stripe-hosted, and webhook-authoritative:

- Before provider creation, 44OS snapshots Item, offer, seller, price, terms, tax, shipping, customer, and expected entitlement facts.
- Signed Stripe webhooks own payment, refund, dispute, entitlement, Library, fee, earnings, and reconciliation state.
- Success redirects remain pending until signed evidence arrives.
- Duplicate, delayed, and reordered events are idempotent.
- Runtime database controls, active terms, seller eligibility, active offer, server configuration, and the client presentation switch all fail closed independently.
- U.S. physical shipping uses the approved `$14.99 USD` Standard Shipping rate and estimated 5–10 business-day window.
- Automatic tax uses separate configured product tax codes for Books, Music, Sample Packs, clothing, hats, and bags.
- Digital refunds revoke current file access while retaining order, accounting, and Library history.
- Checkout success/cancellation returns use the app origin. The canonical Stripe webhook is registered on `app.44os.com` with the previous apex signing secret retained during the compatibility overlap; the signed handler accepts the bounded current/previous secret set.

Stripe Dashboard Products/Prices are not catalog authority. The server sends verified dynamic price data from the 44OS order snapshot.

Printful is inventory and fulfillment authority for 44-owned Merch:

- Printful controls product presence, name, retail price, SKU, size, color, availability, and production cost.
- 44OS controls customer imagery, featured image, publication, orders, support, and immutable history.
- One complete paginated Sync operation creates unseen products as permanent drafts, updates provider facts, stages new colors without imagery, safely activates new sizes under already-imaged colors, archives products absent from a complete snapshot, and restores reappearing provider IDs as drafts.
- Partial or failed provider reads never archive local rows.
- Customer imagery accepts PNG/JPEG/WebP/AVIF up to 12 MB; SVG is excluded. Each current color has one image, Items may have ordered bonus images, and exactly one current image is featured.
- Content hashes prevent duplicate stored artwork. Replacement swaps the database assignment before deleting the final old reference. Failed deletions enter a bounded, audited, prefix-safe cleanup queue under `uploads/merch/{itemId}/...`.
- Provider thumbnails and mockups never become customer imagery.
- After verified payment, Admin obtains a current address/cart-specific quote and creates or reuses one deterministic `confirm=false` draft.
- The owner alone confirms manufacturing inside Printful. 44OS contains no confirmation API operation.
- Signed Printful events record production, charge/cost, shipment, tracking, delivery, cancellation, return, or failure without rewriting Stripe payment facts.

The first real owner-funded physical lifecycle remains open in Milestones.

## Creator eligibility and Wise payouts

44OS has Member and Creator account roles. Country is collected at Member signup. Creator promotion is Admin-authoritative and does not itself prove tax, payout, or sale eligibility.

The approved existing Creator cohort may sell ordinary digital Items during a manual 30-calendar-day paperwork grace period beginning only when the owner executes the final public-launch re-base. Closed testing does not consume the period. Admin records follow-up evidence and manually pauses or restores paid offers with a reason; no browser timer or automated suspension decides eligibility. Earnings remain pending until tax and payout requirements pass.

Creator Merch and licensed Beat sales are excluded from this boundary.

Wise Business is the only selected creator-payout provider:

- Stripe Connect payouts, Stripe Global Payouts, PayPal, and Wise transfer APIs are not used.
- Launch payout is owner-operated Wise email-to-claim. Wise collects bank details; 44OS stores an encrypted versioned email and masked display only.
- 44OS has no bank account, routing, IBAN, SWIFT, or branch fields.
- A creator country is not eligible from a static list. An operator must verify the exact business-to-individual country/currency/email-to-claim route in Wise, record dated evidence and revalidation, and fail closed when it expires or changes.
- Natural-person sellers only. Entity sellers are waitlisted.
- U.S. individuals use a current W-9; foreign individuals use a current W-8BEN. Entity and ambiguous forms stop for professional review.
- Tax PDFs and payout addresses use AES-256-GCM with server-only versioned keys and never appear in ordinary tables, logs, email, analytics, support history, or browser persistence.
- A qualified tax professional must approve classification, source, treaty/withholding, deposits, reporting, electronic certification, retention, reviewer access, and creator terms before payouts.
- Earnings states remain distinct: accrued, pending tax, pending destination, eligible, approved, processing, failed/returned, and paid.
- Monthly batches use immutable cutoffs and membership, advisory locks, human approval, provider evidence, independent reconciliation, and append-only payout debits. Only independently reconciled Wise evidence may produce `paid`.

All payout execution controls remain off with emergency stop on.

## Beat Store boundary

Beats are canonical Music Items identified by assigned Type/capability, never title text. The dormant foundation includes tagged public preview, controlled musical metadata, private sale files, versioned Basic/Premium/Trackout/Exclusive templates, offer-to-file grants, immutable buyer licenses, collaborator splits, exclusive reservations, and server-authoritative archival after an exclusive sale.

Every Beat surface requires both the client review flag and database review control. Publishing, catalog, Checkout, pilots, splits, and exclusivity default off. Draft legal templates cannot be sold. The first possible pilot is non-exclusive and single-owner only after legal, payment, refund/dispute, reconciliation, earnings, and payout gates pass. Splits and exclusivity require separate acceptance.

## Security, release, and recovery

Required code gates are proportional to the change:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run audit:ui-cleanup` for UI-system changes
4. Relevant contracts: smoke, hardening, observability, analytics, commerce, Printful, email, and mobile safe-area
5. `npm run test:security` against local Supabase only
6. `npm run test:schema-replay` against disposable local Supabase only
7. `npm run build`
8. `git diff --check`

Migration releases additionally require a fresh backup, linked dry run, strict linked lint, migration-history comparison, reviewed repository SQL, post-apply history verification, and preservation probes. Never paste untracked production SQL or repair migration history casually.

`supabase/migrations/20260712010000_44os_item_baseline.sql` is the canonical replayable starting point and must not be edited after adoption. Every later database change is a timestamped forward migration. `supabase/seed.sql` intentionally contains no production accounts or content; local replay verifies structure and security without copying live user data.

After deployment, run the marketing host matrix against `https://44os.com`, launch smoke against `https://app.44os.com`, and manually verify only the journeys affected by the change. Do not repeat every historical journey for unrelated UI work.

Operational rules:

- `/api/health` is the bounded application/Supabase readiness endpoint and remains available on both origins during the compatibility period.
- Origin-local login state, service workers, PWA installation, push subscriptions, Studio draft recovery, Cart, player queue, and preferences do not transfer across the apex-to-app move. Existing PWA users reinstall from `app.44os.com` and re-enable notifications; server-backed accounts, content, Library entries, purchases, messages, and entitlements are unaffected.
- `src/instrumentation.ts` and the service-only error sink record sanitized release/runtime/route/error identity. Never record headers, query values, request bodies, user content, credentials, or tokens.
- Authentication incidents start with Supabase Auth health, redirects, rate limits, SMTP, and recovery. Never request passwords, OTPs, or session links.
- Publishing/storage incidents preserve permanent Items and protected access. Never repair by hard-deleting an Item or making private files public.
- Abuse response preserves reports and moderation audit. Credible threats, child-safety reports, and legal notices escalate immediately.
- Recovery uses reviewed forward repair by default. A separate disposable project restore must compare permanent IDs, row counts, audit rows, and storage references before acceptance.
- Secrets live only in approved local/Vercel/Supabase/provider secret storage. Missing provider configuration fails closed.
- Presentation rollback never deletes orders, entitlements, audit, provider, terms, or ledger evidence.

Generated caches and local QA renders do not belong in Git. Migrations, templates, source fixtures, and production assets are not caches. Database backups are short-lived: create one immediately before an authorized write, retain only a fixture explicitly used by a recovery test, and move or remove obsolete local dumps after the change is verified. `npm run test:data-restore` currently depends on the ignored fixture `supabase/backups/20260713_before_m17_interactive_foundation_data.sql`.

## Maintenance rules

- Keep exactly the three handoff documents named at the top of this file in `Other/`.
- Foundation and UI state current behavior; Milestones states only current work.
- Do not restore retired setup guides, research dumps, proposal documents, execution diaries, or completed milestone ledgers.
- Record durable architectural or provider decisions here, not step-by-step dashboard history.
- Record visual and interaction decisions in UI.
- Record only open work, blockers, acceptance criteria, and the minimal accepted baseline in Milestones.
- Preserve permanent IDs, immutable history, provider evidence, and fail-closed controls across every change.
