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
  sidebar,
  sidebarPreferences,
  globalCss,
  settingsPage,
  sectionTabs,
  welcomeApp,
  authExperience,
  adminHomeApp,
  publicProfile,
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
  read('src/components/Sidebar.tsx'),
  read('src/lib/dockPreferences.ts'),
  read('src/app/globals.css'),
  read('src/app/settings/page.tsx'),
  read('src/components/SectionTabs.tsx'),
  read('src/components/WelcomeApp.tsx'),
  read('src/components/AuthExperience.tsx'),
  read('src/components/admin/AdminHomeApp.tsx'),
  read('src/components/PublicProfileApp.tsx'),
]);
const informationDialog = await read('src/components/InformationDialog.tsx');

assert.doesNotMatch(supportArticle, /Reviewed for (?:the )?.*launch/i, 'Support articles omit internal launch-review copy');
assert.match(supportArticle, /href=\{`\/support#support-category-\$\{category\.id\}`\}/, 'Support category breadcrumb is a working link');
assert.match(supportLayout, /TopbarSectionBack rootHref="\/support"/, 'Support articles register topbar back navigation');
assert.match(adminLayout, /TopbarSectionBack rootHref="\/admin"/, 'every Admin subroute inherits topbar back navigation');
for (const parent of ['/admin/content/', '/admin/fulfillment/', '/admin/people/']) {
  assert.ok(adminLayout.includes(`prefix: '${parent}'`), `${parent} detail routes return to their owning list`);
}

assert.match(customerCommerce, /export async function hasCustomerOrders/, 'the Account hub has a focused order-existence query');
assert.match(customerCommerce, /neq\('status', 'draft'\)[\s\S]*limit\(1\)/, 'only placed orders make Orders visible');
assert.match(youApp, /\.\.\.\(hasOrders \? \[\{[\s\S]*href: '\/orders'/, 'Orders is hidden in Account until an order exists');
const accountProfileIndex = youApp.indexOf("href: profileHref");
const accountStudioIndex = youApp.indexOf("href: '/studio'");
const accountOrdersIndex = youApp.indexOf("href: '/orders'");
const accountMessagesIndex = youApp.indexOf("href: '/inbox'");
const accountAdminIndex = youApp.indexOf("href: '/admin'");
const accountTeamIndex = youApp.indexOf("href: '/team'");
const accountSettingsIndex = youApp.indexOf("href: '/settings'");
assert.ok(
  accountProfileIndex > 0
    && accountProfileIndex < accountStudioIndex
    && accountStudioIndex < accountOrdersIndex
    && accountOrdersIndex < accountMessagesIndex
    && accountMessagesIndex < accountAdminIndex
    && accountAdminIndex < accountTeamIndex
    && accountTeamIndex < accountSettingsIndex,
  'Account orders role-gated Admin or Team between Messages and Settings',
);
assert.doesNotMatch(youApp, /href: '\/(?:notifications|support)'/, 'Account omits Notifications and Support from its focused destination list');
assert.match(youApp, /profile\?\.role === 'admin'[\s\S]*href: '\/admin'[\s\S]*hasTeamAccess[\s\S]*href: '\/team'/, 'Account exposes Admin or Team only after the matching capability check');
assert.doesNotMatch(youApp, /HubHero title=\{`Welcome,/, 'Account no longer duplicates the personalized Home greeting');
assert.match(youApp, /you-mobile-identity[\s\S]*<SocialAvatar[\s\S]*<h1>\{displayName\}<\/h1>/, 'Account leads with the centered avatar and name identity');
assert.match(youApp, /<\/nav>[\s\S]*className="you-logout-action"[\s\S]*>Log Out<\/button>/, 'Log Out sits separately beneath the Account menu');
assert.doesNotMatch(topbar, /os-topbar-account-menu|aria-label="Your account"/, 'desktop Topbar omits the duplicate account avatar and menu');
assert.doesNotMatch(topbar, /PUBLIC_PURCHASES_AVAILABLE[\s\S]*cartCount/, 'a staged Cart remains reachable even while Checkout activation is fail closed');
assert.match(topbar, /os-topbar-search[\s\S]*os-topbar-notification-menu[\s\S]*cartCount > 0[\s\S]*os-topbar-cart-button/, 'Topbar orders Search, Notifications, then the wider Cart count control');
assert.match(globalCss, /--os-topbar-right-inset:[^;]*--os-content-inset[\s\S]*\.os-topbar\s*\{[\s\S]*padding:[^;]*var\(--os-topbar-right-inset\)/, 'desktop Topbar actions share the canonical page-action right edge');
assert.match(sidebar, /SidebarAccountItem[\s\S]*href="\/you"[\s\S]*sidebar-account-avatar[\s\S]*Account/, 'desktop Sidebar replaces Settings with an avatar-backed Account destination');
assert.match(sidebarPreferences, /SIDEBAR_COMPACT_WIDTH = 76[\s\S]*SIDEBAR_MIN_EXPANDED_WIDTH = 196[\s\S]*SIDEBAR_MAX_WIDTH = 280/, 'Sidebar resizing preserves the accepted compact, label-safe, and original maximum widths');
assert.match(sidebarPreferences, /SIDEBAR_WIDTH_STORAGE_KEY = '44-sidebar-width'[\s\S]*getSidebarWidth[\s\S]*setSidebarWidth/, 'Sidebar expanded width persists on the device');
assert.match(sidebar, /className="sidebar-resize-handle"[\s\S]*role="separator"[\s\S]*aria-label="Resize Sidebar"[\s\S]*onKeyDown=\{onResizeKeyDown\}[\s\S]*onPointerDown=\{onResizePointerDown\}/, 'Sidebar exposes an accessible pointer and keyboard resize edge');
assert.match(sidebar, /nextWidth <= SIDEBAR_MIN_EXPANDED_WIDTH[\s\S]*compactSidebar\(\)/, 'Sidebar snaps to the compact icon rail at its label-safe minimum');
assert.match(globalCss, /\.app-sidebar \{[\s\S]*width: var\(--os-sidebar-user-width, var\(--os-sidebar-width\)\)/, 'the live expanded Sidebar width drives shell geometry');
assert.match(globalCss, /\.sidebar-resize-handle \{[\s\S]*cursor: col-resize;/, 'the Sidebar edge advertises native horizontal resizing');
assert.doesNotMatch(`${sidebar}\n${libraryApp}`, /Pin (?:Creator )?to Dock|Dock Settings|Expand Dock|Compact Dock|aria-label="Dock"/, 'active navigation UI uses Sidebar product language');
assert.match(sectionTabs, /dockToTopbar[\s\S]*getBoundingClientRect\(\)\.top <= scroller![\s\S]*dataset\.topbarDocked = docked \? 'true' : 'false'[\s\S]*setTabs\(docked \? topbarTabsRef\.current : undefined\)/, 'shared section rails transfer visual ownership to the global Topbar at one scroll threshold without overlapping');
assert.match(globalCss, /\.section-tab-rail\[data-topbar-docked="true"\] \{[\s\S]*visibility: hidden;/, 'the in-page rail keeps its layout space but disappears while its Topbar counterpart is active');
assert.match(topbar, /os-topbar-tab-section[\s\S]*os-topbar-tab-section-first/, 'Topbar preserves the open underline-tab variant and exact first-tab alignment');
assert.match(storeDiscovery, /<SectionTabs ariaLabel="Discover categories" dockToTopbar topbarTabs=\{discoverTopbarTabs\}>[\s\S]*<SectionTab/, 'Home begins with its shared category rail and docks it into the Topbar while scrolling');
assert.match(libraryApp, /LIBRARY_FILTER_ORDER\.filter[\s\S]*Library categories" dockToTopbar topbarTabs=\{libraryTopbarTabs\}/, 'Library uses the same dockable categories and omits unavailable content types');
assert.match(storeDiscovery, /label: 'Featured'[\s\S]*label: 'Music'[\s\S]*label: 'Beats'[\s\S]*label: 'Samples'[\s\S]*label: 'Merch'[\s\S]*label: 'Books'[\s\S]*label: 'Games'/, 'Home tabs use the accepted Music, Beats, Samples, Merch, Books, and Games order');
assert.match(storeDiscovery, /const featuredTitle = user[\s\S]*`Welcome, \$\{authenticatedViewerName\}`[\s\S]*: 'Discover'/, 'Featured greets signed-in viewers by name and remains Discover for signed-out viewers');
assert.match(storeDiscovery, /STORE_FILTER_TITLES[\s\S]*music: 'Browse Music'[\s\S]*physical: 'Browse Merch'[\s\S]*asset: 'Browse Samples'[\s\S]*book: 'Browse Books'[\s\S]*interactive: 'Browse Games'/, 'category selections expose consistent Browse titles');
assert.match(storeDiscovery, /function browseBeats\(\)[\s\S]*setActiveFilter\('music'\)[\s\S]*setTypeFilter\('Beat'\)[\s\S]*return category === 'all' \?[\s\S]*onClick=\{option\.category === 'beats' \? browseBeats/, 'Beats behaves as a Home tab instead of the differently styled route link');
assert.match(storeDiscovery, /\{!frontDoor && category !== 'beats' && <label className="page-search-control/, 'the dedicated Beats view also omits the redundant inline Search field');
assert.match(settingsPage, /id="appearance"[\s\S]*id="account"[\s\S]*id="notifications"/, 'Settings keeps Appearance, Account, and Notifications in one continuous page order');
assert.doesNotMatch(settingsPage, /<SectionTabs|activeSection|hidden=\{activeSection/, 'Settings does not hide its sections behind tabs');
assert.match(settingsPage, /role="radiogroup" aria-label="Theme mode"[\s\S]*settings-theme-swatch-\$\{m\.id\}[\s\S]*role="group" aria-label="Accent color"/, 'Theme and Accent use the same visual selector grammar');
assert.match(globalCss, /\.settings-theme-swatch-system \{[\s\S]*linear-gradient\(90deg, #fff 0 50%, #111 50% 100%\)/, 'System appearance uses the half-light, half-dark circular preview');
assert.match(globalCss, /\.settings-swatch-dot \{[\s\S]*width: 18px;[\s\S]*height: 18px;[\s\S]*flex: 0 0 18px;[\s\S]*\.settings-theme-field \.settings-swatch,[\s\S]*\.settings-accent-field \.settings-swatch \{[\s\S]*width: 104px;[\s\S]*flex: 0 0 104px;[\s\S]*justify-content: center;/, 'every Theme and Accent pill uses the System-safe width with centered content and unsquished circles');
assert.match(canonicalCss, /\.settings-two-column[\s\S]*\.settings-theme-field \{[\s\S]*grid-column: 1 \/ -1;[\s\S]*grid-row: 1;[\s\S]*\.settings-accent-field \{[\s\S]*grid-column: 1 \/ -1;[\s\S]*grid-row: 2;/, 'Theme and Accent occupy separate full-width, left-aligned rows');

assert.match(storeDetail, /<ProductDetailsSection details=\{productDetails\}/, 'Store renders relevant Product Details');
assert.doesNotMatch(`${storeDetail}\n${storeDiscovery}`, /Sign In to Save|Purchasing coming soon|Paid sales unavailable/, 'Store actions never replace available actions with signed-out or coming-soon labels');
assert.match(storeDetail, /userSignedIn[\s\S]*\{ label: 'Add to Library', href: '\/login'/, 'signed-out Store visitors see Add to Library and reach Login when they select it');
assert.match(storeDetail, /paidDownloadAvailable[\s\S]*product\.download_purchase_enabled[\s\S]*product\.paid_offer_available === true[\s\S]*label: 'Buy Download'/, 'enabled paid downloads expose Buy Download without a disabled placeholder');
assert.doesNotMatch(libraryDetail, /Product Details/, 'Product Details stays out of Library');
assert.match(storeDetail, /listReleaseVideoEmbeds/, 'Store loads release videos');
assert.match(storeDetail, /<LibraryVideoEmbedsSection embeds=\{videoEmbeds\}/, 'Store renders the same Videos section as Library');
assert.match(libraryDetail, /<h2 className="view-section-title">Tracklist<\/h2>/, 'Library keeps Tracklist directly above its track list');
assert.match(storeDetail, /<h2 className="view-section-title item-community-section-title">\{contentHeading\}<\/h2>/, 'Store keeps its content heading directly above the track list');
assert.match(storeDetail, /if \(product\.beat\) \{[\s\S]*label: 'Buy License'[\s\S]*onClick: onBuyLicense/, 'Beat detail replaces Add to Library with a Buy License scroll action');
assert.match(storeDetail, /getContentHeading[\s\S]*if \(product\.beat\) return 'Preview'/, 'Beat detail labels its tagged audio section Preview');
assert.ok(storeDetail.indexOf('<BeatLicensePanel product={product}') > storeDetail.indexOf('view-tracklist-section'), 'Beat Preview precedes Licenses');
assert.ok(storeDetail.indexOf('<ProductDetailsSection details={productDetails}') > storeDetail.indexOf('<BeatLicensePanel product={product}'), 'Beat Licenses precede Product Details');
assert.match(storeDetail, /className="beat-license-actions"[\s\S]*License Info[\s\S]*Add to Cart/, 'each Beat license keeps License Info beside a rightmost Cart action');
assert.match(storeDetail, /if \(product\.beat\) \{[\s\S]*label: 'BPM'[\s\S]*label: 'Key'[\s\S]*label: 'Time signature'[\s\S]*label: 'Moods'[\s\S]*label: 'Instruments'/, 'Beat Product Details expose musical metadata instead of generic track counts');
assert.doesNotMatch(storeDetail, /Review only|Purchasing is unavailable while Beat commerce|Tagged Preview/, 'Beat detail omits the retired review-only and unavailable presentation');
assert.match(storeDetail, /\{!isBeat \? <ProductReviewsSection/, 'Beat detail omits Reviews');
assert.match(itemDetails, /item\.beat && beatReviewSurfacesEnabled[\s\S]*hydrateBeatProducts\(paidRows\)[\s\S]*!item\.beat \|\| Boolean\(candidate\.beat\)/, 'Beat related Items hydrate and retain Beats only');
assert.match(storeDetail, /related\.length > 0 \|\| isBeat[\s\S]*No other Beats from this creator yet\./, 'Beat related content retains an explicit empty state');
assert.match(informationDialog, /createPortal[\s\S]*useUi44DialogFocus[\s\S]*role="dialog"[\s\S]*aria-modal="true"[\s\S]*aria-label="Close"[\s\S]*document\.body/, 'the reusable information dialog portals above the complete shell, traps focus, and exposes an explicit close action');
assert.match(globalCss, /\.information-dialog-overlay \{[\s\S]*position: fixed;[\s\S]*inset: 0;[\s\S]*place-items: center;[\s\S]*\.information-dialog-overlay > \.ui44-dialog-scrim \{[\s\S]*rgba\(0, 0, 0, 0\.7\)/, 'information dialogs center over a full-viewport darkened backdrop');
assert.match(storeDiscovery, /effectiveTypeFilter !== 'all' && !browsingBeats/, 'the implicit Beats category does not falsely mark the filter control active');

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
assert.match(studioOverview, /const STUDIO_CREATE_ACTIONS = \[[\s\S]*Add Music[\s\S]*Add Book[\s\S]*Add Game[\s\S]*beatReviewSurfacesEnabled[\s\S]*Add Beat[\s\S]*Add Sample Pack[\s\S]*\];/, 'Studio plus actions use the intended concise order with the gated Beat action before Sample Packs');
assert.doesNotMatch(studioOverview.match(/const STUDIO_CREATE_ACTIONS = \[[\s\S]*?\];/)?.[0] ?? '', /Add Update|Add Samples|Add Event/, 'Studio plus actions omit retired creation labels');
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

assert.match(storeDiscovery, /featuredProduct \? <DiscoverFeature/, 'Discover opens with one editorial release feature');
assert.match(storeDiscovery, /discover-feature-eyebrow">FEATURED RELEASE<[\s\S]*<strong>\{product\.title\}<\/strong>[\s\S]*discover-feature-link">Explore release →</, 'the feature contains only its eyebrow, title, and release action');
assert.doesNotMatch(storeDiscovery, /product\.feature_description \|\| product\.short_description/, 'the feature omits its former descriptive sentence');
assert.doesNotMatch(storeDiscovery, /title="Recently Added"/, 'Discover removes the duplicate Recently Added shelf');
assert.match(storeDiscovery, /const sortedMusicProducts = \[\.\.\.musicProducts\]\.sort\(comparePublicCatalogProducts\)[\s\S]*const featuredProductIds[\s\S]*const newReleaseProducts = keepNewestProductPerCreator\(sortedMusicProducts, featuredProductIds\)\.slice\(0, 8\)/, 'New Releases keeps the latest non-featured release from at most eight creators in release chronology');
assert.match(storeDiscovery, /const newReleaseProductIds[\s\S]*const browseMusicProducts = sortedMusicProducts[\s\S]*!featuredProductIds\.has\(product\.id\)[\s\S]*!newReleaseProductIds\.has\(product\.id\)[\s\S]*slice\(0, 8\)/, 'Browse Music contains the next releases without duplicating the feature or New Releases');
assert.ok(storeDiscovery.indexOf('title="New Releases"') < storeDiscovery.indexOf('title="New Creators"'), 'New Releases immediately follows the editorial feature');
assert.ok(storeDiscovery.indexOf('title="New Creators"') < storeDiscovery.indexOf('title="Creators You Follow"'), 'New Creators precedes followed-creator content');
assert.ok(storeDiscovery.indexOf('title="Creators You Follow"') < storeDiscovery.indexOf('title="Browse Music"'), 'Browse Music follows Creators You Follow');
assert.ok(storeDiscovery.indexOf('title="Browse Music"') < storeDiscovery.indexOf('title="Browse Beats"'), 'Browse Music precedes Browse Beats');
assert.ok(storeDiscovery.indexOf('title="Browse Beats"') < storeDiscovery.indexOf('title="Browse Samples"'), 'Browse Beats precedes Browse Samples');
assert.ok(storeDiscovery.indexOf('title="Browse Samples"') < storeDiscovery.indexOf('title="Browse Merch"'), 'Browse Samples precedes Browse Merch');
assert.ok(storeDiscovery.indexOf('title="Browse Merch"') < storeDiscovery.indexOf('title="Browse Books"'), 'Browse Merch precedes Browse Books');
assert.ok(storeDiscovery.indexOf('title="Browse Books"') < storeDiscovery.indexOf('title="Browse Games"'), 'Browse Books precedes Browse Games at the quiet end of Discover');
assert.match(storeDiscovery, /title="New Creators"[\s\S]*discover-creator-shelf[\s\S]*href=\{profileHref\}[\s\S]*discover-creator-main[\s\S]*<strong>\{name\}<\/strong>/, 'Discover presents image-and-name Creator links that open public profiles');
assert.doesNotMatch(storeDiscovery, /toggleCreatorFollow|followBusyId|View releases/, 'New Creator cards omit follow and secondary actions');
assert.match(storeDiscovery, /preferredCreatorContentTab[\s\S]*music[\s\S]*beats[\s\S]*books[\s\S]*sample-packs[\s\S]*games[\s\S]*merch/, 'Home Creator links select the first available published content tab');
assert.match(storeDiscovery, /preferredTab \? `\$\{profilePath\}\?tab=\$\{preferredTab\}` : profilePath/, 'Home Creator links fall back to the default profile when no published Item exists');
assert.match(publicProfile, /normalized === 'games'[\s\S]*creatorTabs\.push\(\{ id: 'games', label: 'Games' \}\)[\s\S]*tab === 'games'/, 'public profiles support the Games destination used by Home Creator links');
assert.match(publicProfile, /isOwn && <div className="social-profile-owner-tools">[\s\S]*href="\/profile\/edit"[\s\S]*aria-label="Edit profile"[\s\S]*<ProfileEditIcon/, 'owner profiles expose one pencil edit action in the page action column');
assert.doesNotMatch(publicProfile, />Edit Profile<|>Open Studio</, 'owner profiles omit the former large Edit Profile and Open Studio buttons');
assert.match(globalCss, /\.social-profile-owner-tools \{[\s\S]*position: absolute;[\s\S]*top: 16px;[\s\S]*right: 16px;/, 'the profile pencil aligns beneath the Topbar Search control column');
assert.doesNotMatch(storeDiscovery, /spotlightCreators|New releases from \$\{spotlight\.creatorName\}/, 'Discover omits the experimental artist-specific release shelves');
assert.match(globalCss, /\.discover-feature \{[\s\S]*min-height: clamp\(340px, 36vw, 510px\)/, 'the Discover feature uses the accepted taller editorial proportion');
assert.doesNotMatch(globalCss, /\.discover-feature:hover/, 'the Discover feature has no hover motion');
assert.match(storeDiscovery, /const showStoreFilter = !frontDoor \|\| effectiveFilter !== 'all' \|\| hasActiveFacetFilters/, 'Featured hides its irrelevant filter until a category or facet is active');
assert.match(storeDiscovery, /const followingProducts = keepNewestProductPerCreator/, 'Creators You Follow keeps one Item per creator');
assert.match(libraryApp, /LIBRARY_GROUP_ORDER[\s\S]*Music[\s\S]*Beats[\s\S]*Sample Packs[\s\S]*Books[\s\S]*Games/, 'Library All groups saved Items in the accepted Home-aligned content order');
assert.match(libraryApp, /activeFilter !== 'all'[\s\S]*label: null, rows: visibleRows/, 'filtered Library views show only the selected content without a redundant section heading');
assert.match(itemDetails, /localMaskPreviewEnabled && itemId === LOCAL_MASK_ITEM_ID[\s\S]*saveLocalMask\(\)/, 'the MASK browser-storage shortcut is development-only');
assert.match(itemDetails, /const saveResult = await supabase\.rpc\('save_item_to_library'/, 'production MASK acquisition uses the canonical Library RPC');
assert.match(adminPage, /href="\/admin\/home"[\s\S]*Home editorial/, 'Admin exposes the narrow Discover editorial control');
assert.match(adminHomeApp, /setAdminHomeFeaturedItem[\s\S]*Featured release[\s\S]*Reason/, 'Admin Home selects one release and requires an audited reason');
assert.doesNotMatch(nextConfig, /source: "\/admin\/home", destination: "\/admin"/, 'Admin Home is no longer redirected away');
assert.match(storeDiscovery, />Sort by<[\s\S]*value="release-date">Release date<[\s\S]*value="recently-added">Recently added</, 'Browse exposes release-date and recently-added sorting first in the filter');
assert.match(storeDiscovery, /title="New Releases"[\s\S]*browseCategory\('music', 'release-date'\)/, 'New Releases opens release-date Browse Music');
assert.match(authExperience, /creatorAccountRequested[\s\S]*router\.replace\('\/welcome'\)/, 'new accounts enter the welcome journey after an immediate session is established');
assert.match(welcomeApp, /Creator setup is open\. Publishing remains locked until 44 completes its review\./, 'Creator onboarding separates profile setup from publishing approval');
assert.match(welcomeApp, /MEMBER_GUIDE[\s\S]*CREATOR_GUIDE[\s\S]*Right-click/, 'Welcome provides concise Member and Creator guidance plus the desktop interaction hint');
assert.match(canonicalCss, /:is\(\.ui44-section-header, \.hub-section-head\) \{[\s\S]*align-items: center;/, 'shared section actions center on the title row');
assert.match(canonicalCss, /\.store-app-page \.page-filter-menu \{\s*margin-right: 0;/, 'desktop Store filters align with the Topbar action column');
assert.match(legacyTrackRepairMigration, /62277a2a-f9cf-4e3b-9a29-09deb03bb512[\s\S]*1783191107348-01-touch-feat\.-kholor-\.mp3/, 'the legacy touch track repair targets the verified replacement object');
assert.match(legacyTrackRepairMigration, /ad7f8882-b3e2-55ab-8359-d11fedb83f42[\s\S]*07\.%20Where%20You%20At'/, 'the legacy Where You At track repair removes the URL-breaking question mark');
assert.match(legacyTrackRepairMigration, /0025cb74-5e4b-4f36-9dc6-fea8f09759ba[\s\S]*duration_seconds = 155/, 'GET OUT receives its measured source-file duration');
assert.match(legacyTrackRepairMigration, /changed after inventory; refusing to overwrite it/, 'legacy repairs fail closed when production data has changed');

console.log('Experience polish contract passed.');
