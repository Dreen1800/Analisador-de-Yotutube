import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// We'll use environment variables here, for now using placeholders
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || '';

// Cliente regular para operações normais de usuário (com chave anônima)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Cliente admin para operações que requerem acesso privilegiado (com chave de serviço)
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);