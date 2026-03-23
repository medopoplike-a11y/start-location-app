import { createClient } from '@supabase/supabase-js'

// هذه البيانات ستحصل عليها من لوحة تحكم Supabase الخاصة بك
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
