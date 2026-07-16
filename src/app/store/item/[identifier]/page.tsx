'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useContextMenu, COPY_TO_CLIPBOARD_TOAST_EVENT } from '@/components/ContextMenu';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { productMeta } from '@/lib/products';
import { isFreeLibraryClaim } from '@/lib/libraryContent';
import { browseIndexHref, getProductExperience, productBrowseHref, productLibraryHref } from '@/lib/experience';
import { creatorHref } from '@/lib/platform';
import { ProductGrid, ProductCard } from '@/components/Ui';
import { ProductReviewsSection } from '@/components/ProductReviewsSection';
import { ProductDetailHeader, type ProductDetailAction } from '@/components/LibraryDetailPrimitives';
import { AchievementToast, type AchievementToastData } from '@/components/AchievementToast';
import { useTopbarBack } from '@/components/TopbarContext';
import { addToCart, useCart } from '@/lib/cart';
import { resolvePrice } from '@/lib/pricing';
import { useMusicPlayer, type MusicQueueTrack } from '@/components/MusicPlayer';
import { listPlayableItemTracks } from '@/lib/domain/catalog';
import {
  getCatalogItem,
  getItemLibraryOwnership,
  listRelatedCatalogItems,
  recordItemShareVisit,
  saveItemToLibrary,
} from '@/lib/domain/itemDetails';
import { getPublicNativeContent, type BookContent, type SamplePackFile } from '@/lib/domain/nativeContent';
import { SamplePackExperience } from '@/components/SamplePackExperience';
import { Ui44OverflowTrackTitle } from '@/components/ui44/OverflowTrackTitle';
import { Ui44SectionArrow } from '@/components/ui44/Controls';

type ProductTrack = {
  id: string;
  title: string;
  number?: number | null;
  duration_seconds?: number | null;
  audio_url?: string | null;
  download_url?: string | null;
};

export default function ProductPage() {
  const { identifier } = useParams<{ identifier: string }>();
  return <ProductStoreDetail identifier={identifier} />;
}

export function ProductStoreDetail({
  identifier,
  backHref,
  backLabel,
  legacyRedirect = false,
  releasePage = false,
  merchPage = false,
}: {
  identifier: string;
  backHref?: string;
  backLabel?: string;
  legacyRedirect?: boolean;
  releasePage?: boolean;
  merchPage?: boolean;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cart = useCart();
  const { currentTrack, isPlaying, toggleTrack, queueNext } = useMusicPlayer();
  const { openContextMenu } = useContextMenu();
  const [product, setProduct] = useState<Product | null>(null);
  const [tracks, setTracks] = useState<ProductTrack[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [toast, setToast] = useState<AchievementToastData | null>(null);
  const [owned, setOwned] = useState(false);
  const [ownedLibraryItemId, setOwnedLibraryItemId] = useState<string | null>(null);
  const [ownedAcquisitionType, setOwnedAcquisitionType] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(() => searchParams.get('track'));
  const [inferredTrackDurations, setInferredTrackDurations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [bookContent, setBookContent] = useState<BookContent | null>(null);
  const [sampleFiles, setSampleFiles] = useState<SamplePackFile[]>([]);
  const cameFromRadio = searchParams.get('source') === 'radio';

  useTopbarBack(cameFromRadio
    ? { href: '/radio', label: 'Radio' }
    : { href: backHref ?? '/store', label: backLabel ?? 'Store' });

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      setTracks([]);
      setBookContent(null);
      setSampleFiles([]);
      const data = await getCatalogItem(identifier);

      setProduct(data);
      setLoading(false);

      if (data && merchPage && getProductExperience(data) !== 'physical') {
        router.replace(productBrowseHref(data));
        return;
      }

      if (data && legacyRedirect) {
        const target = productBrowseHref(data);
        router.replace(target);
        return;
      }

      if (data) {
        if (releasePage || getProductExperience(data) === 'music') {
          const trackRows = await listPlayableItemTracks(data.id);
          setTracks(trackRows.sort((a, b) => trackOrder(a) - trackOrder(b)));
        }

        setRelated(await listRelatedCatalogItems(data));
        if (['book', 'asset'].includes(getProductExperience(data))) {
          const nativeContent = await getPublicNativeContent(data.id);
          setBookContent(nativeContent.book);
          setSampleFiles(nativeContent.samples);
        }
      }
    }
    fetchProduct();
  }, [identifier, legacyRedirect, merchPage, releasePage, router]);

  useEffect(() => {
    async function fetchOwnership(userId: string) {
      if (!product) return;
      const data = await getItemLibraryOwnership(userId, product.id);
      setOwned(Boolean(data));
      setOwnedLibraryItemId(data?.id ?? null);
      setOwnedAcquisitionType(data?.acquisition_type ?? null);
    }
    if (user) fetchOwnership(user.id);
    else Promise.resolve().then(() => {
      setOwned(false);
      setOwnedLibraryItemId(null);
      setOwnedAcquisitionType(null);
    });
  }, [product, user]);

  useEffect(() => {
    const highlightedTrackId = searchParams.get('track');
    Promise.resolve().then(() => setSelectedTrackId(highlightedTrackId));
  }, [searchParams]);

  useEffect(() => {
    async function recordSharedVisit() {
      if (!product) return;
      const referrerId = searchParams.get('ref');
      if (!referrerId || referrerId === user?.id) return;

      if (!user) return;
      await recordItemShareVisit(product.id, referrerId);

    }

    recordSharedVisit();
  }, [product, searchParams, user]);

  async function addToLibrary() {
    if (!product) return;
    if (!user) { alert('Sign in first, then add this to your library.'); return; }
    if (!canSaveProductToLibrary(product)) return;
    try {
      const data = await saveItemToLibrary(user.id, product.id);
      setOwned(true);
      setOwnedAcquisitionType(data?.acquisition_type ?? 'free');
      setOwnedLibraryItemId(data?.id ?? null);
    } catch (saveError) {
      alert(saveError instanceof Error ? saveError.message : 'Could not add this Item to your Library.');
    }
  }

  function addProductToCart() {
    if (!product) return;
    const price = resolvePrice(product);
    addToCart({
      item_id: product.id,
      title: product.title,
      creator: product.creators?.display_name || product.creator || '44 Creator',
      item_type: product.item_type ?? null,
      cover_url: product.cover_url,
      price_cents: price.cents,
      currency: price.currency,
      slug: product.slug ?? null,
      href: productBrowseHref(product),
    });
  }

  const trackNumbers = useMemo(
    () => new Map(tracks.map((track, index) => [track.id, trackOrder(track) || index + 1])),
    [tracks],
  );

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

  if (loading) return <div className="ui44-route-state ui44-state ui44-state-loading" role="status" aria-live="polite">Loading…</div>;
  if (!product) return <div className="ui44-route-state">Item not found</div>;

  const productExperience = getProductExperience(product);
  const isReleasePage = releasePage || productExperience === 'music';
  const canClaimToLibrary = canSaveProductToLibrary(product);
  const hasDownloadUnlock = ownedAcquisitionType === 'purchase';
  const creatorLink = creatorHref(product.creators ?? product.creator);
  const creatorTabLink = `${creatorLink}${creatorLink.includes('?') ? '&' : '?'}tab=${creatorProfileTab(productExperience)}${product.id ? `&fromProduct=${encodeURIComponent(product.id)}` : ''}`;
  const creatorMoreLink = `${creatorLink}${creatorLink.includes('?') ? '&' : '?'}tab=${creatorProfileTab(productExperience)}`;
  const libraryHref = ownedLibraryItemId ? productLibraryHref(product, ownedLibraryItemId) : browseIndexHref(product).replace('/store', '/library');

  const playableTracks: MusicQueueTrack[] = (
    tracks
      .filter(track => track.audio_url)
      .map(track => ({
        id: track.id,
        title: track.title,
        artist: product.creators?.display_name || product.creator || '44 Creator',
        releaseTitle: product.title,
        artworkUrl: product.cover_url || product.hero_url || null,
        audioUrl: track.audio_url as string,
        durationSeconds: getTrackDurationSeconds(track, inferredTrackDurations),
        productId: product.id,
        artistHref: creatorLink,
        releaseHref: productBrowseHref(product),
      }))
  );

  function toggleReleaseTrack(track: ProductTrack) {
    if (!track.audio_url) return;
    const index = playableTracks.findIndex(item => item.id === track.id);
    if (index >= 0) {
      setSelectedTrackId(track.id);
      toggleTrack(playableTracks, index);
    }
  }

  function queueReleaseTrackNext(track: ProductTrack) {
    if (!track.audio_url) return;
    const nextTrack = playableTracks.find(item => item.id === track.id);
    if (nextTrack) queueNext(nextTrack);
  }

  function shareTrackLink(track: ProductTrack) {
    if (!product) return;
    const url = typeof window !== 'undefined' ? new URL(productBrowseHref(product), window.location.origin) : null;
    if (!url) return;
    url.searchParams.set('track', track.id);
    if (user?.id) url.searchParams.set('ref', user.id);
    void navigator.clipboard?.writeText(url.toString());
    window.dispatchEvent(new CustomEvent(COPY_TO_CLIPBOARD_TOAST_EVENT, {
      detail: { message: 'Link copied to clipboard' },
    }));
  }

  const primaryActions: ProductDetailAction[] = resolveStoreActions({
    product,
    userSignedIn: Boolean(user),
    owned,
    canClaimToLibrary,
    hasDownloadUnlock,
    libraryHref,
    cartHasItem: cart.has(product.id),
    onAddToLibrary: addToLibrary,
    onAddToCart: addProductToCart,
    bookSampleAvailable: Boolean(bookContent?.preview_url),
  });
  const contentHeading = getContentHeading(product);
  const productDetails = buildProductDetails(product, tracks, inferredTrackDurations, bookContent, sampleFiles);
  const creatorDisplayName = product.creators?.display_name || product.creator || '44 Creator';
  const productDescription = product.long_description?.trim() || product.short_description?.trim();
  const releaseMeta = [
    (product.item_type || productMeta(product)).toUpperCase(),
    ...(product.year ? [String(product.year)] : []),
  ];

  return (
    <div className="view-detail-single">

      <ProductDetailHeader
        product={product}
        creatorName={creatorDisplayName}
        creatorHrefValue={creatorTabLink}
        meta={releaseMeta}
        actions={primaryActions}
        externalLinks={product.external_links ?? []}
        coverClassName={`view-album-cover-${productExperience}`}
        showCreatorAvatar={false}
      />

      {['book', 'asset'].includes(productExperience) && productDescription ? (
        <div className="view-section item-description-section">
          <h2 className="view-section-title">Description</h2>
          <p className="os-type-body view-description">{productDescription}</p>
        </div>
      ) : null}

      <div className="view-section view-tracklist-section">
        {productExperience !== 'asset' ? <div className="item-community-header item-community-section-header">
          <h2 className="view-section-title item-community-section-title">{contentHeading}</h2>
        </div> : null}
        {isReleasePage ? (
          tracks.length === 0 ? (
            <p className="os-type-body view-description view-content-empty">No tracks are published for this release yet.</p>
          ) : (
            <div className="view-tracklist ui44-track-list ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
              {tracks.map((track, index) => {
                const active = currentTrack?.id === track.id;
                const selected = selectedTrackId === track.id;
                return (
                  <div
                    className={selected || active ? 'view-track-row view-track-row-selected ui44-track-row ui44-track-row-interactive ui44-track-row-selected' : 'view-track-row ui44-track-row ui44-track-row-interactive'}
                    key={track.id}
                    onClick={() => {
                      setSelectedTrackId(track.id);
                      toggleReleaseTrack(track);
                    }}
                    onContextMenu={event => openContextMenu(event, [
                      { id: 'play', label: 'Play', onSelect: () => toggleReleaseTrack(track), disabled: !track.audio_url },
                      { id: 'play-next', label: 'Play Next', onSelect: () => queueReleaseTrackNext(track), disabled: !track.audio_url },
                      { kind: 'divider', id: 'track-actions' },
                      { id: 'creator', label: 'View Creator', href: creatorTabLink },
                      { id: 'share', label: 'Share Link', onSelect: () => shareTrackLink(track) },
                    ])}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selected || active}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedTrackId(track.id);
                        toggleReleaseTrack(track);
                      }
                    }}
                  >
                    <div className={active ? 'view-track-leading view-track-leading-current ui44-track-leading' : 'view-track-leading ui44-track-leading'}>
                      <span className="view-track-number ui44-track-index">{trackNumbers.get(track.id) ?? index + 1}</span>
                      <button
                        className="view-track-play ui44-track-play-action"
                        type="button"
                        disabled={!track.audio_url}
                        aria-label={`${active && isPlaying ? 'Pause' : 'Play'} ${track.title}`}
                        onClick={event => {
                          event.stopPropagation();
                          toggleReleaseTrack(track);
                        }}
                      >
                        <span className={active ? (isPlaying ? 'view-track-icon view-track-icon-equalizer view-track-icon-equalizer-playing' : 'view-track-icon view-track-icon-pause') : 'view-track-icon view-track-icon-play'} aria-hidden="true" />
                      </button>
                    </div>
                    <Ui44OverflowTrackTitle title={track.title} active={active && isPlaying} className="ui44-track-title" />
                    <div className="view-track-duration ui44-track-duration">{formatTrackDuration(getTrackDurationSeconds(track, inferredTrackDurations))}</div>
                  </div>
                );
              })}
            </div>
          )
        ) : productExperience === 'asset' ? (
          <SamplePackExperience
            itemId={product.id}
            title={product.title}
            creator={creatorDisplayName}
            artworkUrl={product.cover_url || product.hero_url}
            samples={sampleFiles}
            signedIn={Boolean(user)}
          />
        ) : productExperience === 'book' ? (
          <div className="book-sample-callout">
            <p className="os-type-body view-description">{bookContent?.preview_url ? 'Read the creator-selected PDF sample in the 44OS reader.' : 'This creator has not added a public sample yet.'}</p>
            {bookContent?.preview_url ? <Link className="os-button os-button-secondary" href={`/reader/${product.id}?mode=sample`}>Read Sample</Link> : null}
          </div>
        ) : (
          <p className="os-type-body view-description view-content-empty">
            Product gallery support is not available for this Item yet.
          </p>
        )}
      </div>

      <div className="view-section">
        <h2 className="view-section-title">Product Details</h2>
        <div className="ui44-panel ui44-panel-glass ui44-panel-overflow-clip ui44-detail-list">
          {productDetails.map(detail => (
            <div className="view-row ui44-list-row ui44-list-row-detail" key={detail.label}>
              <span className="view-row-label">{detail.label}</span>
              <span className="view-row-value">{detail.value}</span>
            </div>
          ))}
        </div>
      </div>

      {related.length > 0 && (
        <div className="view-section">
          <div className="item-community-header item-community-section-header">
            <h2 className="view-section-title item-community-section-title">Similar Items</h2>
            <Ui44SectionArrow href={creatorMoreLink} label="View more similar items" />
          </div>
          <ProductGrid>
            {related.map(item => <ProductCard key={item.id} product={item} />)}
          </ProductGrid>
        </div>
      )}

      <ProductReviewsSection productId={product.id} canPost={owned} />

      <AchievementToast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function trackOrder(track: ProductTrack) {
  return track.number ?? 0;
}

function canSaveProductToLibrary(product: Product) {
  const experience = getProductExperience(product);
  if (experience === 'physical') return false;
  if (experience === 'music') return true;
  return isFreeLibraryClaim(product);
}

function formatTrackDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return '-:--';
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
}

function getTrackDurationSeconds(track: ProductTrack, inferredDurations: Record<string, number>) {
  return track.duration_seconds && track.duration_seconds > 0
    ? track.duration_seconds
    : inferredDurations[track.id] ?? null;
}

function resolveStoreActions({
  product,
  userSignedIn,
  owned,
  canClaimToLibrary,
  hasDownloadUnlock,
  libraryHref,
  cartHasItem,
  onAddToLibrary,
  onAddToCart,
  bookSampleAvailable,
}: {
  product: Product;
  userSignedIn: boolean;
  owned: boolean;
  canClaimToLibrary: boolean;
  hasDownloadUnlock: boolean;
  libraryHref: string;
  cartHasItem: boolean;
  onAddToLibrary: () => void;
  onAddToCart: () => void;
  bookSampleAvailable: boolean;
}) {
  const experience = getProductExperience(product);
  const free = isFreeLibraryClaim(product);
  if (experience === 'music') {
    return [
      owned
        ? { label: 'View in Library', href: libraryHref, secondary: true }
        : userSignedIn
          ? { label: 'Add to Library', onClick: onAddToLibrary, secondary: true }
          : { label: 'Sign In to Save', href: '/login', secondary: true },
      ...(product.download_purchase_enabled && product.price_cents > 0 && !hasDownloadUnlock
        ? [cartHasItem
          ? { label: 'View Download Cart', href: '/cart', secondary: true }
          : { label: 'Buy Download', onClick: onAddToCart, secondary: true }]
        : []),
    ];
  }

  if (experience === 'book') {
    return [
      ...(bookSampleAvailable ? [{ label: 'Read Sample', href: `/reader/${product.id}?mode=sample` }] : []),
      free && canClaimToLibrary
        ? owned
          ? { label: 'View in Library', href: libraryHref, secondary: true }
          : userSignedIn
            ? { label: 'Add to Library', onClick: onAddToLibrary, secondary: true }
            : { label: 'Sign In to Save', href: '/login', secondary: true }
        : cartHasItem
          ? { label: 'View Purchase Cart', href: '/cart', secondary: true }
          : { label: 'Buy Book', onClick: onAddToCart, secondary: true },
    ];
  }

  if (experience === 'asset' && free && canClaimToLibrary) {
    return [owned
      ? { label: 'View in Library', href: libraryHref }
      : userSignedIn
        ? { label: 'Add to Library', onClick: onAddToLibrary }
        : { label: 'Sign In to Save', href: '/login' }];
  }

  return [
    cartHasItem
      ? { label: 'View Purchase Cart', href: '/cart' }
      : { label: experience === 'physical' ? 'Buy Physical' : 'Buy Download', onClick: onAddToCart },
  ];
}

function getContentHeading(product: Product) {
  const experience = getProductExperience(product);
  if (experience === 'music') return 'Tracklist';
  if (experience === 'book') return 'Book Sample';
  if (experience === 'asset') return product.item_type?.toLowerCase().includes('stem') ? 'Original Track' : 'Preview Samples';
  return 'Product Gallery';
}

function buildProductDetails(product: Product, tracks: ProductTrack[], inferredDurations: Record<string, number> = {}, bookContent: BookContent | null = null, sampleFiles: SamplePackFile[] = []) {
  const experience = getProductExperience(product);
  const creator = product.creators?.display_name || product.creator || '44 Creator';
  const uploadDate = new Date(product.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const taxonomy = [
    { label: 'Category', value: product.browse_category?.label || 'Unassigned' },
    { label: 'Type', value: product.browse_type?.label || 'Unassigned' },
  ];
  if (experience === 'music') {
    const totalLengthSeconds = tracks.reduce((sum, track) => sum + (getTrackDurationSeconds(track, inferredDurations) ?? 0), 0);
    return [
      { label: 'Creator', value: creator },
      ...taxonomy,
      { label: 'Release Year', value: String(product.year ?? 'N/A') },
      { label: 'Total Tracks', value: String(tracks.length) },
      { label: 'Total Length', value: formatTrackDuration(totalLengthSeconds) },
      { label: 'Upload Date', value: uploadDate },
    ];
  }
  if (experience === 'book') {
    return [
      { label: 'Creator', value: creator },
      ...taxonomy,
      { label: 'Publication Year', value: String(product.year ?? 'N/A') },
      { label: 'Total Pages', value: bookContent?.total_pages ? String(bookContent.total_pages) : 'Not provided' },
      { label: 'Language', value: bookContent?.language_code || 'Not provided' },
      { label: 'Upload Date', value: uploadDate },
    ];
  }
  if (experience === 'asset') {
    return [
      { label: 'Creator', value: creator },
      ...taxonomy,
      { label: 'Year', value: String(product.year ?? 'N/A') },
      { label: 'Previewed Samples', value: String(sampleFiles.length) },
      { label: 'Preview Format', value: [...new Set(sampleFiles.map(sample => sample.mime_type).filter(Boolean))].join(', ') || 'Not provided' },
      { label: 'Upload Date', value: uploadDate },
    ];
  }
  return [
    { label: 'Creator', value: creator },
    ...taxonomy,
    { label: 'Release Year', value: String(product.year ?? 'N/A') },
    { label: 'Color', value: 'Coming soon' },
    { label: 'Available Sizes', value: 'Coming soon' },
    { label: 'Materials', value: 'Coming soon' },
    { label: 'Upload Date', value: uploadDate },
  ];
}

function creatorProfileTab(experience: ReturnType<typeof getProductExperience>) {
  if (experience === 'book') return 'books';
  if (experience === 'asset') return 'sample-packs';
  return 'music';
}
