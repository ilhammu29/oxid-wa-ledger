/**
 * Normalization utilities for Telegram incoming commands and user identifiers.
 */

/**
 * Masks a Telegram numeric user ID for safe structured logging.
 * Example: 123456789 -> 123***789
 * Example: 98765 -> 98***
 */
export function maskTelegramUserId(userId: number | string | undefined | null): string {
  if (!userId) return "[EMPTY]";
  const str = String(userId).trim();
  if (str.length <= 4) return "****";

  const prefixLen = Math.min(3, Math.floor(str.length / 3));
  const suffixLen = Math.min(3, Math.floor(str.length / 3));

  const prefix = str.slice(0, prefixLen);
  const suffix = str.slice(-suffixLen);

  return `${prefix}****${suffix}`;
}

export interface NormalizedTelegramCommand {
  isStart: boolean;
  normalizedText: string;
}

/**
 * Adapts incoming Telegram commands into canonical text for the existing parser.
 *
 * Rules:
 * - /start and /start@bot -> isStart: true
 * - /help and /help@bot -> "help"
 * - Suffixes like @bot_name are safely stripped
 * - Natural language commands (e.g. "Kejual 15kg", "laporan hari ini") pass through intact
 */
export function normalizeTelegramCommand(rawText: string): NormalizedTelegramCommand {
  if (!rawText) {
    return { isStart: false, normalizedText: "" };
  }

  const trimmed = rawText.trim();

  // Match leading Telegram command e.g. /start, /start@bot, /help, /help@my_bot
  const commandMatch = trimmed.match(/^\/([a-zA-Z0-9_]+)(?:@[a-zA-Z0-9_]+)?(?:\s+([\s\S]*))?$/);

  if (commandMatch) {
    const commandName = commandMatch[1].toLowerCase();
    const commandArgs = commandMatch[2] ? commandMatch[2].trim() : "";

    if (commandName === "start") {
      return { isStart: true, normalizedText: "/start" };
    }

    if (commandName === "help") {
      return { isStart: false, normalizedText: "help" };
    }

    // Pass other slash commands stripped of / and @bot (e.g. /batal -> "batal", /batal terakhir -> "batal terakhir")
    const resolved = commandArgs ? `${commandName} ${commandArgs}` : commandName;
    return { isStart: false, normalizedText: resolved };
  }

  return { isStart: false, normalizedText: trimmed };
}
