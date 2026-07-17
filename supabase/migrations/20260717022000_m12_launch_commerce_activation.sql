begin;

-- Owner-approved launch snapshot. This is immutable evidence for every
-- Checkout order and activates only the database payment boundary; individual
-- Creator offers and physical products remain separately fail closed until
-- their own eligibility/review gates are satisfied.
insert into public.commerce_terms_versions(
  code,version,title,body,body_sha256,status,effective_at,approved_by
)
select
  'commerce',
  '2026-07-17-launch-1',
  '44OS Checkout, Refund, Return, and Shipping Terms',
  $terms$
Effective July 17, 2026

forty four operates 44OS. By placing an order, you agree to the 44OS Terms of Service and Privacy Policy at https://44os.com/legal/terms and https://44os.com/legal/privacy.

Prices, currency, applicable tax, and shipping are shown before an order is submitted. Stripe processes payment through Stripe-hosted Checkout. An order is complete only after 44OS receives verified payment evidence.

Digital purchases provide only the access or license shown on the Item and at checkout. They do not transfer copyright. Contact support@44os.com promptly for an incorrect, damaged, missing, or undelivered Item. Cancellation is not guaranteed after a digital Item is delivered or a physical order enters production. Refund and return eligibility depends on the Item, fulfillment status, the circumstances, checkout terms, and applicable law. Approved refunds are returned to the original payment method where possible.

Physical merchandise is sold by forty four, fulfilled by Printful, and ships only to supported United States delivery addresses. Standard Shipping is $14.99 USD with an estimated delivery window of 5–10 business days. Production, delivery estimates, availability, and tracking can change. You are responsible for providing a complete and accurate deliverable address. If fulfillment cannot proceed, forty four may hold the order, offer a reasonable alternative, or cancel and refund the affected amount.

Nothing in this snapshot limits a non-waivable consumer right. Support and order issues: support@44os.com.
$terms$,
  encode(extensions.digest($terms$
Effective July 17, 2026

forty four operates 44OS. By placing an order, you agree to the 44OS Terms of Service and Privacy Policy at https://44os.com/legal/terms and https://44os.com/legal/privacy.

Prices, currency, applicable tax, and shipping are shown before an order is submitted. Stripe processes payment through Stripe-hosted Checkout. An order is complete only after 44OS receives verified payment evidence.

Digital purchases provide only the access or license shown on the Item and at checkout. They do not transfer copyright. Contact support@44os.com promptly for an incorrect, damaged, missing, or undelivered Item. Cancellation is not guaranteed after a digital Item is delivered or a physical order enters production. Refund and return eligibility depends on the Item, fulfillment status, the circumstances, checkout terms, and applicable law. Approved refunds are returned to the original payment method where possible.

Physical merchandise is sold by forty four, fulfilled by Printful, and ships only to supported United States delivery addresses. Standard Shipping is $14.99 USD with an estimated delivery window of 5–10 business days. Production, delivery estimates, availability, and tracking can change. You are responsible for providing a complete and accurate deliverable address. If fulfillment cannot proceed, forty four may hold the order, offer a reasonable alternative, or cancel and refund the affected amount.

Nothing in this snapshot limits a non-waivable consumer right. Support and order issues: support@44os.com.
$terms$,'sha256'),'hex'),
  'active',
  now(),
  controls.platform_seller_id
from public.commerce_runtime_controls controls
where controls.singleton
  and controls.platform_seller_id is not null;

update public.commerce_runtime_controls controls
set
  operating_model_approved_at=now(),
  approved_by=controls.platform_seller_id,
  terms_version_id=(
    select id from public.commerce_terms_versions
    where code='commerce' and version='2026-07-17-launch-1'
  ),
  shipping_countries=array['US'],
  launch_scope='marketplace',
  stripe_payments_enabled=true,
  checkout_enabled=true
where controls.singleton
  and controls.platform_seller_id is not null;

-- Imported physical products must be deliberately published through Admin
-- only after Printful review and 44OS-owned main/color imagery. This removes
-- prior manual Merch presentation from the launch path.
update public.catalog_offers offer
set status='draft'
from public.catalog_items item
where offer.item_id=item.id
  and item.experience_type='merch'
  and offer.offer_type='physical_purchase';

update public.catalog_items item
set status='draft', cover_url=null
where item.experience_type='merch';

commit;
