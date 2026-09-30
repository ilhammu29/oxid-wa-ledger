import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const adminSecret = request.headers.get("x-admin-secret");
  const expectedAdminSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!expectedAdminSecret || adminSecret !== expectedAdminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronSecret = process.env.REMINDER_CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "REMINDER_CRON_SECRET is not configured on server runtime" },
      { status: 500 }
    );
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

    // 1. Delete old secret from vault
    await client.query("DELETE FROM vault.secrets WHERE name = 'REMINDER_CRON_SECRET';");

    // 2. Insert new dedicated secret
    await client.query(
      `SELECT vault.create_secret($1, 'REMINDER_CRON_SECRET', 'Dedicated cron job secret for OXID Ledger');`,
      [cronSecret]
    );

    // 3. Verify vault secret presence and match without exposing secret
    const vaultRes = await client.query(
      `SELECT name, description, created_at, updated_at,
              (decrypted_secret = $1) AS secret_matches
       FROM vault.decrypted_secrets
       WHERE name = 'REMINDER_CRON_SECRET';`,
      [cronSecret]
    );

    const vaultMatch = vaultRes.rows[0]?.secret_matches === true;

    // 4. Verify cron job status
    const cronRes = await client.query(`
      SELECT jobid, schedule, active, jobname
      FROM cron.job
      WHERE jobname = 'oxid_daily_reminder_cron';
    `);

    // 5. Test trigger via pg_net with new vault secret
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
    await new Promise((r) => setTimeout(r, 2500));

    let netResponse: any = null;
    if (netRequestId) {
      const netRes = await client.query(
        `SELECT id, status_code, error_msg, timed_out FROM net._http_response WHERE id = $1;`,
        [netRequestId]
      ).catch(() => ({ rows: [] }));
      netResponse = netRes.rows[0] || null;
    }

    return NextResponse.json({
      success: true,
      vaultUpdated: true,
      vaultMatches: vaultMatch,
      cronJob: cronRes.rows[0] || null,
      netResponse,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Vault update error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  } finally {
    await client.end().catch(() => {});
  }
}
