"use server";

import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, acquireInFlightLock, releaseInFlightLock } from "@/modules/auth/rate-limit";

export interface RegisterResult {
  success: boolean;
  error?: string;
  code?: string;
  emailConfirmationRequired?: boolean;
}

export interface AdminAuthClient {
  auth: {
    admin?: {
      createUser: (params: {
        email: string;
        password: string;
        email_confirm?: boolean;
        user_metadata?: Record<string, unknown>;
      }) => Promise<{ data: { user?: unknown } | null; error: { message: string; code?: string; status?: number } | null }>;
    };
    signUp?: (params: {
      email: string;
      password: string;
      options?: {
        data?: Record<string, unknown>;
        emailRedirectTo?: string;
      };
    }) => Promise<{
      data: {
        user?: { id: string; email?: string; email_confirmed_at?: string | null; identities?: unknown[] } | null;
        session?: unknown;
      } | null;
      error: { message: string; code?: string; status?: number } | null;
    }>;
  };
}

function mapAuthError(error: { message?: string; code?: string; status?: number }): RegisterResult {
  const msg = (error.message || "").toLowerCase();
  const code = error.code || "";

  if (msg.includes("already") || code === "email_exists" || code === "user_already_exists") {
    return {
      success: false,
      error: "Email ini sudah terdaftar. Silakan masuk.",
      code: "email_exists",
    };
  }

  if (
    msg.includes("invalid") ||
    msg.includes("format") ||
    code === "invalid_email" ||
    code === "email_address_invalid"
  ) {
    return {
      success: false,
      error: "Format email tidak valid.",
      code: "invalid_email",
    };
  }

  if (msg.includes("password") || code === "weak_password") {
    return {
      success: false,
      error: "Password minimal 8 karakter.",
      code: "weak_password",
    };
  }

  if (
    msg.includes("rate limit") ||
    code === "over_email_send_rate_limit" ||
    error.status === 429
  ) {
    return {
      success: false,
      error: "Terlalu banyak percobaan pendaftaran. Silakan tunggu beberapa saat.",
      code: "rate_limit",
    };
  }

  return {
    success: false,
    error: "Pendaftaran belum dapat diproses. Silakan coba lagi beberapa saat.",
    code: "server_error",
  };
}

/**
 * Server action for public user registration.
 *
 * Step 10.2 Security Hardening:
 * - Public self-service NEVER bypasses email ownership verification in production
 * - admin.createUser({ email_confirm: true }) is disabled by default
 * - ALLOW_UNVERIFIED_INTERNAL_SIGNUP must default to false (internal tests only)
 * - Rate limiting protects endpoints against registration abuse
 * - Safe Indonesian messages; zero stack trace leaks
 */
export async function registerUserAction(
  formData: FormData,
  clientOverride?: AdminAuthClient
): Promise<RegisterResult> {
  const fullName = (formData.get("fullName") as string || "").trim();
  const email = (formData.get("email") as string || "").trim().toLowerCase();
  const password = (formData.get("password") as string || "");

  // 1. Validation
  if (!fullName || fullName.length < 2) {
    return {
      success: false,
      error: "Nama lengkap minimal 2 karakter.",
      code: "invalid_name",
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return {
      success: false,
      error: "Format email tidak valid.",
      code: "invalid_email",
    };
  }

  if (!password || password.length < 8) {
    return {
      success: false,
      error: "Password minimal 8 karakter.",
      code: "weak_password",
    };
  }

  // 2. Concurrency Lock & Rate Limiting
  const lockKey = `signup_lock_${email}`;
  if (!acquireInFlightLock(lockKey)) {
    return {
      success: false,
      error: "Permintaan pendaftaran sedang diproses. Mohon tunggu.",
      code: "in_flight",
    };
  }

  try {
    const rateCheck = checkRateLimit(`signup_email_${email}`, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: "Terlalu banyak percobaan pendaftaran. Silakan tunggu beberapa saat.",
        code: "rate_limit",
      };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://oxid-wa-ledger.vercel.app";

    // 3. Controlled internal testing mode
    // Must default to false. Bypassing email verification in production is forbidden.
    const allowUnverifiedInternal = process.env.ALLOW_UNVERIFIED_INTERNAL_SIGNUP === "true";

    if (allowUnverifiedInternal && serviceRoleKey && !clientOverride) {
      const adminSupabase = createClient(supabaseUrl!, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data, error } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (error) {
        return mapAuthError(error);
      }

      if (data?.user) {
        return { success: true };
      }
    }

    // 4. Client Override Support (for test suites)
    if (clientOverride) {
      if (clientOverride.auth?.signUp) {
        const { data, error } = await clientOverride.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${siteUrl}/auth/callback?next=/onboarding`,
          },
        });
        if (error) {
          return mapAuthError(error);
        }
        if (data?.user && (!data.user.email_confirmed_at && !data.session)) {
          return { success: true, emailConfirmationRequired: true };
        }
        return { success: true };
      } else if (clientOverride.auth?.admin && allowUnverifiedInternal) {
        const { data, error } = await clientOverride.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });
        if (error) {
          return mapAuthError(error);
        }
        if (data?.user) {
          return { success: true };
        }
      } else if (clientOverride.auth?.admin && !allowUnverifiedInternal) {
        // Explicitly reject unverified admin bypass when flag is false
        return {
          success: false,
          error: "Pendaftaran langsung tanpa verifikasi email tidak diizinkan.",
          code: "unverified_signup_blocked",
        };
      }
    }

    // 5. Standard Safe Self-Service Auth (Public Production)
    if (!supabaseUrl || !anonKey) {
      return {
        success: false,
        error: "Konfigurasi server tidak lengkap.",
        code: "config_error",
      };
    }

    const supabase = createClient(supabaseUrl, anonKey);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${siteUrl}/auth/callback?next=/onboarding`,
      },
    });

    if (signUpError) {
      return mapAuthError(signUpError);
    }

    // Check if user already exists
    if (signUpData?.user && (!signUpData.user.identities || signUpData.user.identities.length === 0)) {
      return {
        success: false,
        error: "Email ini sudah terdaftar. Silakan masuk.",
        code: "email_exists",
      };
    }

    // If confirmation required
    if (signUpData?.user && (!signUpData.user.email_confirmed_at && !signUpData.session)) {
      return { success: true, emailConfirmationRequired: true };
    }

    return { success: true };
  } catch (err) {
    console.error("[RegisterAction] Unexpected error:", err);
    return {
      success: false,
      error: "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
      code: "network_error",
    };
  } finally {
    releaseInFlightLock(lockKey);
  }
}

export async function resendVerificationEmailAction(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = (email || "").trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { success: false, error: "Format email tidak valid." };
  }

  const rateCheck = checkRateLimit(`resend_${cleanEmail}`, 3, 10 * 60 * 1000);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: "Terlalu banyak permintaan kirim ulang. Silakan tunggu beberapa saat.",
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://oxid-wa-ledger.vercel.app";

  if (!supabaseUrl || !anonKey) {
    return { success: false, error: "Konfigurasi server tidak lengkap." };
  }

  try {
    const supabase = createClient(supabaseUrl, anonKey);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: cleanEmail,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=/onboarding`,
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("rate limit") || error.status === 429) {
        return {
          success: false,
          error: "Terlalu banyak permintaan. Silakan tunggu beberapa saat.",
        };
      }
      return { success: false, error: "Gagal mengirim ulang email verifikasi." };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Terjadi kesalahan koneksi server." };
  }
}

export async function requestPasswordResetAction(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = (email || "").trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { success: false, error: "Format email tidak valid." };
  }

  const rateCheck = checkRateLimit(`reset_${cleanEmail}`, 3, 15 * 60 * 1000);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: "Terlalu banyak permintaan reset kata sandi. Silakan tunggu beberapa saat.",
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://oxid-wa-ledger.vercel.app";

  if (!supabaseUrl || !anonKey) {
    return { success: false, error: "Konfigurasi server tidak lengkap." };
  }

  try {
    const supabase = createClient(supabaseUrl, anonKey);
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${siteUrl}/auth/reset-password`,
    });

    if (error) {
      return { success: false, error: "Gagal memproses permintaan reset kata sandi." };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Terjadi kesalahan koneksi server." };
  }
}
