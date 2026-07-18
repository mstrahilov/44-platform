import { supabase } from '@/lib/supabase';
import { usernameKey } from '@/lib/usernames';

export async function accountExistsForEmail(email: string) {
  const result = await supabase.rpc('account_exists_for_email', { lookup_email: email });
  if (result.error) throw result.error;
  return Boolean(result.data);
}

export async function usernameIsTaken(username: string, excludeUserId?: string) {
  let request = supabase.from('profiles').select('id').eq('username_normalized', usernameKey(username));
  if (excludeUserId) request = request.neq('id', excludeUserId);
  const result = await request.maybeSingle();
  if (result.error) throw result.error;
  return Boolean(result.data);
}
