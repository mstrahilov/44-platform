/**
 * Launch presentation for creator commerce.
 *
 * This is not a payment authorization switch. Checkout and payouts remain
 * server-authoritative and fail closed through commerce_runtime_controls.
 */
/** Emergency public presentation switch. Server-side order gates remain authoritative. */
export const PUBLIC_PURCHASES_AVAILABLE = process.env.NEXT_PUBLIC_PUBLIC_PURCHASES_AVAILABLE === 'true';

/** Explicit local review mode. It never bypasses server-side order, Stripe, or Printful controls. */
export const COMMERCE_TEST_MODE = process.env.NODE_ENV !== 'production'
  && process.env.NEXT_PUBLIC_COMMERCE_TEST_MODE === 'true';

export function paidSalesUiAvailable(item: { paid_sales_available?: boolean }) {
  return PUBLIC_PURCHASES_AVAILABLE && (item.paid_sales_available === true || COMMERCE_TEST_MODE);
}

export const PURCHASING_COMING_SOON_TITLE = 'Purchasing coming soon';

export const PURCHASING_COMING_SOON_COPY =
  'This Item is available to explore now. 44OS purchasing will open after payment and fulfillment testing is complete.';
