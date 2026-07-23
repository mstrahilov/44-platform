import { readFile } from 'node:fs/promises';

const [css, layout, topbar, sidebar, osApps, youPage] = await Promise.all([
  readFile('src/app/globals.css', 'utf8'),
  readFile('src/app/layout.tsx', 'utf8'),
  readFile('src/components/Topbar.tsx', 'utf8'),
  readFile('src/components/Sidebar.tsx', 'utf8'),
  readFile('src/lib/osApps.ts', 'utf8'),
  readFile('src/app/you/page.tsx', 'utf8'),
]);

const requirements = [
  ['viewport-fit cover', /viewportFit:\s*'cover'/, layout],
  ['native safe-area token', /--os-safe-area-top:\s*env\(safe-area-inset-top,\s*0px\)/, css],
  ['separate topbar content height', /--os-topbar-content-height:\s*60px/, css],
  ['total topbar includes safe area', /--os-topbar-height:\s*calc\(var\(--os-topbar-content-height\)\s*\+\s*var\(--os-safe-area-top\)\)/, css],
  ['deterministic notch override', /html\[data-safe-area-test='notch'\][\s\S]*--os-safe-area-top:\s*47px/, css],
  ['topbar pads below safe area', /\.os-topbar[\s\S]*padding:\s*var\(--os-safe-area-top\)/, css],
  ['mobile search clears status bar', /\.os-topbar-search-form[\s\S]*top:\s*calc\(var\(--os-safe-area-top\)\s*\+\s*8px\)/, css],
  ['right controls cannot shrink', /\.os-topbar-right[\s\S]*flex-shrink:\s*0/, css],
  ['left controls may shrink', /\.os-topbar-left[\s\S]*min-width:\s*0/, css],
  ['account control remains labelled', /aria-label="Your account"/, topbar],
  ['mobile Search is a real topbar form', /className="os-topbar-search-mobile"[\s\S]*type="search"[\s\S]*placeholder="Search"/, topbar],
  ['mobile account popover is replaced by Account', /\.os-topbar-account-menu,\s*\.os-topbar-login-avatar\s*{\s*display:\s*none/, css],
  ['mobile Dock has five equal columns', /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/, css],
  ['mobile Dock order is Home Library Radio Community Account', /getOSApp\('store'\)[\s\S]*getOSApp\('library'\)[\s\S]*getOSApp\('radio'\)[\s\S]*getOSApp\('community'\)[\s\S]*getOSApp\('you'\)/, sidebar],
  ['mobile Dock has visible labels', /className="mobile-dock-label"/, sidebar],
  ['mobile Account routes own the Account Dock state', /pathname\.startsWith\('\/you'\)[\s\S]*return 'you'/, osApps],
  ['Account route renders the account destination', /return <YouApp \/>/, youPage],
  ['Search entry is limited to the three hub families', /MOBILE_STORE_SEARCH_ROUTES[\s\S]*MOBILE_COMMUNITY_SEARCH_ROUTES[\s\S]*MOBILE_LIBRARY_SEARCH_ROUTES[\s\S]*mode: 'search'/, osApps],
  ['Search results retain Search with Back', /pathname === '\/search'[\s\S]*mode: 'search-back'/, osApps],
  ['mobile Search updates results dynamically', /window\.setTimeout\([\s\S]*router\.replace\(/, topbar],
  ['detail and account routes receive mobile Back', /mode: 'back', fallbackHref:/, osApps],
  ['shared bottom shell includes Dock and safe area', /--os-mobile-shell-bottom:\s*calc\([\s\S]*var\(--os-mobile-dock-height\)\s*\+\s*env\(safe-area-inset-bottom\)/, css],
  ['mobile player sits exactly above the shell bottom', /\.music-player-bar\s*{[\s\S]*bottom:\s*var\(--os-mobile-shell-bottom\)/, css],
];

const failures = requirements.filter(([, pattern, source]) => !pattern.test(source)).map(([label]) => label);
if (failures.length) throw new Error(`Mobile safe-area contract failed:\n- ${failures.join('\n- ')}`);

console.log('Mobile shell contract passed for the 320/360/375/390/412/430px acceptance matrix, route-aware Search/Back states, Account destination, notch override, and player spacing.');
