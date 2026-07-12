export type StoreCategory = 'all' | 'music' | 'books' | 'games' | 'assets' | 'merch';

export const STORE_CATEGORIES: StoreCategory[] = ['all', 'music', 'books', 'games', 'merch', 'assets'];

export function isStoreCategory(value: string): value is StoreCategory {
  return STORE_CATEGORIES.includes(value as StoreCategory);
}
