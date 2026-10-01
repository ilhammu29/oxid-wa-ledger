"use server";

import { createClient } from "@/lib/supabase/server";
import {
  isOxidSuperAdmin,
  adminActivateSubscription,
  adminConfirmPayment,
  adminRejectPayment,
  adminExtendSubscription,
  adminSuspendSubscription,
  adminReactivateSubscription,
  adminCancelSubscription,
  SubscriptionPlanCode,
} from "@/modules/subscriptions";
import { revalidatePath } from "next/cache";

export interface AdminActionResult {
  success: boolean;
  error?: string;
}

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  const isAdmin = await isOxidSuperAdmin(user, supabase);
  if (!isAdmin) {
    throw new Error("FORBIDDEN: User is not an authorized OXID platform admin");
  }

  return { user, supabase };
}

export async function adminActivateSubscriptionAction(formData: FormData): Promise<AdminActionResult> {
  try {
    const { user, supabase } = await requireAdminUser();
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
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function adminConfirmPaymentAction(formData: FormData): Promise<AdminActionResult> {
  try {
    const { user, supabase } = await requireAdminUser();
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
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function adminRejectPaymentAction(formData: FormData): Promise<AdminActionResult> {
  try {
    const { user, supabase } = await requireAdminUser();
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
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function adminExtendSubscriptionAction(formData: FormData): Promise<AdminActionResult> {
  try {
    const { user, supabase } = await requireAdminUser();
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
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function adminSuspendSubscriptionAction(formData: FormData): Promise<AdminActionResult> {
  try {
    const { user, supabase } = await requireAdminUser();
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
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function adminReactivateSubscriptionAction(formData: FormData): Promise<AdminActionResult> {
  try {
    const { user, supabase } = await requireAdminUser();
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
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function adminCancelSubscriptionAction(formData: FormData): Promise<AdminActionResult> {
  try {
    const { user, supabase } = await requireAdminUser();
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
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
