# 44OS Printful Integration

## Approved phase boundary

44OS uses Printful only as a white-label fulfillment vendor for 44-owned Merch. Stripe remains the customer-payment provider and 44 remains responsible for retail pricing, customer support, refunds, returns, tax, and product promises. Creator Merch is excluded.

This repository phase can:

- verify one Printful Manual order/API store;
- import an exact Sync Product and its Sync Variants;
- preserve permanent 44OS Item identity while treating owner-entered Printful names and retail prices as the catalog input;
- reject unreviewed, unavailable, or unmapped variants;
- retrieve and durably snapshot current shipping estimates;
- create an idempotent Printful **draft** order; and
- receive signed V2 webhook events for draft-safe states.

It cannot confirm an order. The database requires `confirmation_enabled=false` and `confirmation_requested_at` to remain null, and the server adapter contains no confirmation operation. Forward migration `20260717020000_m20_manual_printful_fulfillment.sql` allows signed provider evidence to record a later owner-confirmed charge, production, shipment, delivery, cancellation, or return. The owner must still confirm only in Printful after reviewing the draft.

## Current official facts

- Printful currently offers a Free plan at **$0/month**; there are no setup fees or order minimums. Product, printing, shipping, taxes, and possible embroidery digitization are charged per order. [Printful pricing](https://www.printful.com/pricing) and [cost overview](https://help.printful.com/hc/en-us/articles/360014010240-How-much-does-Printful-cost)
- A custom 44OS integration should create a **Manual order/API store** from the Printful Stores dashboard. Products in that store are not automatically public. [Manual order/API store](https://help.printful.com/hc/en-us/articles/23581702148764-How-do-I-create-and-use-a-manual-order-API-store)
- A private token is appropriate for one company operating one Printful account. Store-level tokens can target a single store; account-level tokens also require `X-PF-Store-Id`. Tokens expire and cannot be refreshed, so replacement is an operational responsibility. [Printful API authentication](https://developers.printful.com/docs/)
- V1 is the stable Sync Product/Sync Variant surface. V2 is currently Open Beta; Printful says V2 endpoints may be used live, but small refinements may still occur. [API v1](https://developers.printful.com/docs/) and [API v2 status](https://help.printful.com/hc/en-us/articles/10293184543260-What-should-I-know-about-Printful-s-API-v2)
- Printful identifies the exact blank product by **Variant ID**, not Product ID. Sync Variants connect the designed store listing to that Catalog Variant. [Sync Product and Variant documentation](https://developers.printful.com/docs/)
- V2 creates orders in `draft`; draft orders are not charged and are not picked up for fulfillment. Confirmation is a separate endpoint that begins fulfillment. [V2 order flow](https://developers.printful.com/docs/v2-beta/)
- Shipping rates are dynamic and can change within an hour; they should be requested immediately before placing an order. A quote needs the recipient country, state for the US/Canada/Australia, exact variants, quantities, and currency. [Shipping Rate API](https://developers.printful.com/docs/)
- Stripe-hosted Checkout cannot dynamically replace shipping options after the customer enters an address. Exact address-based rates require embedded Checkout or an address collected before Session creation. The launch therefore retains one owner-approved flat U.S. Stripe shipping charge and reconciles it against the later exact Printful quote. [Stripe dynamic shipping](https://docs.stripe.com/payments/checkout/custom-shipping-options)
- Customer payment and Printful billing are separate transactions. After an order is confirmed, Printful uses the Wallet and primary billing method to charge the merchant for product, fulfillment, shipping, and applicable tax. [Printful billing](https://help.printful.com/hc/en-us/articles/360014007680-How-does-the-Printful-billing-system-work)
- V2 webhooks use HTTPS and support HMAC-SHA256 signatures through `x-pf-webhook-signature`. [V2 webhooks](https://developers.printful.com/docs/v2-beta/)

Printful documents the production API origin `https://api.printful.com` and does not document a separate sandbox origin in the current public API guides. Therefore, this phase treats the provider account as real and relies on the documented non-charging draft boundary. That is an inference from the current official API material, not a claim that Printful guarantees a sandbox does not exist.

## Owner setup — do not paste secrets into documentation or chat

1. Sign in to Printful and open **Stores**.
2. Choose **Connect via API** to create a Manual order/API store named `44OS` or `44OS Draft Fulfillment`.
3. Open the Printful Developer Portal and create a private token for that single store.
4. For the current adapter, grant only **View and manage orders of the authorized store** and **View store products**. Webhooks are configured separately in the Printful dashboard when a reviewed HTTPS endpoint exists; do not grant file, product-management, webhook-management, or unrelated account scopes unless a later implementation explicitly requires them.
5. Copy the token once and store it as `PRINTFUL_PRIVATE_TOKEN` in the local `.env.local` file. Never use a `NEXT_PUBLIC_` name.
6. Copy the numeric API Store ID into `PRINTFUL_STORE_ID` in `.env.local`.
7. Set `PRINTFUL_STORE_CURRENCY` to the three-letter currency configured for that API store (`USD` for the current 44 launch boundary).
8. Leave automatic order confirmation off in the Printful store settings. If Printful offers “Manually confirm all imported orders,” enable it as a second provider-side guard.
9. Do not add or auto-recharge a billing method merely to run this draft-only phase. Existing billing settings must not be changed without a separate controlled-order decision.
10. When a public HTTPS preview is available, configure the V2 webhook URL as `/api/printful/webhook`, subscribe only to the reviewed order/catalog/shipment events, and store its generated secret as `PRINTFUL_WEBHOOK_SECRET`.
11. Restart the local app, open **Admin → Printful fulfillment**, and use **Verify safe connection**. The screen must continue to show `Confirmation / charging: Hard-locked off`.

## Mapping and acceptance workflow

1. In Printful, publish the reviewed designed products to the Manual order/API store. Record each Sync Product ID and verify every intended size/color Sync Variant is synced.
2. In 44OS Admin, use **Pull products from Printful**. On the first import, choose the existing 44OS Item to preserve its permanent ID or choose **Create new pending product**. No UUID entry or code change is required.
3. Upload one 44OS main image, one image for each imported color, and optional bonus gallery images. Printful thumbnails and mockups are ignored and never populate customer-facing imagery. Every size sharing a color reuses that color assignment.
4. Review the provider name, per-variant Printful retail price, production cost, calculated margin, size/color, and availability. Review is variant-specific: an available, priced variant meeting the configured base-cost margin may become active, while every unavailable, unpriced, currency-mismatched, or under-margin variant remains blocked and private. A product with no eligible variants remains blocked.
5. Repeat the same import. Counts, provider identities, and 44OS-owned image assignments must remain unchanged; this proves idempotency.
6. Request two identical shipping estimates for the same country/state/postal code, currency, variants, and quantities. The request/rate snapshot hash must match while the quote is current.
7. Verify an unmapped or unavailable variant is rejected before any provider order call.
8. For one paid local physical fixture, create the draft twice. Both calls must resolve to the same 44 fulfillment row, the same external ID, and the same Printful draft ID.
9. In Printful, verify the order status is `draft`, no confirmation was requested, Wallet/card charge is zero, and no production/fulfillment activity started.

## Customer-facing image ownership

Forward migration `20260717021000_m20_merch_owned_product_images.sql` makes forty four the sole authority for customer-facing Merch imagery:

- one main image per Item also becomes the canonical Store-card cover;
- one image per imported color is shared by every size in that color;
- bonus images remain product-wide gallery entries;
- only administrators can upload, replace, or delete assignments through the server-only route;
- published Items expose only curated rows through a narrow read policy; and
- Printful re-imports preserve these assignments and write no provider thumbnail or variant image URL.

Images are stored in the existing public uploads bucket under randomized Item-scoped paths. PNG, JPEG, WebP, and AVIF are accepted up to 12 MB; SVG is excluded. Metadata replacement and the corresponding Item/variant pointers occur in one database transaction, while replaced storage objects are removed after the new assignment succeeds.

## Manual-review launch workflow

The local launch implementation now adds owner-approved pricing and a paid physical-order queue:

1. Import the exact Sync Product in Admin and review current provider variants.
2. Set the product name and each variant’s retail price in Printful. **Pull and review** updates the mapped 44OS Item and variants while preserving their IDs, records immutable pricing evidence, and requires at least one current variant to preserve the configured minimum margin. Prior paid orders keep their immutable title/price snapshots.
3. After a signed Stripe payment, Admin derives a current U.S. shipping quote from the server-owned order, address, and variant snapshot.
4. Admin creates or reuses one non-charging Printful draft bound to that exact quote and order.
5. The owner opens the provider order and confirms only in Printful.
6. Signed, idempotent Printful events reconcile production and shipment evidence. Out-of-order events cannot regress current state, and only processed signed evidence can queue fulfillment email.

The customer-facing launch is U.S.-only with one owner-approved Stripe flat shipping charge. forty four absorbs any difference between that charge and the later provider quote.
7. Run the provider contract, pgTAP security files, type checking, lint, build, and `git diff --check`.

## Deferred owner workflow for adding future products

The draft-only provider boundary now includes the non-developer catalog pull. Future additions use the same pending workflow.

The preferred default is an explicit **Admin → Printful → Import/review product** workflow:

1. The owner creates or updates the designed product in the `44OS` Printful store.
2. Admin re-fetches Printful Sync Products and shows products that are not yet mapped.
3. The owner maps a product to an existing permanent 44OS Item once or creates a new pending Item.
4. Pull writes the Printful name and per-variant retail prices plus provider mappings idempotently. 44OS-owned images remain separate.
5. The owner reviews every Sync Variant, color/size, availability, base cost, margin result, and 44OS image assignment.
6. Unavailable, unmapped, stale, or below-margin variants remain blocked.
7. Publication and sale require a separate explicit review and activation.

Do not automatically publish every new Printful product merely because a provider webhook or sync event exists. Provider-webhook discovery may create an Admin attention item or refresh a known mapping, but it must not create a public Item, invent retail price, accept artwork, or enable fulfillment. The later milestone must compare explicit Admin import with webhook-assisted discovery and retain the former as authority unless the owner approves narrower safe automation.

## Rollback

- Keep public purchases off and do not confirm any provider draft.
- Disable `draft_orders_enabled`, `shipping_quotes_enabled`, and `catalog_import_enabled` before removing server routes.
- Revoke the private token and signed-webhook configuration in Printful separately; repository rollback cannot revoke provider access.
- Draft provider objects are external state. Delete or cancel them manually only after confirming they remain uncharged and outside fulfillment.
- Database restoration is forward-only: ship a reviewed compensating migration while preserving order/mapping/webhook evidence.
