'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, CenteredMessage, GlassPanel } from '@/components/Ui';
import { useAuth } from '@/lib/useAuth';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';

const swatches = [
  ['Canvas', 'var(--os-color-canvas)'],
  ['Ink', 'var(--os-color-ink)'],
  ['Secondary', 'var(--os-color-ink-secondary)'],
  ['Muted', 'var(--os-color-ink-muted)'],
  ['Accent', 'var(--os-color-accent)'],
  ['Danger', 'var(--os-color-danger)'],
];

const typeSamples = [
  ['Display', 'os-type-display', 'Home'],
  ['Page Title', 'os-type-page-title', 'Studio'],
  ['Panel Title', 'os-type-panel-title', 'Community Profile'],
  ['Section Title', 'os-type-section-title', 'Recent Content'],
  ['Field Title', 'os-type-field-title', 'Theme'],
  ['Card Title', 'os-type-card-title', 'EVERYTHING BEFORE'],
  ['Body', 'os-type-body', 'Use body text for page descriptions and primary explanatory copy.'],
  ['Body Small', 'os-type-body-small', 'Use small body text for helper copy, empty states, and compact descriptions.'],
  ['Meta', 'os-type-meta', '12h · General'],
  ['Eyebrow', 'os-type-eyebrow', 'FOUNDATION'],
];

export default function Studio44OSPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;
    loadStudioProfile(user.id).then(result => {
      setProfile(result.profile);
      setProfileLoading(false);
    });
  }, [user]);

  if (loading || profileLoading) {
    return <PageShell><CenteredMessage>Loading 44OS...</CenteredMessage></PageShell>;
  }

  if (!user || !profile) {
    return <PageShell><CenteredMessage>Loading 44OS...</CenteredMessage></PageShell>;
  }

  if (!isCreatorProfile(profile)) {
    return (
      <PageShell>
        <div className="dashboard-page">
          <GlassPanel style={{ padding: 40 }}>
            <h1 className="os-type-panel-title" style={{ marginBottom: 8 }}>Creator Access Required</h1>
            <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)', marginBottom: 18 }}>
              44OS reference pages are internal development tools.
            </p>
            <Link href="/store" className="os-button os-button-secondary">Back to Store</Link>
          </GlassPanel>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="dashboard-page">
        <header className="dashboard-header">
          <div className="dashboard-header-copy">
            <div className="os-type-eyebrow" style={{ color: 'var(--os-color-ink-muted)', marginBottom: 8 }}>44OS Reference</div>
            <h1 className="os-type-display">44OS UI</h1>
          </div>
          <Link href="/studio" className="os-button os-button-secondary os-button-compact">Studio</Link>
        </header>

        <section className="dashboard-section">
          <div className="dashboard-header-copy">
            <h2 className="os-type-panel-title">Typography</h2>
            <p className="os-type-body-small">Use these styles as the hierarchy. Avoid custom font sizes unless a shared token is missing.</p>
          </div>
          <div className="dashboard-list-surface">
            {typeSamples.map(([label, className, sample], index) => (
              <div
                key={label}
                className="dashboard-list-row"
                style={{ gridTemplateColumns: '180px minmax(0, 1fr)', borderTop: index === 0 ? 'none' : undefined }}
              >
                <div className="dashboard-row-meta">{label}</div>
                <div className={className}>{sample}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-header-copy">
            <h2 className="os-type-panel-title">Color And Materials</h2>
            <p className="os-type-body-small">Use tokens and system surfaces so light/dark themes stay coherent.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
            {swatches.map(([label, color]) => (
              <div key={label} className="os-paper-card" style={{ padding: 16 }}>
                <div style={{ height: 70, borderRadius: 14, background: color, border: '1px solid var(--os-color-hairline)', marginBottom: 12 }} />
                <div className="os-type-card-title">{label}</div>
                <div className="os-type-meta" style={{ color: 'var(--os-color-ink-muted)' }}>{color}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginTop: 14 }}>
            <div className="os-glass-panel" style={{ padding: 22 }}>
              <div className="os-type-card-title">Glass Panel</div>
              <p className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>Use for large system layers and translucent panels.</p>
            </div>
            <div className="os-paper-card" style={{ padding: 22 }}>
              <div className="os-type-card-title">Paper Card</div>
              <p className="os-type-body-small" style={{ color: 'var(--os-color-ink-secondary)' }}>Use for readable content, repeated cards, and management surfaces.</p>
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-header-copy">
            <h2 className="os-type-panel-title">Controls</h2>
            <p className="os-type-body-small">Buttons, fields, tabs, and popovers should reuse these shared patterns.</p>
          </div>
          <div className="dashboard-list-surface" style={{ padding: 24, display: 'grid', gap: 24 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="os-button os-button-primary" type="button">Primary</button>
              <button className="os-button os-button-secondary" type="button">Secondary</button>
              <button className="os-button os-button-ghost" type="button">Ghost</button>
              <button className="os-button os-button-danger" type="button">Delete</button>
              <button className="os-button os-button-secondary os-button-compact" type="button">Compact</button>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <label>
                <div className="os-type-card-title" style={{ marginBottom: 8 }}>Field</div>
                <input className="os-input-field os-input-large" placeholder="Use shared input fields" />
              </label>
              <label>
                <div className="os-type-card-title" style={{ marginBottom: 8 }}>Textarea</div>
                <textarea className="os-input-textarea" placeholder="Use shared textarea styling" />
              </label>
            </div>

            <div className="settings-segment" role="group" aria-label="Example tabs" style={{ width: 'fit-content' }}>
              <button className="settings-segment-item settings-segment-item-active" type="button">General</button>
              <button className="settings-segment-item" type="button">Questions</button>
              <button className="settings-segment-item" type="button">Collaboration</button>
            </div>

            <div style={{ position: 'relative', minHeight: 156 }}>
              <div className="os-popover" style={{ position: 'static', opacity: 1, transform: 'none', pointerEvents: 'auto' }}>
                <div className="os-popover-header">
                  <div className="os-popover-heading">44OS Dropdown</div>
                </div>
                <button className="os-popover-item" type="button">Profile</button>
                <button className="os-popover-item" type="button">Friends</button>
                <button className="os-popover-item" type="button">Messages</button>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-header-copy">
            <h2 className="os-type-panel-title">Cards And Lists</h2>
            <p className="os-type-body-small">Artwork cards navigate. Management rows use dashboard list surfaces.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 320px) minmax(0, 1fr)', gap: 18 }}>
            <div className="product-tile">
              <div className="product-tile-art product-tile-art-square" style={{ background: 'linear-gradient(135deg, #d8b04c, #141414)' }} />
              <div className="product-tile-info">
                <div className="product-tile-title">here comes the feeling</div>
                <div className="product-tile-subtitle">OLSTEN</div>
              </div>
            </div>

            <div className="dashboard-list-surface">
              {['DELTA', 'GHOST', 'Beat Production'].map((title, index) => (
                <div
                  key={title}
                  className="dashboard-list-row"
                  style={{ gridTemplateColumns: 'minmax(0, 1fr) 140px minmax(220px, auto)', borderTop: index === 0 ? 'none' : undefined }}
                >
                  <div className="dashboard-row-copy">
                    <div className="dashboard-row-title">{title}</div>
                    <div className="dashboard-row-subtitle">{index === 2 ? 'Asset' : 'Album'}</div>
                  </div>
                  <div className="dashboard-row-meta">{index === 2 ? 'Assets' : 'Music'}</div>
                  <div className="dashboard-row-actions">
                    <div className="dashboard-status-pill">Published</div>
                    <button className="os-button os-button-ghost os-button-compact" type="button">Open</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-header-copy">
            <h2 className="os-type-panel-title">Community And Empty States</h2>
            <p className="os-type-body-small">Social rows stay readable and quiet. Empty states are direct.</p>
          </div>
          <div className="dashboard-list-surface" style={{ padding: 24, display: 'grid', gap: 18 }}>
            <article className="social-row">
              <span className="social-avatar" aria-hidden="true">44</span>
              <div className="social-row-main">
                <div className="social-row-meta">
                  <span className="social-author-name">@44corp</span>
                  <span className="social-dot" />
                  <span className="social-time">General</span>
                </div>
                <h2 className="social-row-title">Known issue</h2>
                <p className="social-row-body">Some empty states are currently too empty. We are adding better messages.</p>
                <div className="social-actions">
                  <span className="social-action">4</span>
                  <span className="social-action">Like</span>
                </div>
              </div>
            </article>
            <div className="app-empty-text">No posts yet.</div>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
