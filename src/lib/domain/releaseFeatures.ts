import { supabase } from '@/lib/supabase';

export type ReleaseVideoEmbed = {
  id: string;
  item_id?: string;
  title: string;
  youtube_video_id: string;
  sort_order: number;
};

export async function listReleaseVideoEmbeds(itemId: string) {
  const result = await supabase
    .from('item_video_embeds' as never)
    .select('id,item_id,title,youtube_video_id,sort_order')
    .eq('item_id', itemId)
    .order('sort_order');
  if (result.error) throw result.error;
  return (result.data as ReleaseVideoEmbed[] | null) ?? [];
}

export async function replaceStudioReleaseVideoEmbeds(itemId: string, embeds: Array<{ title: string; url: string }>) {
  const result = await supabase.rpc('replace_owned_item_video_embeds' as never, {
    target_item_id: itemId,
    target_embeds: embeds,
  } as never);
  if (result.error) throw result.error;
}
