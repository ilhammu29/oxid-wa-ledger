import "server-only";

export interface ServerEnv {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  NODE_ENV: "development" | "production" | "test";
}

export interface WhatsAppEnv {
  WHATSAPP_ACCESS_TOKEN: string;
  WHATSAPP_PHONE_NUMBER_ID: string;
  WHATSAPP_WABA_ID: string;
  META_APP_SECRET: string;
  WHATSAPP_VERIFY_TOKEN: string;
  META_GRAPH_API_VERSION: string;
}

export interface EnvValidationResult {
  isValid: boolean;
  missingVariables: string[];
  message: string;
}

/**
 * Validates whether required server-side Supabase environment variables are present.
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
 * Validates Meta WhatsApp Cloud API server-side environment variables.
 * CRITICAL SECURITY: Never prints, logs, or exposes secret values.
 */
export function checkWhatsAppEnv(): EnvValidationResult {
  const missingVariables: string[] = [];

  if (!process.env.WHATSAPP_ACCESS_TOKEN) {
    missingVariables.push("WHATSAPP_ACCESS_TOKEN");
  }
  if (!process.env.WHATSAPP_PHONE_NUMBER_ID) {
    missingVariables.push("WHATSAPP_PHONE_NUMBER_ID");
  }
  if (!process.env.WHATSAPP_WABA_ID) {
    missingVariables.push("WHATSAPP_WABA_ID");
  }
  if (!process.env.META_APP_SECRET) {
    missingVariables.push("META_APP_SECRET");
  }
  if (!process.env.WHATSAPP_VERIFY_TOKEN) {
    missingVariables.push("WHATSAPP_VERIFY_TOKEN");
  }

  const isValid = missingVariables.length === 0;
  const message = isValid
    ? "WhatsApp environment variables are properly configured."
    : `Missing WhatsApp environment variables: ${missingVariables.join(", ")}.`;

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

/**
 * Retrieves validated Meta WhatsApp environment variables.
 * Throws a descriptive error when required variables are missing.
 */
export function getWhatsAppEnv(): WhatsAppEnv {
  const check = checkWhatsAppEnv();
  if (!check.isValid) {
    throw new Error(
      `[OXID WA Ledger] WhatsApp Configuration Error: ${check.message}`
    );
  }

  return {
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN!,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID!,
    WHATSAPP_WABA_ID: process.env.WHATSAPP_WABA_ID!,
    META_APP_SECRET: process.env.META_APP_SECRET!,
    WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN!,
    META_GRAPH_API_VERSION: process.env.META_GRAPH_API_VERSION || "v21.0",
  };
}

export interface TelegramEnv {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
}

/**
 * Validates Telegram Bot server-side environment variables.
 * CRITICAL SECURITY: Never prints, logs, or exposes secret values.
 */
export function checkTelegramEnv(): EnvValidationResult {
  const missingVariables: string[] = [];

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    missingVariables.push("TELEGRAM_BOT_TOKEN");
  }
  if (!process.env.TELEGRAM_WEBHOOK_SECRET) {
    missingVariables.push("TELEGRAM_WEBHOOK_SECRET");
  }

  const isValid = missingVariables.length === 0;
  const message = isValid
    ? "Telegram environment variables are properly configured."
    : `Missing Telegram environment variables: ${missingVariables.join(", ")}.`;

  return {
    isValid,
    missingVariables,
    message,
  };
}

/**
 * Retrieves validated Telegram environment variables.
 * Throws a descriptive error when required variables are missing.
 */
export function getTelegramEnv(): TelegramEnv {
  const check = checkTelegramEnv();
  if (!check.isValid) {
    throw new Error(
      `[OXID WA Ledger] Telegram Configuration Error: ${check.message}`
    );
  }

  return {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN!,
    TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET!,
  };
}
