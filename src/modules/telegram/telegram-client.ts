import { TelegramSendResult } from "./types";

export interface SendTelegramTextOptions {
  chatId: number | string;
  text: string;
  botToken?: string;
  timeoutMs?: number;
}

/**
 * Dedicated server-only Telegram Bot API Client.
 *
 * Rules:
 * - Uses official Telegram Bot API (https://api.telegram.org/bot<TOKEN>/sendMessage)
 * - Attaches bot token server-to-server
 * - Enforces request timeout (default: 10s)
 * - Normalizes Telegram API errors into typed codes
 * - Never prints or leaks bot token or secret in logs or error messages
 * - Strictly keeps destination chatId bounded to incoming message.chat.id
 */
export async function sendTelegramText(
  options: SendTelegramTextOptions
): Promise<TelegramSendResult> {
  const token = options.botToken || process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return {
      success: false,
      errorCode: "TELEGRAM_BOT_TOKEN_MISSING",
      errorMessage: "TELEGRAM_BOT_TOKEN is not configured on the server runtime.",
    };
  }

  if (!options.chatId) {
    return {
      success: false,
      errorCode: "CHAT_ID_MISSING",
      errorMessage: "chatId is missing in outbound send options.",
    };
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
  const timeoutMs = options.timeoutMs || 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: options.chatId,
        text: options.text,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      description?: string;
      error_code?: number;
      result?: { message_id?: number };
    } | null;

    if (!res.ok || !json?.ok) {
      const description = json?.description
        ? String(json.description).slice(0, 200)
        : res.statusText || "Unknown error";
      const errorCode = json?.error_code
        ? `TELEGRAM_API_${json.error_code}`
        : `TELEGRAM_HTTP_${res.status}`;

      console.warn(
        `[TelegramClient] Outbound send failed | code: ${errorCode} | chat: ${options.chatId} | error: ${description}`
      );

      return {
        success: false,
        errorCode,
        errorMessage: description,
      };
    }

    return {
      success: true,
      messageId: json.result?.message_id,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isAbort =
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("aborted"));
    const errorMsg = isAbort
      ? `Outbound request timed out after ${timeoutMs}ms`
      : err instanceof Error
      ? err.message
      : String(err);

    console.error(
      `[TelegramClient] Exception sending outbound message | chat: ${options.chatId} | error: ${errorMsg}`
    );

    return {
      success: false,
      errorCode: isAbort ? "TELEGRAM_TIMEOUT" : "TELEGRAM_SEND_EXCEPTION",
      errorMessage: errorMsg,
    };
  }
}

export interface SendTelegramDocumentOptions {
  chatId: number | string;
  document: Buffer;
  filename: string;
  caption?: string;
  botToken?: string;
  timeoutMs?: number;
}

/**
 * Sends a binary document/file (e.g. XLSX workbook) to a Telegram chat via multipart/form-data.
 */
export async function sendTelegramDocument(
  options: SendTelegramDocumentOptions
): Promise<TelegramSendResult> {
  const token = options.botToken || process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return {
      success: false,
      errorCode: "TELEGRAM_BOT_TOKEN_MISSING",
      errorMessage: "TELEGRAM_BOT_TOKEN is not configured on the server runtime.",
    };
  }

  if (!options.chatId) {
    return {
      success: false,
      errorCode: "CHAT_ID_MISSING",
      errorMessage: "chatId is missing in outbound send options.",
    };
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendDocument`;
  const timeoutMs = options.timeoutMs || 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const formData = new FormData();
    formData.append("chat_id", String(options.chatId));
    if (options.caption) {
      formData.append("caption", options.caption);
    }

    const blob = new Blob([new Uint8Array(options.document)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    formData.append("document", blob, options.filename);

    const res = await fetch(endpoint, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      description?: string;
      error_code?: number;
      result?: { message_id?: number };
    } | null;

    if (!res.ok || !json?.ok) {
      const description = json?.description
        ? String(json.description).slice(0, 200)
        : res.statusText || "Unknown error";
      const errorCode = json?.error_code
        ? `TELEGRAM_API_${json.error_code}`
        : `TELEGRAM_HTTP_${res.status}`;

      console.warn(
        `[TelegramClient] Outbound document send failed | code: ${errorCode} | chat: ${options.chatId} | error: ${description}`
      );

      return {
        success: false,
        errorCode,
        errorMessage: description,
      };
    }

    return {
      success: true,
      messageId: json.result?.message_id,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isAbort =
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("aborted"));
    const errorMsg = isAbort
      ? `Outbound document request timed out after ${timeoutMs}ms`
      : err instanceof Error
      ? err.message
      : String(err);

    console.error(
      `[TelegramClient] Exception sending outbound document | chat: ${options.chatId} | error: ${errorMsg}`
    );

    return {
      success: false,
      errorCode: isAbort ? "TELEGRAM_TIMEOUT" : "TELEGRAM_SEND_EXCEPTION",
      errorMessage: errorMsg,
    };
  }
}

