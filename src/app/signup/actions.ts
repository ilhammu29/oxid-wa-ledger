import { createClient } from "@supabase/supabase-js";

export interface RegisterResult {
  success: boolean;
  error?: string;
  code?: string;
  emailConfirmationRequired?: boolean;
}

/**
 * Server action for user registration.
 *
 * Enforces:
 * - Server-side credentials validation
 * - Creation of confirmed user when service role is available (bypasses SMTP rate limits)
 * - Safe Indonesian error messages for duplicate email, invalid email, weak password, rate limits
 * - No exposure of internal Supabase errors or stack traces
 */
export interface AdminAuthClient {
  auth: {
    admin: {
      createUser: (params: {
        email: string;
        password: string;
        email_confirm?: boolean;
        user_metadata?: Record<string, unknown>;
      }) => Promise<{ data: { user?: unknown } | null; error: { message: string; code?: string; status?: number } | null }>;
    };
  };
}

export async function registerUserAction(formData: FormData, clientOverride?: AdminAuthClient): Promise<RegisterResult> {
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    // 2. Try Admin User Creation (bypasses SMTP rate limits and auto-confirms email for trial)
    const adminSupabase = clientOverride || (supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }) : null);

    if (adminSupabase) {

      const { data, error } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("already") || error.code === "email_exists") {
          return {
            success: false,
            error: "Email ini sudah terdaftar. Silakan masuk.",
            code: "email_exists",
          };
        }
        if (msg.includes("invalid") || msg.includes("format") || error.code === "email_address_invalid") {
          return {
            success: false,
            error: "Format email tidak valid.",
            code: "invalid_email",
          };
        }
        if (msg.includes("rate limit") || error.status === 429) {
          return {
            success: false,
            error: "Terlalu banyak percobaan pendaftaran. Silakan tunggu beberapa saat.",
            code: "rate_limit",
          };
        }
        console.error("[RegisterAction] Admin createUser error:", error.message);
        return {
          success: false,
          error: "Pendaftaran belum dapat diproses. Silakan coba lagi beberapa saat.",
          code: "server_error",
        };
      }

      if (data?.user) {
        return { success: true };
      }
    }

    // 3. Fallback: Standard signUp via client
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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
      options: { data: { full_name: fullName } },
    });

    if (signUpError) {
      const msg = signUpError.message.toLowerCase();
      if (msg.includes("already") || signUpError.code === "user_already_exists") {
        return {
          success: false,
          error: "Email ini sudah terdaftar. Silakan masuk.",
          code: "email_exists",
        };
      }
      if (msg.includes("rate limit") || signUpError.status === 429) {
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

    if (signUpData.user && !signUpData.session) {
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
  }
}
