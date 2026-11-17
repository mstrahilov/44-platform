import { supabase } from '@/lib/supabase';

export type PlaylistTrack = {
  id: string;
  track_id: string;
  sort_order: number;
  added_at: string;
  track: {
    id: string;
    item_id: string;
    title: string;
    number: number;
    duration_seconds: number | null;
    audio_url: string | null;
    item?: { id: string; title: string; cover_url: string | null } | null;
  } | null;
};

export type Playlist = {
  id: string;
  user_id: string;
  title: string;
  cover_url?: string | null;
  created_at: string;
  updated_at: string;
  artwork_url?: string | null;
  tracks?: PlaylistTrack[];
};

export type CatalogTrack = {
  id: string;
  item_id: string;
  title: string;
  duration_seconds: number | null;
  audio_url: string | null;
  has_access: boolean;
  item?: { id: string; title: string; cover_url: string | null; creator?: string | null } | null;
};

export type CatalogTrackCursor = { offset: number };
export type CatalogTrackBrowsePage = {
  contract_version: 1;
  items: CatalogTrack[];
  next_cursor: CatalogTrackCursor | null;
};

type CatalogTrackBrowseRow = {
  track_id: string;
  item_id: string;
  title: string;
  duration_seconds: number | null;
  audio_url: string | null;
  item_title: string;
  creator: string;
  cover_url: string | null;
  hero_url: string | null;
  has_access: boolean;
};

const PLAYLIST_SELECT = 'id,user_id,title,cover_url,created_at,updated_at';
const PLAYLIST_TRACK_SELECT = 'id,playlist_id,track_id,sort_order,added_at,track:tracks(id,item_id,title,number,duration_seconds,audio_url,item:catalog_items(id,title,cover_url))';

export async function listPlaylists(userId: string) {
  const result = await supabase
    .from('playlists' as never)
    .select(PLAYLIST_SELECT)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (result.error) throw result.error;
  const playlists = (result.data ?? []) as unknown as Playlist[];
  if (!playlists.length) return playlists;
  return Promise.all(playlists.map(async playlist => {
    if (playlist.cover_url) return { ...playlist, artwork_url: playlist.cover_url };
    const detail = await getPlaylist(userId, playlist.id);
    const fallbackArtwork = detail?.tracks?.find(track => track.track?.item?.cover_url)?.track?.item?.cover_url || null;
    return { ...playlist, artwork_url: fallbackArtwork };
  }));
}

export async function getPlaylist(userId: string, playlistId: string) {
  const [playlistResult, tracksResult] = await Promise.all([
    supabase.from('playlists' as never).select(PLAYLIST_SELECT).eq('id', playlistId).eq('user_id', userId).maybeSingle(),
    supabase.from('playlist_tracks' as never).select(PLAYLIST_TRACK_SELECT).eq('playlist_id', playlistId).order('sort_order'),
  ]);
  if (playlistResult.error) throw playlistResult.error;
  if (tracksResult.error) throw tracksResult.error;
  if (!playlistResult.data) return null;
  return { ...(playlistResult.data as unknown as Playlist), tracks: (tracksResult.data ?? []) as unknown as PlaylistTrack[] };
}

export async function createPlaylist(userId: string, title: string, coverUrl?: string | null) {
  const result = await supabase.from('playlists' as never).insert({ user_id: userId, title: title.trim() || 'New Playlist', cover_url: coverUrl ?? null } as never).select(PLAYLIST_SELECT).single();
  if (result.error) throw result.error;
  return result.data as unknown as Playlist;
}

export async function renamePlaylist(userId: string, playlistId: string, title: string) {
  const result = await supabase.from('playlists' as never).update({ title: title.trim() || 'New Playlist' } as never).eq('id', playlistId).eq('user_id', userId).select(PLAYLIST_SELECT).single();
  if (result.error) throw result.error;
  return result.data as unknown as Playlist;
}

export async function deletePlaylist(userId: string, playlistId: string) {
  const result = await supabase.from('playlists' as never).delete().eq('id', playlistId).eq('user_id', userId);
  if (result.error) throw result.error;
}

export async function addTrackToPlaylist(trackId: string, playlistId?: string, newPlaylistTitle?: string) {
  const result = await supabase.rpc('add_track_to_playlist' as never, {
    target_track_id: trackId,
    target_playlist_id: playlistId ?? null,
    new_playlist_title: newPlaylistTitle ?? null,
  } as never);
  if (result.error) throw result.error;
  return result.data as string;
}

export async function addReleaseToPlaylist(itemId: string, playlistId: string) {
  const result = await supabase.rpc('add_release_to_playlist' as never, { target_item_id: itemId, target_playlist_id: playlistId } as never);
  if (result.error) throw result.error;
  return Number(result.data ?? 0);
}

export async function replacePlaylistTracks(playlistId: string, trackIds: string[]) {
  const result = await supabase.rpc('replace_playlist_tracks' as never, {
    target_playlist_id: playlistId,
    track_ids: trackIds,
  } as never);
  if (result.error) throw result.error;
}

export async function removeTrackFromPlaylist(playlist: Playlist, trackId: string) {
  await replacePlaylistTracks(playlist.id, (playlist.tracks ?? []).filter(row => row.track_id !== trackId).map(row => row.track_id));
}

export async function browseCatalogTracks(searchQuery: string, cursor: CatalogTrackCursor | null = null, limit = 30) {
  const result = await supabase.rpc('browse_all_tracks_v1' as never, {
    search_query: searchQuery,
    cursor,
    limit,
  } as never);
  if (result.error) throw result.error;
  const page = result.data as unknown as {
    contract_version?: number;
    items?: CatalogTrackBrowseRow[];
    next_cursor?: CatalogTrackCursor | null;
  } | null;
  if (!page || page.contract_version !== 1 || !Array.isArray(page.items)) {
    throw new Error('The catalog returned an unsupported track page.');
  }
  return {
    contract_version: 1 as const,
    items: page.items.map((row): CatalogTrack => ({
      id: row.track_id,
      item_id: row.item_id,
      title: row.title,
      duration_seconds: row.duration_seconds,
      audio_url: row.audio_url,
      has_access: row.has_access,
      item: { id: row.item_id, title: row.item_title, cover_url: row.cover_url, creator: row.creator },
    })),
    next_cursor: page.next_cursor ?? null,
  } satisfies CatalogTrackBrowsePage;
}
