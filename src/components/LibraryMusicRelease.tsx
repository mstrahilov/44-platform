'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CenteredMessage } from '@/components/Ui';
import { useTopbarBack, useTopbarOverflow } from '@/components/TopbarContext';
import { useMusicPlayer, type MusicQueueTrack } from '@/components/MusicPlayer';
import { useAuth } from '@/lib/useAuth';
import { getCatalogItem, getMusicAchievementBundle } from '@/lib/domain/itemDetails';
import { listReleaseVideoEmbeds, type ReleaseVideoEmbed } from '@/lib/domain/releaseFeatures';
import { isSavedMusicContractMissing, listSavedMusicTracks, listVisibleLibraryItems, setSavedMusicRelease, setSavedMusicTrack, type SavedMusicTrack } from '@/lib/domain/library';
import { productLibraryHref } from '@/lib/experience';
import type { Product } from '@/lib/products';
import { creatorHref, type ProductAchievement } from '@/lib/platform';
import { LibraryAchievementsSection, LibraryVideoEmbedsSection, ProductDetailHeader } from '@/components/LibraryDetailPrimitives';
import { ItemTrackList } from '@/components/ItemTrackList';
import { PlaylistPicker } from '@/components/PlaylistPicker';
import { ItemCommunitySection, MoreFromCreatorSection } from '@/components/ItemDetailSections';

export function LibraryMusicRelease({ itemId }: { itemId: string }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [tracks, setTracks] = useState<SavedMusicTrack[]>([]);
  const [achievements, setAchievements] = useState<ProductAchievement[]>([]);
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<Set<string>>(new Set());
  const [visuals, setVisuals] = useState<ReleaseVideoEmbed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [playlistTrackId, setPlaylistTrackId] = useState<string | null>(null);
  const { currentTrack, isPlaying, toggleTrack, queueReleaseNext } = useMusicPlayer();
  useTopbarBack({ href: '/library/music', label: 'Music' });

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    let live = true;
    let redirecting = false;
    void (async () => {
      const release = await getCatalogItem(itemId);
      let saved: SavedMusicTrack[];
      try {
        saved = await listSavedMusicTracks(user.id, itemId);
      } catch (reason) {
        if (!isSavedMusicContractMissing(reason)) throw reason;
        const legacy = (await listVisibleLibraryItems(user.id)).find(row => row.item_id === itemId && row.products);
        if (!legacy?.products) throw reason;
        redirecting = true;
        router.replace(productLibraryHref(legacy.products, legacy.id));
        return;
      }
      if (!live) return;
      const [achievementBundle, releaseVisuals] = await Promise.all([
        getMusicAchievementBundle(user.id, itemId),
        listReleaseVideoEmbeds(itemId),
      ]);
      if (!live) return;
      setProduct(release);
      setTracks(saved.sort((a, b) => a.number - b.number));
      setAchievements(achievementBundle.achievements);
      setUnlockedAchievementIds(new Set(achievementBundle.unlockedAchievements.map(row => row.achievement_id)));
      setVisuals(releaseVisuals);
    })()
      .catch(reason => { if (live) setError(reason instanceof Error ? reason.message : 'Could not load this album.'); })
      .finally(() => { if (live && !redirecting) setLoading(false); });
    return () => { live = false; };
  }, [authLoading, itemId, router, user]);

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

  async function removeTrack(trackId: string) {
    setSaving(true); setError('');
    try {
      await setSavedMusicTrack(trackId, false);
      setTracks(current => current.filter(track => track.track_id !== trackId));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not remove this track.'); }
    finally { setSaving(false); }
  }

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

  if (authLoading || (user && loading)) return <CenteredMessage status>Loading saved album…</CenteredMessage>;
  if (!user) return <CenteredMessage status>Sign in to view your Music Library.</CenteredMessage>;
  if (error && !product) return <CenteredMessage status>{error}</CenteredMessage>;
  if (!product || !tracks.length) return <CenteredMessage status>This album is no longer in your Music Library.</CenteredMessage>;

  return <main className="view-detail-single library-detail-page library-music-release">
    {playlistTrackId ? <PlaylistPicker userId={user.id} trackId={playlistTrackId} onClose={() => setPlaylistTrackId(null)} /> : null}
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
      <ItemTrackList label="Saved tracks" rows={tracks.map((track, index) => {
        const queueIndex = queue.findIndex(row => row.id === track.track_id);
        const active = currentTrack?.id === track.track_id;
        return {
          id: track.track_id,
          number: track.number || index + 1,
          title: track.title,
          playable: queueIndex >= 0,
          active,
          playing: active && isPlaying,
          onPlay: () => { if (queueIndex >= 0) toggleTrack(queue, queueIndex); },
          actions: [
            { id: 'playlist', label: 'Add to Playlist', onSelect: () => setPlaylistTrackId(track.track_id) },
            { id: 'queue', label: 'Add to Queue', onSelect: () => queueReleaseNext([queue[queueIndex]]), disabled: queueIndex < 0 },
            { id: 'remove', label: 'Remove from Library', onSelect: () => { void removeTrack(track.track_id); }, disabled: saving },
          ],
        };
      })} />
    </section>
    <LibraryVideoEmbedsSection embeds={visuals} title="Visuals" />
    {achievements.length > 0 && <LibraryAchievementsSection achievements={achievements} unlockedAchievementIds={unlockedAchievementIds} />}
    <MoreFromCreatorSection key={`more-${product.id}`} item={product} />
    <ItemCommunitySection key={`community-${product.id}`} item={product} />
    {error ? <p role="alert" className="ui44-status ui44-status-error">{error}</p> : null}
  </main>;
}
