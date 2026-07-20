'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EmptyMessage, HubHero, PageShell } from '@/components/Ui';
import { useAuth } from '@/lib/useAuth';
import { listCustomerOrders, type CustomerOrder } from '@/lib/domain/customerCommerce';

export default function OrdersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void listCustomerOrders(user.id)
      .then(rows => { if (active) setOrders(rows); })
      .catch(loadError => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load your orders.');
      })
      .finally(() => { if (active) setFetching(false); });
    return () => { active = false; };
  }, [user]);

  if (loading || !user) {
    return <PageShell><div className="ui44-loading-shell" role="status" aria-label="Loading" /></PageShell>;
  }

  return (
    <PageShell>
      <main className="dashboard-page">
        <HubHero title="Orders" copy="Your checkout history and fulfillment status." />

        {fetching ? (
          <div className="dashboard-empty ui44-state ui44-state-loading" role="status" aria-live="polite">Loading orders…</div>
        ) : error ? (
          <div className="dashboard-status dashboard-status-error ui44-status ui44-status-error" role="alert">Could not load your orders.</div>
        ) : orders.length === 0 ? (
          <EmptyMessage>
            No orders yet.
            <span className="ui44-section-gap-before"><Link className="os-button os-button-primary os-button-compact" href="/">Open Home</Link></span>
          </EmptyMessage>
        ) : (
          <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
            {orders.map(order => (
              <article className="dashboard-list-row ui44-list-row ui44-list-row-dashboard" key={order.id}>
                <div className="dashboard-row-copy">
                  <div className="dashboard-row-title">Order {order.id.slice(0, 8).toUpperCase()}</div>
                  <div className="dashboard-row-subtitle">{formatOrderDate(order)} · {orderStatusLabel(order.status)}</div>
                  {order.lines.map(line => (
                    <div className="dashboard-row-meta ui44-meta-offset" key={line.id}>
                      <span>{line.quantity > 1 ? `${line.quantity} × ` : ''}{line.item_title} · {line.offer_title}
                        {line.fulfillment_status !== 'not_required' ? ` · ${fulfillmentLabel(line.fulfillment_status)}` : ''}
                      </span>
                      {line.offer_type === 'digital_download' && line.has_active_download && line.library_entry_id ? (
                        <span className="ui44-section-gap-before">
                          <Link className="os-button os-button-secondary os-button-compact" href={`/library/item/${line.library_entry_id}#downloads`}>Download</Link>
                        </span>
                      ) : null}
                    </div>
                  ))}
                  {order.status === 'legacy_unverified' ? (
                    <div className="dashboard-row-meta ui44-meta-offset">This historical record is not verified provider payment evidence.</div>
                  ) : null}
                </div>
                <div className="dashboard-row-meta">{formatMoney(order.total_cents, order.currency)}</div>
              </article>
            ))}
          </div>
        )}
      </main>
    </PageShell>
  );
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
}

function formatOrderDate(order: CustomerOrder) {
  const value = order.paid_at || order.placed_at || order.created_at;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function orderStatusLabel(status: string) {
  return ({
    pending_payment: 'Awaiting payment confirmation',
    paid: 'Paid · preparing for fulfillment',
    fulfilled: 'Fulfilled',
    canceled: 'Canceled',
    failed: 'Payment failed',
    partially_refunded: 'Partially refunded',
    refunded: 'Refunded',
    disputed: 'Payment disputed',
    dispute_lost: 'Dispute resolved',
    legacy_unverified: 'Legacy unverified record',
  } as Record<string, string>)[status] ?? status.replaceAll('_', ' ');
}

function fulfillmentLabel(status: string) {
  return ({
    pending: 'Fulfillment pending',
    in_progress: 'Preparing shipment',
    fulfilled: 'Fulfilled',
    canceled: 'Fulfillment canceled',
    returned: 'Returned',
  } as Record<string, string>)[status] ?? status.replaceAll('_', ' ');
}
