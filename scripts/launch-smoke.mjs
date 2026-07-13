const baseUrl = (process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const routes = ['/', '/login', '/support', '/api/health'];
if (process.env.SMOKE_REVIEWED_SURFACES === '1') routes.push('/account/recovery', '/legal/terms', '/legal/privacy', '/legal/copyright');
const failures = [];

for (const route of routes) {
  const response = await fetch(`${baseUrl}${route}`, { redirect: 'manual' });
  const expected = route === '/api/health' ? response.status === 200 : response.status >= 200 && response.status < 400;
  if (!expected) failures.push(`${route}: HTTP ${response.status}`);
  if (route === '/') {
    for (const header of ['x-content-type-options', 'referrer-policy', 'permissions-policy', 'x-frame-options', 'content-security-policy', 'strict-transport-security']) {
      if (!response.headers.get(header)) failures.push(`/: missing ${header}`);
    }
  }
  process.stdout.write(`${expected ? 'PASS' : 'FAIL'} ${route} ${response.status}\n`);
}

if (failures.length) {
  process.stderr.write(`\nLaunch smoke failed:\n${failures.map(failure => `- ${failure}`).join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('\nLaunch smoke passed.\n');
}
