'use client';

import { useParams } from 'next/navigation';
import { PlaylistDetailApp } from '@/components/PlaylistApp';

export default function PlaylistPage() {
  const params = useParams<{ id: string }>();
  return <PlaylistDetailApp playlistId={params.id} />;
}
