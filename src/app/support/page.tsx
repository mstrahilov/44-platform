import Link from 'next/link';
import { PageShell, HubHero, HubSection } from '@/components/Ui';

export default function SupportPage() {
  return (
    <PageShell>
      <main className="app-page">
        <HubHero title="Support" copy="Help with your account, library, and orders on 44." />

        <HubSection title="Get Help">
          <div className="dashboard-list-surface">
            <div className="dashboard-list-row" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
              <div className="dashboard-row-copy">
                <div className="dashboard-row-title">Ask the Community</div>
                <div className="dashboard-row-subtitle">Post a question in Community and the 44 team or other members will respond.</div>
              </div>
              <div className="dashboard-row-actions">
                <Link className="os-button os-button-secondary os-button-compact" href="/community/new">New Post</Link>
              </div>
            </div>
            <div className="dashboard-list-row" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
              <div className="dashboard-row-copy">
                <div className="dashboard-row-title">Account &amp; Settings</div>
                <div className="dashboard-row-subtitle">Email, password reset, privacy, and notification controls live in Settings.</div>
              </div>
              <div className="dashboard-row-actions">
                <Link className="os-button os-button-secondary os-button-compact" href="/settings?tab=account">Open Settings</Link>
              </div>
            </div>
            <div className="dashboard-list-row" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
              <div className="dashboard-row-copy">
                <div className="dashboard-row-title">Your Library</div>
                <div className="dashboard-row-subtitle">Everything you have added or purchased. Purchased music unlocks downloads there.</div>
              </div>
              <div className="dashboard-row-actions">
                <Link className="os-button os-button-secondary os-button-compact" href="/library">Open Library</Link>
              </div>
            </div>
          </div>
        </HubSection>
      </main>
    </PageShell>
  );
}
