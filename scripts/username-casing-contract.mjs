import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [login, profileEdit, profiles, studioProfiles, migration] = await Promise.all([
  read('src/app/login/page.tsx'),
  read('src/components/ProfileEditApp.tsx'),
  read('src/lib/domain/profiles.ts'),
  read('src/lib/studioProfiles.ts'),
  read('supabase/migrations/20260718013000_case_preserving_usernames.sql'),
]);

assert.match(login, /pattern="\[A-Za-z0-9_\]\{3,32\}"/, 'registration accepts uppercase ASCII letters');
assert.match(login, /setUsername\(sanitizeUsernameInput\(/, 'registration preserves accepted capitalization');
assert.match(profileEdit, /setUsername\(sanitizeUsernameInput\(/, 'profile editing preserves accepted capitalization');
assert.match(profileEdit, /usernameIsTaken\(cleanUsername, user\.id\)/, 'profile editing excludes the current account from collision checks');
assert.match(profiles, /\.eq\('username_normalized', usernameKey\(identifier\)\)/, 'profile routing resolves usernames by exact normalized identity');
assert.match(studioProfiles, /isValidUsername\(usernameBase\)[\s\S]*\? usernameBase/, 'authentication profile sync preserves valid stored capitalization');
assert.match(migration, /profiles_username_normalized_key unique \(username_normalized\)/, 'the database blocks capitalization-only duplicates');
assert.match(migration, /requested_username:=trim\(/, 'new-account trigger preserves the requested capitalization');
assert.doesNotMatch(migration, /requested_username:=lower\(/, 'new-account trigger does not lowercase valid usernames');

console.log('Username casing contract passed.');
