'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { notFound, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useContextMenu, COPY_TO_CLIPBOARD_TOAST_EVENT } from '@/components/ContextMenu';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import type { Product } from '@/lib/products';
import { browseHref, formatProductPrice, productMeta } from '@/lib/products';
import { isFreeLibraryClaim } from '@/lib/libraryContent';
import { getProductExperience, productLibraryHref, productStoreHref, storeIndexHref } from '@/lib/experience';
import { creatorHref } from '@/lib/platform';
import { ProductGrid, ProductCard } from '@/components/Ui';
import { ProductReviewsSection } from '@/components/ProductReviewsSection';
import { AchievementToast, type AchievementToastData } from '@/components/AchievementToast';
import { useTopbarBack } from '@/components/TopbarContext';
import { addToCart, useCart } from '@/lib/cart';
import { resolvePrice } from '@/lib/pricing';
import { useMusicPlayer, type MusicQueueTrack } from '@/components/MusicPlayer';

type ProductTrack = {
  id: string;
  title: string;
  number?: number | null;
  track_number?: number | null;
  duration_seconds?: number | null;
  audio_url?: string | null;
  download_url?: string | null;
};

export default function ProductPage() {
  notFound();
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

  useTopbarBack({ href: backHref ?? '/', label: backLabel ?? 'Home' });

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      setTracks([]);
      const productQuery = supabase
        .from('products')
        .select('*, creators:profiles!author_id(*)');
      const { data } = await (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)
        ? productQuery.eq('id', identifier)
        : productQuery.eq('slug', identifier)
      ).maybeSingle();

      setProduct(data);
      setLoading(false);

      if (data && merchPage && getProductExperience(data) !== 'physical') {
        router.replace(productStoreHref(data));
        return;
      }

      if (data && legacyRedirect) {
        const target = productStoreHref(data);
        router.replace(target);
        return;
      }

      if (data) {
        if (releasePage || getProductExperience(data) === 'music') {
          const { data: trackRows } = await supabase
            .from('tracks')
            .select('id,product_id,number,title,duration_seconds,audio_url,download_url')
            .eq('product_id', data.id)
            .order('number');
          setTracks(((trackRows as ProductTrack[] | null) ?? []).sort((a, b) => trackOrder(a) - trackOrder(b)));
        }

        const relatedLimit = getProductExperience(data) === 'physical' ? 12 : 4;
        const relatedQuery = supabase
          .from('products')
          .select('*, creators:profiles!author_id(*)')
          .eq('is_published', true)
          .neq('id', data.id)
          .limit(relatedLimit);

        const relatedScope = data.author_id
          ? relatedQuery.eq('author_id', data.author_id)
          : relatedQuery.eq('creator', data.creator);

        const { data: relatedProducts } = await relatedScope;
        const relatedRows = (relatedProducts ?? []) as Product[];
        setRelated(
          getProductExperience(data) === 'physical'
            ? relatedRows.filter(item => getProductExperience(item) === 'physical').slice(0, 4)
            : relatedRows.slice(0, 4),
        );
      }
    }
    fetchProduct();
  }, [identifier, legacyRedirect, merchPage, releasePage, router]);

  useEffect(() => {
    async function fetchOwnership(userId: string) {
      if (!product) return;
      const { data } = await supabase
        .from('library_items')
        .select('id, product_id, acquisition_type')
        .eq('user_id', userId)
        .eq('product_id', product.id)
        .neq('status', 'hidden')
        .maybeSingle();
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

      await supabase.from('product_share_visits').insert({
        product_id: product.id,
        referrer_id: referrerId,
        visitor_id: user?.id ?? null,
      });

    }

    recordSharedVisit();
  }, [product, searchParams, user?.id]);

  async function addToLibrary() {
    if (!product) return;
    if (!user) { alert('Sign in first, then add this to your library.'); return; }
    if (!canSaveProductToLibrary(product)) return;
    const { error } = await supabase.from('library_items').upsert({ user_id: user.id, product_id: product.id, acquisition_type: 'free', status: 'visible' }, { onConflict: 'user_id,product_id' });
    if (error) { alert(error.message); return; }
    setOwned(true);
    setOwnedAcquisitionType('free');
    const { data } = await supabase
      .from('library_items')
      .select('id, acquisition_type')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .neq('status', 'hidden')
      .maybeSingle();
    setOwnedLibraryItemId(data?.id ?? null);
    setOwnedAcquisitionType(data?.acquisition_type ?? 'free');
  }

  function addProductToCart() {
    if (!product) return;
    const price = resolvePrice(product);
    addToCart({
      product_id: product.id,
      title: product.title,
      creator: product.creators?.display_name || product.creator || '44 Creator',
      cover_url: product.cover_url,
      price_cents: price.cents,
      currency: price.currency,
      slug: product.slug ?? null,
      href: productStoreHref(product),
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

  if (loading) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Loading…</div>;
  if (!product) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--os-color-ink-muted)' }}>Item not found</div>;

  const heroImage = product.hero_url || product.cover_url;
  const productExperience = getProductExperience(product);
  const isReleasePage = releasePage || productExperience === 'music';
  const canClaimToLibrary = canSaveProductToLibrary(product);
  const hasDownloadUnlock = ownedAcquisitionType === 'purchase';
  const creatorLink = creatorHref(product.creators ?? product.creator);
  const creatorTabLink = `${creatorLink}${creatorLink.includes('?') ? '&' : '?'}tab=${creatorProfileTab(productExperience)}${product.id ? `&fromProduct=${encodeURIComponent(product.id)}` : ''}`;
  const creatorMoreLink = `${creatorLink}${creatorLink.includes('?') ? '&' : '?'}tab=${creatorProfileTab(productExperience)}`;
  const libraryHref = ownedLibraryItemId ? productLibraryHref(product, ownedLibraryItemId) : storeIndexHref(product).replace('/store', '/library');

  const hasDescription = Boolean(product.long_description || product.short_description);
  const description = product.long_description || product.short_description || '';
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
    const url = typeof window !== 'undefined' ? new URL(productStoreHref(product), window.location.origin) : null;
    if (!url) return;
    url.searchParams.set('track', track.id);
    if (user?.id) url.searchParams.set('ref', user.id);
    void navigator.clipboard?.writeText(url.toString());
    window.dispatchEvent(new CustomEvent(COPY_TO_CLIPBOARD_TOAST_EVENT, {
      detail: { message: 'Link copied to clipboard' },
    }));
  }

  const heroCopy = getStoreHeroCopy(productExperience);
  const primaryActions = resolveStoreActions({
    product,
    userSignedIn: Boolean(user),
    owned,
    canClaimToLibrary,
    hasDownloadUnlock,
    libraryHref,
    cartHasItem: cart.has(product.id),
    onAddToLibrary: addToLibrary,
    onAddToCart: addProductToCart,
  });
  const aboutHeading = getAboutHeading();
  const contentHeading = getContentHeading(product);
  const productDetails = buildProductDetails(product, tracks, inferredTrackDurations);
  const creatorDisplayName = product.creators?.display_name || product.creator || '44 Creator';

  return (
    <div className="view-detail-single">

      {/* Album-style header */}
      <div
        className={heroImage ? 'view-album-header' : 'view-album-header view-album-header-fallback'}
        style={heroImage ? { backgroundImage: `url(${heroImage})` } as CSSProperties : undefined}
      >
        <div className={`view-album-cover view-album-cover-${productExperience}`}>
          {heroImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImage} alt={product.title} />
          )}
        </div>
        <div className="view-album-copy">
          <div className="view-album-eyebrow view-product-meta-line">
            <span>{(product.product_type || productMeta(product)).toUpperCase()}</span>
            {product.year && (<><span className="view-album-meta-sep" /><span>{product.year}</span></>)}
            <span className="view-album-meta-sep" />
            <span className="view-album-meta-strong view-album-meta-accent">{formatProductPrice(product)}</span>
          </div>
          <h1 className="view-album-title">{product.title}</h1>
          <Link className="library-creator-chip" href={creatorTabLink}>
            <span className="library-creator-avatar">
              {product.creators?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.creators.avatar_url} alt="" />
              ) : (
                <span>{creatorDisplayName.slice(0, 2).toUpperCase()}</span>
              )}
            </span>
            <span>{creatorDisplayName}</span>
          </Link>
          <p className="view-description view-store-hero-copy">{heroCopy}</p>
          <div className="view-album-actions">
            {primaryActions.map(action =>
              action.href ? (
                <Link key={action.label} className={action.secondary ? 'os-button os-button-secondary' : 'os-button os-button-primary'} href={action.href}>
                  {action.label}
                </Link>
              ) : (
                <button key={action.label} className={action.secondary ? 'os-button os-button-secondary' : 'os-button os-button-primary'} type="button" onClick={action.onClick}>
                  {action.label}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      <div className="view-section">
        <h2 className="view-section-title">{aboutHeading}</h2>
        <p className="os-type-body view-description">
          {hasDescription && description.length > 0 ? description : heroCopy}
        </p>
      </div>

      <div className="view-section">
        <div className="item-community-header" style={{ marginBottom: 28 }}>
          <h2 className="view-section-title" style={{ margin: 0 }}>{contentHeading}</h2>
        </div>
        {isReleasePage ? (
          tracks.length === 0 ? (
            <p className="os-type-body view-description view-content-empty">No tracks are published for this release yet.</p>
          ) : (
            <div className="view-tracklist">
              {tracks.map((track, index) => {
                const active = currentTrack?.id === track.id;
                const selected = selectedTrackId === track.id;
                return (
                  <div
                    className={selected ? 'view-track-row view-track-row-selected' : 'view-track-row'}
                    key={track.id}
                    onClick={() => setSelectedTrackId(track.id)}
                    onContextMenu={event => openContextMenu(event, [
                      { id: 'play', label: 'Play', onSelect: () => toggleReleaseTrack(track), disabled: !track.audio_url },
                      { id: 'play-next', label: 'Play Next', onSelect: () => queueReleaseTrackNext(track), disabled: !track.audio_url },
                      { kind: 'divider', id: 'track-actions' },
                      { id: 'creator', label: 'View Creator', href: creatorTabLink },
                      { id: 'share', label: 'Share Link', onSelect: () => shareTrackLink(track) },
                    ])}
                    role="button"
                    tabIndex={0}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedTrackId(track.id);
                      }
                    }}
                  >
                    <div className="view-track-leading">
                      <span className="view-track-number">{trackNumbers.get(track.id) ?? index + 1}</span>
                      <button
                        className="view-track-play"
                        type="button"
                        disabled={!track.audio_url}
                        aria-label={`${active && isPlaying ? 'Pause' : 'Play'} ${track.title}`}
                        onClick={event => {
                          event.stopPropagation();
                          toggleReleaseTrack(track);
                        }}
                      >
                        <span className={active && isPlaying ? 'view-track-icon view-track-icon-pause' : 'view-track-icon view-track-icon-play'} aria-hidden="true" />
                      </button>
                    </div>
                    <div className={active && isPlaying ? 'view-track-title view-track-title-active' : 'view-track-title'}>{track.title}</div>
                    <div className="view-track-duration">{formatTrackDuration(getTrackDurationSeconds(track, inferredTrackDurations))}</div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <p className="os-type-body view-description view-content-empty">
            {productExperience === 'book'
              ? 'Book sample support is the next product upload pass.'
              : productExperience === 'asset'
                ? 'Sample preview support is the next asset upload pass.'
                : 'Product gallery support is the next merch upload pass.'}
          </p>
        )}
      </div>

      <div className="view-section">
        <h2 className="view-section-title">Product Details</h2>
        <div>
          {productDetails.map(detail => (
            <div className="view-row" key={detail.label}>
              <span className="view-row-label">{detail.label}</span>
              <span className="view-row-value">{detail.value}</span>
            </div>
          ))}
        </div>
        {(product.tags ?? []).length > 0 && (
          <div className="app-tag-row" style={{ marginTop: 24 }}>
            {(product.tags ?? []).map(tag => (
              <Link key={tag} href={browseHref({ q: tag })} className="os-pill os-type-pill">{tag}</Link>
            ))}
          </div>
        )}
      </div>

      {related.length > 0 && (
        <div className="view-section">
          <div className="item-community-header" style={{ marginBottom: 28 }}>
            <h2 className="view-section-title" style={{ margin: 0 }}>More from {creatorDisplayName}</h2>
            <Link className="os-button os-button-secondary os-button-compact" href={creatorMoreLink}>
              View More
            </Link>
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
  return track.track_number ?? track.number ?? 0;
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

function getStoreHeroCopy(experience: ReturnType<typeof getProductExperience>) {
  if (experience === 'music') {
    return 'Add this release to your library for free or support the creator by purchasing a digital copy that includes unlimited high-quality downloads.';
  }
  if (experience === 'book') {
    return 'Purchase a copy of this book to add it to your library. All purchases include unlimited downloads in ePub or PDF.';
  }
  if (experience === 'asset') {
    return 'Purchase this asset pack to unlock the full download and keep it in your creative library.';
  }
  return 'Purchase this item to support the creator and keep it with your 44 collection.';
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
}) {
  const experience = getProductExperience(product);
  if (experience === 'music') {
    return [
      owned
        ? { label: 'View in Library', href: libraryHref }
        : userSignedIn
          ? { label: 'Add to Library', onClick: onAddToLibrary }
          : { label: 'Sign In to Save', href: '/login' },
      hasDownloadUnlock
        ? { label: 'View in Library', href: libraryHref, secondary: true }
        : { label: 'Add to Cart', onClick: onAddToCart, secondary: true },
    ];
  }

  if (experience === 'book') {
    return [
      { label: 'Read Sample', href: product.read_url || productStoreHref(product) },
      canClaimToLibrary
        ? owned
          ? { label: 'View in Library', href: libraryHref, secondary: true }
          : userSignedIn
            ? { label: 'Add to Library', onClick: onAddToLibrary, secondary: true }
            : { label: 'Sign In to Save', href: '/login', secondary: true }
        : cartHasItem
          ? { label: 'View Cart', href: '/cart', secondary: true }
          : { label: 'Add to Cart', onClick: onAddToCart, secondary: true },
    ];
  }

  return [
    cartHasItem
      ? { label: 'View Cart', href: '/cart' }
      : { label: 'Add to Cart', onClick: onAddToCart },
  ];
}

function getAboutHeading() {
  return 'Description';
}

function getContentHeading(product: Product) {
  const experience = getProductExperience(product);
  if (experience === 'music') return 'Tracklist';
  if (experience === 'book') return 'Book Sample';
  if (experience === 'asset') return product.product_type?.toLowerCase().includes('stem') ? 'Original Track' : 'Sample Preview';
  return 'Product Gallery';
}

function buildProductDetails(product: Product, tracks: ProductTrack[], inferredDurations: Record<string, number> = {}) {
  const experience = getProductExperience(product);
  const creator = product.creators?.display_name || product.creator || '44 Creator';
  const uploadDate = new Date(product.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (experience === 'music') {
    const totalLengthSeconds = tracks.reduce((sum, track) => sum + (getTrackDurationSeconds(track, inferredDurations) ?? 0), 0);
    return [
      { label: 'Creator', value: creator },
      { label: 'Product Type', value: product.product_type || 'Release' },
      { label: 'Release Year', value: String(product.year ?? 'N/A') },
      { label: 'Total Tracks', value: String(tracks.length) },
      { label: 'Total Length', value: formatTrackDuration(totalLengthSeconds) },
      { label: 'Upload Date', value: uploadDate },
    ];
  }
  if (experience === 'book') {
    return [
      { label: 'Creator', value: creator },
      { label: 'Book Type', value: product.product_type || 'Book' },
      { label: 'Publication Year', value: String(product.year ?? 'N/A') },
      { label: 'Total Pages', value: 'Coming soon' },
      { label: 'Language', value: 'Coming soon' },
      { label: 'Upload Date', value: uploadDate },
    ];
  }
  if (experience === 'asset') {
    return [
      { label: 'Creator', value: creator },
      { label: 'Asset Type', value: product.product_type || 'Asset' },
      { label: 'Year', value: String(product.year ?? 'N/A') },
      { label: 'Total Samples', value: 'Coming soon' },
      { label: 'Sample Format', value: 'Coming soon' },
      { label: 'Upload Date', value: uploadDate },
    ];
  }
  return [
    { label: 'Creator', value: creator },
    { label: 'Product Type', value: product.product_type || 'Product' },
    { label: 'Release Year', value: String(product.year ?? 'N/A') },
    { label: 'Color', value: 'Coming soon' },
    { label: 'Available Sizes', value: 'Coming soon' },
    { label: 'Materials', value: 'Coming soon' },
    { label: 'Upload Date', value: uploadDate },
  ];
}

function creatorProfileTab(experience: ReturnType<typeof getProductExperience>) {
  if (experience === 'book') return 'books';
  if (experience === 'asset') return 'assets';
  return 'music';
}
