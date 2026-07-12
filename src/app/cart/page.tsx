'use client';

import Link from 'next/link';
import { PageShell, HubHero } from '@/components/Ui';
import { useTopbarBack } from '@/components/TopbarContext';
import {
  removeFromCart,
  updateCartQuantity,
  useCart,
} from '@/lib/cart';

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export default function CartPage() {
  const { items, count, subtotalCents } = useCart();
  const currency = items[0]?.currency ?? 'USD';

  useTopbarBack({ href: '/store', label: 'Browse' });

  if (items.length === 0) {
    return (
      <PageShell>
        <main className="dashboard-page">
          <HubHero title="Cart" copy="Items you have added while browsing." />
          <div className="dashboard-list-surface">
            <div className="dashboard-empty">
              Your cart is empty. Browse merch or creator items to add something.
              <div style={{ marginTop: 'var(--os-space-4)' }}>
                <Link className="os-button os-button-primary os-button-compact" href="/store">Open Browse</Link>
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
        <HubHero
          title="Cart"
          copy={`${count} item${count === 1 ? '' : 's'} ready to check out.`}
          actions={
            <Link className="os-button os-button-primary" href="/checkout">
              Continue to Checkout
            </Link>
          }
        />

        <div className="dashboard-list-surface">
          {items.map(item => (
            <div key={item.item_id} className="dashboard-list-row cart-row">
              <div className="cart-row-item">
                <div className="cart-row-art">
                  {item.cover_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.cover_url} alt="" />
                  )}
                </div>
                <div className="dashboard-row-copy">
                  <div className="dashboard-row-title">
                    <Link
                      href={item.href || '/'}
                      style={{ color: 'inherit', textDecoration: 'none' }}
                    >
                      {item.title}
                    </Link>
                  </div>
                  <div className="dashboard-row-subtitle">{item.creator}</div>
                </div>
              </div>

              <div className="cart-row-qty" role="group" aria-label="Quantity">
                <button
                  type="button"
                  className="os-button os-button-secondary os-button-compact"
                  onClick={() => updateCartQuantity(item.item_id, item.quantity - 1)}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="cart-row-qty-value">{item.quantity}</span>
                <button
                  type="button"
                  className="os-button os-button-secondary os-button-compact"
                  onClick={() => updateCartQuantity(item.item_id, item.quantity + 1)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <div className="cart-row-price">
                {formatMoney(item.price_cents * item.quantity, item.currency)}
              </div>

              <div className="dashboard-row-actions">
                <button
                  type="button"
                  className="os-button os-button-ghost os-button-compact"
                  onClick={() => removeFromCart(item.item_id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <div className="cart-summary-row">
            <span className="os-type-body">Subtotal</span>
            <span className="os-type-field-title">{formatMoney(subtotalCents, currency)}</span>
          </div>
          <div className="cart-summary-row cart-summary-note">
            <span className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>
              Taxes and any local fees are calculated at checkout.
            </span>
          </div>
          <div className="cart-summary-actions">
            <Link className="os-button os-button-secondary" href="/store">
              Keep Shopping
            </Link>
            <Link className="os-button os-button-primary" href="/checkout">
              Continue to Checkout
            </Link>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
