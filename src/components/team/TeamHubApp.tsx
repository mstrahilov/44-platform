'use client';

import Link from 'next/link';
import { HubHero, PageShell } from '@/components/Ui';
import { TeamAccessBoundary, TeamSectionNav } from '@/components/team/TeamPrimitives';

const sections = [
  { href: '/team/brand', eyebrow: 'Identity', title: 'Brand Guide', copy: 'Current names, voice, logo rules, colors, typography, social standards, and approval boundaries.' },
  { href: '/team/creators', eyebrow: 'Directory', title: 'Creators', copy: 'Published public Creator information in one read-only workspace.' },
  { href: '/team/releases', eyebrow: 'Catalog', title: 'Releases', copy: 'Published release artwork and facts for routine editorial and social planning.' },
];

export default function TeamHubApp() {
  return <TeamAccessBoundary><PageShell><main className="team-page">
    <TeamSectionNav />
    <HubHero title="Team" copy="Private working material for people representing 44 and 44OS." />
    <p className="team-private-note">Team access is an additional permission. Your Member, Creator, or Admin role stays unchanged.</p>
    <div className="team-hub-grid">
      {sections.map(section => <Link key={section.href} href={section.href} className="team-hub-card ui44-panel">
        <span>{section.eyebrow}</span><h2>{section.title}</h2><p>{section.copy}</p><strong>Open <span aria-hidden="true">›</span></strong>
      </Link>)}
    </div>
  </main></PageShell></TeamAccessBoundary>;
}
