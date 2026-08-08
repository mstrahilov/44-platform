/**
 * Launch presentation for creator commerce.
 *
 * This is not a payment authorization switch. Checkout and payouts remain
 * server-authoritative and fail closed through commerce_runtime_controls.
 */
/** Emergency public presentation switch. Server-side order gates remain authoritative. */
export const PUBLIC_PURCHASES_AVAILABLE = process.env.NEXT_PUBLIC_PUBLIC_PURCHASES_AVAILABLE === 'true';

/** 1.2 launched standard non-exclusive Beat checkout independently of other paid formats. */
export const PUBLIC_BEAT_PURCHASES_AVAILABLE = true;

export function cartCheckoutUiAvailable(items: Array<{
  offer_id?: string | null;
  tier_code?: string | null;
  terms_sha256?: string | null;
}>) {
  if (PUBLIC_PURCHASES_AVAILABLE) return true;
  return PUBLIC_BEAT_PURCHASES_AVAILABLE
    && items.length > 0
    && items.every(item => Boolean(item.offer_id && item.tier_code && item.terms_sha256));
}

/** Explicit local review mode. It never bypasses server-side order, Stripe, or Printful controls. */
export const COMMERCE_TEST_MODE = process.env.NODE_ENV !== 'production'
  && process.env.NEXT_PUBLIC_COMMERCE_TEST_MODE === 'true';

export function paidSalesUiAvailable(item: { paid_sales_available?: boolean; paid_offer_available?: boolean }) {
  return PUBLIC_PURCHASES_AVAILABLE
    && item.paid_offer_available === true
    && (item.paid_sales_available === true || COMMERCE_TEST_MODE);
}
