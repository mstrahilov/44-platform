import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [
  topbar,
  youApp,
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
  storeDiscovery,
  canonicalCss,
  videoMigration,
  studioPricing,
  radioDomain,
  autoRadioMigration,
  bookAndSamplePackMigration,
  requiredMusicMetadataMigration,
  adminReleaseDateMigration,
  adminContentDetail,
  studioOverview,
  legacyTrackRepairMigration,
  libraryApp,
  itemDetails,
  adminPage,
  nextConfig,
] = await Promise.all([
  read('src/components/Topbar.tsx'),
  read('src/components/YouApp.tsx'),
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
  read('src/components/StoreApp.tsx'),
  read('src/styles/44-ui/canonical-system.css'),
  read('supabase/migrations/20260718012000_m13_release_video_limit_ten.sql'),
  read('src/components/StudioPricingFields.tsx'),
  read('src/lib/radio.ts'),
  read('supabase/migrations/20260719020000_auto_radio_and_music_download_controls.sql'),
  read('supabase/migrations/20260719021000_book_access_and_sample_pack_pricing.sql'),
  read('supabase/migrations/20260719022000_required_music_release_metadata.sql'),
  read('supabase/migrations/20260719023000_admin_release_date_corrections.sql'),
  read('src/components/admin/AdminContentDetailApp.tsx'),
  read('src/app/studio/page.tsx'),
  read('supabase/migrations/20260720050000_repair_legacy_track_metadata.sql'),
  read('src/components/LibraryApp.tsx'),
  read('src/lib/domain/itemDetails.ts'),
  read('src/app/admin/page.tsx'),
  read('next.config.ts'),
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
const mobileSupportIndex = youApp.indexOf("href: '/support'");
const mobileSettingsIndex = youApp.indexOf("href: '/settings'");
assert.ok(mobileSupportIndex > 0 && mobileSupportIndex < mobileSettingsIndex, 'mobile Support appears immediately above Settings');
assert.doesNotMatch(topbar, /href="\/support"[\s\S]*href="\/settings"/, 'desktop account menu does not repeat Support and Settings from the Dock');

assert.match(storeDetail, /<ProductDetailsSection details=\{productDetails\}/, 'Store renders relevant Product Details');
assert.doesNotMatch(`${storeDetail}\n${storeDiscovery}`, /Sign In to Save|Purchasing coming soon|Paid sales unavailable/, 'Store actions never replace available actions with signed-out or coming-soon labels');
assert.match(storeDetail, /userSignedIn[\s\S]*\{ label: 'Add to Library', href: '\/login'/, 'signed-out Store visitors see Add to Library and reach Login when they select it');
assert.match(storeDetail, /paidDownloadAvailable[\s\S]*product\.download_purchase_enabled[\s\S]*product\.paid_offer_available === true[\s\S]*label: 'Buy Download'/, 'enabled paid downloads expose Buy Download without a disabled placeholder');
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

assert.match(newItem, /Choose a valid release date\.[\s\S]*Release Date[\s\S]*required[\s\S]*Track Count[\s\S]*required/, 'new Music requires Release Date and Track Count');
assert.match(newItem, /section\.id === 'books'[\s\S]*isMerchProduct[\s\S]*: null\}[\s\S]*section\.id !== 'assets' \? <div className="dashboard-field">[\s\S]*Item Tags/, 'new Sample Packs hide Release Date, Item Type, and Item Tags');
assert.match(newItem, /NEW_MUSIC_ITEM_TYPE_SLUGS = new Set\(\['album', 'ep', 'single', 'mixtape'\]\)[\s\S]*NEW_MUSIC_ITEM_TYPE_SLUGS\.has\(type\.slug\)/, 'standard New Releases expose only Album, EP, Single, and Mixtape Item Types');
assert.doesNotMatch(newItem, /<StudioBookFields/, 'new Books end with the protected full-PDF upload');
assert.doesNotMatch(storeDetail, /Read Sample|mode=sample|book-sample-callout/, 'Store Books expose Library and paid-download actions without a sample reader');
assert.match(newItem, /release_date: normalizedReleaseDate/, 'new releases normalize invalid or incomplete dates to optional data');
assert.match(editItem, /release_date: normalizedReleaseDate/, 'release edits normalize invalid or incomplete dates to optional data');
assert.match(editItem, /if \(isMusicProduct && !normalizedReleaseDate\)[\s\S]*Choose a valid release date\.[\s\S]*Release Date[\s\S]*required/, 'Music creation and editing share the required Release Date rule');
assert.match(requiredMusicMetadataMigration, /'missing_release_date','Choose a Release Date\.'[\s\S]*experience_type='music' and release_date is null/, 'Music publication health requires a Release Date');
assert.match(requiredMusicMetadataMigration, /\('Album','album',10\)[\s\S]*\('EP','ep',20\)[\s\S]*\('Single','single',30\)[\s\S]*\('Mixtape','mixtape',40\)/, 'the canonical standard Music Item Types are available');
assert.match(adminReleaseDateMigration, /set_admin_item_release_date[\s\S]*experience_type<>'music'[\s\S]*release_date=target_release_date[\s\S]*year=extract\(year from target_release_date\)[\s\S]*admin_item_release_date_events/, 'Admin Release Date corrections are Music-only, synchronize year, and are audited');
assert.match(adminReleaseDateMigration, /admin_item_release_date_events_immutable[\s\S]*reject_admin_audit_mutation/, 'Release Date correction history is immutable');
assert.match(adminContentDetail, /setAdminItemReleaseDate\(item\.id, releaseDate, reason\)/, 'Admin content detail persists the confirmed Release Date correction');
assert.match(adminContentDetail, /title="Release Date"[\s\S]*setReleaseDateAction\(true\)[\s\S]*title="Save Release Date\?"/, 'Admin content detail exposes a confirmed Release Date correction control');
assert.match(studioOverview, /const STUDIO_CREATE_ACTIONS = \[[\s\S]*Add Music[\s\S]*Add Book[\s\S]*Add Game[\s\S]*Add Sample Pack[\s\S]*\];/, 'Studio plus actions use the intended concise order');
assert.doesNotMatch(studioOverview.match(/const STUDIO_CREATE_ACTIONS = \[[\s\S]*?\];/)?.[0] ?? '', /Add Update|Add Samples|Add Beat|Add Event/, 'Studio plus actions contain only the four intended labels');
assert.match(canonicalCss, /\.release-core-grid \.release-date-input \{[\s\S]*min-inline-size: 0;[\s\S]*max-inline-size: 100%;/, 'mobile release-date controls stay inside their grid column');
assert.match(studioPricing, /freeAccessDescription[\s\S]*Offer a paid download/, 'Music and Book Studio explain free access and optional paid downloads with a checkbox');
assert.match(studioPricing, /paidDownloadRequired[\s\S]*Sample Packs are paid downloads/, 'Sample Pack Studio always presents required paid-download pricing');
assert.match(newItem, /Everyone can listen and add this release to their Library for free[\s\S]*Everyone can read and add this book to their Library for free[\s\S]*paidDownloadRequired=\{section\.id === 'assets'\}/, 'new Music, Books, and Sample Packs use their intended pricing model');
assert.match(editItem, /Everyone can listen and add this release to their Library for free[\s\S]*Everyone can read and add this book to their Library for free[\s\S]*paidDownloadRequired=\{section\.id === 'assets'\}/, 'Music, Book, and Sample Pack edits preserve their intended pricing model');
assert.match(newItem, /streaming_enabled: isMusicProduct \? true : isGameProduct \? false : undefined,[\s\S]*download_purchase_enabled: !isMerchProduct \? \(isGameProduct \? false : !isFree\) : undefined/, 'new digital Items persist streaming and paid-download capabilities independently while reviewed Games remain non-downloadable');
assert.match(editItem, /isMusicProduct \? \{ streaming_enabled: true \} : isGameProduct \? \{ streaming_enabled: false \} : \{\}[\s\S]*download_purchase_enabled: isGameProduct \? false : !isFree/, 'digital Item edits preserve streaming and paid-download choices while reviewed Games remain non-downloadable');
assert.doesNotMatch(`${newItem}\n${editItem}`, /Creator payouts enabled\./, 'Studio omits the redundant creator-payout success status');
assert.match(autoRadioMigration, /item\.status='published'[\s\S]*item\.experience_type='music'[\s\S]*streaming_enabled[\s\S]*radio_playlist_entries/, 'automatic Radio enrollment accepts only published streaming Music');
assert.match(autoRadioMigration, /tracks_sync_radio_playlist[\s\S]*catalog_items_sync_radio_playlist/, 'Radio enrollment reacts to both playable track creation and Item publication');
assert.match(autoRadioMigration, /on conflict\(track_id\) do nothing/, 'automatic Radio enrollment is idempotent and preserves existing Admin playlist state');
assert.match(radioDomain, /product\.status !== 'published'[\s\S]*product\.experience_type !== 'music'[\s\S]*product\.streaming_enabled === false/, 'Radio playback independently filters stale or ineligible playlist rows');
assert.match(bookAndSamplePackMigration, /new\.experience_type='book'[\s\S]*entitlement_type\) values\(offer_id,'read'\)/, 'published Books always receive free Library and reader access');
assert.match(bookAndSamplePackMigration, /enforce_paid_sample_pack[\s\S]*new\.experience_type='asset'[\s\S]*new\.price_cents<=0[\s\S]*not new\.download_purchase_enabled/, 'the database rejects published Sample Packs without an enabled positive-price download');
assert.match(canonicalCss, /\.studio-sample-preview-count-field \{[\s\S]*width: min\(360px, 100%\);[\s\S]*margin-top: 16px;/, 'Sample Preview Count occupies its own bounded row below the section description');

assert.match(uploadField, /AUDIO_UPLOAD_ACCEPT[\s\S]*\.m4a[\s\S]*\.aac/, 'phone audio chooser includes common iOS formats and extensions');
assert.match(uploads, /import\('tus-js-client'\)/, 'large uploads use the resumable TUS client');
assert.match(uploads, /retryDelays: \[0, 1_000, 3_000, 5_000, 10_000\]/, 'large uploads retry transient mobile-network failures');
assert.ok(uploadField.indexOf('onChange(uploadedValue)') < uploadField.indexOf('analyzeAudioFile(file)'), 'durable upload completes before optional audio analysis');
assert.match(uploadField, /if \(processed\)[\s\S]*processed\.durationSeconds[\s\S]*else if \(!processed && accept\?\.includes\('audio'\) && onAudioMetadata\)[\s\S]*readAudioDuration\(file\)/, 'processed release tracks use verified worker duration while legacy uploads keep lightweight metadata reads');

assert.ok(storeDiscovery.indexOf('title="Recently Added"') < storeDiscovery.indexOf('title="New in Music"'), 'Recently Added is the first Home shelf');
assert.match(storeDiscovery, /const newReleaseProducts = \[\.\.\.musicProducts\][\s\S]*sort\(comparePublicCatalogProducts\)[\s\S]*slice\(0, 8\)/, 'New in Music uses the eight newest releases by public release chronology');
assert.match(storeDiscovery, /function buildRecentlyAddedProducts\(products: Product\[\], excludedProductIds: Set<string>, limit: number\)[\s\S]*filter\(product => !excludedProductIds\.has\(product\.id\)\)[\s\S]*slice\(0, limit\)/, 'Recently Added excludes New in Music and selects the newest remaining uploads directly');
assert.match(storeDiscovery, /const recentlyAddedProducts = buildRecentlyAddedProducts\([\s\S]*\['music', 'book', 'interactive', 'asset', 'physical'\][\s\S]*sort\(compareRecentlyAddedProducts\)[\s\S]*newReleaseProductIds,[\s\S]*8,[\s\S]*\)/, 'Recently Added displays eight Items across all supported categories in creation order');
assert.match(storeDiscovery, /HOME_BROWSE_SHELF_ORDER[\s\S]*\['book', 'interactive', 'physical', 'asset'\]/, 'category shelves follow Books, Games, Merch, and Sample Packs');
assert.match(storeDiscovery, /const showStoreFilter = !frontDoor \|\| effectiveFilter !== 'all' \|\| hasActiveFacetFilters/, 'Featured hides its irrelevant filter until a category or facet is active');
assert.match(storeDiscovery, /const followingProducts = keepNewestProductPerCreator/, 'Creators You Follow keeps one Item per creator');
assert.match(libraryApp, /LIBRARY_GROUP_ORDER[\s\S]*Music[\s\S]*Books[\s\S]*Games[\s\S]*Sample Packs/, 'Library All groups saved Items under labeled content sections');
assert.match(libraryApp, /activeFilter !== 'all'[\s\S]*label: null, rows: visibleRows/, 'filtered Library views show only the selected content without a redundant section heading');
assert.match(itemDetails, /localMaskPreviewEnabled && itemId === LOCAL_MASK_ITEM_ID[\s\S]*saveLocalMask\(\)/, 'the MASK browser-storage shortcut is development-only');
assert.match(itemDetails, /const saveResult = await supabase\.rpc\('save_item_to_library'/, 'production MASK acquisition uses the canonical Library RPC');
assert.doesNotMatch(adminPage, /\/admin\/home|New Releases/, 'Admin no longer exposes the retired manual Discover shelf editor');
assert.match(nextConfig, /source: "\/admin\/home", destination: "\/admin", permanent: true/, 'retired Admin Home links return to the active Admin hub');
assert.match(storeDiscovery, />Sort by<[\s\S]*value="release-date">Release date<[\s\S]*value="recently-added">Recently added</, 'Browse exposes release-date and recently-added sorting first in the filter');
assert.match(storeDiscovery, /title="New in Music"[\s\S]*browseCategory\('music', 'release-date'\)/, 'New in Music opens release-date Browse');
assert.match(storeDiscovery, /title="Recently Added"[\s\S]*browseCategory\('music', 'recently-added'\)/, 'Recently Added opens creation-time Browse');
assert.match(canonicalCss, /:is\(\.ui44-section-header, \.hub-section-head\) \{[\s\S]*align-items: center;/, 'shared section actions center on the title row');
assert.match(canonicalCss, /\.store-app-page \.page-filter-menu \{\s*margin-right: 0;/, 'desktop Store filters align with the Topbar action column');
assert.match(legacyTrackRepairMigration, /62277a2a-f9cf-4e3b-9a29-09deb03bb512[\s\S]*1783191107348-01-touch-feat\.-kholor-\.mp3/, 'the legacy touch track repair targets the verified replacement object');
assert.match(legacyTrackRepairMigration, /ad7f8882-b3e2-55ab-8359-d11fedb83f42[\s\S]*07\.%20Where%20You%20At'/, 'the legacy Where You At track repair removes the URL-breaking question mark');
assert.match(legacyTrackRepairMigration, /0025cb74-5e4b-4f36-9dc6-fea8f09759ba[\s\S]*duration_seconds = 155/, 'GET OUT receives its measured source-file duration');
assert.match(legacyTrackRepairMigration, /changed after inventory; refusing to overwrite it/, 'legacy repairs fail closed when production data has changed');

console.log('Experience polish contract passed.');
