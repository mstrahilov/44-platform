'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageShell, HubHero, EmptyMessage } from '@/components/Ui';
import { useDashboardTabs } from '@/lib/dashboardTabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';
import { isMissingRelationError } from '@/lib/schemaCompat';

type MerchOrder = {
  id: string;
  buyer_id: string;
  creator_id: string;
  buyer_name: string;
  buyer_email: string;
  delivery_name: string;
  delivery_address_1: string;
  delivery_address_2: string | null;
  delivery_city: string;
  delivery_region: string;
  delivery_postal_code: string;
  delivery_country: string;
  delivery_notes: string | null;
  subtotal_cents: number;
  currency: string;
  status: 'paid' | 'in_progress' | 'completed' | 'received';
  created_at: string;
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export default function DashboardOrdersPage() {
  useDashboardTabs('merch');
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [orders, setOrders] = useState<MerchOrder[]>([]);
  const [fetching, setFetching] = useState(true);
  const [status, setStatus] = useState('');
  const [statusKind, setStatusKind] = useState<'success' | 'error'>('success');

  useEffect(() => {
    async function loadOrders() {
      if (!user) return;
      const profileResult = await loadStudioProfile(user.id);
      setProfile(profileResult.profile);
      const profileId = profileResult.profile?.id ?? user.id;

      const result = await supabase
        .from('merch_orders')
        .select('*')
        .eq('creator_id', profileId)
        .order('created_at', { ascending: false });

      if (result.error) {
        setStatusKind('error');
        setStatus(
          isMissingRelationError(result.error)
            ? 'Merch orders need the reviewed merch SQL applied in Supabase first.'
            : result.error.message,
        );
        setFetching(false);
        return;
      }

      setOrders((result.data as MerchOrder[] | null) ?? []);
      setFetching(false);
    }

    void loadOrders();
  }, [user]);

  async function updateOrderStatus(order: MerchOrder, nextStatus: MerchOrder['status']) {
    const patch: Partial<MerchOrder> & { completed_at?: string; received_at?: string } = { status: nextStatus };
    if (nextStatus === 'completed') patch.completed_at = new Date().toISOString();
    if (nextStatus === 'received') patch.received_at = new Date().toISOString();

    const { error } = await supabase.from('merch_orders').update(patch).eq('id', order.id);
    if (error) {
      setStatusKind('error');
      setStatus(error.message);
      return;
    }

    setOrders(current => current.map(item => item.id === order.id ? { ...item, status: nextStatus } : item));
    setStatusKind('success');
    setStatus('Order updated.');
  }

  if (loading) {
    return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;
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
          <HubHero title="Orders" copy="Creator merch orders live in Dashboard." />
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
          <div className={statusKind === 'success' ? 'dashboard-status dashboard-status-success' : 'dashboard-status dashboard-status-error'} style={{ marginBottom: 'var(--os-space-5)' }}>
            {status}
          </div>
        ) : null}

        <div className="dashboard-list-surface">
          {fetching ? (
            <div className="dashboard-empty">Loading orders…</div>
          ) : orders.length === 0 ? (
            <div className="dashboard-empty">
              No merch orders yet.
              <div style={{ marginTop: 'var(--os-space-4)' }}>
                <Link className="os-button os-button-primary os-button-compact" href="/dashboard/products?section=merch">Open Merch</Link>
              </div>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="dashboard-list-row" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
                <div className="dashboard-row-copy">
                  <div className="dashboard-row-title">{order.buyer_name}</div>
                  <div className="dashboard-row-subtitle">
                    {formatMoney(order.subtotal_cents, order.currency)} · {order.status}
                  </div>
                  <div className="dashboard-row-meta" style={{ marginTop: 8 }}>
                    {order.delivery_name} · {order.delivery_address_1}
                    {order.delivery_address_2 ? `, ${order.delivery_address_2}` : ''}
                    {`, ${order.delivery_city}, ${order.delivery_region} ${order.delivery_postal_code}, ${order.delivery_country}`}
                  </div>
                  {order.delivery_notes ? (
                    <div className="dashboard-row-meta">Notes: {order.delivery_notes}</div>
                  ) : null}
                  <div className="dashboard-row-meta">Buyer contact: {order.buyer_email}</div>
                </div>
                <div className="dashboard-row-actions">
                  {order.status === 'paid' ? (
                    <button type="button" className="os-button os-button-ghost os-button-compact" onClick={() => updateOrderStatus(order, 'in_progress')}>
                      Mark In Progress
                    </button>
                  ) : null}
                  {(order.status === 'paid' || order.status === 'in_progress') ? (
                    <button type="button" className="os-button os-button-secondary os-button-compact" onClick={() => updateOrderStatus(order, 'completed')}>
                      Mark Completed
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
