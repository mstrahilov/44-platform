'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageShell, HubHero, CenteredMessage } from '@/components/Ui';
import { useTopbarBack } from '@/components/TopbarContext';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { clearCart, useCart, type CartItem } from '@/lib/cart';

type PlaceState = 'idle' | 'placing' | 'placed' | 'error';

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export default function CheckoutPage() {
  const { user, loading } = useAuth();
  const { items, count, subtotalCents } = useCart();
  const currency = items[0]?.currency ?? 'USD';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [card, setCard] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [state, setState] = useState<PlaceState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Checkout is a system surface reached from the Cart — keep the OS back path.
  useTopbarBack({ href: '/cart', label: 'Cart' });

  useEffect(() => {
    if (user?.email) setEmail(current => current || user.email!);
  }, [user]);

  if (loading) {
    return <PageShell><CenteredMessage>Loading…</CenteredMessage></PageShell>;
  }

  if (!user) {
    return (
      <PageShell>
        <main className="dashboard-page">
          <HubHero title="Checkout" copy="Sign in to complete your purchase." />
          <div className="dashboard-list-surface">
            <div className="dashboard-empty">
              You need an account to check out and receive items in your library.
              <div style={{ marginTop: 'var(--os-space-4)', display: 'flex', gap: 'var(--os-space-3)' }}>
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
          <div className="dashboard-list-surface">
            <div className="dashboard-empty">
              Add items to your cart to check out.
              <div style={{ marginTop: 'var(--os-space-4)' }}>
                <Link className="os-button os-button-primary os-button-compact" href="/store/merch">Browse Merch</Link>
              </div>
            </div>
          </div>
        </main>
      </PageShell>
    );
  }

  async function placeOrder(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    if (items.length === 0) return;
    if (!name.trim() || !email.trim() || !card.trim() || !expiry.trim() || !cvc.trim()) {
      setErrorMessage('Fill in all billing fields to place the order.');
      setState('error');
      return;
    }

    setState('placing');
    setErrorMessage('');

    const rows = items.map((item: CartItem) => ({
      user_id: user.id,
      product_id: item.product_id,
      acquisition_type: 'purchase',
    }));

    const { error } = await supabase
      .from('library_items')
      .upsert(rows, { onConflict: 'user_id,product_id' });

    if (error) {
      setErrorMessage(error.message);
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
          <HubHero title="Order Placed" copy="Your items are ready in 44OS." />
          <div className="dashboard-list-surface">
            <div className="dashboard-empty">
              A confirmation email will be sent to {email}. Digital items appear in Library.
              <div style={{ marginTop: 'var(--os-space-4)', display: 'flex', gap: 'var(--os-space-3)' }}>
                <Link className="os-button os-button-primary os-button-compact" href="/store/merch">Back to Merch</Link>
                <Link className="os-button os-button-secondary os-button-compact" href="/store/merch">Keep Browsing</Link>
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
          title="Checkout"
          copy={`${count} item${count === 1 ? '' : 's'} · ${formatMoney(subtotalCents, currency)}`}
        />

        <form className="checkout-grid" onSubmit={placeOrder}>
          <section className="settings-section" style={{ maxWidth: 'none' }}>
            <div className="settings-field">
              <div className="settings-field-head">
                <div className="os-type-field-title">Contact</div>
                <p className="os-type-body-small">Order confirmation and download links go here.</p>
              </div>
              <div className="checkout-grid-two">
                <label className="dashboard-field">
                  <div className="dashboard-field-label">Full Name</div>
                  <input
                    className="os-input-field"
                    value={name}
                    onChange={event => setName(event.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </label>
                <label className="dashboard-field">
                  <div className="dashboard-field-label">Email</div>
                  <input
                    type="email"
                    className="os-input-field"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </label>
              </div>
            </div>

            <div className="settings-field">
              <div className="settings-field-head">
                <div className="os-type-field-title">Payment</div>
                <p className="os-type-body-small">Card details are processed off-platform. This is a placeholder form.</p>
              </div>
              <label className="dashboard-field">
                <div className="dashboard-field-label">Card Number</div>
                <input
                  className="os-input-field"
                  value={card}
                  onChange={event => setCard(event.target.value)}
                  placeholder="1234 5678 9012 3456"
                  inputMode="numeric"
                  autoComplete="cc-number"
                />
              </label>
              <div className="checkout-grid-two">
                <label className="dashboard-field">
                  <div className="dashboard-field-label">Expiry</div>
                  <input
                    className="os-input-field"
                    value={expiry}
                    onChange={event => setExpiry(event.target.value)}
                    placeholder="MM/YY"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                  />
                </label>
                <label className="dashboard-field">
                  <div className="dashboard-field-label">CVC</div>
                  <input
                    className="os-input-field"
                    value={cvc}
                    onChange={event => setCvc(event.target.value)}
                    placeholder="123"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                  />
                </label>
              </div>
            </div>

            {errorMessage && (
              <div className="dashboard-status dashboard-status-error">{errorMessage}</div>
            )}

            <div className="cart-summary-actions">
              <Link className="os-button os-button-secondary" href="/cart">
                Back to Cart
              </Link>
              <button
                type="submit"
                className="os-button os-button-primary"
                disabled={state === 'placing'}
              >
                {state === 'placing' ? 'Placing…' : `Place Order · ${formatMoney(subtotalCents, currency)}`}
              </button>
            </div>
          </section>

          <aside className="checkout-summary dashboard-list-surface">
            <div className="checkout-summary-head">
              <h2 className="os-type-field-title">Order Summary</h2>
            </div>
            <div className="checkout-summary-items">
              {items.map(item => (
                <div key={item.product_id} className="checkout-summary-row">
                  <div className="checkout-summary-art">
                    {item.cover_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.cover_url} alt="" />
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="checkout-summary-title">{item.title}</div>
                    <div className="dashboard-row-subtitle">
                      {item.creator} · Qty {item.quantity}
                    </div>
                  </div>
                  <div className="cart-row-price">
                    {formatMoney(item.price_cents * item.quantity, item.currency)}
                  </div>
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
