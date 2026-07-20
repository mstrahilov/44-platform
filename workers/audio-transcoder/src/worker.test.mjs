import test from 'node:test';
import assert from 'node:assert/strict';

test('worker package remains an isolated production module', async () => {
  const packageJson = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(packageJson.type, 'module');
  assert.equal(packageJson.dependencies['@supabase/supabase-js'], '^2.108.2');
});
