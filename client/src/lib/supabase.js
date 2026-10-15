import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

export const SUPABASE_ANON_KEY = supabaseAnonKey || ''
export const EDGE_FUNCTIONS_BASE = `${supabaseUrl}/functions/v1`
export const EDGE_FUNCTION_URL = `${EDGE_FUNCTIONS_BASE}/auth-handler`
