import type { ProductExperience } from '@/lib/experience';
import type { StudioCatalogSectionId } from '@/lib/studioCatalog';

export const STORE_TAGS_BY_EXPERIENCE: Partial<Record<ProductExperience, readonly string[]>> = {
  music: ['Album', 'EP', 'Single', 'Mixtape', 'Live Set'],
  book: ['Novel', 'Artbook', 'Zine'],
  physical: ['Apparel', 'Accessories', 'Physical Music', 'Goods & Collectibles'],
  asset: ['Sample Packs', 'Remix Packs', 'Game Assets'],
};

export function storeTagsForExperience(experience: ProductExperience | null | undefined) {
  return experience ? [...(STORE_TAGS_BY_EXPERIENCE[experience] ?? [])] : [];
}

export function storeTagsForStudioSection(sectionId: StudioCatalogSectionId) {
  if (sectionId === 'music') return storeTagsForExperience('music');
  if (sectionId === 'books') return storeTagsForExperience('book');
  if (sectionId === 'merch') return storeTagsForExperience('physical');
  return storeTagsForExperience('asset');
}
