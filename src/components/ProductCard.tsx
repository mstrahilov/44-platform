'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Product } from '@/lib/products';
import { formatProductPrice } from '@/lib/products';
import { isFreeLibraryClaim } from '@/lib/libraryContent';

interface ProductCardProps {
  product: Product;
  owned?: boolean;
}

export default function ProductCard({ product, owned = false }: ProductCardProps) {
  const [hovered, setHovered] = useState(false);
  const canOpenProduct = !product.id.startsWith('fallback-');
  const canClaimToLibrary = isFreeLibraryClaim(product);
  const cardBody = (
    <>
      <ProductArt product={product} />
      <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 110 }}>
        <div style={{ fontSize: 14, fontWeight: 650, color: 'rgba(255,255,255,0.94)', marginBottom: 4, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.title}</div>
        <div style={{ fontSize: 12, fontWeight: 550, color: 'rgba(255,255,255,0.42)', marginBottom: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.creator}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 'auto' }}>
          <div style={{ fontSize: 14, fontWeight: 750, color: canClaimToLibrary ? '#93FF00' : 'rgba(255,255,255,0.92)' }}>{formatProductPrice(product)}</div>
          {owned && <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.42)' }}>Owned</div>}
        </div>
      </div>
    </>
  );

  const shellStyle = {
    background: hovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${hovered ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: 18,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
    minWidth: 0,
    height: '100%',
    transition: 'border-color 150ms ease, background 150ms ease, transform 150ms ease',
    transform: hovered && canOpenProduct ? 'translateY(-1px)' : 'translateY(0)',
    cursor: canOpenProduct ? 'pointer' : 'default',
  };

  if (canOpenProduct) {
    return (
      <Link
        href={`/product/${product.slug || product.id}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={shellStyle}
      >
        {cardBody}
      </Link>
    );
  }

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={shellStyle}
    >
      {cardBody}
    </article>
  );
}

function ProductArt({ product }: { product: Product }) {
  return (
    <div style={{ width: '100%', aspectRatio: '1', background: 'rgba(255,255,255,0.035)', overflow: 'hidden', position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      {product.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      )}
    </div>
  );
}
