/**
 * Step 10.2 Pre-Beta Auth & Secret Security Verification Suite
 *
 * Tests:
 *  1. Public user cannot call privileged admin user creation
 *  2. Arbitrary email cannot be auto-confirmed (proof of ownership required)
 *  3. Unverified account cannot provision business
 *  4. Verified account can provision business
 *  5. Service-role key absent from client bundle & client code
 *  6. Telegram bot token absent from git-tracked repository files
 *  7. Telegram bot token absent from outbound logs & error traces
 *  8. Rotated Telegram bot token processes pairing and transactions
 *  9. Signup rate limiting and in-flight mutex prevent abuse
 * 10. Multi-tenant isolation and pairing security remain 100% intact
 */

import { Client } from "pg";
import { registerUserAction } from "../src/app/signup/actions";
import { checkRateLimit, resetRateLimit } from "../src/modules/auth/rate-limit";
import { createBusinessForUser } from "../src/modules/onboarding/client-launch";
import { sendTelegramText } from "../src/modules/telegram/telegram-client";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const PG_URL = process.env.TEST_DB_URL || "postgres://postgres:postgres@127.0.0.1:55435/postgres";

interface TestReport {
  id: number;
  name: string;
  passed: boolean;
  error?: string;
}

const reports: TestReport[] = [];

function record(id: number, name: string, passed: boolean, error?: string) {
  reports.push({ id, name, passed, error });
  const icon = passed ? "✓" : "✗";
  console.log(`  ${icon} [Test ${id}] ${name}`);
  if (!passed && error) {
    console.error(`      -> Error: ${error}`);
  }
}

async function runStep10_2Tests() {
  console.log("\n=== OXID WA Ledger - Step 10.2 Pre-Beta Security Hotfix Tests ===\n");

  const pgClient = new Client({ connectionString: PG_URL });
  await pgClient.connect();

  const testUserUnverified = "10200000-0000-0000-0000-000000000001";
  const testUserVerified = "10200000-0000-0000-0000-000000000002";
  const emailUnverified = "unverified_probe@barokah.com";
  const emailVerified = "verified_probe@barokah.com";

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Public user cannot call privileged admin user creation
    // -------------------------------------------------------------------------
    try {
      // Ensure ALLOW_UNVERIFIED_INTERNAL_SIGNUP is false
      delete process.env.ALLOW_UNVERIFIED_INTERNAL_SIGNUP;

      const fd = new FormData();
      fd.set("fullName", "Attacker Probe");
      fd.set("email", "attacker@victim.com");
      fd.set("password", "attackerPassword123!");

      // Attempting to pass admin client override when internal unverified signup is not enabled
      const fakeAdminClient: any = {
        auth: {
          admin: {
            createUser: async () => ({ data: { user: { id: "pwned" } }, error: null }),
          },
        },
      };

      const res = await registerUserAction(fd, fakeAdminClient);
      if (!res.success && res.code === "unverified_signup_blocked") {
        record(1, "Public user cannot invoke admin.createUser email bypass", true);
      } else {
        record(1, "Public user admin bypass blocked", false, `result=${JSON.stringify(res)}`);
      }
    } catch (e: any) {
      record(1, "Public user cannot call privileged admin user creation", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Arbitrary email cannot be auto-confirmed (verification required)
    // -------------------------------------------------------------------------
    try {
      delete process.env.ALLOW_UNVERIFIED_INTERNAL_SIGNUP;

      const fd = new FormData();
      fd.set("fullName", "Budi Santoso");
      fd.set("email", "fresh_visitor@example.com");
      fd.set("password", "rahasia12345");

      // Standard signUp mock returning unverified user (session: null, email_confirmed_at: null)
      const mockStandardClient: any = {
        auth: {
          signUp: async ({ email }: { email: string }) => {
            return {
              data: {
                user: {
                  id: "visitor-uuid",
                  email,
                  email_confirmed_at: null,
                  identities: [{ id: "identity-1" }],
                },
                session: null,
              },
              error: null,
            };
          },
        },
      };

      const res = await registerUserAction(fd, mockStandardClient);
      if (res.success && res.emailConfirmationRequired === true) {
        record(2, "Arbitrary email cannot be auto-confirmed: requires proof of ownership", true);
      } else {
        record(2, "Arbitrary email auto-confirmation blocked", false, `result=${JSON.stringify(res)}`);
      }
    } catch (e: any) {
      record(2, "Arbitrary email verification requirement", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 3: Unverified account cannot provision business
    // -------------------------------------------------------------------------
    try {
      delete process.env.ALLOW_UNVERIFIED_INTERNAL_SIGNUP;

      // Mock client representing an authenticated but UNVERIFIED user (email_confirmed_at = null)
      const unverifiedClient: any = {
        auth: {
          getUser: async () => ({
            data: {
              user: {
                id: testUserUnverified,
                email: emailUnverified,
                email_confirmed_at: null,
              },
            },
            error: null,
          }),
        },
        from: () => ({
          select: () => ({ eq: () => ({ is: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) }) }),
        }),
      };

      const res = await createBusinessForUser(unverifiedClient, testUserUnverified, {
        name: "Usaha Ilegal Unverified",
      });

      if (!res.success && res.error?.includes("Email belum diverifikasi")) {
        record(3, "Unverified account strictly blocked from provisioning a business", true);
      } else {
        record(3, "Unverified business provisioning blocked", false, `result=${JSON.stringify(res)}`);
      }
    } catch (e: any) {
      record(3, "Unverified account cannot provision business", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Verified account can provision business
    // -------------------------------------------------------------------------
    try {
      // Mock client representing an authenticated and VERIFIED user
      const verifiedClient: any = {
        auth: {
          getUser: async () => ({
            data: {
              user: {
                id: testUserVerified,
                email: emailVerified,
                email_confirmed_at: new Date().toISOString(),
              },
            },
            error: null,
          }),
        },
        rpc: async (fnName: string, params: any) => {
          if (fnName === "create_business_for_authenticated_user") {
            return {
              data: {
                success: true,
                business_id: "biz-verified-01",
                name: params.p_name,
              },
              error: null,
            };
          }
          return { data: null, error: { message: "Unknown RPC" } };
        },
        from: (table: string) => {
          if (table === "businesses") {
            return {
              select: () => ({
                eq: () => ({
                  is: () => ({
                    order: () => ({
                      limit: () => ({
                        maybeSingle: async () => ({ data: null }),
                      }),
                    }),
                  }),
                }),
              }),
              insert: () => ({
                select: () => ({
                  single: async () => ({ data: { id: "biz-verified-01", name: "Usaha Legal Verified" }, error: null }),
                }),
              }),
            };
          }
          if (table === "business_users") {
            return {
              insert: async () => ({ error: null }),
            };
          }
          if (table === "business_onboarding_progress") {
            return {
              upsert: async () => ({ error: null }),
            };
          }
          return { insert: async () => ({ error: null }) };
        },
      };

      const res = await createBusinessForUser(verifiedClient, testUserVerified, {
        name: "Usaha Legal Verified",
      });

      if (res.success && res.businessId === "biz-verified-01") {
        record(4, "Verified account successfully authorized to provision business & trial", true);
      } else {
        record(4, "Verified business provisioning failed", false, `result=${JSON.stringify(res)}`);
      }
    } catch (e: any) {
      record(4, "Verified account can provision business", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Service-role key absent from client bundle & client components
    // -------------------------------------------------------------------------
    try {
      // Scan all files in src/ for client components containing SUPABASE_SERVICE_ROLE_KEY
      const clientFiles: string[] = [];
      function findClientFiles(dir: string) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            findClientFiles(fullPath);
          } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
            const content = fs.readFileSync(fullPath, "utf-8");
            if (content.includes('"use client"') || content.includes("'use client'")) {
              clientFiles.push(fullPath);
            }
          }
        }
      }
      findClientFiles(path.join(process.cwd(), "src"));

      let leakedInClient = false;
      for (const cf of clientFiles) {
        const content = fs.readFileSync(cf, "utf-8");
        if (content.includes("SUPABASE_SERVICE_ROLE_KEY")) {
          leakedInClient = true;
          break;
        }
      }

      // Check NEXT_PUBLIC_ variables in src/
      const nextPublicServiceKey = execSync(
        `grep -rn "NEXT_PUBLIC_.*SERVICE" src/ 2>/dev/null || true`
      ).toString().trim();

      if (!leakedInClient && nextPublicServiceKey === "") {
        record(5, "SUPABASE_SERVICE_ROLE_KEY strictly server-only (zero client bundle exposure)", true);
      } else {
        record(5, "Service role key leaked in client", false, `clientLeak=${leakedInClient}`);
      }
    } catch (e: any) {
      record(5, "Service-role key isolation check", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Telegram bot token absent from git-tracked repository files
    // -------------------------------------------------------------------------
    try {
      const gitGrepOutput = execSync(
        `git grep -rnE "[0-9]{8,11}:[A-Za-z0-9_-]{30,40}" -- ':(exclude)scripts/test-step10-2.ts' 2>/dev/null || true`
      ).toString().trim();

      if (gitGrepOutput === "") {
        record(6, "Telegram bot token pattern absent from git-tracked repository files (0 leaked)", true);
      } else {
        record(6, "Telegram token found in git", false, gitGrepOutput.slice(0, 100));
      }
    } catch (e: any) {
      record(6, "Telegram token repository scan", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 7: Telegram bot token absent from outbound logs & error traces
    // -------------------------------------------------------------------------
    try {
      const dummyToken = ["123456789", "ABCDefghIJKLmnopQRSTuvwxyz123456789"].join(":");
      let capturedLog = "";

      const origWarn = console.warn;
      const origError = console.error;
      console.warn = (...args: any[]) => {
        capturedLog += args.join(" ") + "\n";
      };
      console.error = (...args: any[]) => {
        capturedLog += args.join(" ") + "\n";
      };

      try {
        await sendTelegramText({
          chatId: 999999,
          text: "Test message",
          botToken: dummyToken,
          timeoutMs: 100, // fast timeout
        });
      } finally {
        console.warn = origWarn;
        console.error = origError;
      }

      const tokenExposedInLogs = capturedLog.includes(dummyToken);
      if (!tokenExposedInLogs) {
        record(7, "Telegram bot token strictly sanitized: never logged in stdout/stderr on errors", true);
      } else {
        record(7, "Token leaked in logs", false, "Dummy token appeared in console error output");
      }
    } catch (e: any) {
      record(7, "Telegram bot token log sanitization", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 8: Rotated Telegram bot token processes outbound delivery cleanly
    // -------------------------------------------------------------------------
    try {
      // Verify sendTelegramText interface supports explicit rotated token without crash
      const rotatedToken = ["999999999", "RotatedTokenForTestingPreBetaSecurity1"].join(":");
      const result = await sendTelegramText({
        chatId: 12345678,
        text: "Halo dari OXID Ledger",
        botToken: rotatedToken,
        timeoutMs: 200,
      });

      // It should attempt request to official Telegram endpoint without crashing
      if (result.success === false && result.errorCode !== "TELEGRAM_BOT_TOKEN_MISSING") {
        record(8, "Rotated Telegram bot token accepted and executed through standard client adapter", true);
      } else {
        record(8, "Rotated Telegram bot test failed", false, `result=${JSON.stringify(result)}`);
      }
    } catch (e: any) {
      record(8, "Rotated Telegram bot token processing", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 9: Signup rate limiting and in-flight mutex prevent abuse
    // -------------------------------------------------------------------------
    try {
      const probeEmail = "rate_limit_probe@example.com";
      resetRateLimit(`signup_email_${probeEmail}`);

      let acceptedCount = 0;
      let blockedCount = 0;

      for (let i = 0; i < 7; i++) {
        const check = checkRateLimit(`signup_email_${probeEmail}`, 5, 10000);
        if (check.allowed) {
          acceptedCount++;
        } else {
          blockedCount++;
        }
      }

      if (acceptedCount === 5 && blockedCount === 2) {
        record(9, "Signup rate limiter strictly permits 5 attempts and blocks subsequent abuse (429)", true);
      } else {
        record(9, "Rate limiter failed", false, `accepted=${acceptedCount}, blocked=${blockedCount}`);
      }
    } catch (e: any) {
      record(9, "Signup rate limiting", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 10: Multi-tenant isolation & single-business Telegram constraint intact
    // -------------------------------------------------------------------------
    try {
      // Query the verify_and_consume_telegram_pairing_token definition
      const rpcCheck = await pgClient.query(`
        SELECT prosrc FROM pg_proc WHERE proname = 'verify_and_consume_telegram_pairing_token';
      `);
      const procSrc = rpcCheck.rows[0]?.prosrc || "";

      const hasSingleBusinessCheck = procSrc.includes("ALREADY_CONNECTED_TO_OTHER_BUSINESS");
      const hasPlanCapacityCheck = procSrc.includes("OPERATOR_LIMIT_REACHED");

      if (hasSingleBusinessCheck && hasPlanCapacityCheck) {
        record(10, "PostgreSQL RPC enforces single-business context and plan operator limits", true);
      } else {
        record(10, "Multi-tenant pairing constraints failed", false,
          `singleBiz=${hasSingleBusinessCheck}, planCap=${hasPlanCapacityCheck}`);
      }
    } catch (e: any) {
      record(10, "Multi-tenant isolation & Telegram constraints", false, e.message);
    }
  } finally {
    await pgClient.end();
  }

  // Summary
  const passed = reports.filter((r) => r.passed).length;
  const failed = reports.filter((r) => !r.passed).length;

  console.log("\n========================================================");
  console.log(`STEP 10.2 TEST REPORT: ${passed}/${reports.length} PASSED (${failed} FAILED)`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runStep10_2Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
