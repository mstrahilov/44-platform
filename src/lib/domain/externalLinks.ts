import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type ExternalLinkScope = 'profile' | 'item';
export type ExternalLinkPlatform = Database['public']['Tables']['external_link_platforms']['Row'];
export type ExternalLinkDraft = { platform: string; url: string };

export async function listExternalLinkPlatforms(scope: ExternalLinkScope) {
  const column = scope === 'profile' ? 'supports_profiles' : 'supports_items';
  const result = await supabase
    .from('external_link_platforms')
    .select('*')
    .eq(column, true)
    .eq('is_active', true)
    .order('sort_order');
  if (result.error) throw result.error;
  return (result.data as ExternalLinkPlatform[] | null) ?? [];
}

export async function listOwnProfileExternalLinks(profileId: string) {
  const result = await supabase
    .from('profile_external_links')
    .select('platform,url,sort_order')
    .eq('profile_id', profileId)
    .order('sort_order');
  if (result.error) throw result.error;
  return (result.data ?? []).map(row => ({ platform: row.platform, url: row.url }));
}

export async function replaceOwnProfileExternalLinks(links: ExternalLinkDraft[]) {
  const result = await supabase.rpc('replace_own_profile_external_links', { link_rows: links });
  if (result.error) throw new Error(result.error.message);
}

export async function replaceOwnedItemExternalLinks(itemId: string, links: ExternalLinkDraft[]) {
  const result = await supabase.rpc('replace_owned_item_external_links', { target_item_id: itemId, link_rows: links });
  if (result.error) throw new Error(result.error.message);
}

export function materializeExternalLinkDrafts(platforms: ExternalLinkPlatform[], saved: ExternalLinkDraft[]) {
  const savedByPlatform = new Map(saved.map(link => [link.platform, link.url]));
  return platforms.map(platform => ({ platform: platform.key, url: savedByPlatform.get(platform.key) ?? '' }));
}

export function activeExternalLinkDrafts(links: ExternalLinkDraft[]) {
  return links.filter(link => link.url.trim()).map(link => ({ ...link, url: link.url.trim() }));
}

export function validateExternalLinkDrafts(links: ExternalLinkDraft[], platforms: ExternalLinkPlatform[]) {
  const seen = new Set<string>();
  for (const link of activeExternalLinkDrafts(links)) {
    if (!link.platform) return 'Choose a platform and enter its full HTTPS link.';
    if (seen.has(link.platform)) return 'Each platform can be added once.';
    seen.add(link.platform);
    const platform = platforms.find(candidate => candidate.key === link.platform);
    if (!platform) return 'Choose an approved platform.';
    let parsed: URL;
    try { parsed = new URL(link.url.trim()); } catch { return `Enter a valid link for ${platform.label}.`; }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) return `${platform.label} links must use a standard HTTPS address.`;
    const host = parsed.hostname.toLowerCase();
    const allowed = platform.host_patterns.some(pattern => pattern === '*'
      ? host.includes('.') && !['localhost', '127.0.0.1', '0.0.0.0'].includes(host)
      : pattern.startsWith('*.')
        ? host === pattern.slice(2) || host.endsWith(pattern.slice(1))
        : host === pattern);
    if (!allowed) return `Use an official ${platform.label} link.`;
  }
  return null;
}
