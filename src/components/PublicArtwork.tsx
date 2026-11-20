'use client';

import { getImageProps } from 'next/image';
import { memo, useState, type ComponentPropsWithoutRef } from 'react';
import { isOptimizablePublicArtwork } from '@/lib/publicArtwork';

export const CATALOG_ARTWORK_SIZES = '(max-width: 768px) 48vw, (max-width: 1100px) 33vw, 320px';
export const DETAIL_ARTWORK_SIZES = '(max-width: 768px) 70vw, 370px';

export function artworkBackdrop(src: string, pixelSize = 128) {
  const image = isOptimizablePublicArtwork(src)
    ? getImageProps({ src, alt: '', width: pixelSize, height: pixelSize }).props.src
    : src;
  return `url(${JSON.stringify(image)})`;
}

type ArtworkProps = Omit<ComponentPropsWithoutRef<'img'>, 'src' | 'alt' | 'sizes' | 'srcSet' | 'onError'> & {
  src: string;
  alt: string;
  sizes: string;
};

export const PublicArtwork = memo(function PublicArtwork({ src, alt, sizes, loading = 'lazy', decoding = 'async', ...props }: ArtworkProps) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const optimize = failedSrc !== src && isOptimizablePublicArtwork(src);
  const responsive = optimize
    ? getImageProps({ src, alt, sizes, width: 640, height: 640 }).props
    : null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={alt}
      loading={loading}
      decoding={decoding}
      sizes={responsive?.sizes}
      srcSet={responsive?.srcSet}
      src={responsive?.src ?? src}
      onError={optimize ? () => setFailedSrc(src) : undefined}
    />
  );
});
