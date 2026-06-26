'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Product } from '@/lib/products';
import { formatProductPrice } from '@/lib/products';

interface ProductCardProps {
  product: Product;
  owned?: boolean;
  onGet?: (product: Product) => void;
}

export default function ProductCard({ product, owned = false, onGet }: ProductCardProps) {
  const [hovered, setHovered] = useState(false);
  const canOpenProduct = !product.id.startsWith('fallback-');

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 18,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        transition: 'border-color 150ms ease, background 150ms ease',
      }}
    >
      {canOpenProduct ? (
        <Link href={`/product/${product.id}`} style={{ display: 'block' }}>
          <ProductArt product={product} />
        </Link>
      ) : (
        <ProductArt product={product} />
      )}

      <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 118 }}>
        {canOpenProduct ? (
          <Link href={`/product/${product.id}`} style={{ fontSize: 14, fontWeight: 650, color: 'rgba(255,255,255,0.94)', marginBottom: 4, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {product.title}
          </Link>
        ) : (
          <div style={{ fontSize: 14, fontWeight: 650, color: 'rgba(255,255,255,0.94)', marginBottom: 4, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.title}</div>
        )}
        <div style={{ fontSize: 12, fontWeight: 550, color: 'rgba(255,255,255,0.42)', marginBottom: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.creator}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <div style={{ fontSize: 14, fontWeight: 750, color: product.is_free ? '#93FF00' : 'rgba(255,255,255,0.92)' }}>{formatProductPrice(product)}</div>
          <button
            onClick={() => onGet?.(product)}
            disabled={owned || !onGet}
            style={{
              background: 'rgba(255,255,255,0.09)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 9999,
              padding: '5px 14px',
              fontFamily: 'inherit',
              fontSize: 11,
              fontWeight: 650,
              color: 'rgba(255,255,255,0.70)',
              cursor: owned || !onGet ? 'default' : 'pointer',
              letterSpacing: '0.04em',
              opacity: owned || !onGet ? 0.6 : 1,
            }}
          >
            {owned ? 'Owned' : product.is_free ? 'Get' : 'View'}
          </button>
        </div>
      </div>
    </div>
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
