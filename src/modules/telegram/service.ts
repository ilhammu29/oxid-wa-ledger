import { SupabaseClient } from "@supabase/supabase-js";
import {
  TelegramUpdate,
  TelegramWebhookProcessingResult,
  TelegramSendResult,
} from "./types";
import { maskTelegramUserId, normalizeTelegramCommand } from "./normalizer";
import { sendTelegramText } from "./telegram-client";
import { executeConversationAction } from "../conversation/executor";
import { ExecutionContext } from "../transactions/types";
import { captureConversationFailure, FailureType } from "../pilot-hardening";
import { recordIntegrationEvent } from "../monitoring/telemetry";
import { derivePairingTokenHash } from "./pairing-crypto";

export interface ProcessTelegramWebhookOptions {
  sendOutbound?: boolean;
  telegramSender?: typeof sendTelegramText;
}

/**
 * Orchestrates incoming Telegram Bot API Webhook updates.
 *
 * PIPELINE:
 * 1. Validate Telegram Update structure & update_id
 * 2. Safely ignore non-message updates (edited_message, channel_post, callback_query, etc.)
 * 3. Restrict processing strictly to private chats (message.chat.type === "private")
 * 4. Validate numeric Telegram user ID (message.from.id)
 * 5. Handle non-text updates safely without crashing
 * 6. Check Telegram user authorization against telegram_authorized_users
 * 7. Support /start bootstrap for unauthorized users (revealing only own ID)
 * 8. Enforce single active business mapping (detect ambiguous tenant configurations)
 * 9. Atomic update claim (processed_telegram_updates) for strict idempotency
 * 10. Normalize command and execute existing conversation action engine
 * 11. Mark Telegram update completed in database
 * 12. Send deterministic reply strictly to incoming message.chat.id
 */
export async function processIncomingTelegramWebhook(
  client: SupabaseClient,
  update: TelegramUpdate,
  options: ProcessTelegramWebhookOptions = {}
): Promise<TelegramWebhookProcessingResult> {
  const telegramSend = options.telegramSender || sendTelegramText;

  // 1. Validate Update Envelope
  if (!update || typeof update.update_id !== "number") {
    return {
      acknowledged: true,
      type: "malformed_update",
      reason: "Missing or non-numeric update_id in Telegram payload",
    };
  }

  const updateId = update.update_id;

  // 2. Filter Unsupported Update Types (only message is processed for MVP)
  if (!update.message) {
    return {
      acknowledged: true,
      type: "unsupported_update",
      updateId,
      reason: "Update does not contain a new message object",
    };
  }

  const msg = update.message;

  // 3. Restrict Strictly to Private Chats
  if (msg.chat?.type !== "private") {
    return {
      acknowledged: true,
      type: "unsupported_chat_type",
      updateId,
      reason: `Chat type '${msg.chat?.type}' is not supported. Only private chats are allowed.`,
    };
  }

  const replyChatId = msg.chat.id;

  // 4. Validate Sender Identity (Numeric ID)
  const fromUser = msg.from;
  if (!fromUser || typeof fromUser.id !== "number" || isNaN(fromUser.id)) {
    return {
      acknowledged: true,
      type: "malformed_update",
      updateId,
      reason: "Message lacks a valid numeric sender ID (message.from.id)",
    };
  }

  const telegramUserId = fromUser.id;

  // 5. Filter Non-text Messages
  if (typeof msg.text !== "string") {
    return {
      acknowledged: true,
      type: "unsupported_message_type",
      updateId,
      telegramUserId: String(telegramUserId),
      reason: "Non-text message received. Telegram adapter only processes text commands.",
    };
  }

  const rawText = msg.text.trim();
  const { isStart, normalizedText } = normalizeTelegramCommand(rawText);

  // 5.5 Handle Telegram Pairing Token (/connect OXID-XXXX or /start OXID-XXXX or raw code)
  const connectMatch =
    rawText.match(/^\/connect(?:\s+([A-Za-z0-9\-]+))?$/i) ||
    rawText.match(/^\/start\s+([A-Za-z0-9\-]+)$/i) ||
    rawText.match(/^(OXID-[A-Za-z0-9]{4,16})$/i);

  if (connectMatch) {
    const rawPairingCode = connectMatch[1]?.trim().toUpperCase();

    if (rawPairingCode) {
      const tokenHash = derivePairingTokenHash(rawPairingCode);
      const telegramUsername = fromUser.username ? `@${fromUser.username}` : null;
      const displayLabel = fromUser.username
        ? `@${fromUser.username}`
        : `Operator (${fromUser.first_name || "Utama"})`;

      const { data: pairData } = await client.rpc(
        "verify_and_consume_telegram_pairing_token",
        {
          p_token_hash: tokenHash,
          p_telegram_user_id: telegramUserId,
          p_display_label: displayLabel,
          p_telegram_username: telegramUsername,
          p_operator_role: "Kasir",
        }
      );

      const pairResult = pairData as {
        valid?: boolean;
        business_id?: string;
        business_name?: string;
        error?: string;
      } | null;

      if (pairResult?.valid && pairResult.business_id) {
        const pairSuccessReply = `✅ Telegram Berhasil Terhubung!\n\nUsaha: ${pairResult.business_name}\nOperator: ${fromUser.first_name || "Utama"}\n\nAkun Telegram Anda telah terhubung resmi. Anda bisa langsung mulai mencatat penjualan lewat obrolan ini.\n\nContoh pencatatan:\n"Kejual lele 10kg"`;

        await client.rpc("claim_telegram_update", {
          p_update_id: updateId,
          p_business_id: pairResult.business_id,
          p_telegram_user_id: telegramUserId,
        });

        await client.rpc("complete_telegram_update", {
          p_update_id: updateId,
          p_processing_status: "processed",
          p_business_id: pairResult.business_id,
          p_response_text: pairSuccessReply,
          p_error_message: null,
        });

        recordIntegrationEvent(client, {
          businessId: pairResult.business_id,
          channel: "telegram",
          direction: "inbound",
          eventType: "telegram.pairing.consumed",
          status: "success",
          metadata: {
            event: "telegram_pairing_consumed",
            telegram_user_id: maskTelegramUserId(telegramUserId),
          },
        }).catch(() => {});

        if (options.sendOutbound !== false) {
          await telegramSend({
            chatId: replyChatId,
            text: pairSuccessReply,
          });
        }

        return {
          acknowledged: true,
          type: "pairing_success",
          updateId,
          businessId: pairResult.business_id,
          telegramUserId: String(telegramUserId),
        };
      } else {
        let pairFailReply = `❌ Kode pairing tidak valid atau sudah kedaluwarsa.\n\nPastikan kode masih aktif (berlaku 10 menit) dan dibuat melalui halaman pengaturan OXID Ledger.`;

        if (pairResult?.error === "RATE_LIMITED") {
          pairFailReply = `❌ Terlalu banyak percobaan kode koneksi. Silakan tunggu beberapa menit lalu coba lagi.`;
        } else if (pairResult?.error === "ALREADY_CONNECTED_TO_OTHER_BUSINESS") {
          pairFailReply = `❌ Akun Telegram ini sudah terhubung ke bisnis lain.\n\nPutuskan koneksi sebelumnya melalui dashboard sebelum menghubungkan bisnis baru.`;
        } else if (pairResult?.error === "OPERATOR_LIMIT_REACHED") {
          pairFailReply = `❌ Batas operator Telegram untuk paket Anda sudah tercapai.\n\nSilakan upgrade paket langganan Anda melalui dashboard untuk menambah operator baru.`;
        }

        await client.rpc("claim_telegram_update", {
          p_update_id: updateId,
          p_business_id: null,
          p_telegram_user_id: telegramUserId,
        });

        await client.rpc("complete_telegram_update", {
          p_update_id: updateId,
          p_processing_status: "failed",
          p_business_id: null,
          p_response_text: pairFailReply,
          p_error_message: pairResult?.error || "INVALID_PAIRING_CODE",
        });

        recordIntegrationEvent(client, {
          businessId: pairResult?.business_id || "unassigned",
          channel: "telegram",
          direction: "inbound",
          eventType: "telegram.pairing.failed",
          status: "failed",
          metadata: {
            event: "telegram_pairing_failed",
            safe_error_code: pairResult?.error || "INVALID_PAIRING_CODE",
            telegram_user_id: maskTelegramUserId(telegramUserId),
          },
        }).catch(() => {});

        if (options.sendOutbound !== false) {
          await telegramSend({
            chatId: replyChatId,
            text: pairFailReply,
          });
        }

        return {
          acknowledged: true,
          type: "pairing_failed",
          updateId,
          telegramUserId: String(telegramUserId),
          reason: pairResult?.error || "INVALID_PAIRING_CODE",
        };
      }
    } else {
      // User sent bare /connect with no code
      const pairHelpReply = `Gunakan format:\n/connect <KODE-PAIRING>\n\nContoh:\n/connect OXID-7K2P\n\nKode pairing bisa Anda dapatkan dari halaman onboarding dashboard OXID Ledger.`;

      await client.rpc("claim_telegram_update", {
        p_update_id: updateId,
        p_business_id: null,
        p_telegram_user_id: telegramUserId,
      });

      await client.rpc("complete_telegram_update", {
        p_update_id: updateId,
        p_processing_status: "processed",
        p_business_id: null,
        p_response_text: pairHelpReply,
        p_error_message: null,
      });

      if (options.sendOutbound !== false) {
        await telegramSend({
          chatId: replyChatId,
          text: pairHelpReply,
        });
      }

      return {
        acknowledged: true,
        type: "pairing_help",
        updateId,
        telegramUserId: String(telegramUserId),
      };
    }
  }

  // 6. Resolve Business Authorization
  const { data: userRecords, error: authError } = await client
    .from("telegram_authorized_users")
    .select("id, business_id, active")
    .eq("telegram_user_id", telegramUserId)
    .eq("active", true);

  if (authError) {
    console.error(
      `[TelegramWebhook] Database error querying authorization for user: ${maskTelegramUserId(
        telegramUserId
      )} | error: ${authError.message}`
    );
    return {
      acknowledged: true,
      type: "internal_error",
      updateId,
      telegramUserId: String(telegramUserId),
      reason: "Database query error during authorization",
    };
  }

  // CASE A: Unauthorized User
  if (!userRecords || userRecords.length === 0) {
    if (isStart) {
      const bootstrapReply = `OXID Ledger belum mengizinkan akun Telegram ini.\n\nTelegram User ID Anda:\n${telegramUserId}\n\nHubungkan ID ini melalui setup OXID, atau kirim:\n/connect <KODE-PAIRING>`;

      // Atomic claim to prevent duplicate bootstrap replies on retry
      const { data: claimData } = await client.rpc("claim_telegram_update", {
        p_update_id: updateId,
        p_business_id: null,
        p_telegram_user_id: telegramUserId,
      });

      const claimStatus = (claimData as { status?: string })?.status;

      if (claimStatus === "claimed") {
        await client.rpc("complete_telegram_update", {
          p_update_id: updateId,
          p_processing_status: "processed",
          p_business_id: null,
          p_response_text: bootstrapReply,
          p_error_message: null,
        });

        if (options.sendOutbound !== false) {
          await telegramSend({
            chatId: replyChatId,
            text: bootstrapReply,
          });
        }
      }

      return {
        acknowledged: true,
        type: "unauthorized_user",
        updateId,
        telegramUserId: String(telegramUserId),
        action: "BOOTSTRAP_START",
        reason: "Unauthorized user requested /start bootstrap info",
      };
    }

    // 10.1G: Unpaired Telegram Security: Send safe guidance, zero financial mutations
    const unauthReply = `Telegram ini belum terhubung ke bisnis OXID Ledger.\n\nSilakan buka dashboard OXID Ledger dan gunakan kode penghubung Telegram.`;

    await client.rpc("claim_telegram_update", {
      p_update_id: updateId,
      p_business_id: null,
      p_telegram_user_id: telegramUserId,
    });

    await client.rpc("complete_telegram_update", {
      p_update_id: updateId,
      p_processing_status: "processed",
      p_business_id: null,
      p_response_text: unauthReply,
      p_error_message: null,
    });

    if (options.sendOutbound !== false) {
      await telegramSend({
        chatId: replyChatId,
        text: unauthReply,
      });
    }

    console.warn(
      `[TelegramWebhook] Unauthorized sender blocked | telegramUserId: ${maskTelegramUserId(
        telegramUserId
      )}`
    );

    return {
      acknowledged: true,
      type: "unauthorized_user",
      updateId,
      telegramUserId: String(telegramUserId),
      reason: "Telegram user is not an authorized business operator",
    };
  }

  // CASE B: Ambiguous Business Mapping
  if (userRecords.length > 1) {
    const configErrorReply =
      "Konfigurasi akun Telegram Anda tidak valid (terhubung ke beberapa bisnis aktif). Hubungi admin.";

    console.warn(
      `[TelegramWebhook] Multiple active business mappings found for user: ${maskTelegramUserId(
        telegramUserId
      )}`
    );

    await client.rpc("claim_telegram_update", {
      p_update_id: updateId,
      p_business_id: null,
      p_telegram_user_id: telegramUserId,
    });

    await client.rpc("complete_telegram_update", {
      p_update_id: updateId,
      p_processing_status: "failed",
      p_business_id: null,
      p_response_text: configErrorReply,
      p_error_message: "MULTIPLE_ACTIVE_BUSINESS_MAPPINGS",
    });

    if (options.sendOutbound !== false) {
      await telegramSend({
        chatId: replyChatId,
        text: configErrorReply,
      });
    }

    return {
      acknowledged: true,
      type: "ambiguous_business_mapping",
      updateId,
      telegramUserId: String(telegramUserId),
      reason: "Multiple active business mappings exist for Telegram user",
    };
  }

  // CASE C: Authorized Business Operator
  const businessId = userRecords[0].business_id;

  // Channel switch guard: Check if Telegram is enabled for this business
  const { data: channelSettings } = await client
    .from("business_channel_settings")
    .select("telegram_enabled")
    .eq("business_id", businessId)
    .maybeSingle();

  if (channelSettings && channelSettings.telegram_enabled === false) {
    const disabledReply = "Channel Telegram untuk bisnis ini sedang dinonaktifkan di dashboard.";
    await recordIntegrationEvent(client, {
      businessId,
      channel: "telegram",
      direction: "inbound",
      eventType: "channel.disabled_ignored",
      status: "ignored",
      metadata: { telegramUserId },
    });

    if (options.sendOutbound !== false) {
      await telegramSend({
        chatId: replyChatId,
        text: disabledReply,
      });
    }

    return {
      acknowledged: true,
      type: "channel_disabled",
      updateId,
      businessId,
      telegramUserId: String(telegramUserId),
      reason: "Telegram channel is disabled for this business",
    };
  }

  // Handle Authorized /start
  if (isStart) {
    const startReply = `OXID Ledger aktif.\n\nKamu bisa kirim:\n• Kejual 15kg\n• laporan hari ini\n• minggu ini dapat berapa\n• batal terakhir\n• ubah terakhir jadi 20kg\n• help`;

    const { data: claimData } = await client.rpc("claim_telegram_update", {
      p_update_id: updateId,
      p_business_id: businessId,
      p_telegram_user_id: telegramUserId,
    });

    const claimStatus = (claimData as { status?: string })?.status;

    if (claimStatus === "claimed") {
      await client.rpc("complete_telegram_update", {
        p_update_id: updateId,
        p_processing_status: "processed",
        p_business_id: businessId,
        p_response_text: startReply,
        p_error_message: null,
      });

      if (options.sendOutbound !== false) {
        await telegramSend({
          chatId: replyChatId,
          text: startReply,
        });
      }
    }

    return {
      acknowledged: true,
      type: "message_processed",
      updateId,
      businessId,
      telegramUserId: String(telegramUserId),
      action: "START",
    };
  }

  // 7. Atomic Idempotency Claim (CRITICAL CONCURRENCY & RETRY PROTECTION)
  const { data: claimData, error: claimErr } = await client.rpc(
    "claim_telegram_update",
    {
      p_update_id: updateId,
      p_business_id: businessId,
      p_telegram_user_id: telegramUserId,
    }
  );

  const claimStatus = (claimData as { status?: string })?.status;

  if (claimErr || claimStatus !== "claimed") {
    console.info(
      `[TelegramWebhook] Duplicate delivery ignored | status: ${claimStatus} | updateId: ${updateId}`
    );
    return {
      acknowledged: true,
      type: "duplicate_ignored",
      updateId,
      businessId,
      telegramUserId: String(telegramUserId),
      reason: `Update already claimed or processed: ${claimStatus}`,
    };
  }

  await recordIntegrationEvent(client, {
    businessId,
    channel: "telegram",
    direction: "inbound",
    eventType: "telegram.inbound.received",
    status: "success",
    metadata: { telegramUserId },
  });

  // 8. Execute Deterministic Conversation Action
  const dateSeconds = Number(msg.date);
  const messageDate =
    !isNaN(dateSeconds) && dateSeconds > 0
      ? new Date(dateSeconds * 1000)
      : new Date();

  const executionContext: ExecutionContext = {
    businessId,
    source: "telegram",
    now: messageDate,
  };

  const executionResult = await executeConversationAction(
    client,
    executionContext,
    normalizedText
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
      channel: "telegram",
      senderReference: maskTelegramUserId(telegramUserId),
      messageText: rawText,
      normalizedText,
      failureType,
      parserIntent: executionResult.parsed?.intent,
    });

    await recordIntegrationEvent(client, {
      businessId,
      channel: "telegram",
      direction: "internal",
      eventType: "parser.review_required",
      status: "warning",
      errorCode: failureType,
    });
  }

  // 9. Mark Telegram Update Processed (Financial Idempotency committed)
  await client.rpc("complete_telegram_update", {
    p_update_id: updateId,
    p_processing_status: "processed",
    p_business_id: businessId,
    p_response_text: executionResult.replyText,
    p_error_message: executionResult.errorMessage || null,
  });

  await recordIntegrationEvent(client, {
    businessId,
    channel: "telegram",
    direction: "inbound",
    eventType: "telegram.inbound.processed",
    status: executionResult.status === "ERROR" ? "failed" : "success",
    errorCode: executionResult.errorMessage,
    metadata: { action: executionResult.action },
  });

  // 10. Send Outbound Telegram Reply
  let sendResult: TelegramSendResult | undefined;
  if (options.sendOutbound !== false && executionResult.replyText) {
    try {
      sendResult = await telegramSend({
        chatId: replyChatId,
        text: executionResult.replyText,
      });

      if (!sendResult.success) {
        console.error(
          `[TelegramWebhook] Financial action succeeded, but outbound reply failed | updateId: ${updateId} | error: ${sendResult.errorCode}`
        );
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(
        `[TelegramWebhook] Exception sending outbound reply | updateId: ${updateId} | error: ${errorMsg}`
      );
      sendResult = {
        success: false,
        errorCode: "REPLY_EXCEPTION",
        errorMessage: errorMsg,
      };
    }

    await recordIntegrationEvent(client, {
      businessId,
      channel: "telegram",
      direction: "outbound",
      eventType: sendResult?.success ? "telegram.outbound.sent" : "telegram.outbound.failed",
      status: sendResult?.success ? "success" : "failed",
      errorCode: sendResult?.errorCode,
    });
  }

  return {
    acknowledged: true,
    type: "message_processed",
    updateId,
    businessId,
    telegramUserId: String(telegramUserId),
    action: executionResult.action,
    executionResult,
    sendResult,
  };
}
