import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Handles Supabase authentication callbacks (email confirmation, magic link, password reset).
 *
 * Security:
 * - Strictly validates 'next' parameter against open redirect attacks
 * - Only relative paths starting with a single '/' are permitted
 * - Rejects protocol-relative ('//'), backslash ('\\'), or external URLs
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  // Enforce open redirect safety
  const isSafeRelativeUrl =
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.startsWith("/\\") &&
    !next.includes("://") &&
    !next.includes("\\");

  const safeNext = isSafeRelativeUrl ? next : "/onboarding";

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        return NextResponse.redirect(`${origin}${safeNext}`);
      }

      console.error("[AuthCallback] Exchange code error:", error.message);
    } catch (err) {
      console.error("[AuthCallback] Unexpected error:", err);
    }
  }

  // If code is missing, invalid, or expired
  return NextResponse.redirect(`${origin}/login?error=verification_failed`);
}
