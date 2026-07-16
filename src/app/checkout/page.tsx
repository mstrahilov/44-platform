'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageShell, HubHero, CenteredMessage } from '@/components/Ui';
import { useTopbarBack } from '@/components/TopbarContext';
import { useAuth } from '@/lib/useAuth';
import { clearCart, useCart } from '@/lib/cart';
import { getProductExperience } from '@/lib/experience';
import type { Product } from '@/lib/products';
import { getCartCatalogItems, saveFreeCartToLibrary } from '@/lib/domain/acquisition';

type PlaceState = 'idle' | 'placing' | 'placed' | 'error';

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

  const hasPhysicalItem = items.some(item => {
    const catalogItem = catalogItems[item.item_id];
    return catalogItem ? getProductExperience(catalogItem) === 'physical' : false;
  });
  const canCompleteFreeSave = items.length > 0 && subtotalCents === 0 && !hasPhysicalItem;

  if (loading) return <PageShell><CenteredMessage status>Loading…</CenteredMessage></PageShell>;

  if (!user) {
    return (
      <PageShell>
        <main className="dashboard-page">
          <HubHero title="Checkout" copy="Sign in to add free Items to your Library." />
          <div className="dashboard-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
            <div className="dashboard-empty">
              You need an account so 44OS can save these Items to your Library.
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

  if (items.length === 0 && state !== 'placed') {
    return (
      <PageShell>
        <main className="dashboard-page">
          <HubHero title="Checkout" copy="Your cart is empty." />
          <div className="dashboard-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
            <div className="dashboard-empty">
              Add an Item from Store when you are ready.
              <div className="ui44-section-gap-before">
                <Link className="os-button os-button-primary os-button-compact" href="/store">Go to Store</Link>
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
      setErrorMessage('Paid checkout is not available until 44OS selects and verifies its payment and fulfillment model.');
      setState('error');
      return;
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
                <Link className="os-button os-button-secondary os-button-compact" href="/store">Keep Exploring</Link>
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
                  {canCompleteFreeSave ? 'Free Library Save' : 'Paid Checkout Coming Later'}
                </div>
                <p className="os-type-body-small">
                  {canCompleteFreeSave
                    ? 'Add these Items without entering billing information. Streaming access remains independent from your Library.'
                    : '44OS will not collect card or delivery information until verified payments, refunds, taxes, payouts, and fulfillment are ready.'}
                </p>
              </div>
            </div>

            {errorMessage && <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">{errorMessage}</div>}

            <div className="cart-summary-actions">
              <Link className="os-button os-button-secondary" href="/cart">Back to Cart</Link>
              <button type="submit" className="os-button os-button-primary" disabled={state === 'placing' || !canCompleteFreeSave}>
                {state === 'placing' ? 'Adding…' : canCompleteFreeSave ? 'Add to Library · Free' : 'Paid Checkout Unavailable'}
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
