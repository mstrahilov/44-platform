'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useContextMenu, COPY_TO_CLIPBOARD_TOAST_EVENT } from '@/components/ContextMenu';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { productMeta } from '@/lib/products';
import { isFreeLibraryClaim } from '@/lib/libraryContent';
import { browseIndexHref, getProductExperience, productBrowseHref, productLibraryHref } from '@/lib/experience';
import { creatorHref } from '@/lib/platform';
import { ProductGrid, ProductCard, SectionHeader } from '@/components/Ui';
import { ProductReviewsSection } from '@/components/ProductReviewsSection';
import { SocialPostRow } from '@/components/Social';
import { LibraryVideoEmbedsSection, ProductDetailHeader, type ProductDetailAction } from '@/components/LibraryDetailPrimitives';
import { AchievementToast, type AchievementToastData } from '@/components/AchievementToast';
import { useTopbarBack } from '@/components/TopbarContext';
import { addToCart, useCart } from '@/lib/cart';
import { resolvePrice } from '@/lib/pricing';
import { useExchangeRates } from '@/lib/exchangeRates';
import { useViewerMarket } from '@/components/MarketPreferenceSync';
import { useMusicPlayer, type MusicQueueTrack } from '@/components/MusicPlayer';
import { listPlayableItemTracks } from '@/lib/domain/catalog';
import {
  getCatalogItem,
  getItemLibraryOwnership,
  listRelatedCatalogItems,
  recordItemShareVisit,
  saveItemToLibrary,
} from '@/lib/domain/itemDetails';
import { loadCommunityPostsForItem, type ItemCommunityFeed } from '@/lib/domain/community';
import {
  COMMUNITY_INTENT_LABELS,
  inferCommunityIntent,
  inferItemReferences,
} from '@/lib/communityV11';
import { getPublicNativeContent, type BookContent, type SamplePackFile } from '@/lib/domain/nativeContent';
import { SamplePackExperience } from '@/components/SamplePackExperience';
import { Ui44OverflowTrackTitle } from '@/components/ui44/OverflowTrackTitle';
import { Ui44SectionArrow } from '@/components/ui44/Controls';
import { beatReviewSurfacesEnabled, loadBeatCatalogSummaries } from '@/lib/domain/beats';
import { COMMERCE_TEST_MODE, paidSalesUiAvailable } from '@/lib/commerceAvailability';
import { listActiveMerchVariants, type MerchVariant } from '@/lib/domain/merchVariants';
import { listPublicMerchImages, type MerchProductImage } from '@/lib/domain/merchImages';
import { listReleaseVideoEmbeds, type ReleaseVideoEmbed } from '@/lib/domain/releaseFeatures';

type ProductTrack = {
  id: string;
  title: string;
  number?: number | null;
  duration_seconds?: number | null;
  audio_url?: string | null;
  download_url?: string | null;
};

const EMPTY_ITEM_COMMUNITY: ItemCommunityFeed = {
  posts: [],
  replyCounts: {},
  likeCounts: {},
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
  const { currentTrack, isPlaying, toggleTrack, queueNext } = useMusicPlayer();
  const exchangeRates = useExchangeRates();
  const viewerMarket = useViewerMarket();
  const { openContextMenu } = useContextMenu();
  const [product, setProduct] = useState<Product | null>(null);
  const [tracks, setTracks] = useState<ProductTrack[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [itemCommunity, setItemCommunity] = useState<ItemCommunityFeed>(EMPTY_ITEM_COMMUNITY);
  const [toast, setToast] = useState<AchievementToastData | null>(null);
  const [owned, setOwned] = useState(false);
  const [ownedLibraryItemId, setOwnedLibraryItemId] = useState<string | null>(null);
  const [ownedAcquisitionType, setOwnedAcquisitionType] = useState<string | null>(null);
  const [hasActiveDownload, setHasActiveDownload] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(() => searchParams.get('track'));
  const [inferredTrackDurations, setInferredTrackDurations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [bookContent, setBookContent] = useState<BookContent | null>(null);
  const [sampleFiles, setSampleFiles] = useState<SamplePackFile[]>([]);
  const [videoEmbeds, setVideoEmbeds] = useState<ReleaseVideoEmbed[]>([]);
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
    async function fetchProduct() {
      setLoading(true);
      setTracks([]);
      setRelated([]);
      setItemCommunity(EMPTY_ITEM_COMMUNITY);
      setBookContent(null);
      setSampleFiles([]);
      setVideoEmbeds([]);
      setMerchVariants([]);
      setMerchImages([]);
      setSelectedMerchVariantId(null);
      setSelectedMerchColor(null);
      setSelectedMerchImageIndex(0);
      const data = await getCatalogItem(identifier);

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
        if (getProductExperience(data) === 'physical') {
          const [variants, images] = await Promise.all([
            listActiveMerchVariants(data.id, data.title).catch(() => []),
            listPublicMerchImages(data.id).catch(() => []),
          ]);
          setMerchVariants(variants);
          setMerchImages(images);
          const firstSelectable = variants.find(variant => variant.selectable) ?? null;
          setSelectedMerchColor(firstSelectable?.option_values.color ?? null);
          setSelectedMerchVariantId(variants.some(variant => variant.option_values.size) ? null : firstSelectable?.id ?? null);
        }
        if (beatReviewSurfacesEnabled) {
          const beatSummaries = await loadBeatCatalogSummaries([data.id]);
          data.beat = beatSummaries.get(data.id);
          setProduct({ ...data });
        }
        if (releasePage || getProductExperience(data) === 'music') {
          const [trackRows, embeds] = await Promise.all([
            listPlayableItemTracks(data.id),
            listReleaseVideoEmbeds(data.id),
          ]);
          setTracks(trackRows.sort((a, b) => trackOrder(a) - trackOrder(b)));
          setVideoEmbeds(embeds);
        }

        const [relatedItems, communityFeed] = await Promise.all([
          listRelatedCatalogItems(data),
          loadCommunityPostsForItem(data).catch(() => EMPTY_ITEM_COMMUNITY),
        ]);
        setRelated(relatedItems);
        setItemCommunity(communityFeed);
        if (['book', 'asset'].includes(getProductExperience(data))) {
          const nativeContent = await getPublicNativeContent(data.id);
          setBookContent(nativeContent.book);
          setSampleFiles(nativeContent.samples);
        }
      }
      setLoading(false);
    }
    void fetchProduct().catch(() => {
      setProduct(null);
      setLoading(false);
    });
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

  async function addToLibrary() {
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

  const trackNumbers = useMemo(
    () => new Map(tracks.map((track, index) => [track.id, trackOrder(track) || index + 1])),
    [tracks],
  );
  const selectedMerchVariant = merchVariants.find(variant => variant.id === selectedMerchVariantId) ?? null;
  const merchOptionKeys = [...new Set(merchVariants.flatMap(variant => Object.keys(variant.option_values)))];
  const merchColorValues = [...new Set(merchVariants.map(variant => variant.option_values.color).filter(Boolean))];
  const colorVariants = selectedMerchColor
    ? merchVariants.filter(variant => variant.option_values.color === selectedMerchColor)
    : merchVariants;

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

  if (loading) return <div className="ui44-loading-shell" role="status" aria-label="Loading Item" />;
  if (!product) return <div className="ui44-route-state">Item not found</div>;

  const productExperience = getProductExperience(product);
  const isBeat = beatReviewSurfacesEnabled && Boolean(product.beat);
  const isReleasePage = releasePage || productExperience === 'music';
  const canClaimToLibrary = canSaveProductToLibrary(product);
  const hasDownloadUnlock = ownedAcquisitionType === 'purchase' && hasActiveDownload;
  const isMerch = productExperience === 'physical';
  const creatorLink = creatorHref(product.creators ?? product.creator);
  const creatorTabLink = `${creatorLink}${creatorLink.includes('?') ? '&' : '?'}tab=${isBeat ? 'beats' : creatorProfileTab(productExperience)}${product.id ? `&fromProduct=${encodeURIComponent(product.id)}` : ''}`;
  const creatorMoreLink = `${creatorLink}${creatorLink.includes('?') ? '&' : '?'}tab=${isBeat ? 'beats' : creatorProfileTab(productExperience)}`;
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
    cartHasItem: isMerch ? selectedVariantInCart : cart.has(product.id),
    onAddToLibrary: addToLibrary,
    onAddToCart: addProductToCart,
    merchOptionState: isMerch ? !merchVariants.length ? 'unavailable' : selectedMerchVariant ? 'ready' : 'choose' : undefined,
  });
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
  const productDetails = buildProductDetails({
    product,
    experience: productExperience,
    tracks,
    inferredTrackDurations,
    bookContent,
    sampleFiles,
  });

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

      {isBeat && product.beat ? <BeatLicenseReviewPanel product={product} /> : null}

      {(((['book', 'asset'].includes(productExperience) || isBeat) && productDescription) || isMerch) ? (
        <div className="view-section item-description-section">
          <h2 className="view-section-title">Description</h2>
          <p className="os-type-body view-description">{productDescription || 'Description coming soon.'}</p>
        </div>
      ) : null}

      {!isMerch && productExperience !== 'book' ? <div className="view-section view-tracklist-section">
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
        ) : null}
      </div> : null}

      {isReleasePage ? <LibraryVideoEmbedsSection embeds={videoEmbeds} /> : null}

      <ProductDetailsSection details={productDetails} />

      {related.length > 0 && (
        <div className="view-section">
          <SectionHeader
            title="More from the creator"
            action={<Ui44SectionArrow href={creatorMoreLink} label={`View more from ${creatorDisplayName}`} />}
          />
          <ProductGrid className="store-mobile-shelf">
            {related.map(item => <ProductCard key={item.id} product={item} />)}
          </ProductGrid>
        </div>
      )}

      <ProductReviewsSection productId={product.id} canPost={owned} />

      {itemCommunity.posts.length > 0 && (
        <div className="view-section">
          <SectionHeader title="Community" />
          <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip social-feed social-feed-list social-feed-panel item-community-surface item-community-posts">
            {itemCommunity.posts.map(post => {
              const intent = inferCommunityIntent(post);
              const references = post.community_references?.length
                ? post.community_references
                : inferItemReferences(post.body ?? '', [product], {
                  authorHandle: post.creators?.username || post.creators?.slug,
              });
              return (
                <div key={post.id} className="social-feed-post">
                  <SocialPostRow
                    post={post}
                    likeCount={itemCommunity.likeCounts[post.id] ?? 0}
                    replyCount={itemCommunity.replyCounts[post.id] ?? 0}
                    meta={intent === 'general' ? undefined : (
                      <span className="community-intent-label">{COMMUNITY_INTENT_LABELS[intent]}</span>
                    )}
                    references={references}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AchievementToast toast={toast} onDone={() => setToast(null)} />
    </div>
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
  merchOptionState?: 'ready' | 'choose' | 'unavailable';
}): ProductDetailAction[] {
  const experience = getProductExperience(product);
  const free = isFreeLibraryClaim(product);
  const paidDownloadAvailable = product.download_purchase_enabled
    && product.price_cents > 0
    && product.paid_offer_available === true;
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
  if (product.beat) return 'Tagged Preview';
  const experience = getProductExperience(product);
  if (experience === 'music') return 'Tracklist';
  if (experience === 'book') return 'Book Sample';
  if (experience === 'asset') return product.item_type?.toLowerCase().includes('stem') ? 'Original Track' : 'Preview Samples';
  return 'Content';
}

type ProductDetail = { label: string; value: string };

function buildProductDetails({
  product,
  experience,
  tracks,
  inferredTrackDurations,
  bookContent,
  sampleFiles,
}: {
  product: Product;
  experience: ReturnType<typeof getProductExperience>;
  tracks: ProductTrack[];
  inferredTrackDurations: Record<string, number>;
  bookContent: BookContent | null;
  sampleFiles: SamplePackFile[];
}) {
  const releaseDate = formatProductReleaseDate(product.release_date, product.year);
  const totalTrackSeconds = tracks.reduce((total, track) => total + (getTrackDurationSeconds(track, inferredTrackDurations) ?? 0), 0);
  const tags = (product.browse_tags ?? []).map(tag => tag.label).filter(Boolean).join(', ');
  return [
    releaseDate ? { label: 'Release date', value: releaseDate } : null,
    product.browse_category?.label ? { label: 'Category', value: product.browse_category.label } : null,
    { label: 'Type', value: product.browse_type?.label || product.item_type || productMeta(product) },
    tags ? { label: 'Tags', value: tags } : null,
    experience === 'music' ? { label: 'Tracks', value: String(tracks.length) } : null,
    experience === 'music' && totalTrackSeconds > 0 ? { label: 'Total length', value: formatTotalDuration(totalTrackSeconds) } : null,
    experience === 'book' && bookContent?.total_pages ? { label: 'Pages', value: String(bookContent.total_pages) } : null,
    experience === 'asset' ? { label: 'Samples', value: String(sampleFiles.length) } : null,
  ].filter((detail): detail is ProductDetail => Boolean(detail?.value));
}

function ProductDetailsSection({ details }: { details: ProductDetail[] }) {
  if (!details.length) return null;
  return <section className="view-section product-details-section" aria-labelledby="product-details-title">
    <h2 className="view-section-title" id="product-details-title">Product Details</h2>
    <dl className="ui44-detail-list ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
      {details.map(detail => <div className="view-row ui44-list-row ui44-list-row-detail" key={detail.label}>
        <dt className="view-row-label ui44-detail-label">{detail.label}</dt>
        <dd className="view-row-value ui44-detail-value">{detail.value}</dd>
      </div>)}
    </dl>
  </section>;
}

function formatProductReleaseDate(releaseDate: string | null | undefined, year: number | null | undefined) {
  if (!releaseDate) return year ? String(year) : '';
  const parsed = new Date(`${releaseDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return year ? String(year) : '';
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTotalDuration(seconds: number) {
  const totalSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  if (hours > 0) return `${hours} hr ${minutes} min`;
  if (minutes > 0) return `${minutes} min${remainingSeconds ? ` ${remainingSeconds} sec` : ''}`;
  return `${remainingSeconds} sec`;
}

function BeatLicenseReviewPanel({ product }: { product: Product }) {
  const beat = product.beat;
  const cart = useCart();
  if (!beat) return null;
  return <div className="view-section beat-license-section">
    <div className="item-community-header item-community-section-header"><h2 className="view-section-title item-community-section-title">Licenses</h2></div>
    <div className="beat-meta-strip" aria-label="Beat metadata">
      <span>{beat.bpm} BPM</span><span>{beat.keyNotApplicable ? 'Atonal / N/A' : `${beat.keyRoot} ${beat.keyMode}`}</span><span>{beat.timeSignature}</span>
    </div>
    {beat.sampleDisclosure ? <p className="os-type-body beat-sample-disclosure"><strong>Sample disclosure:</strong> {beat.sampleDisclosure}</p> : null}
    {beat.licenseOffers.length ? <div className="dashboard-list-surface ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
      {beat.licenseOffers.map(offer => <details className="beat-license-offer" key={offer.id}>
        <summary className="dashboard-list-row">
          <span className="dashboard-row-copy"><strong className="dashboard-row-title">{offer.title}</strong><span className="dashboard-row-subtitle">{offer.summary} · {offer.includedFileKinds.map(kind => kind.replaceAll('_', ' ')).join(', ')}</span></span>
          <span className="dashboard-row-actions"><strong>{new Intl.NumberFormat('en-US', { style: 'currency', currency: offer.currency }).format(offer.priceCents / 100)}</strong>{offer.status === 'active' && paidSalesUiAvailable(product) ? <button type="button" className="os-button os-button-primary os-button-compact" onClick={event => { event.preventDefault(); addToCart({ item_id: product.id, offer_id: offer.id, title: product.title, creator: product.creators?.display_name || product.creator, item_type: 'Beat', cover_url: product.cover_url, price_cents: offer.priceCents, currency: offer.currency, slug: product.slug, href: productBrowseHref(product), offer_title: offer.title, tier_code: offer.tierCode, included_files: offer.includedFileKinds, terms_sha256: offer.termsSha256 }); }}>{cart.hasOffer(offer.id) ? 'Selected' : 'Choose'}</button> : <span className="dashboard-status-pill studio-status-pill-draft ui44-badge">Review only</span>}</span>
        </summary>
        <div className="beat-license-terms"><p className="os-type-body">{offer.termsText}</p><small>Terms digest: {offer.termsSha256 || 'Created when counsel-approved terms activate.'}</small></div>
      </details>)}
    </div> : <p className="os-type-body view-description">No license tiers are enabled for this Beat.</p>}
    <p className="os-type-meta">{COMMERCE_TEST_MODE
      ? 'Local test mode is on. Checkout still revalidates every offer and license on the server.'
      : 'Purchasing is unavailable while Beat commerce and approved legal templates are off.'}</p>
  </div>;
}

function creatorProfileTab(experience: ReturnType<typeof getProductExperience>) {
  if (experience === 'book') return 'books';
  if (experience === 'asset') return 'sample-packs';
  return 'music';
}
