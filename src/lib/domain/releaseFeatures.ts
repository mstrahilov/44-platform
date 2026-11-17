import { supabase } from '@/lib/supabase';

export type ReleaseVideoEmbed = {
  id: string;
  item_id?: string;
  title: string;
  youtube_video_id: string;
  sort_order: number;
};

export type CreatorVideoPage = {
  id: string;
  creator_id: string;
  title: string;
  youtube_video_id: string;
  youtube_published_at: string | null;
  created_at?: string;
};

export async function listCreatorVideos(limit = 200) {
  const result = await supabase
    .from('creator_videos' as never)
    .select('id,creator_id,title,youtube_video_id,youtube_published_at,created_at')
    .order('youtube_published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (result.error) throw result.error;
  return (result.data as CreatorVideoPage[] | null) ?? [];
}

export async function getCreatorVideo(id: string) {
  const result = await supabase
    .from('creator_videos' as never)
    .select('id,creator_id,title,youtube_video_id,youtube_published_at')
    .eq('id', id)
    .maybeSingle();
  if (result.error) throw result.error;
  return (result.data as CreatorVideoPage | null) ?? null;
}

export async function listReleaseVideoEmbeds(itemId: string) {
  const result = await supabase
    .from('item_video_embeds' as never)
    .select('id,item_id,title,youtube_video_id,sort_order')
    .eq('item_id', itemId)
    .order('sort_order');
  if (result.error) throw result.error;
  return (result.data as ReleaseVideoEmbed[] | null) ?? [];
}

export async function replaceStudioReleaseVideoEmbeds(itemId: string, embeds: Array<{ url: string }>) {
  const result = await supabase.rpc('replace_owned_item_video_embeds' as never, {
    target_item_id: itemId,
    target_embeds: embeds,
  } as never);
  if (result.error) throw result.error;
}
