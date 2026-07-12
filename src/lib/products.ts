import type { Profile } from '@/lib/platform';
import { formatPrice } from '@/lib/pricing';

/** Canonical 44OS publishable entity. Price and acquisition are separate concerns. */
export interface Item {
  id: string;
  author_id?: string | null;
  item_category_id?: string | null;
  slug?: string | null;
  title: string;
  creator: string;
  item_type: string;
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
  capability_keys?: string[];
  external_links?: Array<{
    id: string;
    label: string;
    platform: string;
    url: string;
    sort_order: number;
  }>;
  browse_type?: {
    id: string;
    label: string;
    slug: string;
    sort_order: number;
    category_id: string;
  } | null;
  browse_tags?: Array<{
    id: string;
    label: string;
    slug: string;
    sort_order: number;
    category_id: string;
    item_type_id: string | null;
  }>;
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

/** @deprecated Use Item while route/component names are consolidated in M6. */
export type Product = Item;

export function formatItemPrice(item: Pick<Item, 'is_free' | 'price_cents'> & Partial<Item>) {
  return formatPrice(item);
}

/** @deprecated Compatibility export for existing cards during the M3 cutover. */
export const formatProductPrice = formatItemPrice;

export function itemMeta(item: Pick<Item, 'item_type' | 'experience_type'>) {
  return `${item.item_type} · ${item.experience_type || 'item'}`;
}

/** @deprecated Compatibility export for existing detail components during M3. */
export const productMeta = itemMeta;

const publicCatalogArtistCollator = new Intl.Collator(undefined, {
  sensitivity: 'base',
  numeric: true,
});

function publicCatalogArtistName(product: Item) {
  return product.creators?.display_name
    || product.creators?.username
    || product.creator
    || '';
}

/**
 * Public discovery order: newest release year first, then artist/profile name.
 * Remaining fields only provide deterministic ordering within the same artist/year.
 */
export function comparePublicCatalogItems(a: Item, b: Item) {
  const yearDifference = (b.year ?? Number.NEGATIVE_INFINITY) - (a.year ?? Number.NEGATIVE_INFINITY);
  if (yearDifference !== 0) return yearDifference;

  const artistDifference = publicCatalogArtistCollator.compare(
    publicCatalogArtistName(a),
    publicCatalogArtistName(b),
  );
  if (artistDifference !== 0) return artistDifference;

  const sortOrderDifference = (b.sort_order ?? Number.NEGATIVE_INFINITY) - (a.sort_order ?? Number.NEGATIVE_INFINITY);
  if (sortOrderDifference !== 0) return sortOrderDifference;

  const createdAtDifference = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  if (createdAtDifference !== 0) return createdAtDifference;

  return a.id.localeCompare(b.id);
}

/** @deprecated Compatibility export while route/component names are consolidated. */
export const comparePublicCatalogProducts = comparePublicCatalogItems;

export function browseHref(params: { category?: string; tag?: string; filter?: string; q?: string }) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });

  const query = searchParams.toString();
  return query ? `/search?${query}` : '/search';
}
