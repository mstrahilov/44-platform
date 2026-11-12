import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageShell, SectionHeader } from '@/components/Ui';
import { getCreatorVideo } from '@/lib/domain/releaseFeatures';
import { getPublicProfile } from '@/lib/domain/profiles';
import { buildPageMetadata, conciseDescription } from '@/lib/metadata';
import type { Profile } from '@/lib/platform';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await getCreatorVideo(id).catch(() => null);
  if (!video) return buildPageMetadata({ title: 'Video', path: `/videos/${id}` });
  const profile = await getPublicProfile(video.creator_id).catch(() => null) as Profile | null;
  const creator = profile?.display_name || profile?.username || '44 Creator';
  return buildPageMetadata({
    title: video.title,
    description: conciseDescription(`${video.title} by ${creator}.`, 'Watch a creator video on 44OS.'),
    path: `/videos/${id}`,
    image: `https://i.ytimg.com/vi/${video.youtube_video_id}/hqdefault.jpg`,
    type: 'website',
  });
}

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await getCreatorVideo(id).catch(() => null);
  if (!video) notFound();
  const profile = await getPublicProfile(video.creator_id).catch(() => null) as Profile | null;
  const creator = profile?.display_name || profile?.username || '44 Creator';
  const creatorHref = profile?.username || profile?.slug ? `/profile/${profile.username || profile.slug}` : null;

  return (
    <PageShell>
      <main className="app-page video-detail-page">
        <article className="ui44-panel ui44-panel-glass video-detail-card">
          <div className="video-detail-player">
            <iframe
              title={video.title}
              src={`https://www.youtube-nocookie.com/embed/${video.youtube_video_id}?playsinline=1&rel=0`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <div className="video-detail-copy">
            <h1>{video.title}</h1>
            {creatorHref ? <Link href={creatorHref}>{creator}</Link> : <p>{creator}</p>}
          </div>
        </article>
        <section className="video-detail-community">
          <SectionHeader
            title="Community"
            action={<Link href={`/community?mention=${encodeURIComponent(video.title)}`}>New Post</Link>}
          />
          <div className="ui44-panel ui44-panel-glass video-detail-empty">
            <p>Be the first to say something about this video.</p>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
