import type { Profile } from '@/lib/platform';
import { formatPrice } from '@/lib/pricing';

export interface Product {
  id: string;
  author_id?: string | null;
  product_category_id?: string | null;
  slug?: string | null;
  title: string;
  creator: string;
  product_type: string;
  short_description: string | null;
  long_description: string | null;
  price_cents: number;
  market_mode?: string | null;
  local_price_cents?: number | null;
  local_currency?: string | null;
  available_locally_only?: boolean | null;
  is_free: boolean;
  featured: boolean;
  tags: string[] | null;
  cover_url: string | null;
  hero_url?: string | null;
  feature_description?: string | null;
  experience_type?: string | null;
  fulfillment_type?: string | null;
  streaming_enabled?: boolean | null;
  download_purchase_enabled?: boolean | null;
  launch_url?: string | null;
  read_url?: string | null;
  download_url?: string | null;
  status?: string | null;
  year?: number | null;
  sort_order?: number | null;
  created_at: string;
  creators?: Pick<
    Profile,
    | 'id'
    | 'slug'
    | 'username'
    | 'display_name'
    | 'avatar_url'
    | 'country_code'
    | 'display_currency'
    | 'home_country_code'
    | 'home_currency'
  > | null;
}

export function formatProductPrice(product: Pick<Product, 'is_free' | 'price_cents'> & Partial<Product>) {
  return formatPrice(product);
}

export function productMeta(product: Pick<Product, 'product_type' | 'experience_type'>) {
  return `${product.product_type} · ${product.experience_type || 'item'}`;
}

export function browseHref(params: { category?: string; tag?: string; filter?: string; q?: string }) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });

  const query = searchParams.toString();
  return query ? `/search?${query}` : '/search';
}
