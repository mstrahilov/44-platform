'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SectionHeader, ProductCard, ProductGrid } from '@/components/Ui';
import { SocialPostRow } from '@/components/Social';
import { OS44Button } from '@/components/OS44Button';
import { Ui44SectionArrow } from '@/components/ui44/Controls';
import { useAuth } from '@/lib/useAuth';
import { loadCommunityPostsForItem, loadCommunityPostsForVideo, type ItemCommunityFeed } from '@/lib/domain/community';
import { listRelatedCatalogItems } from '@/lib/domain/itemDetails';
import { listVisibleLibraryItemIds } from '@/lib/domain/library';
import { getProductExperience } from '@/lib/experience';
import { creatorHref } from '@/lib/platform';
import { COMMUNITY_INTENT_LABELS, communityItemReference, inferCommunityIntent, inferItemReferences, type CommunityReference } from '@/lib/communityV11';
import type { Product } from '@/lib/products';

const EMPTY_FEED: ItemCommunityFeed = { posts: [], likeCounts: {}, replyCounts: {} };

/** The same item conversation, empty state, and post actions on Home and Library. */
export function ItemCommunitySection({ item }: { item: Product }) {
  const pathname = usePathname();
  const [feed, setFeed] = useState<ItemCommunityFeed>(EMPTY_FEED);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let live = true;
    void loadCommunityPostsForItem(item)
      .then(result => { if (live) { setFeed(result); setError(''); } })
      .catch(reason => { if (live) setError(reason instanceof Error ? reason.message : 'Could not load posts.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [item, reloadKey]);

  return <section className="view-section item-community-section" aria-label="Community">
    <SectionHeader title="Community" action={<Link className="item-community-new-post" href={`/community/new?itemId=${encodeURIComponent(item.id)}&returnTo=${encodeURIComponent(pathname)}`}>New Post</Link>} />
    {loading ? <p className="ui44-state" role="status">Loading posts…</p> : error ? <div className="item-community-empty-state ui44-panel ui44-panel-glass" role="alert">
      <strong>Could not load posts</strong>
      <p>{error}</p>
      <OS44Button onClick={() => { setLoading(true); setReloadKey(key => key + 1); }}>Retry</OS44Button>
    </div> : feed.posts.length === 0 ? <div className="item-community-empty-state ui44-panel ui44-panel-glass">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.7-3.1A7.5 7.5 0 1 1 20 11.5Z" /></svg>
      <strong>No posts yet</strong>
      <p>Be the first to say something about this.</p>
    </div> : <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip social-feed social-feed-list social-feed-panel item-community-surface item-community-posts">
      {feed.posts.map(post => {
        const intent = inferCommunityIntent(post);
        const references = post.community_references?.length ? post.community_references : [
          ...(post.item_id === item.id ? [communityItemReference(item)] : []),
          ...inferItemReferences(post.body ?? '', [item]),
        ].filter((reference, index, all) => all.findIndex(candidate => candidate.kind === reference.kind && candidate.id === reference.id) === index);
        return <div key={post.id} className="social-feed-post"><SocialPostRow
          post={post}
          likeCount={feed.likeCounts[post.id] ?? 0}
          replyCount={feed.replyCounts[post.id] ?? 0}
          meta={intent === 'general' ? undefined : <span className="community-intent-label">{COMMUNITY_INTENT_LABELS[intent]}</span>}
          metaPlacement="actions"
          references={references}
          showAuthorHandle={false}
          showAttachedItemCard={false}
        /></div>;
      })}
    </div>}
  </section>;
}

/** Community conversation for videos, which are not catalog_items rows. */
export function VideoCommunitySection({ video }: { video: { id: string; title: string; youtube_video_id: string } }) {
  const pathname = usePathname();
  const [feed, setFeed] = useState<ItemCommunityFeed>(EMPTY_FEED);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const videoReference: CommunityReference = {
    id: video.id,
    kind: 'item',
    label: video.title,
    href: `/videos/${video.id}`,
    imageUrl: `https://i.ytimg.com/vi/${video.youtube_video_id}/hqdefault.jpg`,
    secondary: 'Video',
  };

  useEffect(() => {
    let live = true;
    setLoading(true);
    void loadCommunityPostsForVideo(video)
      .then(result => { if (live) { setFeed(result); setError(''); } })
      .catch(reason => { if (live) setError(reason instanceof Error ? reason.message : 'Could not load posts.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [video, reloadKey]);

  return <section className="view-section item-community-section video-community-section" aria-label="Community">
    <SectionHeader title="Community" action={<Link className="item-community-new-post" href={`/community/new?videoId=${encodeURIComponent(video.id)}&returnTo=${encodeURIComponent(pathname)}`}>New Post</Link>} />
    {loading ? <p className="ui44-state" role="status">Loading posts…</p> : error ? <div className="item-community-empty-state ui44-panel ui44-panel-glass" role="alert">
      <strong>Could not load posts</strong><p>{error}</p>
      <OS44Button onClick={() => { setLoading(true); setReloadKey(key => key + 1); }}>Retry</OS44Button>
    </div> : feed.posts.length === 0 ? <div className="item-community-empty-state ui44-panel ui44-panel-glass">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.7-3.1A7.5 7.5 0 1 1 20 11.5Z" /></svg>
      <strong>No posts yet</strong><p>Be the first to say something about this.</p>
    </div> : <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip social-feed social-feed-list social-feed-panel item-community-surface item-community-posts">
      {feed.posts.map(post => {
        const intent = inferCommunityIntent(post);
        const references = post.community_references?.length ? post.community_references : [videoReference];
        return <div key={post.id} className="social-feed-post"><SocialPostRow
          post={post}
          likeCount={feed.likeCounts[post.id] ?? 0}
          replyCount={feed.replyCounts[post.id] ?? 0}
          meta={intent === 'general' ? undefined : <span className="community-intent-label">{COMMUNITY_INTENT_LABELS[intent]}</span>}
          metaPlacement="actions"
          references={references}
          showAuthorHandle={false}
          showAttachedItemCard={false}
        /></div>;
      })}
    </div>}
  </section>;
}

/** Published releases from the same creator, without requiring Library ownership. */
export function MoreFromCreatorSection({ item }: { item: Product }) {
  const { user } = useAuth();
  const [related, setRelated] = useState<Product[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let live = true;
    void listRelatedCatalogItems(item)
      .then(rows => { if (live) setRelated(rows); })
      .catch(() => { if (live) setRelated([]); });
    return () => { live = false; };
  }, [item]);

  useEffect(() => {
    if (!user) return;
    let live = true;
    void listVisibleLibraryItemIds(user.id)
      .then(ids => { if (live) setOwnedIds(new Set(ids)); })
      .catch(() => undefined);
    return () => { live = false; };
  }, [user]);

  if (!related.length) return null;
  const creatorName = item.creators?.display_name || item.creator || '44 Creator';
  const creatorLink = creatorHref(item.creators ?? item.creator);
  const tab = getProductExperience(item) === 'music' ? 'music' : getProductExperience(item);
  const href = `${creatorLink}${creatorLink.includes('?') ? '&' : '?'}tab=${tab}`;
  return <section className="view-section item-more-from-section" aria-label={`More from ${creatorName}`}>
    <SectionHeader title={`More from ${creatorName}`} action={<Ui44SectionArrow href={href} label={`View more from ${creatorName}`} />} />
    <ProductGrid className="store-mobile-shelf">
      {related.map(product => <ProductCard key={product.id} product={product} owned={ownedIds.has(product.id)} />)}
    </ProductGrid>
  </section>;
}
