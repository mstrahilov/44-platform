import { creatorHref } from '@/lib/platform';
import { isMissingRelationError } from '@/lib/schemaCompat';
import { supabase } from '@/lib/supabase';

export type RadioPlaylistEntry = {
  id: string;
  track_id: string;
  sort_order: number;
  is_active: boolean;
  added_at: string;
};

export type RadioTrackRow = {
  id: string;
  title: string;
  duration_seconds: number | null;
  audio_url: string | null;
  product_id: string;
  number?: number | null;
};

export type RadioProductRow = {
  id: string;
  title: string;
  creator: string;
  slug?: string | null;
  category?: string | null;
  product_type?: string | null;
  runtime_type?: string | null;
  experience_type?: string | null;
  fulfillment_type?: string | null;
  cover_url: string | null;
  hero_url?: string | null;
  author_id?: string | null;
  creators?: {
    display_name?: string | null;
    username?: string | null;
    slug?: string | null;
    avatar_url?: string | null;
  } | null;
};

export type RadioPlayableTrack = {
  playlistEntryId: string;
  trackId: string;
  title: string;
  artistName: string;
  artistProfileSlug: string | null;
  coverUrl: string | null;
  audioUrl: string;
  durationSeconds: number;
  productId: string;
  releaseTitle: string;
  releaseHref: string;
  trackHref: string;
  trackNumber: number | null;
  sortOrder: number;
};

export type RadioBundle = {
  tracks: RadioPlayableTrack[];
  requiresSetup: boolean;
  status: string;
};

export async function loadRadioBundle(): Promise<RadioBundle> {
  const playlistResult = await supabase
    .from('radio_playlist_entries')
    .select('id,track_id,sort_order,is_active,added_at')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (isMissingRelationError(playlistResult.error)) {
    return {
      tracks: [],
      requiresSetup: true,
      status: 'Radio playlist tables are not in Supabase yet. Apply the reviewed SQL file first.',
    };
  }

  if (playlistResult.error) {
    return {
      tracks: [],
      requiresSetup: true,
      status: playlistResult.error.message,
    };
  }

  const playlistEntries = (playlistResult.data as RadioPlaylistEntry[] | null) ?? [];
  if (!playlistEntries.length) {
    return {
      tracks: [],
      requiresSetup: false,
      status: 'Radio playlist is empty. Import current uploaded tracks into the Radio playlist.',
    };
  }

  const trackIds = playlistEntries.map(entry => entry.track_id);
  const tracksResult = await supabase
    .from('tracks')
    .select('id,product_id,title,duration_seconds,audio_url,number')
    .in('id', trackIds);

  if (tracksResult.error) {
    return {
      tracks: [],
      requiresSetup: false,
      status: tracksResult.error.message,
    };
  }

  const trackRows = (tracksResult.data as RadioTrackRow[] | null) ?? [];
  const productIds = Array.from(new Set(trackRows.map(track => track.product_id).filter(Boolean)));
  const productsResult = await supabase
    .from('products')
    .select('id,title,creator,slug,category,product_type,runtime_type,experience_type,fulfillment_type,cover_url,hero_url,author_id,creators:profiles!author_id(display_name,username,slug,avatar_url)')
    .in('id', productIds);

  if (productsResult.error) {
    return {
      tracks: [],
      requiresSetup: false,
      status: productsResult.error.message,
    };
  }

  const products = new Map(((productsResult.data as RadioProductRow[] | null) ?? []).map(product => [product.id, product]));
  const tracks = playlistEntries.flatMap(entry => {
    const track = trackRows.find(row => row.id === entry.track_id);
    if (!track?.audio_url || !track.duration_seconds || track.duration_seconds <= 0) return [];
    const product = products.get(track.product_id);
    if (!product) return [];
    return [{
      playlistEntryId: entry.id,
      trackId: track.id,
      title: track.title,
      artistName: product.creators?.display_name || product.creator || '44 Creator',
      artistProfileSlug: product.creators?.username || product.creators?.slug || null,
      coverUrl: product.cover_url || product.hero_url || null,
      audioUrl: track.audio_url,
      durationSeconds: track.duration_seconds,
      productId: product.id,
      releaseTitle: product.title,
      releaseHref: `/product/${product.id}`,
      trackHref: `/product/${product.id}?track=${track.id}`,
      trackNumber: track.number ?? null,
      sortOrder: entry.sort_order,
    }];
  });

  return {
    tracks,
    requiresSetup: false,
    status: tracks.length ? '' : 'No playable Radio tracks were found in the playlist.',
  };
}

export function getSyncedRadioPlayback(args: {
  tracks: RadioPlayableTrack[];
  now?: Date;
  anchorAt?: Date;
}) {
  const { tracks, now = new Date(), anchorAt = new Date('2026-01-01T00:00:00.000Z') } = args;
  if (!tracks.length) {
    return { index: -1, offsetSeconds: 0, elapsedSeconds: 0 };
  }

  const totalDuration = tracks.reduce((sum, track) => sum + track.durationSeconds, 0);
  if (totalDuration <= 0) {
    return { index: 0, offsetSeconds: 0, elapsedSeconds: 0 };
  }

  const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - anchorAt.getTime()) / 1000));
  const loopedSeconds = elapsedSeconds % totalDuration;

  let cursor = 0;
  for (let index = 0; index < tracks.length; index += 1) {
    const track = tracks[index];
    const nextCursor = cursor + track.durationSeconds;
    if (loopedSeconds < nextCursor) {
      return {
        index,
        offsetSeconds: loopedSeconds - cursor,
        elapsedSeconds,
      };
    }
    cursor = nextCursor;
  }

  return { index: 0, offsetSeconds: 0, elapsedSeconds };
}

export function radioArtistHref(track: Pick<RadioPlayableTrack, 'artistProfileSlug'>) {
  return creatorHref(track.artistProfileSlug ?? null);
}
