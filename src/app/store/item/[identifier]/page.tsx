'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useContextMenu, COPY_TO_CLIPBOARD_TOAST_EVENT } from '@/components/ContextMenu';
import { useAuth } from '@/lib/useAuth';
import type { BeatLicenseOfferSummary, Product } from '@/lib/products';
import { productMeta } from '@/lib/products';
import { isFreeLibraryClaim } from '@/lib/libraryContent';
import { browseIndexHref, getProductExperience, productBrowseHref, productLibraryHref } from '@/lib/experience';
import { creatorHref } from '@/lib/platform';
import { ItemCommunitySection, MoreFromCreatorSection } from '@/components/ItemDetailSections';
import { InformationDialog } from '@/components/InformationDialog';
import { LibraryVideosSection, ProductDetailHeader, type ProductDetailAction } from '@/components/LibraryDetailPrimitives';
import { AchievementToast, type AchievementToastData } from '@/components/AchievementToast';
import { useTopbarBack } from '@/components/TopbarContext';
import { useTopbarOverflow } from '@/components/TopbarContext';
import { addToCart, useCart } from '@/lib/cart';
import { resolvePrice } from '@/lib/pricing';
import { useExchangeRates } from '@/lib/exchangeRates';
import { useViewerMarket } from '@/components/MarketPreferenceSync';
import { useMusicPlayer, type MusicQueueTrack } from '@/components/MusicPlayer';
import { listPlayableItemTracks } from '@/lib/domain/catalog';
import {
  getCatalogItem,
  getItemLibraryOwnership,
  recordItemShareVisit,
  saveItemToLibrary,
} from '@/lib/domain/itemDetails';
import { getPublicNativeContent, type SamplePackFile } from '@/lib/domain/nativeContent';
import { SamplePackExperience } from '@/components/SamplePackExperience';
import { ItemTrackList } from '@/components/ItemTrackList';
import { beatReviewSurfacesEnabled, loadBeatCatalogSummaries } from '@/lib/domain/beats';
import { listActiveMerchVariants, type MerchVariant } from '@/lib/domain/merchVariants';
import { listPublicMerchImages, type MerchProductImage } from '@/lib/domain/merchImages';
import { listReleaseCreatorVideos, type ReleaseCreatorVideo } from '@/lib/domain/releaseFeatures';
import { removeLibraryItem } from '@/lib/domain/library';
import { PlaylistPicker } from '@/components/PlaylistPicker';
import { OS44Button } from '@/components/OS44Button';
import { artworkBackdrop } from '@/components/PublicArtwork';

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

function ProductStoreDetail({
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
  const { currentTrack, duration, isPlaying, toggleTrack, queueNext, queueReleaseNext } = useMusicPlayer();
  const exchangeRates = useExchangeRates();
  const viewerMarket = useViewerMarket();
  const { openContextMenu } = useContextMenu();
  const [product, setProduct] = useState<Product | null>(null);
  const [tracks, setTracks] = useState<ProductTrack[]>([]);
  const [toast, setToast] = useState<AchievementToastData | null>(null);
  const [owned, setOwned] = useState(false);
  const [ownedLibraryItemId, setOwnedLibraryItemId] = useState<string | null>(null);
  const [ownedAcquisitionType, setOwnedAcquisitionType] = useState<string | null>(null);
  const [hasActiveDownload, setHasActiveDownload] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(() => searchParams.get('track'));
  const [playlistTrackId, setPlaylistTrackId] = useState<string | null>(null);
  const [inferredTrackDurations, setInferredTrackDurations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [sampleFiles, setSampleFiles] = useState<SamplePackFile[]>([]);
  const [videos, setVideos] = useState<ReleaseCreatorVideo[]>([]);
  const [merchVariants, setMerchVariants] = useState<MerchVariant[]>([]);
  const [merchImages, setMerchImages] = useState<MerchProductImage[]>([]);
  const [selectedMerchVariantId, setSelectedMerchVariantId] = useState<string | null>(null);
  const [selectedMerchColor, setSelectedMerchColor] = useState<string | null>(null);
  const [selectedMerchImageIndex, setSelectedMerchImageIndex] = useState(0);
  const cameFromRadio = searchParams.get('source') === 'radio';

  useTopbarBack(cameFromRadio
    ? { href: '/radio', label: 'Radio' }
    : { href: backHref ?? '/', label: backLabel ?? 'Home' });

  useEffect(() => {
    let active = true;
    async function fetchProduct() {
      setLoading(true);
      setTracks([]);
      setSampleFiles([]);
      setVideos([]);
      setMerchVariants([]);
      setMerchImages([]);
      setSelectedMerchVariantId(null);
      setSelectedMerchColor(null);
      setSelectedMerchImageIndex(0);
      const data = await getCatalogItem(identifier);
      if (!active) return;

      setProduct(data);

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
        const experience = getProductExperience(data);
        const showTracks = releasePage || experience === 'music';
        if (showTracks) {
          void listReleaseCreatorVideos(data.id)
            .then(rows => { if (active) setVideos(rows); })
            .catch(() => undefined);
        }
        const [variants, images, beatSummaries, trackRows, nativeContent] = await Promise.all([
          experience === 'physical' ? listActiveMerchVariants(data.id, data.title).catch(() => []) : [],
          experience === 'physical' ? listPublicMerchImages(data.id).catch(() => []) : [],
          beatReviewSurfacesEnabled ? loadBeatCatalogSummaries([data.id]) : null,
          showTracks ? listPlayableItemTracks(data.id) : [],
          ['book', 'asset'].includes(experience) ? getPublicNativeContent(data.id) : null,
        ]);
        if (!active) return;
        if (experience === 'physical') {
          setMerchVariants(variants);
          setMerchImages(images);
          const firstSelectable = variants.find(variant => variant.selectable) ?? null;
          setSelectedMerchColor(firstSelectable?.option_values.color ?? null);
          setSelectedMerchVariantId(variants.some(variant => variant.option_values.size) ? null : firstSelectable?.id ?? null);
        }
        if (beatSummaries) setProduct({ ...data, beat: beatSummaries.get(data.id) });
        setTracks(trackRows.sort((a, b) => trackOrder(a) - trackOrder(b)));
        if (nativeContent) setSampleFiles(nativeContent.samples);
      }
      setLoading(false);
    }
    void fetchProduct().catch(() => {
      if (!active) return;
      setProduct(null);
      setLoading(false);
    });
    return () => { active = false; };
  }, [identifier, legacyRedirect, merchPage, releasePage, router]);

  useEffect(() => {
    async function fetchOwnership(userId: string) {
      if (!product) return;
      const data = await getItemLibraryOwnership(userId, product.id);
      setOwned(Boolean(data));
      setOwnedLibraryItemId(data?.id ?? null);
      setOwnedAcquisitionType(data?.acquisition_type ?? null);
      setHasActiveDownload(data?.has_active_download ?? false);
    }
    if (user) fetchOwnership(user.id);
    else Promise.resolve().then(() => {
      setOwned(false);
      setOwnedLibraryItemId(null);
      setOwnedAcquisitionType(null);
      setHasActiveDownload(false);
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

  const addToLibrary = useCallback(async () => {
    if (!product) return;
    if (!user) { alert('Sign in first, then add this to your library.'); return; }
    if (!canSaveProductToLibrary(product)) return;
    try {
      const data = await saveItemToLibrary(user.id, product.id);
      setOwned(true);
      setOwnedAcquisitionType(data?.acquisition_type ?? 'free');
      setOwnedLibraryItemId(data?.id ?? null);
      setHasActiveDownload(data?.has_active_download ?? false);
    } catch (saveError) {
      alert(saveError instanceof Error ? saveError.message : 'Could not add this Item to your Library.');
    }
  }, [product, user]);

  const removeFromLibrary = useCallback(async () => {
    if (!product || !user || !ownedLibraryItemId) return;
    try {
      await removeLibraryItem(user.id, ownedLibraryItemId);
      setOwned(false);
      setOwnedLibraryItemId(null);
      setOwnedAcquisitionType(null);
      setHasActiveDownload(false);
    } catch (removeError) {
      alert(removeError instanceof Error ? removeError.message : 'Could not remove this Item from your Library.');
    }
  }, [ownedLibraryItemId, product, user]);

  function shareItemLink() {
    if (typeof window === 'undefined') return;
    const link = window.location.href;
    void navigator.clipboard?.writeText(link);
    window.dispatchEvent(new CustomEvent(COPY_TO_CLIPBOARD_TOAST_EVENT, { detail: { message: 'Link copied to clipboard' } }));
  }

  function addProductToCart() {
    if (!product) return;
    if (getProductExperience(product) === 'physical' && !selectedMerchVariant) {
      alert(merchVariants.length ? 'Choose an available size before adding this Item to your Cart.' : 'Product options are not available yet.');
      return;
    }
    const variantPriceCents = selectedMerchVariant?.price_cents ?? null;
    const productPrice = resolvePrice(
      variantPriceCents === null
        ? product
        : { ...product, price_cents: variantPriceCents, market_mode: 'global', local_price_cents: null, local_currency: null },
      { rates: exchangeRates, viewerCountry: viewerMarket.countryCode, viewerCurrency: viewerMarket.currency },
    );
    addToCart({
      item_id: product.id,
      merch_variant_id: selectedMerchVariant?.source === 'canonical' ? selectedMerchVariant.id : null,
      merch_variant_preview_code: selectedMerchVariant?.source === 'provider_preview' ? selectedMerchVariant.code : null,
      merch_variant_name: selectedMerchVariant?.display_name ?? null,
      merch_option_values: selectedMerchVariant?.option_values,
      title: product.title,
      creator: product.creators?.display_name || product.creator || '44 Creator',
      item_type: product.item_type ?? null,
      cover_url: selectedMerchVariant?.image_url || product.cover_url,
      price_cents: productPrice.checkoutCents,
      currency: productPrice.checkoutCurrency,
      slug: product.slug ?? null,
      href: productBrowseHref(product),
    });
  }

  const selectedMerchVariant = merchVariants.find(variant => variant.id === selectedMerchVariantId) ?? null;
  const merchOptionKeys = [...new Set(merchVariants.flatMap(variant => Object.keys(variant.option_values)))];
  const merchColorValues = [...new Set(merchVariants.map(variant => variant.option_values.color).filter(Boolean))];
  const colorVariants = selectedMerchColor
    ? merchVariants.filter(variant => variant.option_values.color === selectedMerchColor)
    : merchVariants;

  useEffect(() => {
    const trackId = currentTrack?.id;
    if (!trackId || !Number.isFinite(duration) || duration <= 0) return;
    if (!tracks.some(track => track.id === trackId && !track.duration_seconds)) return;

    const seconds = Math.round(duration);
    void Promise.resolve().then(() => {
      setInferredTrackDurations(current => current[trackId] === seconds
        ? current
        : { ...current, [trackId]: seconds });
    });
  }, [currentTrack?.id, duration, tracks]);

  const openPlaylistPicker = useCallback((trackId?: string) => {
    if (!user) {
      router.push('/login');
      return;
    }
    const fallbackTrackId = trackId ?? selectedTrackId ?? tracks[0]?.id;
    if (fallbackTrackId) setPlaylistTrackId(fallbackTrackId);
  }, [router, selectedTrackId, tracks, user]);
  const isMusicRelease = Boolean(product && getProductExperience(product) === 'music');
  const playableTracks: MusicQueueTrack[] = useMemo(() => product ? tracks.filter(track => track.audio_url).map(track => ({
    id: track.id,
    title: track.title,
    artist: product.creators?.display_name || product.creator || '44 Creator',
    releaseTitle: product.title,
    artworkUrl: product.cover_url || product.hero_url || null,
    audioUrl: track.audio_url as string,
    durationSeconds: getTrackDurationSeconds(track, inferredTrackDurations),
    productId: product.id,
    artistHref: creatorHref(product.creators ?? product.creator),
    releaseHref: productBrowseHref(product),
  })) : [], [product, tracks, inferredTrackDurations]);
  useTopbarOverflow(useMemo(() => product ? [
    ...(owned ? [{ id: 'library', label: 'Remove from Library', onSelect: () => { void removeFromLibrary(); } }] : canSaveProductToLibrary(product) ? [{ id: 'library', label: 'Add to Library', onSelect: () => { void addToLibrary(); } }] : []),
    ...(isMusicRelease ? [{ id: 'queue-release', label: 'Add to Queue', onSelect: () => queueReleaseNext(playableTracks) }] : []),
    { id: 'share', label: 'Share', onSelect: shareItemLink },
  ] : undefined, [addToLibrary, product, owned, isMusicRelease, removeFromLibrary, queueReleaseNext, playableTracks]));

  const routeArtwork = product ? product.hero_url || product.cover_url : null;

  if (loading) return <div className="ui44-loading-shell" role="status" aria-label="Loading Item" />;
  if (!product) return <div className="ui44-route-state">Item not found</div>;

  const productExperience = getProductExperience(product);
  const isBeat = beatReviewSurfacesEnabled && Boolean(product.beat);
  const isReleasePage = releasePage || productExperience === 'music';

  const canClaimToLibrary = canSaveProductToLibrary(product);
  const hasDownloadUnlock = ownedAcquisitionType === 'purchase' && hasActiveDownload;
  const isMerch = productExperience === 'physical';
  const creatorLink = creatorHref(product.creators ?? product.creator);
  const creatorTabLink = `${creatorLink}${creatorLink.includes('?') ? '&' : '?'}tab=${isBeat ? 'assets' : creatorProfileTab(productExperience)}${product.id ? `&fromProduct=${encodeURIComponent(product.id)}` : ''}`;
  const libraryHref = ownedLibraryItemId ? productLibraryHref(product, ownedLibraryItemId) : browseIndexHref(product).replace('/store', '/library');
  const merchGallery = [
    ...merchImages,
    ...(!merchImages.some(image => image.file_url === product.cover_url) && product.cover_url
      ? [{ id: 'catalog-cover', item_id: product.id, role: 'main' as const, color_value: null, title: `${product.title} main image`, file_url: product.cover_url, sort_order: -1 }]
      : []),
    ...(!merchImages.some(image => image.file_url === product.hero_url) && product.hero_url && product.hero_url !== product.cover_url
      ? [{ id: 'catalog-hero', item_id: product.id, role: 'bonus' as const, color_value: null, title: `${product.title} gallery image`, file_url: product.hero_url, sort_order: Number.MAX_SAFE_INTEGER }]
      : []),
  ].filter((image, index, images) => images.findIndex(candidate => candidate.file_url === image.file_url) === index);
  const merchGalleryImages = merchGallery.map(image => image.file_url);
  const displayedMerchImage = merchGalleryImages[selectedMerchImageIndex] ?? product.cover_url;
  const selectedVariantInCart = selectedMerchVariant
    ? cart.items.some(entry => entry.merch_variant_id === selectedMerchVariant.id
      || entry.merch_variant_preview_code === selectedMerchVariant.code)
    : false;

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

  const resolvedPrimaryActions = resolveStoreActions({
    product,
    userSignedIn: Boolean(user),
    owned,
    canClaimToLibrary,
    hasDownloadUnlock,
    libraryHref,
    cartHasItem: isMerch ? selectedVariantInCart : cart.has(product.id),
    onAddToLibrary: addToLibrary,
    onAddToCart: addProductToCart,
    onBuyLicense: () => document.getElementById('beat-licenses')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    merchOptionState: isMerch ? !merchVariants.length ? 'unavailable' : selectedMerchVariant ? 'ready' : 'choose' : undefined,
  });
  const primaryActions: ProductDetailAction[] = ['book', 'asset', 'interactive'].includes(productExperience)
    ? resolvedPrimaryActions.filter(action => !['View in Library', 'Add to Library'].includes(action.label))
    : resolvedPrimaryActions;
  const contentHeading = getContentHeading(product);
  const creatorDisplayName = product.creators?.display_name || product.creator || '44 Creator';
  const productDescription = product.long_description?.trim() || product.short_description?.trim();
  const merchTag = product.browse_tags?.[0]?.label || product.browse_type?.label || product.item_type || 'Merch';
  const selectedVariantPriceCents = selectedMerchVariant?.price_cents ?? null;
  const merchPrice = resolvePrice(
    selectedVariantPriceCents === null
      ? product
      : { ...product, price_cents: selectedVariantPriceCents, market_mode: 'global', local_price_cents: null, local_currency: null },
    { rates: exchangeRates, viewerCountry: viewerMarket.countryCode, viewerCurrency: viewerMarket.currency },
  );
  const merchPriceLabel = merchPrice.label;
  const releaseMeta = isMerch
    ? [merchTag.toUpperCase(), merchPriceLabel]
    : [(product.item_type || productMeta(product)).toUpperCase(), ...(product.year ? [String(product.year)] : [])];
  const pageArtwork = routeArtwork;
  return (
    <>
    {playlistTrackId && user ? <PlaylistPicker userId={user.id} trackId={playlistTrackId} onClose={() => setPlaylistTrackId(null)} /> : null}
    <div
      className="view-detail-single store-item-detail-page"
      style={pageArtwork ? { '--release-artwork': artworkBackdrop(pageArtwork) } as CSSProperties : undefined}
    >

      <ProductDetailHeader
        product={product}
        creatorName={creatorDisplayName}
        creatorHrefValue={creatorTabLink}
        meta={releaseMeta}
        actions={isReleasePage && !isBeat ? [] : primaryActions}
        externalLinks={product.external_links ?? []}
        coverClassName={`view-album-cover-${productExperience}`}
        showCreatorAvatar={false}
        showCreatorIdentity={!isMerch}
        imageUrlOverride={isMerch ? displayedMerchImage : undefined}
        className={isMerch ? 'view-merch-purchase-header' : undefined}
        beforeActions={isMerch ? <MerchPurchaseControls
          variants={merchVariants}
          selectedVariant={selectedMerchVariant}
          selectedColor={selectedMerchColor}
          colorValues={merchColorValues}
          colorVariants={colorVariants}
          optionKeys={merchOptionKeys}
          priceLabel={merchPriceLabel}
          onSelectColor={(color, variantId) => {
            setSelectedMerchColor(color);
            setSelectedMerchVariantId(variantId);
            const colorImageIndex = merchGallery.findIndex(image => image.role === 'color'
              && image.color_value?.trim().toLowerCase() === color.trim().toLowerCase());
            setSelectedMerchImageIndex(colorImageIndex >= 0 ? colorImageIndex : 0);
          }}
          onSelectVariant={setSelectedMerchVariantId}
        /> : undefined}
        mediaFooter={isMerch && merchGalleryImages.length ? <div className="merch-gallery-dots" aria-label="Product gallery">
          {merchGalleryImages.map((imageUrl, index) => <button
            type="button"
            key={imageUrl}
            className={selectedMerchImageIndex === index ? 'merch-gallery-dot merch-gallery-dot-active' : 'merch-gallery-dot'}
            aria-label={`View product image ${index + 1}`}
            aria-pressed={selectedMerchImageIndex === index}
            onClick={() => setSelectedMerchImageIndex(index)}
          />)}
        </div> : undefined}
      />
      {isMerch && merchPrice.source === 'converted' ? (
        <p className="dashboard-form-note exchange-rate-attribution">
          Converted display price · <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">Rates by Exchange Rate API</a>
        </p>
      ) : null}

      {(((productExperience === 'asset' || isBeat) && productDescription) || isMerch) ? (
        <div className="view-section item-description-section">
          <h2 className="view-section-title">Description</h2>
          <p className="os-type-body view-description">{productDescription || 'Description coming soon.'}</p>
        </div>
      ) : null}

      {!isMerch && productExperience !== 'book' && productExperience !== 'interactive' ? <div className="view-section view-tracklist-section">
        {productExperience !== 'asset' && !isReleasePage ? <div className="item-community-header item-community-section-header">
          <h2 className="view-section-title item-community-section-title">{contentHeading}</h2>
        </div> : null}
        {isReleasePage ? (
          tracks.length === 0 ? (
            <p className="os-type-body view-description view-content-empty">No tracks are published for this release yet.</p>
          ) : (
            <ItemTrackList label="Release tracks" rows={tracks.map((track, index) => {
              const active = currentTrack?.id === track.id;
              return {
                id: track.id,
                number: trackOrder(track) || index + 1,
                title: track.title,
                playable: Boolean(track.audio_url),
                active: selectedTrackId === track.id || active,
                playing: active && isPlaying,
                onPlay: () => toggleReleaseTrack(track),
                actions: [
                  { id: 'playlist', label: 'Add to Playlist', onSelect: () => openPlaylistPicker(track.id) },
                  { id: 'queue', label: 'Add to Queue', onSelect: () => queueReleaseTrackNext(track), disabled: !track.audio_url },
                  { id: 'share', label: 'Share', onSelect: () => shareTrackLink(track) },
                ],
                onContextMenu: event => openContextMenu(event, [
                  { id: 'play', label: 'Play', onSelect: () => toggleReleaseTrack(track), disabled: !track.audio_url },
                  { id: 'play-next', label: 'Play Next', onSelect: () => queueReleaseTrackNext(track), disabled: !track.audio_url },
                  { kind: 'divider', id: 'track-actions' },
                  { id: 'creator', label: 'View Creator', href: creatorTabLink },
                  { id: 'share', label: 'Share Link', onSelect: () => shareTrackLink(track) },
                ]),
              };
            })} />
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
        ) : null}
      </div> : null}

      {isReleasePage ? <LibraryVideosSection videos={videos} title="Visuals" /> : null}

      {isBeat && product.beat ? <BeatLicensePanel product={product} /> : null}

      {isReleasePage || productExperience === 'asset' ? <MoreFromCreatorSection key={`more-${product.id}`} item={product} /> : null}
      <ItemCommunitySection key={`community-${product.id}`} item={product} />
      {!isReleasePage && productExperience !== 'asset' ? <MoreFromCreatorSection key={`more-${product.id}`} item={product} /> : null}

      <AchievementToast toast={toast} onDone={() => setToast(null)} />
    </div>
    </>
  );
}

function MerchPurchaseControls({
  variants,
  selectedVariant,
  selectedColor,
  colorValues,
  colorVariants,
  optionKeys,
  priceLabel,
  onSelectColor,
  onSelectVariant,
}: {
  variants: MerchVariant[];
  selectedVariant: MerchVariant | null;
  selectedColor: string | null;
  colorValues: string[];
  colorVariants: MerchVariant[];
  optionKeys: string[];
  priceLabel: string;
  onSelectColor: (color: string, variantId: string | null) => void;
  onSelectVariant: (variantId: string | null) => void;
}) {
  if (!variants.length) return <p className="merch-options-unavailable">This product does not have selectable Printful options yet.</p>;
  return <div className="merch-variant-picker">
    {colorValues.length ? <fieldset className="merch-option-group">
      <legend>Color <strong>{selectedColor || 'Choose a color'}</strong></legend>
      <div className="merch-option-buttons merch-color-options">
        {colorValues.map(color => {
          const variantsForColor = variants.filter(variant => variant.option_values.color === color);
          const colorAvailable = variantsForColor.some(variant => variant.selectable);
          return <button
            type="button"
            className={selectedColor === color ? 'merch-option-button merch-color-button merch-option-button-selected' : 'merch-option-button merch-color-button'}
            aria-pressed={selectedColor === color}
            disabled={!colorAvailable}
            key={color}
            onClick={() => {
              const currentSize = selectedVariant?.option_values.size;
              const sameSize = variantsForColor.find(variant => variant.selectable && variant.option_values.size === currentSize);
              const firstAvailable = variantsForColor.find(variant => variant.selectable) ?? null;
              onSelectColor(color, variantsForColor.some(variant => variant.option_values.size)
                ? sameSize?.id ?? null
                : firstAvailable?.id ?? null);
            }}
          ><span className="merch-color-dot" aria-hidden="true" />{color}</button>;
        })}
      </div>
    </fieldset> : null}

    {colorVariants.some(variant => variant.option_values.size) ? <fieldset className="merch-option-group">
      <legend>Size <strong>{selectedVariant?.option_values.size || 'Choose a size'}</strong></legend>
      <div className="merch-option-buttons merch-size-options">
        {[...new Set(colorVariants.map(variant => variant.option_values.size).filter(Boolean))].map(size => {
          const variant = colorVariants.find(candidate => candidate.option_values.size === size);
          return <button
            type="button"
            className={selectedVariant?.id === variant?.id ? 'merch-option-button merch-size-button merch-option-button-selected' : 'merch-option-button merch-size-button'}
            aria-pressed={selectedVariant?.id === variant?.id}
            disabled={!variant?.selectable}
            title={variant?.selectable ? `Choose size ${size}` : `Size ${size} is out of stock`}
            key={size}
            onClick={() => onSelectVariant(variant?.id ?? null)}
          >{size}{!variant?.selectable ? <span className="sr-only"> — out of stock</span> : null}</button>;
        })}
      </div>
    </fieldset> : null}

    {!colorValues.length && !optionKeys.length ? <fieldset className="merch-option-group">
      <legend>Variant</legend>
      <div className="merch-option-buttons">
        {variants.map(variant => <button type="button" className={selectedVariant?.id === variant.id ? 'merch-option-button merch-option-button-selected' : 'merch-option-button'} disabled={!variant.selectable} onClick={() => onSelectVariant(variant.id)} key={variant.id}>{variant.display_name}</button>)}
      </div>
    </fieldset> : null}

    <div className="merch-variant-selection">
      <strong>{selectedVariant ? selectedVariant.display_name : 'Select an available option'}</strong>
      <span>{priceLabel}</span>
    </div>
  </div>;
}

function trackOrder(track: ProductTrack) {
  return track.number ?? 0;
}

function canSaveProductToLibrary(product: Product) {
  if (product.beat) return false;
  const experience = getProductExperience(product);
  if (experience === 'physical') return false;
  if (experience === 'music' || experience === 'book') return true;
  return isFreeLibraryClaim(product);
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
  onBuyLicense,
  merchOptionState,
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
  onBuyLicense: () => void;
  merchOptionState?: 'ready' | 'choose' | 'unavailable';
}): ProductDetailAction[] {
  const experience = getProductExperience(product);
  const free = isFreeLibraryClaim(product);
  const paidDownloadAvailable = product.download_purchase_enabled
    && product.price_cents > 0
    && product.paid_offer_available === true;
  if (product.beat) {
    return [{
      label: 'Buy License',
      onClick: onBuyLicense,
      disabled: product.beat.licenseOffers.length === 0,
    }];
  }
  if (experience === 'music') {
    return [
      owned
        ? { label: 'View in Library', href: libraryHref, secondary: true }
        : userSignedIn
          ? { label: 'Add to Library', onClick: onAddToLibrary, secondary: true }
          : { label: 'Add to Library', href: '/login', secondary: true },
      ...(paidDownloadAvailable && !hasDownloadUnlock
        ? [cartHasItem
          ? { label: 'View Download Cart', href: '/cart', secondary: true }
          : { label: 'Buy Download', onClick: onAddToCart, secondary: true }]
        : []),
    ];
  }

  if (experience === 'book') {
    const actions: Array<ProductDetailAction | null> = [
      canClaimToLibrary
        ? owned
          ? { label: 'View in Library', href: libraryHref, secondary: true }
          : userSignedIn
            ? { label: 'Add to Library', onClick: onAddToLibrary, secondary: true }
            : { label: 'Add to Library', href: '/login', secondary: true }
        : null,
      ...(paidDownloadAvailable && !hasDownloadUnlock
        ? [cartHasItem
          ? { label: 'View Download Cart', href: '/cart', secondary: true }
          : { label: 'Buy Download', onClick: onAddToCart, secondary: true }]
        : []),
    ];
    return actions.filter((action): action is ProductDetailAction => action !== null);
  }

  if (experience === 'asset' && free && canClaimToLibrary) {
    return [owned
      ? { label: 'View in Library', href: libraryHref }
      : userSignedIn
        ? { label: 'Add to Library', onClick: onAddToLibrary }
        : { label: 'Add to Library', href: '/login' }];
  }

  if (experience === 'interactive' && free && canClaimToLibrary) {
    return [owned
      ? { label: 'View in Library', href: libraryHref }
      : userSignedIn
        ? { label: 'Add to Library', onClick: onAddToLibrary }
        : { label: 'Add to Library', href: '/login' }];
  }

  if (experience !== 'physical' && !paidDownloadAvailable) return [];
  if (experience === 'physical' && product.paid_offer_available !== true) return [];
  return [
    experience === 'physical' && merchOptionState === 'unavailable'
      ? { label: 'Options unavailable', disabled: true }
      : experience === 'physical' && merchOptionState === 'choose'
      ? { label: 'Choose an option', disabled: true }
      : cartHasItem
      ? { label: 'View Purchase Cart', href: '/cart' }
      : { label: experience === 'physical' ? 'Add to Cart' : 'Buy Download', onClick: onAddToCart },
  ];
}

function getContentHeading(product: Product) {
  if (product.beat) return 'Preview';
  const experience = getProductExperience(product);
  if (experience === 'music') return 'Tracklist';
  if (experience === 'book') return 'Book Sample';
  if (experience === 'asset') return product.item_type?.toLowerCase().includes('stem') ? 'Original Track' : 'Preview Samples';
  return 'Content';
}

function BeatLicensePanel({ product }: { product: Product }) {
  const beat = product.beat;
  const cart = useCart();
  const router = useRouter();
  const [selectedOffer, setSelectedOffer] = useState<BeatLicenseOfferSummary | null>(null);
  if (!beat) return null;
  function selectOffer(offer: BeatLicenseOfferSummary) {
    if (cart.hasOffer(offer.id)) {
      router.push('/cart');
      return;
    }
    addToCart({
      item_id: product.id,
      offer_id: offer.id,
      title: product.title,
      creator: product.creators?.display_name || product.creator,
      item_type: 'Beat',
      cover_url: product.cover_url,
      price_cents: offer.priceCents,
      currency: offer.currency,
      slug: product.slug,
      href: productBrowseHref(product),
      offer_title: offer.title,
      tier_code: offer.tierCode,
      included_files: offer.includedFileKinds,
      terms_sha256: offer.termsSha256,
    });
  }

  return <div className="view-section beat-license-section" id="beat-licenses">
    <div className="item-community-header item-community-section-header"><h2 className="view-section-title item-community-section-title">Licenses</h2></div>
    {beat.licenseOffers.length ? <div className="beat-license-list ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
      {beat.licenseOffers.map(offer => <article className="beat-license-offer" key={offer.id}>
        <span className="beat-license-copy"><strong>{offer.title}</strong><span>{offer.summary}</span></span>
        <span className="beat-license-actions">
          <strong className="beat-license-price">{new Intl.NumberFormat('en-US', { style: 'currency', currency: offer.currency }).format(offer.priceCents / 100)}</strong>
          <OS44Button type="button" className="os-button os-button-secondary os-button-compact" onClick={() => setSelectedOffer(offer)}>License Info</OS44Button>
          <OS44Button type="button" className="os-button os-button-primary os-button-compact" onClick={() => selectOffer(offer)}>{cart.hasOffer(offer.id) ? 'View Cart' : 'Add to Cart'}</OS44Button>
        </span>
      </article>)}
    </div> : <p className="os-type-body view-description">No license tiers are enabled for this Beat.</p>}
    <InformationDialog open={Boolean(selectedOffer)} title={selectedOffer?.title ?? 'License Information'} onClose={() => setSelectedOffer(null)}>
      {selectedOffer ? <>
        <p>{selectedOffer.summary}</p>
        <p className="information-dialog-meta"><strong>Includes:</strong> {selectedOffer.includedFileKinds.map(kind => kind.replaceAll('_', ' ')).join(', ')}</p>
        <div className="information-dialog-terms">{selectedOffer.termsText}</div>
      </> : null}
    </InformationDialog>
  </div>;
}

function creatorProfileTab(experience: ReturnType<typeof getProductExperience>) {
  if (experience === 'book') return 'books';
  if (experience === 'asset') return 'assets';
  return 'music';
}
