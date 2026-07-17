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
import { PUBLIC_PURCHASES_AVAILABLE, PURCHASING_COMING_SOON_COPY, PURCHASING_COMING_SOON_TITLE } from '@/lib/commerceAvailability';

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

  if (!PUBLIC_PURCHASES_AVAILABLE) {
    return (
      <PageShell>
        <main className="dashboard-page">
          <HubHero title={PURCHASING_COMING_SOON_TITLE} copy="44OS is launching without customer payments." />
          <div className="dashboard-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
            <div className="dashboard-empty">
              {PURCHASING_COMING_SOON_COPY}
              <div className="ui44-section-gap-before">
                <Link className="os-button os-button-primary os-button-compact" href="/store">Keep Exploring</Link>
              </div>
            </div>
          </div>
        </main>
      </PageShell>
    );
  }

  if (items.length === 0) {
    return (
      <PageShell>
        <main className="dashboard-page">
          <HubHero title="Cart" copy="Items you have added while browsing." />
          <div className="dashboard-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
            <div className="dashboard-empty">
              Your cart is empty. Browse merch or creator items to add something.
              <div className="ui44-section-gap-before">
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

        <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
          {items.map(item => (
            <div key={item.line_id || item.item_id} className="dashboard-list-row cart-row ui44-list-row ui44-list-row-cart">
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
                      className="cart-item-link"
                    >
                      {item.title}
                    </Link>
                  </div>
                  <div className="dashboard-row-subtitle">{item.offer_title || item.item_type || legacyItemTypes[item.item_id] || 'Item'}</div>
                  {item.merch_variant_name ? <div className="os-type-meta">{formatMerchOptions(item.merch_option_values) || item.merch_variant_name}</div> : null}
                  {item.tier_code ? <div className="os-type-meta">{item.included_files?.map(file => file.replaceAll('_', ' ')).join(' · ')}</div> : null}
                </div>
              </div>

              <div className="cart-row-price">
                {formatMoney(item.price_cents, item.currency)}
              </div>

              <button
                type="button"
                className="cart-row-remove-button"
                onClick={() => removeFromCart(item.line_id || item.item_id)}
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
            <span className="os-type-body-small ui44-text-secondary">
              Prices and availability are verified by 44OS. Stripe calculates approved tax and shipping at checkout.
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

function formatMerchOptions(options?: Record<string, string>) {
  return Object.entries(options ?? {}).map(([name, value]) => `${name.replaceAll('_', ' ')}: ${value}`).join(' · ');
}
