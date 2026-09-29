import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/config/env";
import type { SupabaseClient } from "@supabase/supabase-js";

let adminInstance: SupabaseClient | null = null;

/**
 * Creates an administrative Supabase client using the privileged service role key.
 * 
 * SECURITY WARNING:
 * - This client bypasses Row Level Security (RLS).
 * - MUST ONLY be used on the server in secure backend contexts (e.g. system jobs, webhooks).
 * - NEVER import or execute this from client components.
 */
export function createAdminClient(): SupabaseClient {
  if (adminInstance) {
    return adminInstance;
  }

  const env = getServerEnv();

  adminInstance = createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return adminInstance;
}
