import "server-only";

export interface ServerEnv {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  NODE_ENV: "development" | "production" | "test";
}

export interface EnvValidationResult {
  isValid: boolean;
  missingVariables: string[];
  message: string;
}

/**
 * Validates whether required server-side environment variables are present.
 */
export function checkServerEnv(): EnvValidationResult {
  const missingVariables: string[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missingVariables.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missingVariables.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    missingVariables.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  const isValid = missingVariables.length === 0;
  const message = isValid
    ? "Server environment variables are properly configured."
    : `Missing required environment variables: ${missingVariables.join(
        ", "
      )}. Please populate .env.local based on .env.example.`;

  return {
    isValid,
    missingVariables,
    message,
  };
}

/**
 * Retrieves validated server-side environment variables.
 * Throws a descriptive error when required variables are missing in runtime operations.
 */
export function getServerEnv(): ServerEnv {
  const check = checkServerEnv();
  if (!check.isValid) {
    throw new Error(
      `[OXID WA Ledger] Configuration Error: ${check.message}`
    );
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    NODE_ENV: (process.env.NODE_ENV || "development") as ServerEnv["NODE_ENV"],
  };
}
