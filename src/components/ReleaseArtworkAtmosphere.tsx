'use client';

import { getImageProps } from 'next/image';
import { isOptimizablePublicArtwork } from '@/lib/publicArtwork';

/**
 * Blurred artwork field used behind catalog and Library item details.
 * The small source image mirrors Swift's low-resolution atmosphere image;
 * the visible cover remains a separate, sharp image in the page header.
 */
export function ReleaseArtworkAtmosphere({ artworkUrl }: { artworkUrl: string | null | undefined }) {
  if (!artworkUrl) return null;

  const image = isOptimizablePublicArtwork(artworkUrl)
    ? getImageProps({ src: artworkUrl, alt: '', width: 320, height: 320, sizes: '320px' }).props
    : { src: artworkUrl };

  return (
    <div className="release-artwork-atmosphere" aria-hidden="true">
      <div className="release-artwork-atmosphere-image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img {...image} alt="" loading="eager" decoding="async" fetchPriority="low" />
      </div>
      <div className="release-artwork-status-veil" />
    </div>
  );
}
