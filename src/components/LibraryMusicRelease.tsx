'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CenteredMessage } from '@/components/Ui';
import { useTopbarBack, useTopbarOverflow } from '@/components/TopbarContext';
import { useMusicPlayer, type MusicQueueTrack } from '@/components/MusicPlayer';
import { useAuth } from '@/lib/useAuth';
import { getCatalogItem, getMusicAchievementBundle } from '@/lib/domain/itemDetails';
import { listReleaseCreatorVideos, type ReleaseCreatorVideo } from '@/lib/domain/releaseFeatures';
import { isSavedMusicContractMissing, listSavedMusicTracks, listVisibleLibraryItems, setSavedMusicRelease, type SavedMusicTrack } from '@/lib/domain/library';
import { productBrowseHref, productLibraryHref } from '@/lib/experience';
import type { Product } from '@/lib/products';
import { creatorHref, type ProductAchievement } from '@/lib/platform';
import { LibraryAchievementsSection, LibraryVideosSection, ProductDetailHeader } from '@/components/LibraryDetailPrimitives';
import { PlaylistTrackList } from '@/components/PlaylistTrackList';
import { PlaylistPicker } from '@/components/PlaylistPicker';
import { ItemCommunitySection, MoreFromCreatorSection } from '@/components/ItemDetailSections';
import { ReleaseArtworkAtmosphere } from '@/components/ReleaseArtworkAtmosphere';
import { COPY_TO_CLIPBOARD_TOAST_EVENT } from '@/components/ContextMenu';

export function LibraryMusicRelease({ itemId }: { itemId: string }) {
  const { user, loading: authLoading } = useAuth();
  if (authLoading) return <CenteredMessage status>Loading saved album…</CenteredMessage>;
  if (!user) return <CenteredMessage status>Sign in to view your Music Library.</CenteredMessage>;
  return <SavedAlbum key={`${user.id}:${itemId}`} itemId={itemId} userId={user.id} />;
}

function SavedAlbum({ itemId, userId }: { itemId: string; userId: string }) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [tracks, setTracks] = useState<SavedMusicTrack[]>([]);
  const [achievements, setAchievements] = useState<ProductAchievement[]>([]);
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<Set<string>>(new Set());
  const [visuals, setVisuals] = useState<ReleaseCreatorVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [playlistTrackId, setPlaylistTrackId] = useState<string | null>(null);
  const { currentTrack, isPlaying, toggleTrack, queueReleaseNext } = useMusicPlayer();
  useTopbarBack({ href: '/library/music', label: 'Music' });

  useEffect(() => {
    let live = true;
    let redirecting = false;
    void (async () => {
      const releasePromise = getCatalogItem(itemId);
      const savedPromise = listSavedMusicTracks(userId, itemId).catch(async reason => {
        if (!isSavedMusicContractMissing(reason)) throw reason;
        const legacy = (await listVisibleLibraryItems(userId)).find(row => row.item_id === itemId && row.products);
        if (!legacy?.products) throw reason;
        if (live) {
          redirecting = true;
          router.replace(productLibraryHref(legacy.products, legacy.id));
        }
        return null;
      });
      void getMusicAchievementBundle(userId, itemId).then(achievementBundle => {
        if (!live) return;
        setAchievements(achievementBundle.achievements);
        setUnlockedAchievementIds(new Set(achievementBundle.unlockedAchievements.map(row => row.achievement_id)));
      }).catch(() => undefined);
      void listReleaseCreatorVideos(itemId).then(releaseVisuals => {
        if (live) setVisuals(releaseVisuals);
      }).catch(() => undefined);
      const [release, saved] = await Promise.all([releasePromise, savedPromise]);
      if (!live || !saved) return;
      setProduct(release);
      setTracks(saved.sort((a, b) => a.number - b.number));
    })()
      .catch(reason => { if (live) setError(reason instanceof Error ? reason.message : 'Could not load this album.'); })
      .finally(() => { if (live && !redirecting) setLoading(false); });
    return () => { live = false; };
  }, [itemId, router, userId]);

  const queue = useMemo<MusicQueueTrack[]>(() => tracks.filter(track => track.audio_url).map(track => ({
    id: track.track_id,
    title: track.title,
    artist: product?.creators?.display_name || product?.creator || '44 Creator',
    releaseTitle: product?.title || '',
    artworkUrl: product?.cover_url || product?.hero_url || null,
    audioUrl: track.audio_url!,
    durationSeconds: track.duration_seconds,
    productId: itemId,
  })), [itemId, product, tracks]);

  const removeRelease = useCallback(async () => {
    setSaving(true); setError('');
    try { await setSavedMusicRelease(itemId, false); setTracks([]); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not remove this album.'); }
    finally { setSaving(false); }
  }, [itemId]);

  useTopbarOverflow(useMemo(() => product ? [
    { id: 'queue', label: 'Add to Queue', onSelect: () => queueReleaseNext(queue), disabled: !queue.length },
    { id: 'share', label: 'Share', onSelect: () => { void navigator.clipboard?.writeText(new URL(`/store/item/${product.slug}`, window.location.origin).toString()); } },
    { id: 'public-album', label: 'Open Public Album', onSelect: () => router.push(`/store/item/${product.slug}`) },
    { id: 'remove-album', label: 'Remove from Library', onSelect: () => { void removeRelease(); }, disabled: saving },
  ] : undefined, [product, queue, queueReleaseNext, removeRelease, router, saving]));

  function shareTrack(trackId: string) {
    if (!product || typeof window === 'undefined') return;
    const url = new URL(productBrowseHref(product), window.location.origin);
    url.searchParams.set('track', trackId);
    url.searchParams.set('ref', userId);
    void navigator.clipboard?.writeText(url.toString());
    window.dispatchEvent(new CustomEvent(COPY_TO_CLIPBOARD_TOAST_EVENT, { detail: { message: 'Track link copied to clipboard' } }));
  }

  if (loading) return <CenteredMessage status>Loading saved album…</CenteredMessage>;
  if (error && !product) return <CenteredMessage status>{error}</CenteredMessage>;
  if (!product || !tracks.length) return <CenteredMessage status>This album is no longer in your Music Library.</CenteredMessage>;

  return <main className="view-detail-single library-detail-page library-music-release">
    {playlistTrackId ? <PlaylistPicker userId={userId} trackId={playlistTrackId} onClose={() => setPlaylistTrackId(null)} /> : null}
    <ReleaseArtworkAtmosphere artworkUrl={product.cover_url || product.hero_url} />
    <ProductDetailHeader
      product={product}
      creatorName={product.creators?.display_name || product.creator || '44 Creator'}
      creatorHrefValue={creatorHref(product.creators ?? product.creator)}
      meta={[(product.item_type || 'Album').toUpperCase(), ...(product.year ? [String(product.year)] : [])]}
      actions={[]}
      externalLinks={product.external_links ?? []}
      showCreatorAvatar={false}
    />
    <section className="view-section view-tracklist-section">
      <PlaylistTrackList label="Saved tracks" rows={tracks.map((track, index) => {
        const queueIndex = queue.findIndex(row => row.id === track.track_id);
        const active = currentTrack?.id === track.track_id;
        return {
          id: track.track_id,
          number: track.number || index + 1,
          title: track.title,
          artist: product.creators?.display_name || product.creator || '44 Creator',
          artistHref: creatorHref(product.creators ?? product.creator),
          playable: queueIndex >= 0,
          active,
          playing: active && isPlaying,
          onPlay: () => { if (queueIndex >= 0) toggleTrack(queue, queueIndex); },
          actions: [
            { id: 'playlist', label: 'Add to Playlist', onSelect: () => setPlaylistTrackId(track.track_id) },
            { id: 'queue', label: 'Add to Queue', onSelect: () => queueReleaseNext([queue[queueIndex]]), disabled: queueIndex < 0 },
            { id: 'share', label: 'Share', onSelect: () => shareTrack(track.track_id) },
          ],
        };
      })} />
    </section>
    <LibraryVideosSection videos={visuals} title="Visuals" />
    {achievements.length > 0 && <LibraryAchievementsSection achievements={achievements} unlockedAchievementIds={unlockedAchievementIds} />}
    <MoreFromCreatorSection key={`more-${product.id}`} item={product} />
    <ItemCommunitySection key={`community-${product.id}`} item={product} />
    {error ? <p role="alert" className="ui44-status ui44-status-error">{error}</p> : null}
  </main>;
}
