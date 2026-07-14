import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/instrumentation.ts', import.meta.url), 'utf8');
const required = [
  "event: 'request_error'",
  'occurredAt:',
  'release:',
  'runtime:',
  'request: { method: request.method, path: request.path }',
  'context,',
  'error: normalizedError(error)',
];
const forbidden = [
  'request.headers',
  'request.nextUrl.search',
  'request.url',
  'authorization',
  'cookie',
  'access_token',
  'refresh_token',
];

for (const fragment of required) {
  if (!source.includes(fragment)) throw new Error(`Missing request_error contract fragment: ${fragment}`);
}
for (const fragment of forbidden) {
  if (source.toLowerCase().includes(fragment.toLowerCase())) throw new Error(`Sanitization contract contains forbidden request data: ${fragment}`);
}

process.stdout.write('Observability contract passed: request errors are structured and sanitized.\n');
