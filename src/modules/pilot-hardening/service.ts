import { SupabaseClient } from "@supabase/supabase-js";

export type FailureType =
  | "UNKNOWN_INTENT"
  | "UNKNOWN_PRODUCT"
  | "AMBIGUOUS_PRODUCT"
  | "MULTI_PRODUCT"
  | "AMBIGUOUS_QUANTITY"
  | "UNSUPPORTED_FORMAT";

export type ReviewStatus = "pending" | "reviewed" | "ignored";

export interface ConversationFailure {
  id: string;
  businessId: string;
  channel: "telegram" | "whatsapp";
  senderReference: string | null;
  messageText: string;
  normalizedText: string | null;
  failureType: FailureType;
  parserIntent: string | null;
  reviewStatus: ReviewStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface CaptureFailureParams {
  businessId: string;
  channel: "telegram" | "whatsapp";
  senderReference?: string | null;
  messageText: string;
  normalizedText?: string | null;
  failureType: FailureType;
  parserIntent?: string | null;
}

/**
 * Captures an unparseable or unhandled message from an AUTHORIZED operator.
 * Maximum message length is 500 characters.
 * Secrets or raw tokens are NEVER stored.
 */
export async function captureConversationFailure(
  client: SupabaseClient,
  params: CaptureFailureParams
): Promise<{ success: boolean; id?: string }> {
  try {
    const trimmedMessage = params.messageText.slice(0, 500);
    const trimmedNormalized = params.normalizedText
      ? params.normalizedText.slice(0, 500)
      : null;

    const { data, error } = await client
      .from("conversation_failures")
      .insert({
        business_id: params.businessId,
        channel: params.channel,
        sender_reference: params.senderReference || null,
        message_text: trimmedMessage,
        normalized_text: trimmedNormalized,
        failure_type: params.failureType,
        parser_intent: params.parserIntent || null,
        review_status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.warn(`[PilotHardening] Failed to capture failure: ${error.message}`);
      return { success: false };
    }

    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[PilotHardening] Unexpected error capturing failure: ${msg}`);
    return { success: false };
  }
}

/**
 * Updates review status of a conversation failure record (owner/admin action).
 */
export async function updateFailureReviewStatus(
  client: SupabaseClient,
  params: {
    failureId: string;
    reviewStatus: ReviewStatus;
    reviewedBy?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const { error } = await client
    .from("conversation_failures")
    .update({
      review_status: params.reviewStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: params.reviewedBy || null,
    })
    .eq("id", params.failureId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Retrieves pending conversation failures for a business.
 */
export async function getConversationFailures(
  client: SupabaseClient,
  businessId: string,
  options: {
    reviewStatus?: ReviewStatus;
    limit?: number;
  } = {}
): Promise<ConversationFailure[]> {
  let query = client
    .from("conversation_failures")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (options.reviewStatus) {
    query = query.eq("review_status", options.reviewStatus);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    businessId: String(row.business_id),
    channel: String(row.channel) as ConversationFailure["channel"],
    senderReference: String(row.sender_reference),
    messageText: String(row.message_text),
    normalizedText: row.normalized_text ? String(row.normalized_text) : null,
    failureType: String(row.failure_type) as ConversationFailure["failureType"],
    parserIntent: row.parser_intent ? String(row.parser_intent) : null,
    reviewStatus: String(row.review_status) as ConversationFailure["reviewStatus"],
    createdAt: String(row.created_at),
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
  }));
}
