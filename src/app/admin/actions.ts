"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getPlatformAdminUser,
  hasPlatformPermission,
  PlatformPermission,
  PlatformAdminRole,
  adminActivateSubscription,
  adminConfirmPayment,
  adminRejectPayment,
  adminExtendSubscription,
  adminSuspendSubscription,
  adminReactivateSubscription,
  adminCancelSubscription,
  createBillingPaymentSetting,
  updateBillingPaymentSetting,
  deleteBillingPaymentSetting,
  updatePlatformAdminRole,
  deactivatePlatformAdmin,
  reactivatePlatformAdmin,
  SubscriptionPlanCode,
} from "@/modules/subscriptions";
import { revalidatePath } from "next/cache";

export interface AdminActionResult {
  success: boolean;
  error?: string;
}

/**
 * Server-side authorization guard for all platform administrative actions.
 * Verifies authenticated session, checks public.platform_admins active status,
 * and enforces fine-grained permission matrix.
 */
async function requirePlatformAdminWithPermission(permission: PlatformPermission) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  const adminRecord = await getPlatformAdminUser(user, supabase);
  if (!adminRecord || !adminRecord.active) {
    throw new Error("FORBIDDEN: User is not an authorized active OXID platform admin");
  }

  if (!hasPlatformPermission(adminRecord.role, permission)) {
    throw new Error(`FORBIDDEN: Platform role '${adminRecord.role}' is not authorized for '${permission}'`);
  }

  return { user, supabase, adminRecord };
}

export async function adminActivateSubscriptionAction(formData: FormData): Promise<AdminActionResult> {
  try {
    const { user, supabase } = await requirePlatformAdminWithPermission("subscriptions:write");
    const businessId = formData.get("businessId") as string;
    const planCode = (formData.get("planCode") as SubscriptionPlanCode) || "basic";
    const durationDays = parseInt(formData.get("durationDays") as string, 10) || 30;
    const notes = (formData.get("notes") as string) || "";

    if (!businessId) throw new Error("Missing businessId");

    await adminActivateSubscription(supabase, {
      businessId,
      planCode,
      durationDays,
      adminUserId: user.id,
      adminEmail: user.email || undefined,
      notes,
    });

    revalidatePath(`/admin/businesses/${businessId}`);
    revalidatePath("/admin/businesses");
    revalidatePath("/admin/subscriptions");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function adminConfirmPaymentAction(formData: FormData): Promise<AdminActionResult> {
  try {
    const { user, supabase } = await requirePlatformAdminWithPermission("payments:write");
    const paymentId = formData.get("paymentId") as string;
    const businessId = formData.get("businessId") as string;
    const extensionDays = parseInt(formData.get("extensionDays") as string, 10) || 30;
    const notes = (formData.get("notes") as string) || "";

    if (!paymentId) throw new Error("Missing paymentId");

    await adminConfirmPayment(supabase, {
      paymentId,
      adminUserId: user.id,
      adminEmail: user.email || undefined,
      extensionDays,
      notes,
    });

    if (businessId) {
      revalidatePath(`/admin/businesses/${businessId}`);
    }
    revalidatePath("/admin/businesses");
    revalidatePath("/admin/payments");
    revalidatePath("/admin/subscriptions");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function adminRejectPaymentAction(formData: FormData): Promise<AdminActionResult> {
  try {
    const { user, supabase } = await requirePlatformAdminWithPermission("payments:write");
    const paymentId = formData.get("paymentId") as string;
    const businessId = formData.get("businessId") as string;
    const notes = (formData.get("notes") as string) || "";

    if (!paymentId) throw new Error("Missing paymentId");

    await adminRejectPayment(supabase, {
      paymentId,
      adminUserId: user.id,
      adminEmail: user.email || undefined,
      notes,
    });

    if (businessId) {
      revalidatePath(`/admin/businesses/${businessId}`);
    }
    revalidatePath("/admin/businesses");
    revalidatePath("/admin/payments");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function adminExtendSubscriptionAction(formData: FormData): Promise<AdminActionResult> {
  try {
    const { user, supabase } = await requirePlatformAdminWithPermission("subscriptions:write");
    const businessId = formData.get("businessId") as string;
    const days = parseInt(formData.get("days") as string, 10) || 30;
    const notes = (formData.get("notes") as string) || "";

    if (!businessId) throw new Error("Missing businessId");

    await adminExtendSubscription(supabase, {
      businessId,
      days,
      adminUserId: user.id,
      adminEmail: user.email || undefined,
      notes,
    });

    revalidatePath(`/admin/businesses/${businessId}`);
    revalidatePath("/admin/businesses");
    revalidatePath("/admin/subscriptions");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function adminSuspendSubscriptionAction(formData: FormData): Promise<AdminActionResult> {
  try {
    const { user, supabase } = await requirePlatformAdminWithPermission("subscriptions:write");
    const businessId = formData.get("businessId") as string;
    const notes = (formData.get("notes") as string) || "";

    if (!businessId) throw new Error("Missing businessId");

    await adminSuspendSubscription(supabase, {
      businessId,
      adminUserId: user.id,
      adminEmail: user.email || undefined,
      notes,
    });

    revalidatePath(`/admin/businesses/${businessId}`);
    revalidatePath("/admin/businesses");
    revalidatePath("/admin/subscriptions");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function adminReactivateSubscriptionAction(formData: FormData): Promise<AdminActionResult> {
  try {
    const { user, supabase } = await requirePlatformAdminWithPermission("subscriptions:write");
    const businessId = formData.get("businessId") as string;
    const days = parseInt(formData.get("days") as string, 10) || 30;
    const notes = (formData.get("notes") as string) || "";

    if (!businessId) throw new Error("Missing businessId");

    await adminReactivateSubscription(supabase, {
      businessId,
      days,
      adminUserId: user.id,
      adminEmail: user.email || undefined,
      notes,
    });

    revalidatePath(`/admin/businesses/${businessId}`);
    revalidatePath("/admin/businesses");
    revalidatePath("/admin/subscriptions");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function adminCancelSubscriptionAction(formData: FormData): Promise<AdminActionResult> {
  try {
    const { user, supabase } = await requirePlatformAdminWithPermission("subscriptions:write");
    const businessId = formData.get("businessId") as string;
    const notes = (formData.get("notes") as string) || "";

    if (!businessId) throw new Error("Missing businessId");

    await adminCancelSubscription(supabase, {
      businessId,
      adminUserId: user.id,
      adminEmail: user.email || undefined,
      notes,
    });

    revalidatePath(`/admin/businesses/${businessId}`);
    revalidatePath("/admin/businesses");
    revalidatePath("/admin/subscriptions");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ----------------------------------------------------------------------------
// Billing Payment Settings Admin Actions
// ----------------------------------------------------------------------------

export async function adminCreateBillingSettingAction(formData: FormData): Promise<AdminActionResult> {
  try {
    const { user, supabase } = await requirePlatformAdminWithPermission("settings:write");
    const bankName = (formData.get("bankName") as string) || "";
    const accountName = (formData.get("accountName") as string) || "";
    const maskedAccountNumber = (formData.get("maskedAccountNumber") as string) || "";
    const paymentInstructions = (formData.get("paymentInstructions") as string) || "";
    const active = formData.get("active") === "true";

    if (!bankName || !accountName || !maskedAccountNumber) {
      throw new Error("Bank name, account name, and masked account number are required.");
    }

    await createBillingPaymentSetting(supabase, {
      bankName,
      accountName,
      maskedAccountNumber,
      paymentInstructions,
      active,
      adminUserId: user.id,
      adminEmail: user.email || undefined,
    });

    revalidatePath("/admin/settings/billing");
    revalidatePath("/dashboard/subscription");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function adminUpdateBillingSettingAction(formData: FormData): Promise<AdminActionResult> {
  try {
    const { user, supabase } = await requirePlatformAdminWithPermission("settings:write");
    const id = formData.get("id") as string;
    if (!id) throw new Error("Missing setting id");

    const bankName = formData.get("bankName") as string | undefined;
    const accountName = formData.get("accountName") as string | undefined;
    const maskedAccountNumber = formData.get("maskedAccountNumber") as string | undefined;
    const paymentInstructions = formData.get("paymentInstructions") as string | undefined;
    const active = formData.has("active") ? formData.get("active") === "true" : undefined;

    await updateBillingPaymentSetting(supabase, {
      id,
      bankName,
      accountName,
      maskedAccountNumber,
      paymentInstructions,
      active,
      adminUserId: user.id,
      adminEmail: user.email || undefined,
    });

    revalidatePath("/admin/settings/billing");
    revalidatePath("/dashboard/subscription");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function adminDeleteBillingSettingAction(formData: FormData): Promise<AdminActionResult> {
  try {
    const { supabase } = await requirePlatformAdminWithPermission("settings:write");
    const id = formData.get("id") as string;
    if (!id) throw new Error("Missing setting id");

    await deleteBillingPaymentSetting(supabase, id);

    revalidatePath("/admin/settings/billing");
    revalidatePath("/dashboard/subscription");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ----------------------------------------------------------------------------
// User & Platform Admin Management Actions
// ----------------------------------------------------------------------------

export async function adminUpdatePlatformRoleAction(formData: FormData): Promise<AdminActionResult> {
  try {
    const { user, supabase } = await requirePlatformAdminWithPermission("users:write");
    const targetUserId = formData.get("targetUserId") as string;
    const role = formData.get("role") as PlatformAdminRole;

    if (!targetUserId || !role) throw new Error("Missing targetUserId or role");

    await updatePlatformAdminRole(supabase, {
      userId: targetUserId,
      role,
      adminUserId: user.id,
      adminEmail: user.email || undefined,
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function adminDeactivatePlatformAdminAction(formData: FormData): Promise<AdminActionResult> {
  try {
    const { user, supabase } = await requirePlatformAdminWithPermission("users:write");
    const targetUserId = formData.get("targetUserId") as string;

    if (!targetUserId) throw new Error("Missing targetUserId");

    // Prevent self-deactivation
    if (targetUserId === user.id) {
      throw new Error("Admin cannot deactivate their own active session.");
    }

    await deactivatePlatformAdmin(supabase, {
      userId: targetUserId,
      adminUserId: user.id,
      adminEmail: user.email || undefined,
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function adminReactivatePlatformAdminAction(formData: FormData): Promise<AdminActionResult> {
  try {
    const { user, supabase } = await requirePlatformAdminWithPermission("users:write");
    const targetUserId = formData.get("targetUserId") as string;

    if (!targetUserId) throw new Error("Missing targetUserId");

    await reactivatePlatformAdmin(supabase, {
      userId: targetUserId,
      adminUserId: user.id,
      adminEmail: user.email || undefined,
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
