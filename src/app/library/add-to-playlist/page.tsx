'use client';

import { Suspense } from 'react';
import { PlaylistPickerPage } from '@/components/PlaylistPicker';

export default function AddToPlaylistPage() {
  return <Suspense fallback={<main className="dashboard-page ui44-loading-shell" role="status" aria-label="Loading playlist picker" />}>
    <PlaylistPickerPage />
  </Suspense>;
}
