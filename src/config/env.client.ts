export interface ClientEnv {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
}

export interface ClientEnvValidationResult {
  isValid: boolean;
  missingVariables: string[];
  message: string;
}

/**
 * Checks whether client-safe public Supabase environment variables are defined.
 * Never accesses or exposes server secrets.
 */
export function checkClientEnv(): ClientEnvValidationResult {
  const missingVariables: string[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missingVariables.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missingVariables.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const isValid = missingVariables.length === 0;
  const message = isValid
    ? "Client public environment variables are properly configured."
    : `Missing public Supabase variables: ${missingVariables.join(
        ", "
      )}. Please verify .env.local configuration.`;

  return {
    isValid,
    missingVariables,
    message,
  };
}

/**
 * Retrieves validated client environment variables.
 * Throws a clean error if accessed before .env.local is populated.
 */
export function getClientEnv(): ClientEnv {
  const check = checkClientEnv();
  if (!check.isValid) {
    throw new Error(
      `[OXID WA Ledger] Client Configuration Error: ${check.message}`
    );
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  };
}

/**
 * Retrieves public Telegram bot username without exposing bot tokens or secrets.
 * Authoritative default is 'catfish_ledger_bot'.
 */
export function getTelegramBotUsername(): string {
  return (
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
    "catfish_ledger_bot"
  );
}

/**
 * Builds safe Telegram deep-link for pairing (/start OXID-XXXX).
 * Never exposes tokens or secrets.
 */
export function buildTelegramPairingDeepLink(pairingCode: string, botUsername?: string): string {
  const username = botUsername || getTelegramBotUsername();
  return `https://t.me/${username}?start=${encodeURIComponent(pairingCode)}`;
}
