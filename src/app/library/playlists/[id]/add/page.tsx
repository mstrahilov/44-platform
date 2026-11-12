'use client';

import { useParams } from 'next/navigation';
import { PlaylistAddTrackApp } from '@/components/PlaylistApp';

export default function AddPlaylistTrackPage() {
  const params = useParams<{ id: string }>();
  return <PlaylistAddTrackApp playlistId={params.id} />;
}
