import type { Product } from '@/lib/products';
import { supabase } from '@/lib/supabase';
import { hideLocalMask, LOCAL_MASK_LIBRARY_ID, localMaskIsSaved, localMaskProduct } from '@/lib/localMaskPreview';

export type LibraryItemRow = {
  id: string;
  item_id: string | null;
  acquired_at: string | null;
  acquisition_type: string | null;
  status: string;
  products: Product | null;
};

export async function listVisibleLibraryItems(userId: string) {
  const result = await supabase
    .from('library_entries')
    .select('id,item_id,acquired_at,acquisition_type,status,products:catalog_items(*, creators:profiles!author_id(*))')
    .eq('user_id', userId)
    .neq('status', 'archived')
    .neq('status', 'hidden')
    .order('acquired_at', { ascending: false });

  if (result.error) throw result.error;
  const rows = (result.data ?? []) as unknown as LibraryItemRow[];
  const hasCatalogMask = rows.some(row => {
    const product = row.products;
    if (!product) return false;
    return product.id === localMaskProduct.id
      || product.slug?.trim().toLowerCase() === 'mask'
      || (product.title.trim().toLowerCase() === 'mask' && product.author_id === localMaskProduct.author_id);
  });
  return localMaskIsSaved() && !hasCatalogMask ? [...rows, {
    id: LOCAL_MASK_LIBRARY_ID,
    item_id: localMaskProduct.id,
    acquired_at: new Date().toISOString(),
    acquisition_type: 'free',
    status: 'visible',
    products: localMaskProduct,
  }] : rows;
}

export async function listVisibleLibraryItemIds(userId: string) {
  const result = await supabase
    .from('library_entries')
    .select('item_id,status')
    .eq('user_id', userId);

  if (result.error) throw result.error;
  const ids = (result.data ?? []).flatMap(row => (
    row.item_id && row.status !== 'hidden' ? [row.item_id] : []
  ));
  return localMaskIsSaved() && !ids.includes(localMaskProduct.id) ? [...ids, localMaskProduct.id] : ids;
}

export async function removeLibraryItem(userId: string, libraryEntryId: string) {
  const result = await supabase
    .from('library_entries')
    .delete()
    .eq('id', libraryEntryId)
    .eq('user_id', userId);

  if (result.error) throw result.error;
}

export async function hideLibraryItem(userId: string, libraryEntryId: string) {
  if (libraryEntryId === LOCAL_MASK_LIBRARY_ID) { hideLocalMask(); return; }
  const result = await supabase
    .from('library_entries')
    .update({ status: 'hidden' })
    .eq('id', libraryEntryId)
    .eq('user_id', userId);

  if (result.error) throw result.error;
}

export type SavedMusicTrack = {
  track_id: string;
  item_id: string;
  title: string;
  number: number;
  audio_url: string | null;
  duration_seconds: number | null;
  saved_at: string;
  product: Product;
};

export function isSavedMusicContractMissing(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return ['PGRST205', '42P01'].includes(code) || message.includes('saved_music_tracks');
}

export async function listSavedMusicTracks(userId: string, itemId?: string) {
  let releaseTrackIds: string[] | null = null;
  if (itemId) {
    const tracks = await supabase.from('tracks').select('id').eq('item_id', itemId);
    if (tracks.error) throw tracks.error;
    releaseTrackIds = (tracks.data ?? []).map(track => track.id);
    if (!releaseTrackIds.length) return [];
  }

  let query = supabase.from('saved_music_tracks' as never)
    .select('track_id,saved_at,track:tracks!inner(id,item_id,title,number,audio_url,duration_seconds,item:catalog_items!inner(*,creators:profiles!author_id(*)))')
    .eq('user_id', userId);
  if (releaseTrackIds) query = query.in('track_id', releaseTrackIds) as typeof query;
  const result = await query.order('saved_at', { ascending: false });
  if (result.error) throw result.error;
  return ((result.data ?? []) as unknown as Array<{ track_id: string; saved_at: string; track: { id: string; item_id: string; title: string; number: number; audio_url: string | null; duration_seconds: number | null; item: Product } }> )
    .filter(row => row.track?.item?.experience_type === 'music' && row.track.item.status === 'published')
    .map(row => ({ track_id: row.track_id, item_id: row.track.item_id, title: row.track.title, number: row.track.number, audio_url: row.track.audio_url, duration_seconds: row.track.duration_seconds, saved_at: row.saved_at, product: row.track.item } satisfies SavedMusicTrack));
}

export async function listSavedMusicTrackIds(userId: string, itemId?: string) {
  return (await listSavedMusicTracks(userId, itemId)).map(track => track.track_id);
}

export async function setSavedMusicTrack(trackId: string, saved: boolean) {
  const result = await supabase.rpc('set_saved_music_track' as never, { target_track_id: trackId, should_save: saved } as never);
  if (result.error) throw result.error;
}

export async function setSavedMusicRelease(itemId: string, saved: boolean) {
  const result = await supabase.rpc('set_saved_music_release' as never, { target_item_id: itemId, should_save: saved } as never);
  if (result.error) throw result.error;
}

export async function listSavedMusicReleaseIds(userId: string) {
  const tracks = await listSavedMusicTracks(userId);
  return [...new Set(tracks.map(track => track.item_id))];
}

type SavedMusicAlbumProduct = Pick<Product, 'id' | 'title' | 'creator' | 'cover_url' | 'hero_url' | 'release_date'> & {
  creators?: Pick<NonNullable<Product['creators']>, 'display_name'> | null;
};

export type SavedMusicAlbum = {
  item_id: string;
  product: SavedMusicAlbumProduct;
  track_count: number;
  saved_at: string;
};

export async function listSavedMusicAlbums(userId: string) {
  const result = await supabase.from('saved_music_tracks' as never)
    .select('saved_at,track:tracks!inner(item:catalog_items!inner(id,title,creator,cover_url,hero_url,release_date,experience_type,status,creators:profiles!author_id(display_name)))')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });
  if (result.error) throw result.error;
  const rows = (result.data ?? []) as unknown as Array<{
    saved_at: string;
    track: { item: SavedMusicAlbumProduct & { experience_type: string; status: string } } | null;
  }>;
  const albums = new Map<string, SavedMusicAlbum>();
  for (const row of rows) {
    const product = row.track?.item;
    if (product?.experience_type !== 'music' || product.status !== 'published') continue;
    const album = albums.get(product.id);
    if (album) {
      album.track_count += 1;
      if (row.saved_at > album.saved_at) album.saved_at = row.saved_at;
    } else albums.set(product.id, { item_id: product.id, product, track_count: 1, saved_at: row.saved_at });
  }
  return [...albums.values()].sort((left, right) => right.saved_at.localeCompare(left.saved_at));
}
