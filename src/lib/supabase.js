import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || ''
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set. Using localStorage fallback.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

