'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageShell, HubHero, CenteredMessage } from '@/components/Ui';
import { useTopbarBack } from '@/components/TopbarContext';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { clearCart, useCart, type CartItem } from '@/lib/cart';
import { getProductExperience } from '@/lib/experience';
import type { Product } from '@/lib/products';
import { isMissingRelationError } from '@/lib/schemaCompat';

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
  const [deliveryName, setDeliveryName] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [state, setState] = useState<PlaceState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const [catalogProducts, setCatalogProducts] = useState<Record<string, Product>>({});

  // Checkout is a system surface reached from the Cart — keep the OS back path.
  useTopbarBack({ href: '/cart', label: 'Cart' });

  useEffect(() => {
    const userEmail = user?.email;
    if (!userEmail) return;
    Promise.resolve().then(() => {
      setEmail(current => current || userEmail);
      setName(current => current || userEmail.split('@')[0]);
    });
  }, [user?.email]);

  useEffect(() => {
    async function loadProducts() {
      if (!items.length) return;
      const productIds = items.map(item => item.product_id);
      const { data } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);
      const rows = (data as Product[] | null) ?? [];
      setCatalogProducts(rows.reduce<Record<string, Product>>((acc, product) => {
        acc[product.id] = product;
        return acc;
      }, {}));
    }
    void loadProducts();
  }, [items]);

  const merchItems = items.filter(item => {
    const product = catalogProducts[item.product_id];
    return product ? getProductExperience(product) === 'physical' : false;
  });
  const digitalItems = items.filter(item => {
    const product = catalogProducts[item.product_id];
    return product ? getProductExperience(product) !== 'physical' : true;
  });
  const hasMerch = merchItems.length > 0;

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
                <Link className="os-button os-button-primary os-button-compact" href="/browse/merch">Browse Merch</Link>
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
    if (hasMerch && (!deliveryName.trim() || !address1.trim() || !city.trim() || !region.trim() || !postalCode.trim() || !country.trim())) {
      setErrorMessage('Fill in the delivery address for merch orders.');
      setState('error');
      return;
    }

    setState('placing');
    setErrorMessage('');

    if (digitalItems.length > 0) {
      const rows = digitalItems.map((item: CartItem) => ({
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
    }

    if (hasMerch) {
      const merchProducts = merchItems
        .map(item => ({ item, product: catalogProducts[item.product_id] }))
        .filter((entry): entry is { item: CartItem; product: Product } => Boolean(entry.product));

      const merchByCreator = merchProducts.reduce<Record<string, Array<{ item: CartItem; product: Product }>>>((acc, entry) => {
        const creatorId = entry.product.author_id || 'unknown';
        if (!acc[creatorId]) acc[creatorId] = [];
        acc[creatorId].push(entry);
        return acc;
      }, {});

      for (const [creatorId, creatorItems] of Object.entries(merchByCreator)) {
        const subtotal = creatorItems.reduce((sum, entry) => sum + entry.item.price_cents * entry.item.quantity, 0);
        const orderInsert = await supabase
          .from('merch_orders')
          .insert({
            buyer_id: user.id,
            creator_id: creatorId,
            buyer_name: name.trim(),
            buyer_email: email.trim(),
            delivery_name: deliveryName.trim(),
            delivery_address_1: address1.trim(),
            delivery_address_2: address2.trim() || null,
            delivery_city: city.trim(),
            delivery_region: region.trim(),
            delivery_postal_code: postalCode.trim(),
            delivery_country: country.trim(),
            delivery_notes: deliveryNotes.trim() || null,
            currency,
            subtotal_cents: subtotal,
            status: 'paid',
          })
          .select('id')
          .single();

        if (orderInsert.error) {
          if (isMissingRelationError(orderInsert.error)) {
            setErrorMessage('Merch orders need the reviewed merch SQL applied in Supabase first.');
          } else {
            setErrorMessage(orderInsert.error.message);
          }
          setState('error');
          return;
        }

        const orderId = orderInsert.data?.id;
        const itemInsert = await supabase.from('merch_order_items').insert(
          creatorItems.map(entry => ({
            order_id: orderId,
            product_id: entry.item.product_id,
            quantity: entry.item.quantity,
            unit_price_cents: entry.item.price_cents,
            line_total_cents: entry.item.price_cents * entry.item.quantity,
          })),
        );

        if (itemInsert.error) {
          setErrorMessage(itemInsert.error.message);
          setState('error');
          return;
        }
      }
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
                <Link className="os-button os-button-primary os-button-compact" href="/browse/merch">Back to Merch</Link>
                <Link className="os-button os-button-secondary os-button-compact" href="/browse">Keep Browsing</Link>
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

            {hasMerch ? (
              <div className="settings-field">
                <div className="settings-field-head">
                  <div className="os-type-field-title">Delivery</div>
                  <p className="os-type-body-small">Local-fulfillment merch orders share this delivery address with the creator after payment.</p>
                </div>
                <div className="checkout-grid-two">
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Delivery Name</div>
                    <input className="os-input-field" value={deliveryName} onChange={event => setDeliveryName(event.target.value)} autoComplete="shipping name" />
                  </label>
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Country</div>
                    <input className="os-input-field" value={country} onChange={event => setCountry(event.target.value)} autoComplete="shipping country" />
                  </label>
                </div>
                <label className="dashboard-field">
                  <div className="dashboard-field-label">Address Line 1</div>
                  <input className="os-input-field" value={address1} onChange={event => setAddress1(event.target.value)} autoComplete="shipping address-line1" />
                </label>
                <label className="dashboard-field">
                  <div className="dashboard-field-label">Address Line 2</div>
                  <input className="os-input-field" value={address2} onChange={event => setAddress2(event.target.value)} autoComplete="shipping address-line2" />
                </label>
                <div className="checkout-grid-two">
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">City</div>
                    <input className="os-input-field" value={city} onChange={event => setCity(event.target.value)} autoComplete="shipping address-level2" />
                  </label>
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">State / Region</div>
                    <input className="os-input-field" value={region} onChange={event => setRegion(event.target.value)} autoComplete="shipping address-level1" />
                  </label>
                </div>
                <div className="checkout-grid-two">
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Postal Code</div>
                    <input className="os-input-field" value={postalCode} onChange={event => setPostalCode(event.target.value)} autoComplete="shipping postal-code" />
                  </label>
                  <label className="dashboard-field">
                    <div className="dashboard-field-label">Delivery Notes</div>
                    <input className="os-input-field" value={deliveryNotes} onChange={event => setDeliveryNotes(event.target.value)} placeholder="Apartment, landmark, timing notes" />
                  </label>
                </div>
              </div>
            ) : null}

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
