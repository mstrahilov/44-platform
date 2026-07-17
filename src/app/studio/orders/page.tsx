'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageShell, HubHero, EmptyMessage } from '@/components/Ui';
import { useAuth } from '@/lib/useAuth';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { listCreatorOrders, updateCreatorOrderFulfillment, type CreatorOrderLine } from '@/lib/domain/studioCommerce';

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export default function StudioOrdersPage() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [orders, setOrders] = useState<CreatorOrderLine[]>([]);
  const [fetching, setFetching] = useState(true);
  const [status, setStatus] = useState('');
  const [statusKind, setStatusKind] = useState<'success' | 'error'>('success');

  useEffect(() => {
    async function loadOrders() {
      if (!user) return;
      const profileResult = await loadStudioProfile(user.id);
      setProfile(profileResult.profile);
      const profileId = profileResult.profile?.id ?? user.id;

      try {
        setOrders(await listCreatorOrders(profileId));
      } catch (loadError) {
        setStatusKind('error');
        setStatus(loadError instanceof Error ? loadError.message : 'Could not load verified orders.');
        setFetching(false);
        return;
      }

      setFetching(false);
    }

    void loadOrders();
  }, [user]);

  async function updateOrderStatus(order: CreatorOrderLine, nextStatus: 'in_progress' | 'fulfilled' | 'returned') {
    try {
      await updateCreatorOrderFulfillment(order.id, nextStatus);
    } catch (updateError) {
      setStatusKind('error');
      setStatus(updateError instanceof Error ? updateError.message : 'Could not update this order.');
      return;
    }

    setOrders(current => current.map(item => item.id === order.id ? { ...item, fulfillment_status: nextStatus } : item));
    setStatusKind('success');
    setStatus('Order updated.');
  }

  if (loading) {
    return <PageShell><div className="ui44-loading-shell" role="status" aria-label="Loading" /></PageShell>;
  }

  if (!user) {
    return (
      <PageShell>
        <main className="dashboard-page">
          <HubHero title="Orders" copy="Sign in to manage merch orders." />
          <EmptyMessage>Log in to view creator merch orders.</EmptyMessage>
        </main>
      </PageShell>
    );
  }

  if (profile && !isCreatorProfile(profile)) {
    return (
      <PageShell>
        <main className="dashboard-page">
          <HubHero title="Orders" copy="Creator merch orders live in Studio." />
          <EmptyMessage>Creator access is required to manage merch orders.</EmptyMessage>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="dashboard-page">
        <HubHero title="Orders" copy="Local-fulfillment merch orders from buyers appear here after checkout." />

        {status ? (
          <div
            className={`${statusKind === 'success' ? 'dashboard-status dashboard-status-success ui44-status ui44-status-success' : 'dashboard-status dashboard-status-error ui44-status ui44-status-error'} ui44-status-block`}
            role={statusKind === 'success' ? 'status' : 'alert'}
          >
            {status}
          </div>
        ) : null}

        <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
          {fetching ? (
            <div className="dashboard-empty ui44-state ui44-state-loading" role="status" aria-live="polite">Loading orders…</div>
          ) : orders.length === 0 ? (
            <div className="dashboard-empty">
              No merch orders yet.
              <div className="ui44-section-gap-before">
                <Link className="os-button os-button-primary os-button-compact" href="/studio#merch">Open Merch</Link>
              </div>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="dashboard-list-row ui44-list-row ui44-list-row-dashboard ui44-list-row-wide-actions">
                <div className="dashboard-row-copy">
                  <div className="dashboard-row-title">{order.item_title}</div>
                  <div className="dashboard-row-subtitle">
                    {formatMoney(order.line_total_cents, order.currency)} · {order.order?.status ?? 'payment unavailable'} · {order.fulfillment_status}
                  </div>
                  {order.address ? <div className="dashboard-row-meta ui44-meta-offset">
                    {order.address.recipient_name} · {order.address.address_line_1}
                    {order.address.address_line_2 ? `, ${order.address.address_line_2}` : ''}
                    {`, ${order.address.city}, ${order.address.region} ${order.address.postal_code}, ${order.address.country_code}`}
                  </div> : <div className="dashboard-row-meta ui44-meta-offset">Verified delivery address unavailable.</div>}
                  {order.address?.delivery_notes ? <div className="dashboard-row-meta">Notes: {order.address.delivery_notes}</div> : null}
                  {order.order?.customer_email_snapshot ? <div className="dashboard-row-meta">Buyer contact: {order.order.customer_email_snapshot}</div> : null}
                </div>
                <div className="dashboard-row-actions">
                  {order.fulfillment_status === 'pending' ? (
                    <button type="button" className="os-button os-button-ghost os-button-compact" onClick={() => updateOrderStatus(order, 'in_progress')}>
                      Mark In Progress
                    </button>
                  ) : null}
                  {(order.fulfillment_status === 'pending' || order.fulfillment_status === 'in_progress') ? (
                    <button type="button" className="os-button os-button-secondary os-button-compact" onClick={() => updateOrderStatus(order, 'fulfilled')}>
                      Mark Fulfilled
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </PageShell>
  );
}
