import { SupabaseClient } from "@supabase/supabase-js";
import { GoogleSheetsQueueJob } from "./types";

/**
 * Enqueues a sync job for a business if Google Sheets connection is enabled.
 * Implements queue coalescing: merges into pending/processing job for the same business.
 * Never throws; returns false if connection is disabled or if enqueue fails.
 */
export async function enqueueSync(
  client: SupabaseClient,
  businessId: string,
  reason: string
): Promise<boolean> {
  try {
    // 1. Try DB RPC
    const { data: rpcResult, error: rpcErr } = await client.rpc("enqueue_google_sheets_sync", {
      p_business_id: businessId,
      p_reason: reason,
    });

    if (!rpcErr && typeof rpcResult === "boolean") {
      return rpcResult;
    }

    // 2. Direct fallback (e.g. mock test adapters)
    const { data: conn } = await client
      .from("google_sheets_connections")
      .select("enabled, spreadsheet_id")
      .eq("business_id", businessId)
      .single();

    if (!conn || !conn.enabled || !conn.spreadsheet_id) {
      return false;
    }

    // Check if there is already a pending or processing job (coalesce)
    const { data: existingJobs } = await client
      .from("google_sheets_sync_queue")
      .select("id, reason")
      .eq("business_id", businessId)
      .in("status", ["pending", "processing"])
      .limit(1);

    if (existingJobs && existingJobs.length > 0) {
      const existing = existingJobs[0];
      const mergedReason = existing.reason.includes(reason)
        ? existing.reason
        : `${existing.reason}, ${reason}`;

      await client
        .from("google_sheets_sync_queue")
        .update({
          reason: mergedReason,
          available_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      return true;
    }

    // Insert new job
    const { error: insertErr } = await client.from("google_sheets_sync_queue").insert({
      business_id: businessId,
      reason,
      status: "pending",
      available_at: new Date().toISOString(),
    });

    return !insertErr;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[GoogleSheetsQueue] Safe enqueue notice: ${msg}`);
    return false;
  }
}

/**
 * Atomically claims up to `limit` pending sync jobs whose available_at <= now().
 */
export async function claimPendingSyncJobs(
  client: SupabaseClient,
  limit: number = 5
): Promise<GoogleSheetsQueueJob[]> {
  const nowIso = new Date().toISOString();

  // Find candidate pending jobs
  const { data: candidates, error: findErr } = await client
    .from("google_sheets_sync_queue")
    .select("*")
    .eq("status", "pending")
    .lte("available_at", nowIso)
    .order("available_at", { ascending: true })
    .limit(limit);

  if (findErr || !candidates || candidates.length === 0) {
    return [];
  }

  const claimed: GoogleSheetsQueueJob[] = [];

  for (const job of candidates) {
    // Atomically claim by setting status = 'processing'
    const { data: updated, error: updateErr } = await client
      .from("google_sheets_sync_queue")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("status", "pending")
      .select()
      .single();

    if (!updateErr && updated) {
      claimed.push({
        id: updated.id,
        businessId: updated.business_id,
        reason: updated.reason,
        status: updated.status,
        attemptCount: updated.attempt_count,
        availableAt: updated.available_at,
        createdAt: updated.created_at,
        startedAt: updated.started_at,
        finishedAt: updated.finished_at,
        errorCode: updated.error_code,
      });
    }
  }

  return claimed;
}

/**
 * Marks a claimed sync job as completed.
 */
export async function markJobCompleted(
  client: SupabaseClient,
  jobId: string
): Promise<void> {
  await client
    .from("google_sheets_sync_queue")
    .update({
      status: "completed",
      finished_at: new Date().toISOString(),
      error_code: null,
    })
    .eq("id", jobId);
}

/**
 * Marks a claimed sync job as failed, scheduling conservative exponential backoff retry if transient.
 */
export async function markJobFailed(
  client: SupabaseClient,
  jobId: string,
  errorCode: string,
  isPermanent: boolean,
  currentAttempts: number
): Promise<void> {
  const maxAttempts = 5;

  if (isPermanent || currentAttempts >= maxAttempts) {
    await client
      .from("google_sheets_sync_queue")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_code: errorCode,
        attempt_count: currentAttempts + 1,
      })
      .eq("id", jobId);
    return;
  }

  // Backoff intervals:
  // attempt 0 -> +5 min
  // attempt 1 -> +15 min
  // attempt 2 -> +60 min
  // attempt 3+ -> +120 min
  const backoffMinutes =
    currentAttempts === 0 ? 5 : currentAttempts === 1 ? 15 : currentAttempts === 2 ? 60 : 120;

  const nextAvailableAt = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();

  await client
    .from("google_sheets_sync_queue")
    .update({
      status: "pending",
      attempt_count: currentAttempts + 1,
      available_at: nextAvailableAt,
      error_code: errorCode,
    })
    .eq("id", jobId);
}

/**
 * Enqueues reconciliation jobs for enabled connections whose last successful sync is older than the configured interval.
 * (Requirement 35: Automatic Reconciliation)
 */
export async function enqueueStaleReconciliationJobs(
  client: SupabaseClient
): Promise<number> {
  try {
    const { data: connections, error } = await client
      .from("google_sheets_connections")
      .select("business_id, sync_interval_minutes, last_sync_at")
      .eq("enabled", true)
      .not("spreadsheet_id", "is", null);

    if (error || !connections || connections.length === 0) {
      return 0;
    }

    const now = Date.now();
    let enqueuedCount = 0;

    for (const conn of connections) {
      const intervalMs = (conn.sync_interval_minutes || 5) * 60 * 1000;
      const lastSyncTime = conn.last_sync_at ? new Date(conn.last_sync_at).getTime() : 0;

      if (now - lastSyncTime >= intervalMs) {
        const enqueued = await enqueueSync(client, conn.business_id, "STALE_RECONCILIATION");
        if (enqueued) {
          enqueuedCount++;
        }
      }
    }

    return enqueuedCount;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[GoogleSheetsQueue] Stale check error: ${msg}`);
    return 0;
  }
}
