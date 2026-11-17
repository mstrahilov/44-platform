import VideosBrowseApp from '@/components/VideosBrowseApp';
import { buildPageMetadata } from '@/lib/metadata';

export function generateMetadata() {
  return buildPageMetadata({ title: 'Videos', description: 'Watch videos from 44OS creators.', path: '/videos' });
}

export default function VideosPage() {
  return <VideosBrowseApp />;
}
