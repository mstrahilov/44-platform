export interface Product {
  id: string;
  creator_id?: string | null;
  category_id?: string | null;
  slug?: string | null;
  title: string;
  creator: string;
  product_type: string;
  category: string;
  description: string | null;
  price_cents: number;
  is_free: boolean;
  is_published: boolean;
  featured: boolean;
  tags: string[] | null;
  cover_url: string | null;
  hero_url?: string | null;
  feature_description?: string | null;
  runtime_type?: string | null;
  launch_url?: string | null;
  read_url?: string | null;
  download_url?: string | null;
  status?: string | null;
  year?: number | null;
  created_at: string;
}

export function formatProductPrice(product: Pick<Product, 'is_free' | 'price_cents'>) {
  if (product.is_free || product.price_cents === 0) return 'Free';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(product.price_cents / 100);
}

export function productMeta(product: Pick<Product, 'product_type' | 'category'>) {
  return `${product.product_type} · ${product.category}`;
}

export function browseHref(params: { category?: string; tag?: string; filter?: string; q?: string }) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });

  const query = searchParams.toString();
  return query ? `/browse?${query}` : '/browse';
}

export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'fallback-product-a',
    title: 'Product A',
    creator: 'Creator A',
    product_type: 'Album',
    category: 'Music',
    description: 'Description text for a music product used to test product cards and detail pages.',
    price_cents: 0,
    is_free: true,
    is_published: true,
    featured: true,
    tags: ['Album', 'Ambient'],
    cover_url: null,
    created_at: new Date(0).toISOString(),
  },
  {
    id: 'fallback-product-b',
    title: 'Product B',
    creator: 'Creator B',
    product_type: 'Game',
    category: 'Games',
    description: 'Description text for a game product used to test grid wrapping and product pages.',
    price_cents: 1499,
    is_free: false,
    is_published: true,
    featured: true,
    tags: ['Puzzle', 'Web Game'],
    cover_url: null,
    created_at: new Date(0).toISOString(),
  },
  {
    id: 'fallback-product-c',
    title: 'Product C',
    creator: 'Creator C',
    product_type: 'Interactive Experience',
    category: 'Interactive',
    description: 'Description text for an interactive product used to test hero and browse surfaces.',
    price_cents: 0,
    is_free: true,
    is_published: true,
    featured: true,
    tags: ['Interactive', 'Unity'],
    cover_url: null,
    created_at: new Date(0).toISOString(),
  },
  {
    id: 'fallback-product-d',
    title: 'Product D',
    creator: 'Creator A',
    product_type: 'Sample Pack',
    category: 'Sample Packs',
    description: 'Description text for a sample pack product.',
    price_cents: 999,
    is_free: false,
    is_published: true,
    featured: false,
    tags: ['Samples', 'Ambient'],
    cover_url: null,
    created_at: new Date(0).toISOString(),
  },
];
