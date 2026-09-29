import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkServerEnv } from "@/config/env";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a server-side Supabase client for Server Components, Server Actions, and Route Handlers.
 * Automatically synchronizes cookies with Next.js request/response cycle.
 */
export async function createClient(): Promise<SupabaseClient> {
  const envCheck = checkServerEnv();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      `[OXID WA Ledger] Cannot initialize Supabase server client: ${envCheck.message}`
    );
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be safely ignored if middleware is refreshing auth sessions.
          }
        },
      },
    }
  );
}
