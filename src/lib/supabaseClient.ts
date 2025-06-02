import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// We'll use environment variables here, for now using placeholders
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || '';

// Check if we already have clients in window (for development hot reloading)
const globalAny = globalThis as any;

// Cliente regular para operações normais de usuário (com chave anônima)
export const supabase = globalAny.__supabase__ || (globalAny.__supabase__ = createClient<Database>(supabaseUrl, supabaseAnonKey));

// Cliente admin para operações que requerem acesso privilegiado (com chave de serviço)
export const supabaseAdmin = globalAny.__supabaseAdmin__ || (globalAny.__supabaseAdmin__ = createClient<Database>(supabaseUrl, supabaseServiceKey));