'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { safeStorage } from '@/lib/storage';

let client: SupabaseClient<Database> | null = null;

/** Cliente único do browser. A sessão fica no localStorage (com try/catch) e renova sozinha. */
export function supabase(): SupabaseClient<Database> {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Faltam NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  client = createClient<Database>(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // OTP por código: nunca há token na URL para ler
      detectSessionInUrl: false,
      // Safari em aba privada lança exceção no localStorage; sem isso o client inteiro cai
      storage: safeStorage('local'),
    },
    realtime: { params: { eventsPerSecond: 5 } },
  });
  return client;
}
