import { createBrowserClient } from "@supabase/ssr";
import { checkClientEnv } from "@/config/env.client";
import type { SupabaseClient } from "@supabase/supabase-js";

let clientInstance: SupabaseClient | null = null;

/**
 * Creates or retrieves a browser-safe Supabase client.
 * Safe to use in React Client Components ("use client").
 */
export function createClient(): SupabaseClient {
  if (clientInstance) {
    return clientInstance;
  }

  const envCheck = checkClientEnv();
  if (!envCheck.isValid) {
    throw new Error(
      `[OXID WA Ledger] Cannot initialize Supabase browser client: ${envCheck.message}`
    );
  }

  clientInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return clientInstance;
}
