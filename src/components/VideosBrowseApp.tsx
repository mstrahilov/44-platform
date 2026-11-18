'use client';

import { useEffect, useState } from 'react';
import { EmptyMessage, HubHero, PageShell, ProductGrid } from '@/components/Ui';
import { SectionTab, SectionTabs } from '@/components/SectionTabs';
import { SocialArtifactCard } from '@/components/Social';
import { listCreatorVideos, type CreatorVideoPage } from '@/lib/domain/releaseFeatures';
import { OS44Button } from '@/components/OS44Button';
import { CreatorVideoTitle } from '@/components/CreatorVideoTitle';

const BASE_DISCOVER_TABS = [
  { id: 'featured', label: 'Home', href: '/' },
  { id: 'music', label: 'Music', href: '/store/music' },
  { id: 'videos', label: 'Videos', href: '/videos' },
  { id: 'books', label: 'Books', href: '/store/books' },
  { id: 'assets', label: 'Assets', href: '/store/sample-packs' },
  { id: 'games', label: 'Games', href: '/store/games' },
] as const;

export default function VideosBrowseApp() {
  const [videos, setVideos] = useState<CreatorVideoPage[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    void listCreatorVideos().then(rows => {
      if (alive) {
        setVideos(rows);
        setError('');
        setLoading(false);
      }
    }).catch(() => {
      if (alive) { setError('Could not load videos. Check your connection and try again.'); setLoading(false); }
    });
    return () => { alive = false; };
  }, [attempt]);

  const discoverTabs = BASE_DISCOVER_TABS;
  const topbarTabs = discoverTabs.map(item => ({
    id: item.id,
    label: item.label,
    href: item.href,
    active: item.id === 'videos',
    variant: 'section' as const,
  }));

  return (
    <PageShell>
      <main className="app-page store-app-page">
        <div className="store-discover-opening section-tab-page-opening">
          <HubHero title="Discover" />
          {videos !== null && !error ? (
            <SectionTabs ariaLabel="Discover categories" dockToTopbar toolbarSpacing topbarTabs={topbarTabs}>
              {discoverTabs.map(item => <SectionTab key={item.id} href={item.href} active={item.id === 'videos'}>{item.label}</SectionTab>)}
            </SectionTabs>
          ) : null}
        </div>
        {error ? <EmptyMessage>
          <span>{error}</span>{' '}
          <OS44Button type="button" className="os-button os-button-secondary" onClick={() => { setLoading(true); setAttempt(value => value + 1); }}>Try Again</OS44Button>
        </EmptyMessage> : loading || videos === null ? <EmptyMessage status>Loading videos...</EmptyMessage> : videos.length === 0 ? <EmptyMessage>No videos are published yet.</EmptyMessage> : (
          <ProductGrid className="video-browse-grid">
            {videos.map(video => <SocialArtifactCard
              key={video.id}
              href={`/videos/${video.id}`}
              title={<CreatorVideoTitle videoId={video.youtube_video_id} storedTitle={video.title} />}
              image={`https://i.ytimg.com/vi/${video.youtube_video_id}/hqdefault.jpg`}
              shape="landscape"
              singleLineTitle
            />)}
          </ProductGrid>
        )}
      </main>
    </PageShell>
  );
}
