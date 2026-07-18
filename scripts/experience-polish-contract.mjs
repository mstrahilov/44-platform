import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [
  topbar,
  customerCommerce,
  supportArticle,
  supportLayout,
  adminLayout,
  storeDetail,
  libraryDetail,
  releaseFeatures,
  releaseDomain,
  newItem,
  editItem,
  uploads,
  uploadField,
  canonicalCss,
  videoMigration,
] = await Promise.all([
  read('src/components/Topbar.tsx'),
  read('src/lib/domain/customerCommerce.ts'),
  read('src/app/support/[slug]/page.tsx'),
  read('src/app/support/layout.tsx'),
  read('src/app/admin/layout.tsx'),
  read('src/app/store/item/[identifier]/page.tsx'),
  read('src/components/LibraryItemDetail.tsx'),
  read('src/components/StudioReleaseFeatures.tsx'),
  read('src/lib/domain/releaseFeatures.ts'),
  read('src/app/studio/products/new/page.tsx'),
  read('src/app/studio/products/[id]/page.tsx'),
  read('src/lib/uploads.ts'),
  read('src/components/UploadField.tsx'),
  read('src/styles/44-ui/canonical-system.css'),
  read('supabase/migrations/20260718012000_m13_release_video_limit_ten.sql'),
]);

assert.doesNotMatch(supportArticle, /Reviewed for (?:the )?.*launch/i, 'Support articles omit internal launch-review copy');
assert.match(supportArticle, /href=\{`\/support#support-category-\$\{category\.id\}`\}/, 'Support category breadcrumb is a working link');
assert.match(supportLayout, /TopbarSectionBack rootHref="\/support"/, 'Support articles register topbar back navigation');
assert.match(adminLayout, /TopbarSectionBack rootHref="\/admin"/, 'every Admin subroute inherits topbar back navigation');
for (const parent of ['/admin/content/', '/admin/fulfillment/', '/admin/people/']) {
  assert.ok(adminLayout.includes(`prefix: '${parent}'`), `${parent} detail routes return to their owning list`);
}

assert.match(customerCommerce, /export async function hasCustomerOrders/, 'the account menu has a focused order-existence query');
assert.match(customerCommerce, /neq\('status', 'draft'\)[\s\S]*limit\(1\)/, 'only placed orders make Orders visible');
assert.match(topbar, /\{hasOrders && \([\s\S]*href="\/orders"/, 'Orders is hidden until an order exists');
const mobileSupportIndex = topbar.indexOf('href="/support"');
const mobileSettingsIndex = topbar.indexOf('href="/settings"');
assert.ok(mobileSupportIndex > 0 && mobileSupportIndex < mobileSettingsIndex, 'mobile Support appears immediately above Settings');
assert.match(topbar.slice(mobileSupportIndex, mobileSettingsIndex), /os-popover-item-mobile-only/, 'the added Support menu item remains mobile-only');

assert.match(storeDetail, /<ProductDetailsSection details=\{productDetails\}/, 'Store renders relevant Product Details');
assert.doesNotMatch(libraryDetail, /Product Details/, 'Product Details stays out of Library');
assert.match(storeDetail, /listReleaseVideoEmbeds/, 'Store loads release videos');
assert.match(storeDetail, /<LibraryVideoEmbedsSection embeds=\{videoEmbeds\}/, 'Store renders the same Videos section as Library');
assert.match(libraryDetail, /<h2 className="view-section-title">Tracklist<\/h2>/, 'Library keeps Tracklist directly above its track list');
assert.match(storeDetail, /<h2 className="view-section-title item-community-section-title">\{contentHeading\}<\/h2>/, 'Store keeps its content heading directly above the track list');

assert.match(releaseFeatures, /const MAX_RELEASE_VIDEOS = 10/, 'Studio allows ten release videos');
assert.doesNotMatch(releaseFeatures, /Enter video title|dashboard-field-label">Title/, 'Studio no longer asks for a video title');
assert.match(releaseDomain, /embeds: Array<\{ url: string \}>/, 'video persistence accepts URL-only drafts');
assert.match(videoMigration, /jsonb_array_length\(target_embeds\) > 10/, 'database boundary accepts no more than ten videos');
assert.match(videoMigration, /'YouTube video ' \|\| \(next_order \+ 1\)/, 'database creates an internal accessibility title for URL-only videos');

assert.doesNotMatch(newItem, /Choose a release date and total track count/, 'release date is not a create-time publishing gate');
assert.match(newItem, /release_date: normalizedReleaseDate/, 'new releases normalize invalid or incomplete dates to optional data');
assert.match(editItem, /release_date: normalizedReleaseDate/, 'release edits normalize invalid or incomplete dates to optional data');
assert.match(canonicalCss, /\.release-core-grid \.release-date-input \{[\s\S]*min-inline-size: 0;[\s\S]*max-inline-size: 100%;/, 'mobile release-date controls stay inside their grid column');

assert.match(uploadField, /AUDIO_UPLOAD_ACCEPT[\s\S]*\.m4a[\s\S]*\.aac/, 'phone audio chooser includes common iOS formats and extensions');
assert.match(uploads, /import\('tus-js-client'\)/, 'large uploads use the resumable TUS client');
assert.match(uploads, /retryDelays: \[0, 1_000, 3_000, 5_000, 10_000\]/, 'large uploads retry transient mobile-network failures');
assert.ok(uploadField.indexOf('onChange(uploadedValue)') < uploadField.indexOf('analyzeAudioFile(file)'), 'durable upload completes before optional audio analysis');
assert.match(uploadField, /else if \(accept\?\.includes\('audio'\) && onAudioMetadata\)[\s\S]*readAudioDuration\(file\)/, 'release tracks use lightweight duration metadata instead of full-file decoding');

console.log('Experience polish contract passed.');
