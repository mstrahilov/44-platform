export type ArtistRotationTrack = {
  trackId: string;
  artistKey: string;
};

type RotationGroup<T> = {
  key: string;
  catalog: T[];
  deck: T[];
  cursor: number;
  cycle: number;
  quota: number;
  remaining: number;
  current: number;
  tieBreak: number;
  lastTrackId: string | null;
};

/** A global day boundary keeps every listener on the same station rotation. */
export function radioRotationDayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/**
 * Build a deterministic, artist-aware station rotation.
 *
 * Square-root weighting softens catalog-size dominance while preserving a
 * meaningful benefit for artists with deeper catalogs. Each artist's own deck
 * is exhausted before a track repeats, and adjacent artist repeats are avoided
 * whenever any other artist still has a scheduled slot.
 */
export function buildFairRadioRotation<T extends ArtistRotationTrack>(tracks: T[], seed: string): T[] {
  if (tracks.length < 2) return [...tracks];

  const grouped = new Map<string, T[]>();
  for (const track of tracks) {
    const key = track.artistKey.trim() || 'unknown-artist';
    const group = grouped.get(key) ?? [];
    group.push(track);
    grouped.set(key, group);
  }

  const random = createSeededRandom(seed);
  const groups = Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, catalog]) => ({
      key,
      catalog: [...catalog].sort((left, right) => left.trackId.localeCompare(right.trackId)),
      weight: Math.sqrt(catalog.length),
      tieBreak: random(),
    }));
  const weightTotal = groups.reduce((sum, group) => sum + group.weight, 0);
  const quotas = groups.map(group => {
    const exact = tracks.length * group.weight / weightTotal;
    return { key: group.key, exact, quota: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let slotsLeft = tracks.length - quotas.reduce((sum, group) => sum + group.quota, 0);
  quotas
    .sort((left, right) => right.remainder - left.remainder || left.key.localeCompare(right.key))
    .forEach(group => {
      if (slotsLeft <= 0) return;
      group.quota += 1;
      slotsLeft -= 1;
    });
  const quotaByKey = new Map(quotas.map(group => [group.key, group.quota]));

  const rotationGroups: RotationGroup<T>[] = groups.map(group => {
    const quota = quotaByKey.get(group.key) ?? 0;
    return {
      key: group.key,
      catalog: group.catalog,
      deck: shuffleWithSeed(group.catalog, `${seed}:${group.key}:0`),
      cursor: 0,
      cycle: 0,
      quota,
      remaining: quota,
      current: 0,
      tieBreak: group.tieBreak,
      lastTrackId: null,
    };
  }).filter(group => group.quota > 0);

  const rotation: T[] = [];
  let previousArtist: string | null = null;
  const totalSlots = tracks.length;

  while (rotation.length < totalSlots) {
    const available = rotationGroups.filter(group => group.remaining > 0);
    if (!available.length) break;
    for (const group of available) group.current += group.quota;

    const alternatives = available.filter(group => group.key !== previousArtist);
    const candidates = alternatives.length ? alternatives : available;
    candidates.sort((left, right) => (
      right.current - left.current
      || left.tieBreak - right.tieBreak
      || left.key.localeCompare(right.key)
    ));
    const selected = candidates[0];
    const track = takeNextTrack(selected, seed);
    rotation.push(track);
    selected.remaining -= 1;
    selected.current -= totalSlots;
    selected.tieBreak = random();
    selected.lastTrackId = track.trackId;
    previousArtist = selected.key;
  }

  return rotation;
}

function takeNextTrack<T extends ArtistRotationTrack>(group: RotationGroup<T>, seed: string) {
  if (group.cursor >= group.deck.length) {
    group.cycle += 1;
    group.deck = shuffleWithSeed(group.catalog, `${seed}:${group.key}:${group.cycle}`);
    group.cursor = 0;
    if (group.deck.length > 1 && group.deck[0]?.trackId === group.lastTrackId) {
      [group.deck[0], group.deck[1]] = [group.deck[1], group.deck[0]];
    }
  }
  const track = group.deck[group.cursor];
  group.cursor += 1;
  return track;
}

function shuffleWithSeed<T>(values: T[], seed: string) {
  const shuffled = [...values];
  const random = createSeededRandom(seed);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function createSeededRandom(seed: string) {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
