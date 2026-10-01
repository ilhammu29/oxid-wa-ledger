import { SupabaseClient } from "@supabase/supabase-js";
import {
  MetaWebhookPayload,
  WebhookProcessingResult,
  MetaSendResult,
} from "./types";
import { normalizePhoneNumber, maskPhoneNumber } from "./phone";
import { sendMetaTextMessage } from "./meta-client";
import { executeConversationAction } from "../conversation/executor";
import { ExecutionContext } from "../transactions/types";
import { captureConversationFailure, FailureType } from "../pilot-hardening";
import { recordIntegrationEvent } from "../monitoring/telemetry";

export interface ProcessWebhookOptions {
  sendOutbound?: boolean;
  metaSender?: typeof sendMetaTextMessage;
}

/**
 * Orchestrates the end-to-end incoming WhatsApp message processing pipeline.
 *
 * PIPELINE:
 * 1. Validate Meta envelope structure
 * 2. Ignore non-message status events (sent, delivered, read) safely
 * 3. Extract text message payload (handle non-text without crashing)
 * 4. Resolve receiving WhatsApp connection -> business_id
 * 5. Verify sender authorization against whatsapp_authorized_senders
 * 6. Claim WhatsApp message ID atomically (strict idempotency protection)
 * 7. Execute deterministic parser and conversation action engine
 * 8. Mark WhatsApp message as processed in database
 * 9. Send deterministic formatted reply via Meta Cloud API
 * 10. Return acknowledged result to webhook handler
 */
export async function processIncomingWhatsAppWebhook(
  client: SupabaseClient,
  payload: MetaWebhookPayload,
  options: ProcessWebhookOptions = {}
): Promise<WebhookProcessingResult> {
  const metaSend = options.metaSender || sendMetaTextMessage;

  // 1. Verify object envelope
  if (!payload || payload.object !== "whatsapp_business_account") {
    return {
      acknowledged: true,
      type: "malformed_payload",
      reason: "Object is not whatsapp_business_account",
    };
  }

  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  if (!change || !value) {
    return {
      acknowledged: true,
      type: "malformed_payload",
      reason: "Missing entry or changes array in payload",
    };
  }

  // 2. Safe structured logging for Status callbacks (sent, delivered, read, failed)
  if (value.statuses && value.statuses.length > 0) {
    for (const st of value.statuses) {
      const err = (st.errors?.[0] as Record<string, unknown>) || undefined;
      const errCode = (err?.code as string | number) ?? "none";
      const errData = err?.error_data as Record<string, unknown> | undefined;
      const errSubcode = errData?.details ? "details_provided" : ((err?.subcode as string | number) ?? "none");
      const errTitle = err?.title ? String(err.title).slice(0, 150) : "none";
      const rawDetails = errData?.details || err?.message || "none";
      const errDetails = String(rawDetails).replace(/[A-Za-z0-9_-]{25,}/g, "[REDACTED]").slice(0, 200);

      console.info(
        `[WebhookStatus] wamid: ${st.id} | status: ${st.status} | recipient: ${maskPhoneNumber(st.recipient_id)} | errCode: ${errCode} | subcode: ${errSubcode} | title: ${errTitle} | details: ${errDetails}`
      );
    }
  }

  // Ignore Status-only callbacks safely without invoking financial parsers
  if (value.statuses && value.statuses.length > 0 && (!value.messages || value.messages.length === 0)) {
    const firstStatus = value.statuses[0];
    return {
      acknowledged: true,
      type: "status_event",
      messageId: firstStatus.id,
      action: `status_${firstStatus.status}`,
    };
  }

  // 3. Extract Message
  const msg = value.messages?.[0];
  if (!msg) {
    return {
      acknowledged: true,
      type: "status_event",
      reason: "No incoming messages present in change payload",
    };
  }

  const messageId = msg.id;
  const phoneNumberId = value.metadata?.phone_number_id;

  if (!phoneNumberId) {
    return {
      acknowledged: true,
      type: "malformed_payload",
      messageId,
      reason: "Missing metadata.phone_number_id in incoming webhook",
    };
  }

  // 4. Resolve receiving business from whatsapp_connections
  const { data: connection, error: connErr } = await client
    .from("whatsapp_connections")
    .select("business_id, status")
    .eq("phone_number_id", phoneNumberId)
    .maybeSingle();

  if (connErr || !connection || (connection.status !== "connected" && connection.status !== "active")) {
    console.warn(
      `[Webhook] Connection not found or inactive | phoneNumberId: ${phoneNumberId} | error: ${connErr?.message}`
    );
    return {
      acknowledged: true,
      type: "unknown_connection",
      messageId,
      reason: `No active connection for phone_number_id: ${phoneNumberId}`,
    };
  }

  const businessId = connection.business_id;

  // 5. Normalize sender phone
  let normalizedSender: string;
  try {
    normalizedSender = normalizePhoneNumber(msg.from);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[Webhook] Invalid sender phone format: ${msg.from} | ${errorMsg}`);
    return {
      acknowledged: true,
      type: "unauthorized_sender",
      messageId,
      businessId,
      reason: "Invalid sender phone format",
    };
  }

  // 6. Authorized Sender Check (CRITICAL SECURITY)
  const { data: senderRecord, error: senderErr } = await client
    .from("whatsapp_authorized_senders")
    .select("id, active")
    .eq("business_id", businessId)
    .eq("phone_number", normalizedSender)
    .eq("active", true)
    .maybeSingle();

  if (senderErr || !senderRecord) {
    console.warn(
      `[Webhook] Unauthorized sender blocked | business: ${businessId} | sender: ${maskPhoneNumber(
        normalizedSender
      )}`
    );
    // Silent ignore: Return 200 to Meta, ZERO financial writes, ZERO metadata leaks
    return {
      acknowledged: true,
      type: "unauthorized_sender",
      messageId,
      businessId,
      senderPhone: maskPhoneNumber(normalizedSender),
      reason: "Sender is not an authorized business operator",
    };
  }

  // Channel switch guard: Check if WhatsApp is enabled for this business
  const { data: channelSettings } = await client
    .from("business_channel_settings")
    .select("whatsapp_enabled")
    .eq("business_id", businessId)
    .maybeSingle();

  if (channelSettings && channelSettings.whatsapp_enabled === false) {
    await recordIntegrationEvent(client, {
      businessId,
      channel: "whatsapp",
      direction: "inbound",
      eventType: "channel.disabled_ignored",
      status: "ignored",
      metadata: { sender: maskPhoneNumber(normalizedSender) },
    });

    return {
      acknowledged: true,
      type: "channel_disabled",
      messageId,
      businessId,
      senderPhone: maskPhoneNumber(normalizedSender),
      reason: "WhatsApp channel is disabled for this business",
    };
  }

  // 7. Non-text message handling
  if (msg.type !== "text") {
    // Claim message ID to prevent processing loops
    await client.rpc("claim_whatsapp_message", {
      p_message_id: messageId,
      p_business_id: businessId,
      p_sender_phone: normalizedSender,
      p_message_type: msg.type,
      p_payload_hash: null,
    });

    await client.rpc("complete_whatsapp_message", {
      p_message_id: messageId,
      p_processing_status: "ignored",
      p_response_text: "Saat ini pencatatan hanya mendukung pesan teks.",
      p_error_message: null,
    });

    if (options.sendOutbound !== false) {
      await metaSend({
        phoneNumberId,
        to: normalizedSender,
        text: "Saat ini pencatatan hanya mendukung pesan teks.",
      }).catch(() => {});
    }

    return {
      acknowledged: true,
      type: "unsupported_message_type",
      messageId,
      businessId,
      senderPhone: maskPhoneNumber(normalizedSender),
    };
  }

  const rawMessageText = msg.text?.body?.trim() || "";

  // 8. Atomic Idempotency Claim (CRITICAL CONCURRENCY PROTECTION)
  const { data: claimData, error: claimErr } = await client.rpc(
    "claim_whatsapp_message",
    {
      p_message_id: messageId,
      p_business_id: businessId,
      p_sender_phone: normalizedSender,
      p_message_type: "text",
      p_payload_hash: null,
    }
  );

  const claimStatus = (claimData as { status?: string })?.status;

  if (claimErr || claimStatus !== "claimed") {
    console.info(
      `[Webhook] Duplicate delivery ignored | status: ${claimStatus} | messageId: ${messageId}`
    );
    return {
      acknowledged: true,
      type: "duplicate_ignored",
      messageId,
      businessId,
      senderPhone: maskPhoneNumber(normalizedSender),
      reason: `Message already claimed or processed: ${claimStatus}`,
    };
  }

  await recordIntegrationEvent(client, {
    businessId,
    channel: "whatsapp",
    direction: "inbound",
    eventType: "whatsapp.inbound.received",
    status: "success",
    metadata: { sender: maskPhoneNumber(normalizedSender) },
  });

  // 9. Execute Deterministic Conversation Action
  const timestampSeconds = Number(msg.timestamp);
  const messageDate = !isNaN(timestampSeconds) && timestampSeconds > 0
    ? new Date(timestampSeconds * 1000)
    : new Date();

  const executionContext: ExecutionContext = {
    businessId,
    source: "whatsapp",
    now: messageDate,
  };

  const executionResult = await executeConversationAction(
    client,
    executionContext,
    rawMessageText
  );

  // Pilot Hardening: Capture unhandled / unparseable operator messages
  if (
    executionResult.status === "ERROR" ||
    executionResult.action === "SHOW_UNKNOWN_HELP" ||
    executionResult.action === "ASK_CONFIRMATION"
  ) {
    let failureType: FailureType = "UNKNOWN_INTENT";
    if (executionResult.errorCode === "MULTI_PRODUCT_DETECTED") failureType = "MULTI_PRODUCT";
    else if (executionResult.errorCode === "AMBIGUOUS_PRODUCT") failureType = "AMBIGUOUS_PRODUCT";
    else if (executionResult.errorCode === "UNKNOWN_PRODUCT") failureType = "UNKNOWN_PRODUCT";
    else if (executionResult.errorCode === "UNSUPPORTED_FORMAT") failureType = "UNSUPPORTED_FORMAT";
    else if (executionResult.action === "ASK_CONFIRMATION") failureType = "AMBIGUOUS_QUANTITY";

    await captureConversationFailure(client, {
      businessId,
      channel: "whatsapp",
      senderReference: maskPhoneNumber(normalizedSender),
      messageText: rawMessageText,
      normalizedText: rawMessageText,
      failureType,
      parserIntent: executionResult.parsed?.intent,
    });

    await recordIntegrationEvent(client, {
      businessId,
      channel: "whatsapp",
      direction: "internal",
      eventType: "parser.review_required",
      status: "warning",
      errorCode: failureType,
    });
  }

  // 10. Mark Message Processed (Financial Idempotency committed)
  await client.rpc("complete_whatsapp_message", {
    p_message_id: messageId,
    p_processing_status: "processed",
    p_response_text: executionResult.replyText,
    p_error_message: executionResult.errorMessage || null,
  });

  await recordIntegrationEvent(client, {
    businessId,
    channel: "whatsapp",
    direction: "inbound",
    eventType: "whatsapp.inbound.processed",
    status: executionResult.status === "ERROR" ? "failed" : "success",
    errorCode: executionResult.errorMessage,
    metadata: { action: executionResult.action },
  });

  // 11. Send Outbound WhatsApp Reply
  let sendResult: MetaSendResult | undefined;
  if (options.sendOutbound !== false && executionResult.replyText) {
    try {
      sendResult = await metaSend({
        phoneNumberId,
        to: normalizedSender,
        text: executionResult.replyText,
      });

      if (!sendResult.success) {
        console.error(
          `[Webhook] Financial action succeeded, but outbound reply failed | messageId: ${messageId} | error: ${sendResult.errorCode}`
        );
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(
        `[Webhook] Exception sending outbound reply | messageId: ${messageId} | error: ${errorMsg}`
      );
      sendResult = {
        success: false,
        errorCode: "REPLY_EXCEPTION",
        errorMessage: errorMsg,
      };
    }

    await recordIntegrationEvent(client, {
      businessId,
      channel: "whatsapp",
      direction: "outbound",
      eventType: sendResult?.success ? "whatsapp.outbound.sent" : "whatsapp.outbound.failed",
      status: sendResult?.success ? "success" : "failed",
      errorCode: sendResult?.errorCode,
    });
  }

  return {
    acknowledged: true,
    type: "message_processed",
    messageId,
    businessId,
    senderPhone: maskPhoneNumber(normalizedSender),
    action: executionResult.action,
    executionResult,
    sendResult,
  };
}
