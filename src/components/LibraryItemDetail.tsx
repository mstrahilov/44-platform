'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useContextMenu } from '@/components/ContextMenu';
import { useAuth } from '@/lib/useAuth';
import { productLibraryHref } from '@/lib/experience';
import { getProductLibraryContent, getProductLibraryPrimaryAction, getProductRuntimeKind } from '@/lib/libraryContent';
import { creatorHref, type ProductAchievement, type Track } from '@/lib/platform';
import { AchievementToast, type AchievementToastData } from '@/components/AchievementToast';
import { LibraryAchievementsSection, LibraryBonusContentSection, LibraryFilesSection, LibraryVideoEmbedsSection, ProductDetailHeader, withSourceProduct, type LibraryBonusAsset, type LibraryFileAsset, type ProductDetailAction } from '@/components/LibraryDetailPrimitives';
import { ProductUpdatesSection } from '@/components/ProductUpdatesSection';
import { recordAchievementPlaybackSignal, trackProductAchievementTrigger } from '@/lib/achievementTracking';
import { useTopbarBack } from '@/components/TopbarContext';
import { MUSIC_TRACK_COMPLETED_EVENT, MUSIC_TRACK_STARTED_EVENT, useMusicPlayer, type MusicQueueTrack, type MusicTrackPlaybackEventDetail } from '@/components/MusicPlayer';
import { getLibraryItemBundle, type DetailedLibraryItemRow } from '@/lib/domain/itemDetails';
import type { ReleaseVideoEmbed } from '@/lib/domain/releaseFeatures';
import type { BookContent, SamplePackFile } from '@/lib/domain/nativeContent';
import { SamplePackExperience } from '@/components/SamplePackExperience';
import { Ui44OverflowTrackTitle } from '@/components/ui44/OverflowTrackTitle';
import type { BeatLicenseGrant } from '@/lib/domain/beats';
import { supabase } from '@/lib/supabase';

type LibraryKind = 'product';

type LibraryItemRow = DetailedLibraryItemRow;

export function LibraryItemDetail({
  kind,
  id,
  backHref = '/library',
  backLabel = 'Library',
  legacyRedirect = false,
}: {
  kind: LibraryKind;
  id: string;
  backHref?: string;
  backLabel?: string;
  legacyRedirect?: boolean;
}) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const router = useRouter();
  useTopbarBack({ href: backHref, label: backLabel });
  const [productRow, setProductRow] = useState<LibraryItemRow | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [achievements, setAchievements] = useState<ProductAchievement[]>([]);
  const [bonusAssets, setBonusAssets] = useState<LibraryBonusAsset[]>([]);
  const [assets, setAssets] = useState<LibraryFileAsset[]>([]);
  const [bookContent, setBookContent] = useState<BookContent | null>(null);
  const [sampleFiles, setSampleFiles] = useState<SamplePackFile[]>([]);
  const [hasActiveDownload, setHasActiveDownload] = useState(false);
  const [videoEmbeds, setVideoEmbeds] = useState<ReleaseVideoEmbed[]>([]);
  const [beatLicenses, setBeatLicenses] = useState<BeatLicenseGrant[]>([]);
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      Promise.resolve().then(() => {
        setLoading(false);
        setError('Sign in to view this library item.');
      });
      return;
    }

    async function fetchItem(userId: string) {
      setLoading(true);
      setError(null);

      if (kind === 'product') {
        let bundle;
        try {
          bundle = await getLibraryItemBundle(userId, id);
        } catch (loadError) {
          setError(loadError instanceof Error ? loadError.message : 'Library item not found.');
          setLoading(false);
          return;
        }
        if (!bundle) {
          setError('Library item not found.');
          setLoading(false);
          return;
        }

        const { row } = bundle;
        setProductRow(row);

        if (legacyRedirect && row.products) {
          router.replace(productLibraryHref(row.products, row.id));
          return;
        }

        setTracks(bundle.tracks);
        setAchievements(bundle.achievements);
        setBonusAssets(bundle.assets.filter(asset => ['bonus_content', 'bonus_achievement'].includes(asset.asset_type ?? '')));
        setAssets(bundle.assets);
        setBookContent(bundle.nativeContent.book);
        setSampleFiles(bundle.nativeContent.samples);
        setVideoEmbeds(bundle.videoEmbeds);
        setBeatLicenses(bundle.beatLicenses);
        setHasActiveDownload(bundle.hasActiveDownload);
        setUnlockedAchievementIds(new Set(bundle.unlockedAchievements.map(item => item.achievement_id)));
      }

      setLoading(false);
    }

    fetchItem(userId);
  }, [authLoading, id, kind, legacyRedirect, router, userId]);

  if (authLoading || loading) return <div className="ui44-route-state ui44-state ui44-state-loading" role="status" aria-live="polite">Loading…</div>;
  if (error) return <div className="ui44-route-state">{error}</div>;
  if (!user) return <div className="ui44-route-state">Sign in to view this library item.</div>;

  if (kind === 'product' && productRow?.products) {
    return <ProductLibraryDetail userId={user.id} row={productRow} tracks={tracks} achievements={achievements} assets={assets} bonusAssets={bonusAssets} videoEmbeds={videoEmbeds} beatLicenses={beatLicenses} unlockedAchievementIds={unlockedAchievementIds} bookContent={bookContent} sampleFiles={sampleFiles} hasActiveDownload={hasActiveDownload} />;
  }

  return <div className="ui44-route-state">Library item not found.</div>;
}

function ProductLibraryDetail({
  userId,
  row,
  tracks,
  achievements,
  assets,
  bonusAssets,
  videoEmbeds,
  beatLicenses,
  unlockedAchievementIds,
  bookContent,
  sampleFiles,
  hasActiveDownload,
}: {
  userId: string;
  row: LibraryItemRow;
  tracks: Track[];
  achievements: ProductAchievement[];
  assets: LibraryFileAsset[];
  bonusAssets: LibraryBonusAsset[];
  videoEmbeds: ReleaseVideoEmbed[];
  beatLicenses: BeatLicenseGrant[];
  unlockedAchievementIds: Set<string>;
  bookContent: BookContent | null;
  sampleFiles: SamplePackFile[];
  hasActiveDownload: boolean;
}) {
  const product = row.products!;
  const baseAction = getProductLibraryPrimaryAction(product);
  const includedFile = assets.find(asset => asset.file_url && !['bonus_content', 'bonus_achievement'].includes(asset.asset_type ?? ''));
  const action = includedFile?.file_url ? {
    ...baseAction,
    label: includedFile.asset_type === 'book' ? 'Open' : 'Download',
    href: includedFile.file_url,
  } : baseAction;
  const runtimeKind = getProductRuntimeKind(product);
  const isMusic = runtimeKind === 'music';
  const isBook = runtimeKind === 'book';
  const isAsset = runtimeKind === 'sample_pack';
  const { currentTrack, isPlaying, playQueue, toggleTrack: togglePlayerTrack, queueNext } = useMusicPlayer();
  const { openContextMenu } = useContextMenu();
  const [localUnlockedAchievementIds, setLocalUnlockedAchievementIds] = useState(unlockedAchievementIds);
  const [completedTrackIds, setCompletedTrackIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<AchievementToastData | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [inferredTrackDurations, setInferredTrackDurations] = useState<Record<string, number>>({});
  const [noSkipsEligible, setNoSkipsEligible] = useState(false);
  const [fullReleaseHandled, setFullReleaseHandled] = useState(false);
  const playbackSessionIdRef = useRef('');
  const [downloadingTrackId, setDownloadingTrackId] = useState<string | null>(null);

  function currentPlaybackSessionId() {
    if (!playbackSessionIdRef.current) playbackSessionIdRef.current = crypto.randomUUID();
    return playbackSessionIdRef.current;
  }

  function beginPlaybackSession() {
    playbackSessionIdRef.current = crypto.randomUUID();
    return playbackSessionIdRef.current;
  }

  useEffect(() => { Promise.resolve().then(() => setCompletedTrackIds(new Set())); }, [product.id]);
  useEffect(() => { Promise.resolve().then(() => setLocalUnlockedAchievementIds(unlockedAchievementIds)); }, [unlockedAchievementIds]);
  useEffect(() => {
    const missingDurationTracks = tracks.filter(track => track.audio_url && (!track.duration_seconds || track.duration_seconds <= 0));
    if (missingDurationTracks.length === 0) return;

    let alive = true;
    const audioElements = missingDurationTracks.map(track => {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.src = track.audio_url!;
      audio.addEventListener('loadedmetadata', () => {
        if (!alive || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
        setInferredTrackDurations(current => ({
          ...current,
          [track.id]: Math.round(audio.duration),
        }));
      });
      return audio;
    });

    return () => {
      alive = false;
      audioElements.forEach(audio => {
        audio.removeAttribute('src');
        audio.load();
      });
    };
  }, [tracks]);

  const musicQueue = useMemo<MusicQueueTrack[]>(() => (
    tracks
      .filter(track => Boolean(track.audio_url))
      .map(track => ({
        id: track.id,
        title: track.title,
        artist: product.creators?.display_name || product.creator || '44 Creator',
        releaseTitle: product.title,
        artworkUrl: product.cover_url || product.hero_url,
        audioUrl: track.audio_url!,
        durationSeconds: track.duration_seconds,
        productId: product.id,
        artistHref: creatorHref(product.creators ?? product.creator),
        releaseHref: productLibraryHref(product, row.id),
      }))
  ), [product, row.id, tracks]);
  const overachieverAchievement = achievements.find(achievement => achievement.code === 'overachiever');
  const hasOverachieverUnlocked = Boolean(overachieverAchievement && localUnlockedAchievementIds.has(overachieverAchievement.id));

  async function toggleTrack(track: Track) {
    if (!track.audio_url) return;
    const trackIndex = musicQueue.findIndex(item => item.id === track.id);
    if (trackIndex < 0) return;

    if (currentTrack?.productId === product.id && currentTrack.id !== track.id) setNoSkipsEligible(false);
    if (trackIndex === 0 && currentTrack?.productId !== product.id) {
      beginPlaybackSession();
      setCompletedTrackIds(new Set());
      setNoSkipsEligible(true);
      setFullReleaseHandled(false);
    }
    togglePlayerTrack(musicQueue, trackIndex);
  }

  function queueTrackNext(track: Track) {
    if (!track.audio_url) return;
    const trackIndex = musicQueue.findIndex(item => item.id === track.id);
    if (trackIndex < 0) return;
    queueNext(musicQueue[trackIndex]);
  }

  function playRelease() {
    if (!musicQueue.length) {
      runProductAction(action);
      return;
    }

    beginPlaybackSession();
    playQueue(musicQueue, 0);
    setSelectedTrackId(musicQueue[0]?.id ?? null);
    setCompletedTrackIds(new Set());
    setNoSkipsEligible(true);
    setFullReleaseHandled(false);
  }

  function openDownloads() {
    document.getElementById('downloads')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function downloadTrack(track: Track) {
    if (!hasActiveDownload || !track.audio_url) return;
    setDownloadingTrackId(track.id);
    try {
      const session = await supabase.auth.getSession();
      if (session.error) throw session.error;
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Sign in again before downloading this track.');
      const response = await fetch(`/api/library/audio/${track.id}`, { headers: { authorization: `Bearer ${token}` } });
      const payload = await response.json() as { url?: string; filename?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || 'This download could not be prepared.');
      const downloadResponse = await fetch(payload.url);
      if (!downloadResponse.ok) throw new Error('The authorized download expired. Please try again.');
      const objectUrl = URL.createObjectURL(await downloadResponse.blob());
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = payload.filename || '44-track.mp3';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      alert(downloadError instanceof Error ? downloadError.message : 'This download could not be started.');
    } finally {
      setDownloadingTrackId(null);
    }
  }

  useEffect(() => {
    function handleTrackCompleted(event: Event) {
      const detail = (event as CustomEvent<MusicTrackPlaybackEventDetail>).detail;
      if (detail.productId !== product.id) return;
      void recordAchievementPlaybackSignal({
        productId: product.id,
        trackId: detail.trackId,
        sessionId: currentPlaybackSessionId(),
        signalType: 'track_completed',
      });
      setCompletedTrackIds(current => new Set(current).add(detail.trackId));
    }
    function handleTrackStarted(event: Event) {
      const detail = (event as CustomEvent<MusicTrackPlaybackEventDetail>).detail;
      if (detail.productId !== product.id) return;
      if (detail.reason === 'manual' || detail.reason === 'next' || detail.reason === 'previous') {
        void recordAchievementPlaybackSignal({
          productId: product.id,
          trackId: detail.trackId,
          sessionId: currentPlaybackSessionId(),
          signalType: 'track_skipped',
        });
        setNoSkipsEligible(false);
      }
    }
    window.addEventListener(MUSIC_TRACK_COMPLETED_EVENT, handleTrackCompleted);
    window.addEventListener(MUSIC_TRACK_STARTED_EVENT, handleTrackStarted);
    return () => {
      window.removeEventListener(MUSIC_TRACK_COMPLETED_EVENT, handleTrackCompleted);
      window.removeEventListener(MUSIC_TRACK_STARTED_EVENT, handleTrackStarted);
    };
  }, [product.id]);

  useEffect(() => {
    async function evaluateCompletedRelease() {
      if (!isMusic) return;
      if (fullReleaseHandled) return;
      const playableTrackIds = tracks.filter(track => Boolean(track.audio_url)).map(track => track.id);
      if (playableTrackIds.length === 0 || !playableTrackIds.every(trackId => completedTrackIds.has(trackId))) return;
      if (!row.item_id) return;
      setFullReleaseHandled(true);
      const triggerTypes = ['all_tracks_listened'];
      if (noSkipsEligible) triggerTypes.push('album_no_skips');
      const now = new Date();
      if (now.getHours() >= 22 || now.getHours() < 4) triggerTypes.push('release_completed_at_night');
      triggerTypes.push('release_completed_three_sessions');
      const unlocked: AchievementToastData[] = [];
      for (const triggerType of triggerTypes) {
        const result = await trackProductAchievementTrigger({
          userId,
          productId: row.item_id,
          triggerType,
          achievements,
          unlockedAchievementIds: localUnlockedAchievementIds,
          metadata: {
            source: 'library_playback',
            playback_session_id: currentPlaybackSessionId(),
            timezone_offset_minutes: now.getTimezoneOffset(),
          },
        });
        unlocked.push(...result.unlockedAchievements);
      }
      const unlockedAchievement = unlocked[unlocked.length - 1];
      if (!unlockedAchievement) return;
      setLocalUnlockedAchievementIds(current => {
        const next = new Set(current);
        unlocked.forEach(achievement => next.add(achievement.id));
        return next;
      });
      setToast(unlockedAchievement);
    }
    evaluateCompletedRelease();
  }, [achievements, completedTrackIds, fullReleaseHandled, isMusic, localUnlockedAchievementIds, noSkipsEligible, row.item_id, tracks, userId]);

  const content = getProductLibraryContent(product);
  const creatorDisplayName = product.creators?.display_name || product.creator || '44 Creator';
  const trackNumbers = useMemo(
    () => new Map(tracks.map((track, index) => [track.id, track.number ?? index + 1])),
    [tracks],
  );
  const creatorLink = withSourceProduct(creatorHref(product.creators ?? creatorDisplayName), product.id);
  const releaseMeta = [
    (product.item_type || content.detailsTitle).toUpperCase(),
    ...(product.year ? [String(product.year)] : []),
  ];
  const readerHref = `/reader/${product.id}?returnTo=${encodeURIComponent(`/library/item/${row.id}`)}`;
  const interactiveHref = `/launch/${product.id}?returnTo=${encodeURIComponent(`/library/item/${row.id}`)}`;
  const primaryActions: ProductDetailAction[] = [
    {
      label: isMusic ? 'Play' : isBook ? 'Read' : isAsset ? 'Download' : action.label,
      href: isBook && bookContent ? readerHref : runtimeKind === 'interactive' ? interactiveHref : undefined,
      opensInNewWindow: runtimeKind === 'interactive',
      onClick: isMusic ? playRelease : (isBook && bookContent) || runtimeKind === 'interactive' ? undefined : () => runProductAction(action),
    },
    ...(hasActiveDownload && ((isMusic && tracks.some(track => Boolean(track.audio_url))) || includedFile?.file_url) ? [{
      label: 'Download',
      href: !isMusic ? includedFile?.file_url ?? undefined : undefined,
      opensInNewWindow: !isMusic,
      onClick: isMusic ? openDownloads : undefined,
      secondary: true,
    } satisfies ProductDetailAction] : []),
    ...(!isMusic && !isBook && !isAsset ? [{ label: 'View Creator', href: creatorLink, secondary: true } satisfies ProductDetailAction] : []),
  ];

  return (
    <div className="view-detail-single library-detail-page">

      <ProductDetailHeader
        product={product}
        creatorName={creatorDisplayName}
        creatorHrefValue={creatorLink}
        meta={releaseMeta}
        actions={primaryActions}
        externalLinks={product.external_links ?? []}
      />

      {/* Tracklist (music) */}
      {isMusic && tracks.length > 0 && (
        <div className="view-section view-tracklist-section">
          <h2 className="view-section-title">Tracklist</h2>
          <div className="view-tracklist ui44-track-list ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
            {tracks.map((track, index) => (
              <div
                className={selectedTrackId === track.id || currentTrack?.id === track.id ? 'view-track-row view-track-row-selected ui44-track-row ui44-track-row-interactive ui44-track-row-selected' : 'view-track-row ui44-track-row ui44-track-row-interactive'}
                key={track.id}
                onClick={() => {
                  setSelectedTrackId(track.id);
                  void toggleTrack(track);
                }}
                onContextMenu={event => openContextMenu(event, [
                  { id: 'play', label: 'Play', onSelect: () => { void toggleTrack(track); } },
                  { id: 'play-next', label: 'Play Next', onSelect: () => queueTrackNext(track), disabled: !track.audio_url },
                ])}
                role="button"
                tabIndex={0}
                aria-pressed={selectedTrackId === track.id || currentTrack?.id === track.id}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedTrackId(track.id);
                    void toggleTrack(track);
                  }
                }}
              >
                <div className={currentTrack?.id === track.id ? 'view-track-leading view-track-leading-current ui44-track-leading' : 'view-track-leading ui44-track-leading'}>
                  <span className="view-track-number ui44-track-index">{trackNumbers.get(track.id) ?? index + 1}</span>
                  <button
                    type="button"
                    className="view-track-play ui44-track-play-action"
                    aria-label={`${currentTrack?.id === track.id && isPlaying ? 'Pause' : 'Play'} ${track.title}`}
                    onClick={event => {
                      event.stopPropagation();
                      setSelectedTrackId(track.id);
                      void toggleTrack(track);
                    }}
                    disabled={!track.audio_url}
                  >
                    <span className={currentTrack?.id === track.id ? (isPlaying ? 'view-track-icon view-track-icon-equalizer view-track-icon-equalizer-playing' : 'view-track-icon view-track-icon-pause') : 'view-track-icon view-track-icon-play'} aria-hidden="true" />
                  </button>
                </div>
                <Ui44OverflowTrackTitle title={track.title} active={currentTrack?.id === track.id && isPlaying} className="ui44-track-title" />
                <span className="view-track-duration ui44-track-duration">{formatDuration(getTrackDurationSeconds(track, inferredTrackDurations))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isMusic && hasActiveDownload && tracks.some(track => Boolean(track.audio_url)) && (
        <div className="view-section" id="downloads">
          <h2 className="view-section-title">Downloads</h2>
          <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
            {tracks.filter(track => Boolean(track.audio_url)).map(track => (
              <div className="dashboard-list-row ui44-list-row ui44-list-row-dashboard" key={`download-${track.id}`}>
                <span className="dashboard-row-copy">
                  <span className="dashboard-row-title">{track.title}</span>
                  <span className="dashboard-row-subtitle">Included with your purchase.</span>
                </span>
                <button className="os-button os-button-secondary os-button-compact" type="button" disabled={downloadingTrackId === track.id} onClick={() => void downloadTrack(track)}>
                  {downloadingTrackId === track.id ? 'Preparing…' : 'Download'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isBook && (
        <div className="view-section">
          <h2 className="view-section-title">Description</h2>
          <p className="os-type-body view-description">
            {product.long_description || product.short_description || content.emptyCopy}
          </p>
        </div>
      )}

      {isAsset && <SamplePackExperience
        itemId={product.id}
        title={product.title}
        creator={product.creators?.display_name || product.creator || '44 Creator'}
        artworkUrl={product.cover_url || product.hero_url}
        samples={sampleFiles}
        library
        signedIn
        fullPackUrl={assets.find(asset => asset.asset_type === 'sample_pack')?.file_url ?? null}
        signedDownloads={Object.fromEntries(assets.filter(asset => asset.asset_type === 'sample' && asset.id && asset.file_url).map(asset => [asset.id!, asset.file_url!]))}
      />}

      {!isMusic && !isBook && !isAsset && (
        <div className="view-section"><h2 className="view-section-title">{content.contentTitle}</h2><p className="os-type-body view-description">{content.emptyCopy}</p></div>
      )}

      {isMusic && <LibraryAchievementsSection achievements={achievements} unlockedAchievementIds={localUnlockedAchievementIds} />}
      {beatLicenses.length > 0 && <LibraryBeatLicensesSection licenses={beatLicenses} assets={assets} />}
      {isMusic && <LibraryVideoEmbedsSection embeds={videoEmbeds} />}
      {isMusic && <LibraryBonusContentSection bonusAssets={bonusAssets} unlocked={hasOverachieverUnlocked} />}
      {!isMusic && !isBook && !isAsset && <LibraryFilesSection assets={assets} />}
      <ProductUpdatesSection productId={product.id} emptyMessage="No updates from this creator yet." />

      <AchievementToast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function LibraryBeatLicensesSection({ licenses, assets }: { licenses: BeatLicenseGrant[]; assets: LibraryFileAsset[] }) {
  const assetsById = new Map(assets.map(asset => [asset.id, asset]));
  async function download(grantId: string, beatFileId: string, assetId: string) {
    const asset = assetsById.get(assetId);
    if (!asset?.file_url) return;
    const result = await supabase.rpc('record_beat_file_download', { target_grant_id: grantId, target_beat_file_id: beatFileId, target_user_agent: navigator.userAgent });
    if (result.error) { alert(result.error.message); return; }
    window.open(asset.file_url, '_blank', 'noopener,noreferrer');
  }
  return <div className="view-section library-beat-licenses">
    <h2 className="view-section-title">Beat Licenses</h2>
    <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
      {licenses.map(license => {
        const manifest = Array.isArray(license.file_manifest) ? license.file_manifest : [];
        return <details key={license.id} className="beat-library-license" open={licenses.length === 1}>
          <summary className="dashboard-list-row"><span className="dashboard-row-copy"><strong className="dashboard-row-title">{license.tier_code[0].toUpperCase() + license.tier_code.slice(1)} · {license.license_number}</strong><span className="dashboard-row-subtitle">Granted {new Date(license.granted_at).toLocaleDateString()} · Terms {license.terms_sha256.slice(0, 12)}…</span></span><span className={`dashboard-status-pill ui44-badge${license.status === 'active' ? ' dashboard-status-pill-success' : ' dashboard-status-pill-warning'}`}>{license.status}</span></summary>
          <div className="beat-library-license-body">
            <p className="os-type-body">{license.terms_text}</p>
            <div className="dashboard-form-actions">{manifest.flatMap(entry => {
              if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
              const beatFileId = typeof entry.beatFileId === 'string' ? entry.beatFileId : '';
              const assetId = typeof entry.assetId === 'string' ? entry.assetId : '';
              const kind = typeof entry.kind === 'string' ? entry.kind : 'file';
              const asset = assetsById.get(assetId);
              return asset?.file_url ? [<button key={beatFileId} type="button" className="os-button os-button-secondary os-button-compact" disabled={license.status !== 'active'} onClick={() => void download(license.id, beatFileId, assetId)}>Download {kind.replaceAll('_', ' ')}</button>] : [];
            })}</div>
          </div>
        </details>;
      })}
    </div>
  </div>;
}

function runProductAction(action: ReturnType<typeof getProductLibraryPrimaryAction>) {
  if (action.href) { window.open(action.href, '_blank', 'noopener,noreferrer'); return; }
  alert(action.missingMessage);
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '--:--';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function getTrackDurationSeconds(track: Track, inferredTrackDurations: Record<string, number>) {
  return track.duration_seconds && track.duration_seconds > 0
    ? track.duration_seconds
    : inferredTrackDurations[track.id] ?? null;
}
