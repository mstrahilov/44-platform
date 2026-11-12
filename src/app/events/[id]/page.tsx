import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageShell, SectionHeader } from '@/components/Ui';
import { getCreatorEvent } from '@/lib/domain/events';
import { getPublicProfile } from '@/lib/domain/profiles';
import { buildPageMetadata, conciseDescription } from '@/lib/metadata';
import type { Profile } from '@/lib/platform';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getCreatorEvent(id).catch(() => null);
  if (!event) return buildPageMetadata({ title: 'Event', path: `/events/${id}` });
  return buildPageMetadata({
    title: event.title,
    description: conciseDescription(event.short_description, 'Creator event on 44OS.'),
    path: `/events/${id}`,
  });
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getCreatorEvent(id).catch(() => null);
  if (!event || event.lifecycle_state === 'removed' || event.moderation_state !== 'visible') notFound();
  const profile = await getPublicProfile(event.creator_id).catch(() => null) as Profile | null;
  const creator = profile?.display_name || profile?.username || '44 Creator';
  const creatorHref = profile?.username || profile?.slug ? `/profile/${profile.username || profile.slug}` : null;
  const date = new Date(event.starts_at).toLocaleString(undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  return (
    <PageShell>
      <main className="app-page event-detail-page">
        <article className="ui44-panel ui44-panel-glass event-detail-card">
          <div className="event-detail-copy">
            <span className="ui44-eyebrow">{event.format.replace('_', ' ')}</span>
            <h1>{event.title}</h1>
            {creatorHref ? <Link href={creatorHref}>{creator}</Link> : <p>{creator}</p>}
            <time dateTime={event.starts_at}>{date}</time>
            <p>{event.short_description}</p>
            {event.venue_name ? <p>{[event.venue_name, event.locality, event.region].filter(Boolean).join(' · ')}</p> : null}
            {event.online_url ? <a href={event.online_url} target="_blank" rel="noopener noreferrer">Join online</a> : null}
          </div>
        </article>
        <section className="event-detail-community">
          <SectionHeader
            title="Community"
            action={<Link href={`/community?mention=${encodeURIComponent(event.title)}`}>New Post</Link>}
          />
          <div className="ui44-panel ui44-panel-glass event-detail-empty">
            <p>Be the first to say something about this event.</p>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
