import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// We'll use environment variables here, for now using placeholders
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);