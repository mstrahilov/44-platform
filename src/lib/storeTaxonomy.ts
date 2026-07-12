import type { ProductExperience } from '@/lib/experience';
import type { StudioCatalogSectionId } from '@/lib/studioCatalog';

export const STORE_TYPES_BY_EXPERIENCE: Partial<Record<ProductExperience, readonly string[]>> = {
  music: ['Album', 'EP', 'Single', 'Mixtape', 'Live Set'],
  book: ['Novel', 'Artbook', 'Zine'],
  physical: ['Apparel', 'Accessories', 'Physical Music', 'Goods & Collectibles'],
  asset: ['Sample Packs', 'Remix Packs', 'Game Assets'],
};

export function storeTypesForExperience(experience: ProductExperience | null | undefined) {
  return experience ? [...(STORE_TYPES_BY_EXPERIENCE[experience] ?? [])] : [];
}

export function storeTypesForStudioSection(sectionId: StudioCatalogSectionId) {
  if (sectionId === 'music') return storeTypesForExperience('music');
  if (sectionId === 'books') return storeTypesForExperience('book');
  if (sectionId === 'merch') return storeTypesForExperience('physical');
  return storeTypesForExperience('asset');
}

function normalizedTaxonomyLabel(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function itemMatchesStoreType(
  item: { item_type?: string | null; tags?: string[] | null; taxonomy_terms?: Array<{ level: string; label: string }> },
  type: string,
) {
  const target = normalizedTaxonomyLabel(type);
  return normalizedTaxonomyLabel(item.item_type ?? '') === target
    || (item.taxonomy_terms ?? []).some(term => term.level === 'type' && normalizedTaxonomyLabel(term.label) === target)
    || (item.tags ?? []).some(tag => normalizedTaxonomyLabel(tag) === target);
}

export function parseStoreTags(value: string) {
  return Array.from(new Set(value.split(',').map(tag => tag.trim()).filter(Boolean)));
}
