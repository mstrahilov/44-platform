import Link from 'next/link';
import { PageShell } from '@/components/Ui';

const quickApps = [
  { label: 'Music', meta: 'Library and store', href: '/music' },
  { label: 'Community', meta: 'Posts, friends, replies', href: '/community' },
  { label: 'Projects', meta: 'Briefs and active work', href: '/projects/demo' },
  { label: 'Resources', meta: 'Guides and templates', href: '/resources' },
];

const activity = [
  { title: 'DELTA', meta: 'Continue listening', detail: 'EP · 4 tracks' },
  { title: 'Deluxe Edition', meta: 'Creator update', detail: 'New note from @olsten44' },
  { title: 'Known issue', meta: 'Community', detail: '3 replies today' },
];

const systemStats = [
  ['Music', '15 releases'],
  ['Projects', '1 active'],
  ['Messages', '2 unread'],
];

export default function Studio44OSHomeConceptPage() {
  return (
    <PageShell>
      <main className="os-home-concept" aria-label="44OS Home concept">
        <section className="os-home-hero" aria-label="Home">
          <div className="os-home-ambient" aria-hidden="true" />

          <div className="os-home-hero-copy">
            <div className="os-type-eyebrow">44OS Home Concept</div>
            <h1>Welcome back, Austin.</h1>
            <p>
              A calm starting surface for music, projects, community, and the work waiting inside 44OS.
            </p>
          </div>

          <div className="os-home-now">
            <div className="os-home-now-art" aria-hidden="true">
              <span>44</span>
            </div>
            <div>
              <div className="os-type-eyebrow">Now Ready</div>
              <h2>here comes the feeling</h2>
              <p>OLSTEN · Release workspace</p>
            </div>
          </div>
        </section>

        <section className="os-home-grid">
          <div className="os-home-panel os-home-panel-large">
            <div className="os-home-panel-head">
              <div>
                <div className="os-type-eyebrow">Pinned Apps</div>
                <h2>Open a space</h2>
              </div>
              <Link href="/settings" className="os-button os-button-secondary os-button-compact">
                Customize
              </Link>
            </div>

            <div className="os-home-app-grid">
              {quickApps.map(app => (
                <Link key={app.label} href={app.href} className="os-home-app-tile">
                  <span className="os-home-app-mark" aria-hidden="true">{app.label.slice(0, 1)}</span>
                  <span>
                    <strong>{app.label}</strong>
                    <small>{app.meta}</small>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="os-home-panel">
            <div className="os-type-eyebrow">System</div>
            <h2>Today</h2>
            <div className="os-home-stat-list">
              {systemStats.map(([label, value]) => (
                <div key={label} className="os-home-stat">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="os-home-panel">
            <div className="os-home-panel-head">
              <div>
                <div className="os-type-eyebrow">Continue</div>
                <h2>Recent activity</h2>
              </div>
            </div>
            <div className="os-home-activity-list">
              {activity.map(item => (
                <div key={item.title} className="os-home-activity">
                  <span className="os-home-activity-dot" aria-hidden="true" />
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.meta}</small>
                  </span>
                  <em>{item.detail}</em>
                </div>
              ))}
            </div>
          </div>

          <div className="os-home-panel os-home-project">
            <div>
              <div className="os-type-eyebrow">Project Workspace</div>
              <h2>Website rebuild brief</h2>
              <p>Files, messages, timeline, and approvals will live together when a client enters 44OS for work.</p>
            </div>
            <div className="os-home-progress" aria-label="Project progress">
              <span style={{ width: '58%' }} />
            </div>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
