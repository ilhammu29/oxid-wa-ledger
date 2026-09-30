import "server-only";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export interface AuthenticatedBusinessSession {
  user: User;
  business: {
    id: string;
    name: string;
    status: string;
    timezone: string;
    currency: string;
  } | null;
  role: "owner" | "admin" | "member" | null;
  status: "OK" | "NO_BUSINESS" | "MULTIPLE_BUSINESSES";
}

/**
 * Resolves the authenticated Supabase user and their authorized business membership.
 * Guarantees that tenant business_id is derived strictly from membership records,
 * and NEVER from query parameters or arbitrary client input.
 */
export async function getAuthenticatedBusiness(options?: {
  redirectToLogin?: boolean;
}): Promise<AuthenticatedBusinessSession> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    if (options?.redirectToLogin !== false) {
      redirect("/login");
    }
    throw new Error("UNAUTHENTICATED");
  }

  // Resolve business memberships for this user
  const { data: memberships, error: memError } = await supabase
    .from("business_users")
    .select(`
      role,
      business_id,
      businesses (
        id,
        name,
        status,
        timezone,
        currency
      )
    `)
    .eq("user_id", user.id);

  if (memError || !memberships || memberships.length === 0) {
    return {
      user,
      business: null,
      role: null,
      status: "NO_BUSINESS",
    };
  }

  // Filter for active businesses
  const validMemberships = memberships.filter((m) => {
    const b = m.businesses as unknown as { status?: string } | null;
    return b && b.status === "active";
  });

  if (validMemberships.length === 0) {
    return {
      user,
      business: null,
      role: null,
      status: "NO_BUSINESS",
    };
  }

  const primary = validMemberships[0];
  const biz = primary.businesses as unknown as {
    id: string;
    name: string;
    status: string;
    timezone: string;
    currency: string;
  };

  return {
    user,
    business: biz,
    role: primary.role as "owner" | "admin" | "member",
    status: validMemberships.length > 1 ? "MULTIPLE_BUSINESSES" : "OK",
  };
}
