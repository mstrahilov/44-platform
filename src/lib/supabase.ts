import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Vercel preview builds do not always receive production credentials. Supabase
// validates both values while the module is imported, so use inert values to
// keep those builds renderable; configured environments remain unchanged.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'https://unconfigured.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || 'unconfigured-anon-key'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
})
