'use client';

import { useEffect, useRef, useState } from 'react';
import { EmptyMessage, HubHero, PageShell, ProductGrid } from '@/components/Ui';
import { SectionTab, SectionTabs } from '@/components/SectionTabs';
import {
  creatorVideoMetadataUpdatedEvent,
  listCreatorVideosForBrowse,
  type CreatorVideoBrowseRow,
} from '@/lib/domain/releaseFeatures';
import { OS44Button } from '@/components/OS44Button';
import { YouTubeInlinePlayer } from '@/components/YouTubeInlinePlayer';
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
  const sortWasExplicitlySelected = useRef(false);
  const [creatorFilter, setCreatorFilter] = useState('all');
  const [renderCount, setRenderCount] = useState(5);
  const [supportsAutoLoad, setSupportsAutoLoad] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    function handleVideoMetadata(event: Event) {
      const video = (event as CustomEvent<Omit<CreatorVideoBrowseRow, 'creator_profile'> & { creator_profile?: CreatorVideoBrowseRow['creator_profile'] }>).detail;
      if (!video) return;
      setVideos(current => {
        if (!current?.some(row => row.id === video.id)) return [...(current ?? []), { ...video, creator_profile: video.creator_profile ?? null }];
        return current.map(row => row.id === video.id ? { ...row, ...video } : row);
      });
    }
    window.addEventListener(creatorVideoMetadataUpdatedEvent, handleVideoMetadata);
    return () => window.removeEventListener(creatorVideoMetadataUpdatedEvent, handleVideoMetadata);
  }, []);

  const creatorOptions = Array.from(new Map((videos ?? []).map(video => [
    video.creator_id,
    {
      id: video.creator_id,
      label: video.creator_profile?.display_name
        || video.creator_profile?.username
        || `Creator ${video.creator_id.slice(0, 6)}`,
    },
  ] as const)).values()).sort((left, right) => left.label.localeCompare(right.label));
  const creatorVideos = (videos ?? []).filter(video => creatorFilter === 'all' || video.creator_id === creatorFilter);
  const releaseDateAvailable = creatorVideos.some(video => Boolean(video.youtube_published_at));
  const effectiveSortBy = releaseDateAvailable
    ? sortWasExplicitlySelected.current ? sortBy : 'release-date'
    : 'recently-added';
  const visibleVideos = creatorVideos.slice().sort((left, right) => effectiveSortBy === 'recently-added'
    ? compareVideoDates(right.created_at, left.created_at)
    : compareReleaseDateThenCreated(left, right));
  const displayedVideos = visibleVideos.slice(0, renderCount);
  const filterActive = (releaseDateAvailable && effectiveSortBy !== 'release-date') || creatorFilter !== 'all';

  useEffect(() => {
    setRenderCount(5);
  }, [creatorFilter, effectiveSortBy]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || renderCount >= visibleVideos.length) return;
    if (!('IntersectionObserver' in window)) {
      setSupportsAutoLoad(false);
      return;
    }
    setSupportsAutoLoad(true);
    let advanced = false;
    const observer = new IntersectionObserver(entries => {
      if (advanced || !entries.some(entry => entry.isIntersecting)) return;
      advanced = true;
      setRenderCount(current => Math.min(current + 5, visibleVideos.length));
    }, { rootMargin: '200px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [renderCount, visibleVideos.length]);

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
                      <Ui44SelectInput value={effectiveSortBy} onChange={event => { sortWasExplicitlySelected.current = true; setSortBy(event.target.value as VideoSort); }}>
                        {releaseDateAvailable ? <option value="release-date">Release date</option> : null}
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
            {displayedVideos.map(video => <article className="video-inline-card" key={video.id}>
              <YouTubeInlinePlayer videoId={video.youtube_video_id} />
            </article>)}
          </ProductGrid>
        )}
        {!error && !loading && displayedVideos.length < visibleVideos.length ? <div ref={loadMoreRef} className="video-feed-load-more">
          {!supportsAutoLoad ? <OS44Button type="button" className="os-button os-button-secondary" onClick={() => setRenderCount(current => Math.min(current + 5, visibleVideos.length))}>Load 5 more videos</OS44Button> : <span role="status">Loading more videos as you scroll…</span>}
        </div> : null}
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

function compareReleaseDateThenCreated(left: CreatorVideoBrowseRow, right: CreatorVideoBrowseRow) {
  if (left.youtube_published_at && !right.youtube_published_at) return -1;
  if (!left.youtube_published_at && right.youtube_published_at) return 1;
  if (left.youtube_published_at && right.youtube_published_at) {
    const byPublishedDate = compareVideoDates(right.youtube_published_at, left.youtube_published_at);
    if (byPublishedDate !== 0) return byPublishedDate;
  }
  return compareVideoDates(right.created_at, left.created_at);
}
