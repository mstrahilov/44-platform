export type LibraryCategory = 'all' | 'music' | 'books' | 'sample-packs';

export const LIBRARY_CATEGORIES: LibraryCategory[] = ['all', 'music', 'books', 'sample-packs'];

export function isLibraryCategory(value: string): value is LibraryCategory {
  return LIBRARY_CATEGORIES.includes(value as LibraryCategory);
}
