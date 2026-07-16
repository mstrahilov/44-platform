'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageShell, HubHero, EmptyMessage } from '@/components/Ui';
import { Ui44Panel } from '@/components/ui44/Spacing';
import { loadRadioBundle, type RadioPlayableTrack } from '@/lib/radio';
import { useAuth } from '@/lib/useAuth';
import { isCreatorProfile, loadStudioProfile, type StudioProfile } from '@/lib/studioProfiles';

export default function StudioRadioPage() {
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
    return <PageShell><div className="ui44-loading-shell" role="status" aria-label="Loading" /></PageShell>;
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
          <Ui44Panel overflow="visible" className="ui44-creator-gate ui44-creator-gate-compact">
            <h1 className="os-type-panel-title ui44-creator-gate-title">Creator Access Required</h1>
            <p className="os-type-body ui44-text-secondary">
              Radio lives in Studio for creator and admin accounts.
            </p>
          </Ui44Panel>
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
          <div
            className={`${requiresSetup ? 'dashboard-status dashboard-status-error ui44-status ui44-status-error' : 'dashboard-status dashboard-status-success ui44-status ui44-status-success'} ui44-status-block`}
            role={requiresSetup ? 'alert' : 'status'}
          >
            {status}
          </div>
        ) : null}

        {fetching ? (
          <EmptyMessage status>Loading Radio playlist…</EmptyMessage>
        ) : tracks.length ? (
          <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
            {tracks.map((track, index) => (
              <div key={track.playlistEntryId} className="dashboard-list-row ui44-list-row ui44-list-row-dashboard ui44-list-row-radio">
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
