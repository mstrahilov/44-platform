'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Product } from '@/lib/products';
import { formatProductPrice } from '@/lib/products';
import { isFreeLibraryClaim } from '@/lib/libraryContent';

interface ProductCardProps {
  product: Product;
  owned?: boolean;
  variant?: 'compact' | 'wide';
}

export default function ProductCard({ product, owned = false, variant = 'compact' }: ProductCardProps) {
  const [hovered, setHovered] = useState(false);
  const canOpenProduct = !product.id.startsWith('fallback-');
  const canClaimToLibrary = isFreeLibraryClaim(product);
  const className = `product-card product-card-${variant} ${hovered ? 'card-hovered' : ''}`;

  const priceOrOwned = owned ? (
    <div className="product-card-owned">Owned</div>
  ) : (
    <div className={canClaimToLibrary ? 'product-card-price product-card-price-free' : 'product-card-price'}>
      {formatProductPrice(product)}
    </div>
  );

  const cardBody = (
  <>
    <ProductArt product={product} variant={variant} />
    <span className="card-heart" aria-hidden="true">♡</span>

    <div className="product-card-body">
      <div className="product-card-header">
        <div className="product-card-meta">
          <div className="product-card-title">{product.title}</div>
        </div>

        <div
          className={`product-card-price ${
            canClaimToLibrary ? 'product-card-price-free' : ''
          }`}
        >
          {formatProductPrice(product)}
        </div>
      </div>

      {variant === 'wide' && product.description && (
        <div className="product-card-description">
          {product.description}
        </div>
      )}
    </div>
  </>
);

  if (canOpenProduct) {
    return (
      <Link
        href={`/product/${product.slug || product.id}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={className}
      >
        {cardBody}
      </Link>
    );
  }

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={className}
    >
      {cardBody}
    </article>
  );
}

function ProductArt({ product, variant }: { product: Product; variant: 'compact' | 'wide' }) {
  return (
    <div className="product-card-art" data-variant={variant}>
      {product.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.cover_url} alt="" />
      )}
    </div>
  );
}
