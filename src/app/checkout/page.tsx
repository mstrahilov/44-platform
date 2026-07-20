'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { PageShell, HubHero, CenteredMessage } from '@/components/Ui';
import { useTopbarBack } from '@/components/TopbarContext';
import { useAuth } from '@/lib/useAuth';
import { clearCart, useCart } from '@/lib/cart';
import { getProductExperience } from '@/lib/experience';
import type { Product } from '@/lib/products';
import { PUBLIC_PURCHASES_AVAILABLE } from '@/lib/commerceAvailability';
import { getCartCatalogItems, saveFreeCartToLibrary } from '@/lib/domain/acquisition';
import { supabase } from '@/lib/supabase';

type PlaceState = 'idle' | 'placing' | 'placed' | 'confirming' | 'paid' | 'canceled' | 'error';
type CheckoutConfig = {
  available: boolean;
  reason: string | null;
  terms: null | { id: string; title: string; version: string; sha256: string };
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export default function CheckoutPage() {
  const { user, loading } = useAuth();
  const { items, count, subtotalCents } = useCart();
  const currency = items[0]?.currency ?? 'USD';
  const [state, setState] = useState<PlaceState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [catalogItems, setCatalogItems] = useState<Record<string, Product>>({});
  const [checkoutConfig, setCheckoutConfig] = useState<CheckoutConfig | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const idempotencyKey = useRef<string | null>(null);
  const catalogReady = items.length > 0 && items.every(item => Boolean(catalogItems[item.item_id]));
  const hasPhysicalItem = catalogReady && items.some(item => getProductExperience(catalogItems[item.item_id]) === 'physical');

  useTopbarBack({ href: '/cart', label: 'Cart' });

  useEffect(() => {
    async function loadItems() {
      if (!items.length) return;
      const rows = await getCartCatalogItems(items.map(item => item.item_id));
      setCatalogItems(rows.reduce<Record<string, Product>>((result, item) => {
        result[item.id] = item;
        return result;
      }, {}));
    }
    void loadItems();
  }, [items]);

  useEffect(() => {
    if (!PUBLIC_PURCHASES_AVAILABLE || !user || !catalogReady) return;
    let active = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) return;
      const response = await fetch(`/api/checkout/config?requires_physical=${hasPhysicalItem ? 'true' : 'false'}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      });
      const payload = await response.json() as CheckoutConfig;
      if (active && response.ok) setCheckoutConfig(payload);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [catalogReady, hasPhysicalItem, user]);

  useEffect(() => {
    if (!PUBLIC_PURCHASES_AVAILABLE || !user || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const checkoutReturn = params.get('checkout');
    const sessionId = params.get('session_id');
    if (checkoutReturn === 'canceled') {
      Promise.resolve().then(() => setState('canceled'));
      return;
    }
    if (checkoutReturn !== 'success' || !sessionId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    Promise.resolve().then(() => setState('confirming'));
    async function poll() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token || !active) return;
      const response = await fetch(`/api/checkout/status?session_id=${encodeURIComponent(sessionId!)}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      });
      const payload = await response.json() as { status?: string; error?: string };
      if (!active) return;
      if (payload.status && ['paid', 'fulfilled', 'partially_refunded'].includes(payload.status)) {
        clearCart();
        setState('paid');
        return;
      }
      if (payload.status && ['failed', 'canceled', 'refunded', 'disputed', 'dispute_lost'].includes(payload.status)) {
        setErrorMessage('Stripe did not confirm a completed payment. Your card has not granted access or fulfillment.');
        setState('error');
        return;
      }
      attempts += 1;
      if (attempts >= 15) {
        setErrorMessage('Payment confirmation is delayed. Your order remains pending until the signed Stripe webhook arrives.');
        setState('error');
        return;
      }
      timer = setTimeout(() => { void poll(); }, 2000);
    }
    void poll();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [user]);

  const canCompleteFreeSave = items.length > 0 && subtotalCents === 0 && !hasPhysicalItem;
  const canStartPaidCheckout = PUBLIC_PURCHASES_AVAILABLE && items.length > 0 && subtotalCents > 0 && Boolean(checkoutConfig?.available && checkoutConfig.terms);

  if (!PUBLIC_PURCHASES_AVAILABLE) {
    return (
      <PageShell>
        <main className="dashboard-page">
          <HubHero title="Purchasing unavailable" copy="Checkout is temporarily unavailable." />
          <div className="dashboard-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
            <div className="dashboard-empty">
              Your cart is safe. Please return later to complete checkout.
              <div className="checkout-inline-actions">
                <Link className="os-button os-button-primary os-button-compact" href="/">Open Home</Link>
              </div>
            </div>
          </div>
        </main>
      </PageShell>
    );
  }

  if (loading) return <PageShell><CenteredMessage status>Loading…</CenteredMessage></PageShell>;

  if (!user) {
    return (
      <PageShell>
        <main className="dashboard-page">
          <HubHero title="Checkout" copy="Sign in to continue securely and track your order." />
          <div className="dashboard-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
            <div className="dashboard-empty">
              You need an account to continue to checkout and track your order.
              <div className="checkout-inline-actions">
                <Link className="os-button os-button-primary os-button-compact" href="/login">Log In</Link>
                <Link className="os-button os-button-secondary os-button-compact" href="/cart">Back to Cart</Link>
              </div>
            </div>
          </div>
        </main>
      </PageShell>
    );
  }

  if (state === 'confirming' || state === 'paid') {
    return (
      <PageShell>
        <main className="dashboard-page">
          <HubHero title={state === 'paid' ? 'Order Confirmed' : 'Confirming Payment'} copy={state === 'paid' ? 'Your signed Stripe payment is recorded in 44OS.' : 'Stripe has returned you to 44OS. Fulfillment waits for webhook confirmation.'} />
          <div className="dashboard-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
            <div className="dashboard-empty" role="status" aria-live="polite">
              {state === 'paid' ? 'Your order is ready for fulfillment.' : 'Do not close this page while payment confirmation is checked.'}
              <div className="checkout-inline-actions">
                {state === 'paid' ? <Link className="os-button os-button-primary os-button-compact" href="/library">Open Library</Link> : null}
                <Link className="os-button os-button-secondary os-button-compact" href="/">Open Home</Link>
              </div>
            </div>
          </div>
        </main>
      </PageShell>
    );
  }

  if (items.length === 0 && state !== 'placed') {
    return (
      <PageShell>
        <main className="dashboard-page">
          <HubHero title="Checkout" copy="Your cart is empty." />
          <div className="dashboard-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
            <div className="dashboard-empty">
              Add an Item from Store when you are ready.
              <div className="ui44-section-gap-before">
                <Link className="os-button os-button-primary os-button-compact" href="/">Go Home</Link>
              </div>
            </div>
          </div>
        </main>
      </PageShell>
    );
  }

  async function placeOrder(event: React.FormEvent) {
    event.preventDefault();
    if (!user || items.length === 0) return;
    if (!canCompleteFreeSave) {
      if (!canStartPaidCheckout || !termsAccepted) {
        setErrorMessage(!checkoutConfig?.available
          ? checkoutConfig?.reason || 'Paid checkout is not activated.'
          : 'Accept the approved checkout terms before continuing.');
        setState('error');
        return;
      }
      setState('placing');
      setErrorMessage('');
      if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error('Sign in again before checking out.');
        const response = await fetch('/api/checkout/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            lines: items.map(item => ({
              itemId: item.item_id,
              offerId: item.offer_id ?? null,
              merchVariantId: item.merch_variant_id ?? null,
            })),
            idempotencyKey: idempotencyKey.current,
            termsAccepted: true,
          }),
        });
        const payload = await response.json() as { url?: string; error?: string };
        if (!response.ok || !payload.url) throw new Error(payload.error || 'Checkout could not be started.');
        window.location.assign(payload.url);
        return;
      } catch (checkoutError) {
        setErrorMessage(checkoutError instanceof Error ? checkoutError.message : 'Checkout could not be started.');
        setState('error');
        return;
      }
    }

    setState('placing');
    setErrorMessage('');
    try {
      await saveFreeCartToLibrary(user.id, items.map(item => item.item_id));
    } catch (saveError) {
      setErrorMessage(saveError instanceof Error ? saveError.message : 'Could not save these Items to your Library.');
      setState('error');
      return;
    }
    clearCart();
    setState('placed');
  }

  if (state === 'placed') {
    return (
      <PageShell>
        <main className="dashboard-page">
          <HubHero title="Added to Library" copy="Your free Items are ready in 44OS." />
          <div className="dashboard-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
            <div className="dashboard-empty">
              No payment was required. Library keeps the Items you want to return to; public listening remains free where enabled.
              <div className="checkout-inline-actions">
                <Link className="os-button os-button-primary os-button-compact" href="/library">Open Library</Link>
                <Link className="os-button os-button-secondary os-button-compact" href="/">Keep Exploring</Link>
              </div>
            </div>
          </div>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="dashboard-page">
        <HubHero title="Checkout" copy={`${count} item${count === 1 ? '' : 's'} · ${formatMoney(subtotalCents, currency)}`} />
        <form className="checkout-grid" onSubmit={placeOrder}>
          <section className="settings-section checkout-summary-section">
            <div className="settings-field">
              <div className="settings-field-head">
                <div className="os-type-field-title">
                  {canCompleteFreeSave ? 'Free Library Save' : canStartPaidCheckout ? 'Secure Stripe Checkout' : 'Paid Checkout Unavailable'}
                </div>
                <p className="os-type-body-small">
                  {canCompleteFreeSave
                    ? 'Add these Items without entering billing information. Streaming access remains independent from your Library.'
                    : canStartPaidCheckout
                      ? 'Prices, availability, tax, and shipping are recalculated by 44OS before Stripe collects payment.'
                      : checkoutConfig?.reason || '44OS will not collect card or delivery information until payments are configured and approved.'}
                </p>
              </div>
            </div>

            {state === 'canceled' ? <div className="dashboard-status ui44-status" role="status">Checkout was canceled. Nothing was granted or sent to fulfillment, and your Cart is unchanged.</div> : null}

            {canStartPaidCheckout && checkoutConfig?.terms ? (
              <label className="settings-checkbox-row">
                <input type="checkbox" checked={termsAccepted} onChange={event => setTermsAccepted(event.target.checked)} />
                <span>I agree to the <Link href="/legal/terms">Terms &amp; Conditions</Link>.</span>
              </label>
            ) : null}

            {errorMessage && <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{errorMessage}</div>}

            <div className="cart-summary-actions">
              <Link className="os-button os-button-secondary" href="/cart">Back to Cart</Link>
              <button type="submit" className="os-button os-button-primary" disabled={state === 'placing' || (!canCompleteFreeSave && (!canStartPaidCheckout || !termsAccepted))}>
                {state === 'placing' ? (canCompleteFreeSave ? 'Adding…' : 'Opening Stripe…') : canCompleteFreeSave ? 'Add to Library · Free' : canStartPaidCheckout ? 'Continue to Stripe' : 'Paid Checkout Unavailable'}
              </button>
            </div>
          </section>

          <aside className="checkout-summary dashboard-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
            <div className="checkout-summary-head"><h2 className="os-type-field-title">Summary</h2></div>
            <div className="checkout-summary-items">
              {items.map(item => (
                <div key={item.item_id} className="checkout-summary-row ui44-list-row ui44-list-row-checkout">
                  <div className="checkout-summary-art">
                    {item.cover_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.cover_url} alt="" />
                    )}
                  </div>
                  <div className="ui44-min-width-zero">
                    <div className="checkout-summary-title">{item.title}</div>
                    <div className="dashboard-row-subtitle">{item.creator}</div>
                    {item.merch_variant_name ? <div className="os-type-meta">{formatMerchOptions(item.merch_option_values) || item.merch_variant_name}</div> : null}
                  </div>
                  <div className="cart-row-price">{formatMoney(item.price_cents, item.currency)}</div>
                </div>
              ))}
            </div>
            <div className="checkout-summary-total">
              <span className="os-type-body">Subtotal</span>
              <span className="os-type-field-title">{formatMoney(subtotalCents, currency)}</span>
            </div>
          </aside>
        </form>
      </main>
    </PageShell>
  );
}

function formatMerchOptions(options?: Record<string, string>) {
  return Object.entries(options ?? {}).map(([name, value]) => `${name.replaceAll('_', ' ')}: ${value}`).join(' · ');
}
