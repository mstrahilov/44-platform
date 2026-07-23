'use client';

import Link from 'next/link';
import { HubHero, PageShell } from '@/components/Ui';
import { TeamAccessBoundary } from '@/components/team/TeamPrimitives';

const teamSections = [
  { href: '/team/brand', eyebrow: 'Team reference', title: 'Handbook', copy: 'How forty four and 44OS work, including identity, support, Team guidance, and the developer system.' },
  { href: '/team/creators', eyebrow: 'Directory', title: 'Creators', copy: 'Published public Creator information in one read-only workspace.' },
  { href: '/team/releases', eyebrow: 'Catalog', title: 'Releases', copy: 'Published release artwork and facts for routine editorial and social planning.' },
];

export default function TeamHubApp() {
  return <TeamAccessBoundary>{access => {
    const sections = access.source === 'admin'
      ? [...teamSections, {
          href: '/admin',
          eyebrow: 'Administration',
          title: 'Admin',
          copy: 'Platform operations, people, content review, support, and system health.',
        }]
      : teamSections;

    return <PageShell><main className="team-page">
      <HubHero title="Team" copy="Private working material for people representing forty four and 44OS. Team access is an additional permission; your Member, Creator, or Admin role stays unchanged." />
      <div className={`team-hub-grid${access.source === 'admin' ? ' team-hub-grid-admin' : ''}`}>
        {sections.map(section => <Link key={section.href} href={section.href} className="team-hub-card ui44-panel">
          <span>{section.eyebrow}</span><h2>{section.title}</h2><p>{section.copy}</p><strong>Open <span aria-hidden="true">›</span></strong>
        </Link>)}
      </div>
    </main></PageShell>;
  }}</TeamAccessBoundary>;
}
