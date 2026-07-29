export type StoreCategory = 'all' | 'music' | 'books' | 'games' | 'beats' | 'sample-packs' | 'merch';

export const STORE_CATEGORIES: StoreCategory[] = ['all', 'music', 'books', 'games', 'merch', 'beats', 'sample-packs'];

export function isStoreCategory(value: string): value is StoreCategory {
  return STORE_CATEGORIES.includes(value as StoreCategory);
}
