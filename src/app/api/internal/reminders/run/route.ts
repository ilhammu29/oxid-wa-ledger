import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as crypto from "crypto";
import { runDueReminders } from "@/modules/reminders";

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
 * POST /api/internal/reminders/run
 * Internal cron endpoint triggered by Supabase pg_cron or scheduled runner.
 * Authenticated via Authorization: Bearer REMINDER_CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const expectedSecret = process.env.REMINDER_CRON_SECRET;

  if (!expectedSecret) {
    console.error("[ReminderCron] REMINDER_CRON_SECRET is not configured on the server runtime.");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const isAuthorized = verifyBearerToken(authHeader, expectedSecret);

  if (!isAuthorized) {
    console.warn("[ReminderCron] Unauthorized reminder runner request blocked.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Missing Supabase configuration" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const summary = await runDueReminders(supabase);
    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ReminderCron] Reminder runner encountered critical error: ${msg}`);
    return NextResponse.json(
      { success: false, error: "Internal execution failure" },
      { status: 500 }
    );
  }
}
