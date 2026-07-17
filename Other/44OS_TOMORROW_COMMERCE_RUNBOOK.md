# 44OS Tomorrow Commerce Runbook

## Release boundary

The initial paid boundary is signed-in Members purchasing approved Books, Music downloads, Sample Packs, and forty four's eight reviewed Merch Items. Licensed Beats, creator Merch, non-U.S. physical shipping, automated Printful confirmation, and creator payout execution remain off.

Stripe receives customer money. Wise is not involved in Checkout. Printful is a fulfillment vendor paid separately by forty four only after the owner confirms a draft in Printful.

## Local implementation status

- The mobile Topbar includes the native top safe-area inset in its geometry. Search, menus, overlays, and content calculations use the same total height. `html[data-safe-area-test="notch"]` supplies a deterministic 47px local test inset.
- Checkout requires exactly one approved Stripe shipping rate for physical orders and rejects any physical country boundary other than `US`.
- Stripe Tax configuration is fail-closed and category-specific: clothing, hats, bags, Books, Music, and Sample Packs each require an approved `txcd_…` configuration value.
- Admin Printful operations pull the provider catalog without UUID entry, preserve existing 44OS Item IDs, create new products as pending, sync owner-entered Printful names and per-variant retail prices, show current production cost/margin, quote paid physical orders, create idempotent non-charging drafts, and link to the provider dashboard.
- Printful product/variant imagery is ignored. Admin uploads one 44OS main image, one image per imported color shared by all sizes, and optional bonus gallery images through a server-only assignment boundary.
- 44OS contains no Printful confirmation operation. The owner confirms only in Printful.
- Signed Printful events can record later production, cost, shipment, delivery, cancellation, and return evidence without changing Stripe payment facts. Older signed events cannot regress current order state.
- Application transactional email remains fail-closed until the ordered database release, application deployment, Resend webhook, worker, and narrow delivery controls are approved. Hosted Supabase Auth email and the iCloud `support@44os.com` mailbox are already separate live services.

## Owner preparation — no secrets in chat

1. In the existing Printful `44OS` Manual order/API store, finish the eight designed products: 44 T-Shirt, 44 Sweatshirt, 44 Hoodie, 44 Windbreaker, 44 Beanie, 44 Hat, 44 Bag, and 44 Tote.
2. Do not enable automatic confirmation. Keep **Manually confirm all imported orders** enabled.
3. After deployment, use **Admin → Printful fulfillment** to pull each Sync Product, map it once to the existing permanent 44OS Item, and upload the main/color/bonus 44OS images. Product name and per-variant retail prices come from Printful; Admin displays production cost and margin. At least one current variant must preserve the configured $5 minimum margin; individually higher-cost or unavailable variants remain blocked.
4. In Stripe live mode, verify forty four's business/public details, statement descriptor, settlement ownership, and support URL.
5. Add only tax registrations already held or professionally approved. Approve the exact Stripe product tax codes for Merch, Books, Music, and Sample Packs.
6. Create one fixed U.S. shipping rate with the approved amount, USD currency, delivery label/window, and shipping tax treatment.
7. Review the exact live Terms, refund/return, cancellation, and U.S. shipping copy. The accepted database snapshot must match that approved text and digest.
8. Store live keys and signing secrets only in provider or hosting secret fields. Never paste them into chat, documentation, SQL, logs, or client-visible variables.

## Ordered production gate

No step below is authorized merely because local code is complete.

1. Take and verify a fresh hosted database backup.
2. Refresh the linked database credential and compare the linked migration list. The last recorded linked migration is `20260716021000`.
3. Review and dry-run the ordered set beginning at `20260716022000` and ending with `20260717021000`. Do not apply one migration out of order, repair history, or paste SQL manually.
4. Add a separately reviewed activation migration containing the immutable approved terms, `US` shipping boundary, named launch offers, and controls. It must leave Beats, Wise runtime, creator Merch, and unsupported creator routes off.
5. Configure production Stripe, Supabase, Printful, Resend, cron, seller-encryption, and site values. Stripe additionally requires exactly one `STRIPE_SHIPPING_RATE_IDS` value and approved `STRIPE_MERCH_TAX_CODE`, `STRIPE_MERCH_HAT_TAX_CODE`, `STRIPE_MERCH_BAG_TAX_CODE`, `STRIPE_BOOK_TAX_CODE`, `STRIPE_MUSIC_TAX_CODE`, and `STRIPE_SAMPLE_PACK_TAX_CODE` values.
6. Deploy the exact application release only after the migrations succeed.
7. Register signed Stripe, Printful, and Resend webhooks against the deployed HTTPS routes. Register the application-email worker through Supabase Vault/Cron without exposing the bearer secret.
8. Activate only the five operational application-email templates. Keep newsletters off.
9. Run one controlled live digital purchase/refund and one controlled U.S. Merch purchase. The Merch order must stop as a Printful draft until the owner reviews and confirms it.
10. Require zero unexplained payment and fulfillment reconciliation mismatches before enabling the public presentation switch.

## Rollback

Set the public presentation switch and database Checkout controls off first. Leave provider records, orders, webhooks, tax evidence, fulfillment history, entitlements, and ledger entries intact. Cancel or refund through the authoritative provider interface and allow signed events to reconcile the result.
