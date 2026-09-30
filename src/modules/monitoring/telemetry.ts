import { SupabaseClient } from "@supabase/supabase-js";

export type EventChannel = "telegram" | "whatsapp" | "system";
export type EventDirection = "inbound" | "outbound" | "internal";
export type EventStatus = "success" | "failed" | "ignored" | "warning";

export interface IntegrationEventInput {
  businessId?: string | null;
  channel: EventChannel;
  direction: EventDirection;
  eventType: string;
  status: EventStatus;
  errorCode?: string | null;
  metadata?: Record<string, unknown>;
}

const SENSITIVE_KEY_REGEX = /(token|secret|key|password|auth|authorization|credential)/i;

/**
 * Recursively sanitizes metadata to ensure zero secrets or tokens are stored.
 */
function sanitizeMetadata(data?: Record<string, unknown>): Record<string, unknown> {
  if (!data || typeof data !== "object") return {};

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      clean[key] = "[REDACTED]";
      continue;
    }

    if (typeof value === "string") {
      // Remove any potential JWT-like or Bearer strings
      clean[key] = value.replace(/(bearer\s+)[A-Za-z0-9._-]+/gi, "$1[REDACTED]").slice(0, 300);
    } else if (typeof value === "number" || typeof value === "boolean" || value === null) {
      clean[key] = value;
    } else if (Array.isArray(value)) {
      clean[key] = value.slice(0, 20).map((item) =>
        typeof item === "string" ? item.slice(0, 100) : item
      );
    } else if (typeof value === "object") {
      clean[key] = sanitizeMetadata(value as Record<string, unknown>);
    }
  }

  return clean;
}

/**
 * Records an integration event for operational health telemetry.
 */
export async function recordIntegrationEvent(
  client: SupabaseClient,
  event: IntegrationEventInput
): Promise<void> {
  try {
    const cleanMeta = sanitizeMetadata(event.metadata);

    await client.from("integration_events").insert({
      business_id: event.businessId || null,
      channel: event.channel,
      direction: event.direction,
      event_type: event.eventType,
      status: event.status,
      error_code: event.errorCode || null,
      metadata: cleanMeta,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Telemetry] Failed to record integration event: ${msg}`);
  }
}
