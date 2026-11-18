import { notFound } from 'next/navigation';
import { cache } from 'react';
import { VideoDetailClient } from '@/components/VideoDetailClient';
import { getCreatorVideo } from '@/lib/domain/releaseFeatures';
import { buildPageMetadata, conciseDescription } from '@/lib/metadata';
import { supabase } from '@/lib/supabase';

const loadVideo = cache((id: string) => getCreatorVideo(id).catch(() => null));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await loadVideo(id);
  if (!video) return buildPageMetadata({ title: 'Video', path: `/videos/${id}` });
  const { data: profile } = await supabase.from('profiles')
    .select('display_name,username')
    .eq('id', video.creator_id)
    .maybeSingle();
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
  const video = await loadVideo(id);
  if (!video) notFound();
  return <VideoDetailClient video={video} />;
}
