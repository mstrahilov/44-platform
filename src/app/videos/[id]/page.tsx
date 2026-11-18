import { notFound } from 'next/navigation';
import { VideoDetailClient } from '@/components/VideoDetailClient';
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
  return <VideoDetailClient video={video} />;
}
