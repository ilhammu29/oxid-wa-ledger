import { SupabaseClient } from "@supabase/supabase-js";
import { CompleteOnboardingInput } from "./types";
import { hashInviteToken } from "./invite";

export interface OnboardingExecutionResult {
  success: boolean;
  businessId?: string;
  businessName?: string;
  productId?: string;
  error?: string;
}

/**
 * Executes atomic client onboarding via database RPC.
 * Guaranteed to create business, owner membership, default product,
 * operator, reminder settings, channel settings, and mark the invite as used.
 */
export async function executeClientOnboarding(
  client: SupabaseClient,
  input: CompleteOnboardingInput
): Promise<OnboardingExecutionResult> {
  const tokenHash = hashInviteToken(input.inviteToken);

  const { data, error } = await client.rpc("complete_client_onboarding", {
    p_invite_token_hash: tokenHash,
    p_business_name: input.businessName.trim(),
    p_timezone: input.timezone || "Asia/Jakarta",
    p_currency: input.currency || "IDR",
    p_product_name: input.productName.trim() || "Lele",
    p_product_unit: input.productUnit.trim() || "kg",
    p_product_price: Math.round(Number(input.productPrice) || 28000),
    p_channel: input.channel || "telegram",
    p_telegram_user_id: input.telegramUserId || null,
    p_enable_reminder: Boolean(input.enableReminder),
    p_reminder_time: input.reminderTime || "18:00",
    p_reminder_days: input.reminderDays || [1, 2, 3, 4, 5, 6, 0],
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  const result = data as {
    success?: boolean;
    business_id?: string;
    business_name?: string;
    product_id?: string;
  };

  return {
    success: Boolean(result?.success),
    businessId: result?.business_id,
    businessName: result?.business_name,
    productId: result?.product_id,
  };
}
