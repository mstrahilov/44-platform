import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [ui, search, itemDetail, catalog] = await Promise.all([
  read('src/components/Ui.tsx'),
  read('src/app/search/page.tsx'),
  read('src/app/store/item/[identifier]/page.tsx'),
  read('src/lib/domain/catalog.ts'),
]);

const productCard = ui.match(/export function ProductCard[\s\S]*?\n}\n\nfunction resolveProductActionEntries/)?.[0] ?? '';
assert.match(productCard, /owned: boolean/, 'ProductCard requires explicit ownership from its parent');
assert.doesNotMatch(productCard, /getItemLibraryOwnership/, 'repeated ProductCards never query ownership independently');
assert.match(search, /listVisibleLibraryItemIds\(user\.id\)[\s\S]*owned=\{ownedProductIds\.has\(product\.id\)\}/, 'Search batches ownership before rendering item cards');
assert.match(itemDetail, /Promise\.all\(\[[\s\S]*getItemLibraryOwnership[\s\S]*listVisibleLibraryItemIds[\s\S]*owned=\{ownedProductIds\.has\(item\.id\)\}/, 'item detail shares one visible-library load across related cards');
for (const table of ['item_capabilities', 'item_type_assignments', 'item_tag_assignments']) {
  assert.match(catalog, new RegExp(`from\\('${table}'\\)[\\s\\S]*?\\.in\\('item_id', itemIds\\)`), `${table} is scoped to the bounded discovery item IDs`);
}
assert.match(catalog, /from\('item_types'\)[\s\S]*\.in\('id', typeIds\)/, 'discovery loads only assigned active item types');
assert.match(catalog, /from\('item_tags'\)[\s\S]*\.in\('id', tagIds\)/, 'discovery loads only assigned active item tags');

console.log('Catalog query contract passed.');
