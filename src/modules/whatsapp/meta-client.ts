import { MetaSendResult } from "./types";
import { maskPhoneNumber } from "./phone";

export interface SendMetaTextMessageOptions {
  phoneNumberId: string;
  to: string;
  text: string;
  accessToken?: string;
  apiVersion?: string;
}

/**
 * Dedicated server-only Meta WhatsApp Cloud API Client.
 *
 * Rules:
 * - Centralizes Graph API URL & version (defaults to v21.0 or process.env.META_GRAPH_API_VERSION)
 * - Attaches Bearer token server-to-server
 * - Enforces request timeout (10s)
 * - Normalizes Meta API errors into typed codes
 * - Never prints or leaks access token or secrets
 */
export async function sendMetaTextMessage(
  options: SendMetaTextMessageOptions
): Promise<MetaSendResult> {
  const token = options.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  const version =
    options.apiVersion ||
    process.env.META_GRAPH_API_VERSION ||
    "v21.0";

  if (!token) {
    return {
      success: false,
      errorCode: "WHATSAPP_ACCESS_TOKEN_MISSING",
      errorMessage: "WHATSAPP_ACCESS_TOKEN is not configured on the server runtime.",
    };
  }

  if (!options.phoneNumberId) {
    return {
      success: false,
      errorCode: "PHONE_NUMBER_ID_MISSING",
      errorMessage: "phoneNumberId is missing in outbound send options.",
    };
  }

  const endpoint = `https://graph.facebook.com/${version}/${options.phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: options.to,
    type: "text",
    text: {
      preview_url: false,
      body: options.text,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorObj = data?.error;
      const errorCodeNum = errorObj?.code;
      const errorType = errorObj?.type;
      const errorSubcode = errorObj?.error_subcode;
      const rawMessage = errorObj?.message || response.statusText;

      let typedCode = "META_API_ERROR";
      if (errorCodeNum === 190 || errorType === "OAuthException") {
        typedCode = "WHATSAPP_ACCESS_TOKEN_INVALID";
      } else if (errorCodeNum === 80007 || errorCodeNum === 130429) {
        typedCode = "META_RATE_LIMITED";
      } else if (errorCodeNum === 131030) {
        typedCode = "RECIPIENT_NOT_ALLOWED";
      }

      console.error(
        `[MetaClient] Outbound send failed | code: ${typedCode} | metaCode: ${errorCodeNum} (subcode: ${errorSubcode}) | to: ${maskPhoneNumber(
          options.to
        )}`
      );

      return {
        success: false,
        errorCode: typedCode,
        errorMessage: rawMessage,
      };
    }

    const firstMsg = data?.messages?.[0];
    const messageId = firstMsg?.id;

    return {
      success: true,
      messageId,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    const isAbort =
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("abort"));

    const errorCode = isAbort ? "OUTBOUND_TIMEOUT" : "NETWORK_ERROR";
    const errorMessage =
      err instanceof Error ? err.message : "Failed to connect to Meta Graph API";

    console.error(
      `[MetaClient] Network exception during outbound send | code: ${errorCode} | to: ${maskPhoneNumber(
        options.to
      )} | message: ${errorMessage}`
    );

    return {
      success: false,
      errorCode,
      errorMessage,
    };
  }
}

export interface SendMetaTemplateMessageOptions {
  phoneNumberId: string;
  to: string;
  templateName: string;
  languageCode?: string;
  components?: Array<{
    type: "header" | "body" | "button";
    parameters?: Array<{
      type: "text" | "currency" | "date_time";
      text?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  }>;
  accessToken?: string;
  apiVersion?: string;
  fetcher?: typeof fetch;
}

/**
 * Dedicated server-only Meta WhatsApp Cloud API Template Message Client.
 *
 * Rules:
 * - Used for business-initiated outbound messages outside the 24-hour customer window (e.g. reminders)
 * - Meta strictly requires pre-approved Utility/Marketing/Authentication templates
 * - Never prints or leaks access token or secrets
 * - Enforces request timeout (10s)
 */
export async function sendMetaTemplateMessage(
  options: SendMetaTemplateMessageOptions,
  customFetch?: typeof fetch
): Promise<MetaSendResult> {
  const fetcher = customFetch || options.fetcher || fetch;
  const token = options.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  const version =
    options.apiVersion ||
    process.env.META_GRAPH_API_VERSION ||
    "v21.0";

  if (!token) {
    return {
      success: false,
      errorCode: "WHATSAPP_ACCESS_TOKEN_MISSING",
      errorMessage: "WHATSAPP_ACCESS_TOKEN is not configured on the server runtime.",
    };
  }

  if (!options.phoneNumberId) {
    return {
      success: false,
      errorCode: "PHONE_NUMBER_ID_MISSING",
      errorMessage: "phoneNumberId is missing in outbound template send options.",
    };
  }

  const endpoint = `https://graph.facebook.com/${version}/${options.phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: options.to,
    type: "template",
    template: {
      name: options.templateName,
      language: {
        code: options.languageCode || "id",
      },
      ...(options.components && options.components.length > 0
        ? { components: options.components }
        : {}),
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetcher(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorObj = data?.error;
      const errorCodeNum = errorObj?.code;
      const errorType = errorObj?.type;
      const errorSubcode = errorObj?.error_subcode;
      const rawMessage = errorObj?.message || response.statusText;

      let typedCode = "META_API_ERROR";
      if (errorCodeNum === 190 || errorType === "OAuthException") {
        typedCode = "WHATSAPP_ACCESS_TOKEN_INVALID";
      } else if (errorCodeNum === 80007 || errorCodeNum === 130429) {
        typedCode = "META_RATE_LIMITED";
      } else if (errorCodeNum === 131030) {
        typedCode = "RECIPIENT_NOT_ALLOWED";
      } else if (
        errorCodeNum === 132000 ||
        errorCodeNum === 132001 ||
        errorCodeNum === 132005 ||
        errorCodeNum === 132007 ||
        errorCodeNum === 132015
      ) {
        typedCode = "TEMPLATE_NOT_USABLE";
      }

      console.error(
        `[MetaClient] Template outbound send failed | code: ${typedCode} | metaCode: ${errorCodeNum} (subcode: ${errorSubcode}) | template: ${options.templateName} | to: ${maskPhoneNumber(
          options.to
        )}`
      );

      return {
        success: false,
        errorCode: typedCode,
        errorMessage: rawMessage,
      };
    }

    const firstMsg = data?.messages?.[0];
    const messageId = firstMsg?.id;

    return {
      success: true,
      messageId,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    const isAbort =
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("abort"));

    const errorCode = isAbort ? "OUTBOUND_TIMEOUT" : "NETWORK_ERROR";
    const errorMessage =
      err instanceof Error ? err.message : "Failed to connect to Meta Graph API";

    console.error(
      `[MetaClient] Network exception during template send | code: ${errorCode} | template: ${options.templateName} | to: ${maskPhoneNumber(
        options.to
      )} | message: ${errorMessage}`
    );

    return {
      success: false,
      errorCode,
      errorMessage,
    };
  }
}

