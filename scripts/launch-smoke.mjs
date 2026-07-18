const baseUrl = (process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const reviewedSurfacesEnabled = process.env.SMOKE_REVIEWED_SURFACES === '1';
const routes = ['/', '/store/sample-packs', '/login', '/account/recovery', '/support', '/support/what-is-44os', '/legal/terms', '/legal/privacy', '/legal/copyright', '/api/health'];
const failures = [];
const maxResponseMs = Number(process.env.SMOKE_MAX_RESPONSE_MS || 5000);
const maxHtmlBytes = Number(process.env.SMOKE_MAX_HTML_BYTES || 2_000_000);

const compatibilityRoutes = new Map([
  ['/music', '/store/music'],
  ['/books', '/store/books'],
  ['/assets', '/store/sample-packs'],
  ['/product/karen', '/store/item/karen'],
  ['/studio/products', '/studio'],
]);

function fail(message) {
  failures.push(message);
}

function assertDocument(route, response, body) {
  if (!/^<!doctype html>/i.test(body.trimStart())) fail(`${route}: response is not an HTML document`);
  if (!/<html[^>]+lang=["']en["']/i.test(body)) fail(`${route}: missing English document language`);
  if (!/<title>[^<]+<\/title>/i.test(body)) fail(`${route}: missing document title`);
  if (!/<main(?:\s|>)/i.test(body)) fail(`${route}: missing main landmark`);
  const viewport = body.match(/<meta[^>]+name=["']viewport["'][^>]*>/i)?.[0] || '';
  if (!viewport) fail(`${route}: missing viewport metadata`);
  if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:[.,]0*)?(?:\D|$)/i.test(viewport)) fail(`${route}: viewport disables user zoom`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) fail(`${route}: unexpected content-type ${contentType || 'missing'}`);
}

for (const route of routes) {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${route}`, { redirect: 'manual' });
  const durationMs = Math.round(performance.now() - startedAt);
  const expected = route === '/api/health' ? response.status === 200 : response.status >= 200 && response.status < 400;
  if (!expected) fail(`${route}: HTTP ${response.status}`);
  if (durationMs > maxResponseMs) fail(`${route}: ${durationMs}ms exceeds ${maxResponseMs}ms smoke budget`);
  if (route === '/') {
    for (const header of ['x-content-type-options', 'referrer-policy', 'permissions-policy', 'x-frame-options', 'content-security-policy', 'strict-transport-security']) {
      if (!response.headers.get(header)) fail(`/: missing ${header}`);
    }
  }
  if (route === '/api/health') {
    const health = await response.json().catch(() => null);
    if (health?.status !== 'healthy' || !health?.checkedAt || !health?.release || !health?.region || typeof health?.dependencies?.supabase !== 'number') fail('/api/health: invalid readiness response');
  } else {
    const body = await response.text();
    const bytes = Buffer.byteLength(body);
    if (bytes > maxHtmlBytes) fail(`${route}: ${bytes} bytes exceeds ${maxHtmlBytes} byte HTML budget`);
    if (route === '/' && !/<title>44OS<\/title>/i.test(body)) fail('/: root document identity must be 44OS');
    if (route === '/support') {
      if (!/How can we help\?/i.test(body)) fail('/support: missing Help Center search identity');
      if (/launching without customer payments|Paid checkout remains unavailable|protected full downloads remain unavailable/i.test(body)) fail('/support: stale closed-commerce guidance is still rendered');
    }
    if (route === '/support/what-is-44os' && !/A home for independent creative work/i.test(body)) fail('/support/what-is-44os: missing article content');
    assertDocument(route, response, body);
  }
  process.stdout.write(`${expected ? 'PASS' : 'FAIL'} ${route} ${response.status} ${durationMs}ms\n`);
}

for (const [source, destination] of compatibilityRoutes) {
  const response = await fetch(`${baseUrl}${source}`, { redirect: 'manual' });
  const location = response.headers.get('location');
  const resolvedLocation = location ? new URL(location, baseUrl).pathname : '';
  const expected = response.status >= 300 && response.status < 400 && resolvedLocation === destination;
  if (!expected) fail(`${source}: expected one-hop redirect to ${destination}, received HTTP ${response.status} ${location || '(no location)'}`);
  process.stdout.write(`${expected ? 'PASS' : 'FAIL'} ${source} -> ${destination}\n`);
}

if (!reviewedSurfacesEnabled) {
  for (const route of ['/community/moderation']) {
    const response = await fetch(`${baseUrl}${route}`, { redirect: 'manual' });
    const expected = response.status === 404;
    if (!expected) fail(`${route}: expected hidden surface to return 404, received ${response.status}`);
    process.stdout.write(`${expected ? 'PASS' : 'FAIL'} ${route} hidden\n`);
  }
}

if (failures.length) {
  process.stderr.write(`\nLaunch smoke failed:\n${failures.map(failure => `- ${failure}`).join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('\nLaunch smoke passed.\n');
}
