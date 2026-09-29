import "server-only";

/**
 * Server-side Supabase utilities.
 * Client components must import directly from "@/lib/supabase/client"
 * to maintain strict boundary isolation and prevent server secrets from bundling into client code.
 */
export { createClient as createServerClient } from "./server";
export { createAdminClient } from "./admin";
