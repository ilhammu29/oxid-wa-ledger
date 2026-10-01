import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as crypto from "crypto";
import {
  claimPendingSyncJobs,
  enqueueStaleReconciliationJobs,
  markJobCompleted,
  markJobFailed,
} from "@/modules/google-sheets/queue";
import { executeBusinessSync } from "@/modules/google-sheets/sync";
import { GoogleClientError } from "@/modules/google-sheets/client";

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
 * POST /api/internal/google-sheets/run
 * Internal cron endpoint triggered by Supabase pg_cron or scheduled runner.
 * Authenticated via Authorization: Bearer GOOGLE_SHEETS_SYNC_SECRET.
 * Strict authentication: No fallback to service-role key or reminder cron secret.
 */
export async function POST(request: NextRequest) {
  const expectedSecret = process.env.GOOGLE_SHEETS_SYNC_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const reminderSecret = process.env.REMINDER_CRON_SECRET;

  // Fail closed if dedicated secret is not configured or matches other keys
  if (
    !expectedSecret ||
    (serviceKey && expectedSecret === serviceKey) ||
    (reminderSecret && expectedSecret === reminderSecret)
  ) {
    console.error("[GoogleSheetsWorker] Valid dedicated GOOGLE_SHEETS_SYNC_SECRET is not configured on the server runtime.");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const isAuthorized = verifyBearerToken(authHeader, expectedSecret);

  if (!isAuthorized) {
    console.warn("[GoogleSheetsWorker] Unauthorized Google Sheets runner request blocked.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Missing Supabase configuration" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const startedAt = new Date().toISOString();

  try {
    // 1. Enqueue stale reconciliation jobs (Requirement 35)
    const staleEnqueued = await enqueueStaleReconciliationJobs(supabase);

    // 2. Atomically claim up to 5 pending jobs
    const jobs = await claimPendingSyncJobs(supabase, 5);

    const jobResults: Array<{
      jobId: string;
      businessId: string;
      status: "success" | "failed";
      error?: string;
    }> = [];

    for (const job of jobs) {
      try {
        await executeBusinessSync(supabase, job.businessId);
        await markJobCompleted(supabase, job.id);
        jobResults.push({
          jobId: job.id,
          businessId: job.businessId,
          status: "success",
        });
      } catch (err: unknown) {
        let errorCode = "UNKNOWN_ERROR";
        let isPermanent = false;
        let errorMessage = "Sync failed";

        if (err instanceof GoogleClientError) {
          errorCode = err.errorCode;
          isPermanent = !err.isRetryable;
          errorMessage = err.message;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }

        await markJobFailed(supabase, job.id, errorCode, isPermanent, job.attemptCount);

        jobResults.push({
          jobId: job.id,
          businessId: job.businessId,
          status: "failed",
          error: errorMessage,
        });
      }
    }

    const finishedAt = new Date().toISOString();

    // Record scheduler heartbeat in system_job_runs for monitoring
    try {
      await supabase.from("system_job_runs").insert({
        job_name: "google_sheets_sync_runner",
        started_at: startedAt,
        finished_at: finishedAt,
        status: "completed",
        businesses_checked: jobs.length,
        notifications_sent: jobResults.filter((r) => r.status === "success").length,
        notifications_failed: jobResults.filter((r) => r.status === "failed").length,
      });
    } catch {
      // Safe non-critical heartbeat logging
    }

    return NextResponse.json({
      success: true,
      summary: {
        startedAt,
        finishedAt,
        staleEnqueued,
        jobsClaimed: jobs.length,
        results: jobResults,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[GoogleSheetsWorker] Runner encountered critical error: ${msg}`);
    return NextResponse.json(
      { success: false, error: "Internal execution failure" },
      { status: 500 }
    );
  }
}
