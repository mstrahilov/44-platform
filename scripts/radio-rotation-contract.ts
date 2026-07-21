import assert from 'node:assert/strict';
import { buildFairRadioRotation, radioRotationDayKey, type ArtistRotationTrack } from '../src/lib/radioRotation';

type TestTrack = ArtistRotationTrack & { label: string };

const LIVE_SHAPED_CATALOG = [
  ['olsten', 140],
  ['tellali', 122],
  ['evntura', 42],
  ['sh', 20],
  ['koukla', 3],
  ['lvminvs', 1],
] as const;

const tracks = LIVE_SHAPED_CATALOG.flatMap(([artistKey, count]) => (
  Array.from({ length: count }, (_, index): TestTrack => ({
    trackId: `${artistKey}-${String(index + 1).padStart(3, '0')}`,
    artistKey,
    label: `${artistKey} track ${index + 1}`,
  }))
));

const seed = '2026-07-20:radio-contract';
const rotation = buildFairRadioRotation(tracks, seed);
const sameRotation = buildFairRadioRotation(tracks, seed);
const nextDayRotation = buildFairRadioRotation(tracks, '2026-07-21:radio-contract');

assert.equal(rotation.length, tracks.length, 'the station rotation should retain the configured cycle length');
assert.deepEqual(
  rotation.map(track => track.trackId),
  sameRotation.map(track => track.trackId),
  'the same station seed should produce the same shared rotation',
);
assert.notDeepEqual(
  rotation.map(track => track.trackId),
  nextDayRotation.map(track => track.trackId),
  'a new UTC day should produce a fresh rotation',
);

for (let index = 1; index < rotation.length; index += 1) {
  assert.notEqual(
    rotation[index].artistKey,
    rotation[index - 1].artistKey,
    `adjacent artist repeat at positions ${index} and ${index + 1}`,
  );
}

const playCounts = new Map<string, number>();
for (const track of rotation) {
  playCounts.set(track.artistKey, (playCounts.get(track.artistKey) ?? 0) + 1);
}
assert.deepEqual(
  Object.fromEntries(playCounts),
  { olsten: 106, tellali: 99, evntura: 58, sh: 40, koukla: 16, lvminvs: 9 },
  'square-root weighting should preserve depth without letting the largest catalogs monopolize Radio',
);

for (const [artistKey, catalogSize] of LIVE_SHAPED_CATALOG) {
  if (catalogSize < 2) continue;
  const artistTrackIds = rotation
    .filter(track => track.artistKey === artistKey)
    .map(track => track.trackId);
  const seenSinceReset = new Set<string>();
  for (const trackId of artistTrackIds) {
    assert.equal(
      seenSinceReset.has(trackId),
      false,
      `${artistKey} repeated ${trackId} before exhausting its catalog`,
    );
    seenSinceReset.add(trackId);
    if (seenSinceReset.size === catalogSize) seenSinceReset.clear();
  }
}

assert.equal(radioRotationDayKey(new Date('2026-07-20T00:00:00.000Z')), '2026-07-20');
assert.equal(radioRotationDayKey(new Date('2026-07-20T23:59:59.999Z')), '2026-07-20');
assert.equal(radioRotationDayKey(new Date('2026-07-21T00:00:00.000Z')), '2026-07-21');

console.log('Radio rotation contract passed.');
console.log(JSON.stringify({ cycleTracks: rotation.length, playsByArtist: Object.fromEntries(playCounts) }, null, 2));
