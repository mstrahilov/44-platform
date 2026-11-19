'use client';

import { useEffect, useState } from 'react';
import { EmptyMessage, HubHero, PageShell, ProductGrid } from '@/components/Ui';
import { SectionTab, SectionTabs } from '@/components/SectionTabs';
import { SocialArtifactCard } from '@/components/Social';
import { listCreatorVideosForBrowse, type CreatorVideoBrowseRow } from '@/lib/domain/releaseFeatures';
import { OS44Button } from '@/components/OS44Button';
import { CreatorVideoTitle } from '@/components/CreatorVideoTitle';
import { FilterPopover } from '@/components/FilterPopover';
import { Ui44SelectInput } from '@/components/ui44/Inputs';

type VideoSort = 'release-date' | 'recently-added';

const BASE_DISCOVER_TABS = [
  { id: 'featured', label: 'Featured', href: '/' },
  { id: 'music', label: 'Music', href: '/store/music' },
  { id: 'videos', label: 'Videos', href: '/videos' },
  { id: 'books', label: 'Books', href: '/store/books' },
  { id: 'assets', label: 'Assets', href: '/store/sample-packs' },
  { id: 'games', label: 'Games', href: '/store/games' },
] as const;

export default function VideosBrowseApp() {
  const [videos, setVideos] = useState<CreatorVideoBrowseRow[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [sortBy, setSortBy] = useState<VideoSort>('release-date');
  const [creatorFilter, setCreatorFilter] = useState('all');

  useEffect(() => {
    let alive = true;
    void listCreatorVideosForBrowse().then(rows => {
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

  const creatorOptions = Array.from(new Map((videos ?? []).map(video => [
    video.creator_id,
    {
      id: video.creator_id,
      label: video.creator_profile?.display_name
        || video.creator_profile?.username
        || `Creator ${video.creator_id.slice(0, 6)}`,
    },
  ] as const)).values()).sort((left, right) => left.label.localeCompare(right.label));
  const visibleVideos = (videos ?? [])
    .filter(video => creatorFilter === 'all' || video.creator_id === creatorFilter)
    .slice()
    .sort((left, right) => sortBy === 'recently-added'
      ? compareVideoDates(right.created_at, left.created_at)
      : compareVideoDates(right.youtube_published_at, left.youtube_published_at)
        || compareVideoDates(right.created_at, left.created_at));
  const filterActive = sortBy !== 'release-date' || creatorFilter !== 'all';

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
          <div className="store-browse-header">
            <HubHero title="Discover" actions={
              <div className="page-header-tools">
                <FilterPopover label="Filter Videos" active={filterActive}>
                  {() => <>
                    <label className="store-filter-group">
                      <span className="store-filter-label">Sort by</span>
                      <Ui44SelectInput value={sortBy} onChange={event => setSortBy(event.target.value as VideoSort)}>
                        <option value="release-date">Release date</option>
                        <option value="recently-added">Recently added</option>
                      </Ui44SelectInput>
                    </label>
                    <label className="store-filter-group">
                      <span className="store-filter-label">Creator</span>
                      <Ui44SelectInput value={creatorFilter} onChange={event => setCreatorFilter(event.target.value)}>
                        <option value="all">Any creator</option>
                        {creatorOptions.map(creator => <option key={creator.id} value={creator.id}>{creator.label}</option>)}
                      </Ui44SelectInput>
                    </label>
                  </>}
                </FilterPopover>
              </div>
            } />
          </div>
          {videos !== null && !error ? (
            <SectionTabs ariaLabel="Discover categories" dockToTopbar toolbarSpacing topbarTabs={topbarTabs}>
              {discoverTabs.map(item => <SectionTab key={item.id} href={item.href} active={item.id === 'videos'}>{item.label}</SectionTab>)}
            </SectionTabs>
          ) : null}
        </div>
        {error ? <EmptyMessage>
          <span>{error}</span>{' '}
          <OS44Button type="button" className="os-button os-button-secondary" onClick={() => { setLoading(true); setAttempt(value => value + 1); }}>Try Again</OS44Button>
        </EmptyMessage> : loading || videos === null ? <EmptyMessage status>Loading videos...</EmptyMessage> : visibleVideos.length === 0 ? <EmptyMessage>{creatorFilter === 'all' ? 'No videos are published yet.' : 'No videos match this creator.'}</EmptyMessage> : (
          <ProductGrid className="video-browse-grid">
            {visibleVideos.map(video => <SocialArtifactCard
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

function compareVideoDates(left: string | null | undefined, right: string | null | undefined) {
  const leftTime = left ? Date.parse(left) : Number.NEGATIVE_INFINITY;
  const rightTime = right ? Date.parse(right) : Number.NEGATIVE_INFINITY;
  const safeLeftTime = Number.isFinite(leftTime) ? leftTime : Number.NEGATIVE_INFINITY;
  const safeRightTime = Number.isFinite(rightTime) ? rightTime : Number.NEGATIVE_INFINITY;
  return safeLeftTime === safeRightTime ? 0 : safeLeftTime > safeRightTime ? 1 : -1;
}
