import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as crypto from "crypto";
import {
  runSubscriptionLifecycle,
  sendSubscriptionExpiryNotifications,
} from "@/modules/subscriptions";

export const dynamic = "force-dynamic";

function verifyBearerToken(
  authHeader: string | null | undefined,
  expectedSecret: string | null | undefined
): boolean {
  if (!authHeader || !expectedSecret) {
    return false;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return false;
  }

  const providedToken = match[1].trim();
  const bufA = Buffer.from(providedToken, "utf-8");
  const bufB = Buffer.from(expectedSecret, "utf-8");

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Internal cron runner for SaaS subscription lifecycle & expiry notifications.
 *
 * Security:
 * - Requires Authorization: Bearer <SUBSCRIPTION_CRON_SECRET>
 * - Strictly rejects SUPABASE_SERVICE_ROLE_KEY as fallback
 * - Fails closed if no dedicated cron secret is configured
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.SUBSCRIPTION_CRON_SECRET;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const reminderSecret = process.env.REMINDER_CRON_SECRET;

  if (!cronSecret || cronSecret.trim().length === 0) {
    console.error(
      "[SubscriptionCron] Valid dedicated SUBSCRIPTION_CRON_SECRET is not configured on the server runtime."
    );
    return NextResponse.json(
      { error: "Server authentication misconfiguration" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");

  // Strict Security: Reject service role key
  if (serviceRoleKey && verifyBearerToken(authHeader, serviceRoleKey)) {
    console.warn(
      "[SubscriptionCron] Blocked attempt to use SUPABASE_SERVICE_ROLE_KEY as cron bearer credential."
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Strict Security: Reject reminder cron secret (Separation of Duties)
  if (reminderSecret && verifyBearerToken(authHeader, reminderSecret)) {
    console.warn(
      "[SubscriptionCron] Blocked attempt to use REMINDER_CRON_SECRET as subscription cron credential."
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAuthorized = verifyBearerToken(authHeader, cronSecret);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing Supabase configuration" },
      { status: 500 }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const now = new Date();

    // 1. Run lifecycle state machine
    const transitions = await runSubscriptionLifecycle(supabase, now);

    // 2. Send expiry notifications
    const notifications = await sendSubscriptionExpiryNotifications(supabase, now);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      transitionsCount: transitions.length,
      transitions,
      notificationsSent: notifications.length,
      notifications,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[SubscriptionCron] Execution exception:", message);
    return NextResponse.json(
      { success: false, error: "Subscription job execution failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
