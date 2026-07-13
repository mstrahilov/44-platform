'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageShell, HubHero } from '@/components/Ui';
import { useTopbarBack } from '@/components/TopbarContext';
import { supabase } from '@/lib/supabase';
import {
  removeFromCart,
  useCart,
} from '@/lib/cart';

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export default function CartPage() {
  const { items, count, subtotalCents } = useCart();
  const currency = items[0]?.currency ?? 'USD';
  const [legacyItemTypes, setLegacyItemTypes] = useState<Record<string, string>>({});

  useTopbarBack({ href: '/store', label: 'Store' });

  useEffect(() => {
    const missingIds = items.filter(item => !item.item_type).map(item => item.item_id);
    if (missingIds.length === 0) return;
    let active = true;
    supabase
      .from('catalog_items')
      .select('id,item_type')
      .in('id', missingIds)
      .then(({ data }) => {
        if (!active) return;
        setLegacyItemTypes(Object.fromEntries((data ?? []).map(item => [item.id, item.item_type || 'Item'])));
      });
    return () => { active = false; };
  }, [items]);

  if (items.length === 0) {
    return (
      <PageShell>
        <main className="dashboard-page">
          <HubHero title="Cart" copy="Items you have added while browsing." />
          <div className="dashboard-list-surface">
            <div className="dashboard-empty">
              Your cart is empty. Browse merch or creator items to add something.
              <div style={{ marginTop: 'var(--os-space-4)' }}>
                <Link className="os-button os-button-primary os-button-compact" href="/store">Open Store</Link>
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
                  <div className="dashboard-row-subtitle">{item.item_type || legacyItemTypes[item.item_id] || 'Item'}</div>
                </div>
              </div>

              <div className="cart-row-price">
                {formatMoney(item.price_cents, item.currency)}
              </div>

              <button
                type="button"
                className="cart-row-remove-button"
                onClick={() => removeFromCart(item.item_id)}
                aria-label={`Remove ${item.title} from cart`}
                title="Remove from cart"
              >
                <span aria-hidden="true">×</span>
              </button>
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
              Checkout
            </Link>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
