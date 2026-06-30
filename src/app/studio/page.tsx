'use client';

import { SystemPanel } from '@/components/SystemPanel';
import { useAuth } from '@/lib/useAuth';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'products', label: 'Products' },
  { id: 'services', label: 'Services' },
  { id: 'resources', label: 'Resources' },
  { id: 'orders', label: 'Orders' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'payouts', label: 'Payouts' },
];

export default function StudioPage() {
  const { user } = useAuth();
  const initials = user?.email?.charAt(0).toUpperCase() ?? '?';

  return (
    <div className="panel-scroll">
      <SystemPanel tabs={TABS} avatar={initials}>
        {tab => (
          <>
            {tab === 'overview' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Studio Overview</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>
                  Your creator dashboard. Manage everything from one place.
                </p>
              </div>
            )}
            {tab === 'products' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Products</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>Manage your music, books, games, merch, and digital assets.</p>
              </div>
            )}
            {tab === 'services' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Services</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>Manage your offered services.</p>
              </div>
            )}
            {tab === 'resources' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Resources</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>Manage your published guides and tutorials.</p>
              </div>
            )}
            {tab === 'orders' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Orders</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>View orders from customers.</p>
              </div>
            )}
            {tab === 'analytics' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Analytics</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>Views, sales, and engagement data.</p>
              </div>
            )}
            {tab === 'payouts' && (
              <div>
                <h2 className="os-type-panel-title" style={{ marginBottom: 8 }}>Payouts</h2>
                <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>Earnings and payout history.</p>
              </div>
            )}
          </>
        )}
      </SystemPanel>
    </div>
  );
}
