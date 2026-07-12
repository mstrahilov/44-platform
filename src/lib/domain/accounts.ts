import { supabase } from '@/lib/supabase';

export async function accountExistsForEmail(email: string) {
  const result = await supabase.rpc('account_exists_for_email', { lookup_email: email });
  if (result.error) throw result.error;
  return Boolean(result.data);
}

export async function usernameIsTaken(username: string) {
  const result = await supabase.from('profiles').select('id').eq('username', username).maybeSingle();
  if (result.error) throw result.error;
  return Boolean(result.data);
}
