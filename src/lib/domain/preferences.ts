import { supabase } from '@/lib/supabase';
import type { ThemeAccent, ThemeMode } from '@/lib/theme';

export async function getThemePreference(userId: string) {
  const result = await supabase
    .from('user_theme_preferences')
    .select('theme_mode,theme_accent')
    .eq('user_id', userId)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}

export async function saveThemePreference(userId: string, mode: ThemeMode, accent: ThemeAccent) {
  const result = await supabase.from('user_theme_preferences').upsert({
    user_id: userId,
    theme_mode: mode,
    theme_accent: accent,
    updated_at: new Date().toISOString(),
  });
  if (result.error) throw result.error;
}
