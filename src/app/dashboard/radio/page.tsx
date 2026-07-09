'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageShell, GlassPanel, HubHero, EmptyMessage } from '@/components/Ui';
import { useDashboardTabs } from '@/lib/dashboardTabs';
import { loadRadioBundle, type RadioPlayableTrack } from '@/lib/radio';
import { useAuth } from '@/lib/useAuth';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';

export default function DashboardRadioPage() {
  useDashboardTabs('radio');
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [tracks, setTracks] = useState<RadioPlayableTrack[]>([]);
  const [fetching, setFetching] = useState(true);
  const [status, setStatus] = useState('');
  const [requiresSetup, setRequiresSetup] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const profileResult = await loadStudioProfile(user.id);
      setProfile(profileResult.profile);

      const bundle = await loadRadioBundle();
      setTracks(bundle.tracks);
      setStatus(bundle.status);
      setRequiresSetup(bundle.requiresSetup);
      setFetching(false);
    }

    void load();
  }, [user]);

  if (loading) {
    return <PageShell><div style={{ minHeight: '40vh' }} /></PageShell>;
  }

  if (!user) {
    return (
      <PageShell>
        <div className="dashboard-page">
          <HubHero title="Radio" copy="A single always-on playlist built from uploaded music." />
          <EmptyMessage>Log in to view the Radio playlist.</EmptyMessage>
        </div>
      </PageShell>
    );
  }

  if (profile && !isCreatorProfile(profile)) {
    return (
      <PageShell>
        <div className="dashboard-page">
          <GlassPanel style={{ padding: 28 }}>
            <h1 className="os-type-panel-title" style={{ marginBottom: 8 }}>Creator Access Required</h1>
            <p className="os-type-body" style={{ color: 'var(--os-color-ink-secondary)' }}>
              Radio lives in Dashboard for creator and admin accounts.
            </p>
          </GlassPanel>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="dashboard-page">
        <HubHero
          title="Radio"
          copy="44 Radio is one looping playlist built from existing uploaded music."
          actions={<Link href="/radio" className="os-button os-button-ghost">Open Radio</Link>}
        />

        {status ? (
          <div className={requiresSetup ? 'dashboard-status dashboard-status-error' : 'dashboard-status dashboard-status-success'} style={{ marginBottom: 'var(--os-space-5)' }}>
            {status}
          </div>
        ) : null}

        {fetching ? (
          <EmptyMessage>Loading Radio playlist…</EmptyMessage>
        ) : tracks.length ? (
          <div className="dashboard-list-surface">
            {tracks.map((track, index) => (
              <div key={track.playlistEntryId} className="dashboard-list-row" style={{ gridTemplateColumns: '56px minmax(0, 1fr) auto' }}>
                <div className="radio-playlist-index">{index + 1}</div>
                <div className="dashboard-row-copy">
                  <div className="dashboard-row-title">{track.title}</div>
                  <div className="dashboard-row-subtitle">{track.artistName} · {track.releaseTitle}</div>
                </div>
                <div className="dashboard-row-meta">{formatDuration(track.durationSeconds)}</div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyMessage>There are no Radio tracks yet.</EmptyMessage>
        )}
      </div>
    </PageShell>
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}
