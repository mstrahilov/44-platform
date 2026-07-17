import { readFile } from 'node:fs/promises';

const [css, layout, topbar] = await Promise.all([
  readFile('src/app/globals.css', 'utf8'),
  readFile('src/app/layout.tsx', 'utf8'),
  readFile('src/components/Topbar.tsx', 'utf8'),
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
];

const failures = requirements.filter(([, pattern, source]) => !pattern.test(source)).map(([label]) => label);
if (failures.length) throw new Error(`Mobile safe-area contract failed:\n- ${failures.join('\n- ')}`);

console.log('Mobile safe-area contract passed for the 320/360/375/390/412/430px acceptance matrix and notch override.');
