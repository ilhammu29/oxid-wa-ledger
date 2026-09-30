import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const adminSecret = request.headers.get("x-admin-secret");
  const expectedSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!expectedSecret || adminSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawPgUrl =
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL;

  if (!rawPgUrl) {
    return NextResponse.json(
      { error: "No PostgreSQL connection string available on server" },
      { status: 500 }
    );
  }

  const cleanPgUrl = rawPgUrl.replace(/\?.*$/, "");
  const client = new Client({
    connectionString: cleanPgUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    // 1. Check Extensions
    const extRes = await client.query(`
      SELECT extname, extversion, n.nspname AS extnamespace
      FROM pg_extension e
      JOIN pg_namespace n ON n.oid = e.extnamespace
      WHERE extname IN ('pg_cron', 'pg_net', 'supabase_vault', 'pgcrypto')
      ORDER BY extname;
    `);

    // Ensure pg_cron and pg_net exist
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS pg_cron;
      CREATE EXTENSION IF NOT EXISTS pg_net;
    `).catch((err) => {
      console.warn("Extension create warn:", err.message);
    });

    // 2. Check / Ensure Supabase Vault Secret
    let vaultSecretExists = false;
    let vaultSecretName: string | null = null;

    try {
      const vaultCheck = await client.query(`
        SELECT name, description, created_at, updated_at
        FROM vault.decrypted_secrets
        WHERE name = 'REMINDER_CRON_SECRET';
      `);

      if (vaultCheck.rows.length > 0) {
        vaultSecretExists = true;
        vaultSecretName = vaultCheck.rows[0].name;
      } else {
        // Create secret in vault using expectedSecret (SUPABASE_SERVICE_ROLE_KEY)
        // Never log or return the secret value
        await client.query(
          `SELECT vault.create_secret($1, 'REMINDER_CRON_SECRET', 'Cron job authentication secret for OXID Ledger');`,
          [expectedSecret]
        );
        vaultSecretExists = true;
        vaultSecretName = "REMINDER_CRON_SECRET";
      }
    } catch (vaultErr: unknown) {
      console.warn("Vault access notice:", (vaultErr as Error).message);
    }

    // 3. Check / Configure Cron Job
    let cronJob: any = null;
    const cronCheck = await client.query(`
      SELECT jobid, schedule, command, nodename, nodeport, database, username, active, jobname
      FROM cron.job
      WHERE jobname = 'oxid_daily_reminder_cron' OR command LIKE '%reminders/run%';
    `);

    if (cronCheck.rows.length > 0) {
      cronJob = cronCheck.rows[0];
      // If schedule is not */5 * * * *, update it
      if (cronJob.schedule !== "*/5 * * * *") {
        await client.query(`
          SELECT cron.alter_job(
            job_id := $1,
            schedule := '*/5 * * * *'
          );
        `, [cronJob.jobid]);
        cronJob.schedule = "*/5 * * * *";
      }
    } else {
      // Schedule new cron job using pg_net and vault
      const scheduleSql = `
        SELECT cron.schedule(
          'oxid_daily_reminder_cron',
          '*/5 * * * *',
          $$
          SELECT
            net.http_post(
              url := 'https://oxid-wa-ledger.vercel.app/api/internal/reminders/run',
              headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'REMINDER_CRON_SECRET' LIMIT 1)
              ),
              body := '{}'::jsonb,
              timeout_milliseconds := 5000
            ) as request_id;
          $$
        );
      `;
      const schedRes = await client.query(scheduleSql);
      const newJobId = schedRes.rows[0]?.schedule;

      const newCronCheck = await client.query(`
        SELECT jobid, schedule, command, nodename, nodeport, database, username, active, jobname
        FROM cron.job
        WHERE jobname = 'oxid_daily_reminder_cron';
      `);
      cronJob = newCronCheck.rows[0] || { jobid: newJobId, schedule: "*/5 * * * *" };
    }

    // 4. Trigger ONE immediate execution via pg_net to verify end-to-end connectivity
    const triggerNetRes = await client.query(`
      SELECT
        net.http_post(
          url := 'https://oxid-wa-ledger.vercel.app/api/internal/reminders/run',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'REMINDER_CRON_SECRET' LIMIT 1)
          ),
          body := '{}'::jsonb,
          timeout_milliseconds := 8000
        ) as request_id;
    `);

    const netRequestId = triggerNetRes.rows[0]?.request_id;

    // Small delay to allow pg_net worker to process
    await new Promise((r) => setTimeout(r, 2000));

    // 5. Check net response
    let netResponse: any = null;
    if (netRequestId) {
      const netRes = await client.query(`
        SELECT id, status_code, error_msg, timed_out, created
        FROM net._http_response
        WHERE id = $1;
      `, [netRequestId]).catch(() => ({ rows: [] }));
      netResponse = netRes.rows[0] || null;
    }

    // 6. Check recent cron job runs
    const cronRuns = await client.query(`
      SELECT jobid, runid, status, return_message, start_time, end_time
      FROM cron.job_run_details
      WHERE jobid = $1
      ORDER BY start_time DESC
      LIMIT 5;
    `, [cronJob?.jobid || 0]).catch(() => ({ rows: [] }));

    // 7. Check system_job_runs heartbeat
    const heartbeatRes = await client.query(`
      SELECT id, job_name, started_at, finished_at, status, businesses_checked, notifications_sent, notifications_failed
      FROM public.system_job_runs
      ORDER BY started_at DESC
      LIMIT 5;
    `);

    // Clean sanitized cron command (mask any internal details)
    const sanitizedCommand = cronJob?.command
      ? cronJob.command.replace(/(Bearer\s+)[^'"\s]+/, "$1[FROM_VAULT]")
      : null;

    return NextResponse.json({
      success: true,
      extensions: extRes.rows,
      vault: {
        configured: vaultSecretExists,
        secretName: vaultSecretName,
      },
      cron: {
        jobId: cronJob?.jobid,
        jobName: cronJob?.jobname,
        schedule: cronJob?.schedule,
        active: cronJob?.active,
        sanitizedCommand,
      },
      immediateExecution: {
        netRequestId,
        netResponse,
      },
      recentCronRuns: cronRuns.rows,
      systemJobRunsHeartbeat: heartbeatRes.rows,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Cron verification failed";
    console.error("Cron verification error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  } finally {
    await client.end().catch(() => {});
  }
}
