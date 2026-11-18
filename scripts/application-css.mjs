import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export function readApplicationCss() {
  const sources = ['src/app/globals.css', 'src/styles/44-ui/canonical-system.css'];
  return sources.map(path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')).join('\n\n');
}

export function applicationCssHref(css) {
  const hash = createHash('sha256').update(css).digest('hex').slice(0, 20);
  return `/_surface/versioned/44os-app.${hash}.css`;
}

export function readPreparedApplicationCssHref() {
  try {
    const css = readFileSync(new URL('../public/_surface/44os-app.css', import.meta.url));
    return applicationCssHref(css);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return '/_surface/44os-app.css';
  }
}
