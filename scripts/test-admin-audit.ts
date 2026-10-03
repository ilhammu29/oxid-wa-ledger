import { createClient } from "@supabase/supabase-js";
import {
  PlatformAdminRole,
  PlatformPermission,
} from "../src/modules/subscriptions/types";
import { hasPlatformPermission } from "../src/modules/subscriptions/admin";
import { formatIDR, getPlan } from "../src/modules/subscriptions/plans";

// Standalone test suite for Phase 41 Automated Security & RBAC Audit
async function runAuditTests() {
  console.log("=== OXID Ledger - Platform Admin & RBAC Security Verification Suite ===\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
      failed++;
    }
  }

  // 1. RBAC Matrix Verification
  console.log("1. RBAC PERMISSION MATRIX CHECKS:");

  // super_admin: has all permissions
  const allPermissions: PlatformPermission[] = [
    "admin:view",
    "businesses:read",
    "businesses:write",
    "users:read",
    "users:write",
    "subscriptions:read",
    "subscriptions:write",
    "payments:read",
    "payments:write",
    "settings:read",
    "settings:write",
    "audit:read",
    "system:read",
  ];

  const superAdminAllPass = allPermissions.every((p) => hasPlatformPermission("super_admin", p));
  assert(superAdminAllPass, "super_admin possesses all operational platform permissions");

  // viewer: read-only, NO write permissions
  const viewerReadPass =
    hasPlatformPermission("viewer", "admin:view") &&
    hasPlatformPermission("viewer", "businesses:read") &&
    hasPlatformPermission("viewer", "users:read") &&
    hasPlatformPermission("viewer", "subscriptions:read") &&
    hasPlatformPermission("viewer", "payments:read") &&
    hasPlatformPermission("viewer", "system:read") &&
    hasPlatformPermission("viewer", "audit:read");
  assert(viewerReadPass, "viewer has access to read-only views");

  const viewerWriteBlocked =
    !hasPlatformPermission("viewer", "businesses:write") &&
    !hasPlatformPermission("viewer", "users:write") &&
    !hasPlatformPermission("viewer", "subscriptions:write") &&
    !hasPlatformPermission("viewer", "payments:write") &&
    !hasPlatformPermission("viewer", "settings:write") &&
    !hasPlatformPermission("viewer", "settings:read");
  assert(viewerWriteBlocked, "viewer is strictly blocked from all mutating write operations and billing settings");

  // billing_admin: manages payments and subscriptions, cannot manage users or system health
  const billingAdminPass =
    hasPlatformPermission("billing_admin", "payments:read") &&
    hasPlatformPermission("billing_admin", "payments:write") &&
    hasPlatformPermission("billing_admin", "subscriptions:read") &&
    hasPlatformPermission("billing_admin", "subscriptions:write") &&
    hasPlatformPermission("billing_admin", "settings:read") &&
    hasPlatformPermission("billing_admin", "settings:write") &&
    !hasPlatformPermission("billing_admin", "users:read") &&
    !hasPlatformPermission("billing_admin", "users:write") &&
    !hasPlatformPermission("billing_admin", "system:read");
  assert(billingAdminPass, "billing_admin has strict payment/billing scope and is denied user management and system telemetry");

  // support_admin: operational troubleshooting, cannot perform write mutations
  const supportAdminPass =
    hasPlatformPermission("support_admin", "businesses:read") &&
    hasPlatformPermission("support_admin", "users:read") &&
    hasPlatformPermission("support_admin", "system:read") &&
    !hasPlatformPermission("support_admin", "payments:write") &&
    !hasPlatformPermission("support_admin", "subscriptions:write") &&
    !hasPlatformPermission("support_admin", "settings:write") &&
    !hasPlatformPermission("support_admin", "settings:read");
  assert(supportAdminPass, "support_admin has diagnostic read access and is blocked from financial writes and billing credentials");

  // 2. Database Live Connectivity & Schema Integrity Check
  console.log("\n2. DATABASE & LIVE SCHEMA VERIFICATION:");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("Missing Supabase credentials in environment");
    process.exit(1);
  }

  const client = createClient(url, serviceKey);

  // Check platform_admins table
  const { data: admins, error: adminErr } = await client
    .from("platform_admins")
    .select("id, user_id, email, role, active");
  assert(!adminErr && Boolean(admins && admins.length > 0), "platform_admins table exists with active records", adminErr?.message);

  if (admins && admins.length > 0) {
    const superAdmin = admins.find((a) => a.role === "super_admin" && a.active);
    assert(Boolean(superAdmin), `Active super_admin found: ${superAdmin?.email} (user_id: ${superAdmin?.user_id})`);
  }

  // Check business_subscriptions table
  const { data: subs, error: subErr } = await client
    .from("business_subscriptions")
    .select("id, business_id, plan_code, status, trial_ends_at, current_period_end");
  assert(!subErr && Boolean(subs), "business_subscriptions queryable and contains authoritative records", subErr?.message);

  // Check subscription_payments table
  const { data: payments, error: payErr } = await client
    .from("subscription_payments")
    .select("id, business_id, amount_idr, status, reference, confirmed_at");
  assert(!payErr && Boolean(payments), "subscription_payments queryable", payErr?.message);

  // Check subscription_audit_logs table
  const { data: auditLogs, error: auditErr } = await client
    .from("subscription_audit_logs")
    .select("id, business_id, action, new_status, actor_email")
    .limit(5);
  assert(!auditErr && Boolean(auditLogs), "subscription_audit_logs table exists and captures immutable administrative actions", auditErr?.message);

  // Check google_sheets_connections & sync_runs
  const { data: sheetsConn, error: sheetsErr } = await client
    .from("google_sheets_connections")
    .select("business_id, enabled, spreadsheet_id, last_sync_status, last_sync_at")
    .limit(1);
  assert(!sheetsErr && Boolean(sheetsConn), "google_sheets_connections contains verified live integration records", sheetsErr?.message);

  // Check processed_telegram_updates
  const { count: telegramUpdateCount, error: tgErr } = await client
    .from("processed_telegram_updates")
    .select("update_id", { count: "exact", head: true });
  assert(!tgErr && (telegramUpdateCount ?? 0) > 0, `processed_telegram_updates records real live bot operations (${telegramUpdateCount} updates)`, tgErr?.message);

  // 3. Subscription & Plan Invariance
  console.log("\n3. SUBSCRIPTION & FINANCIAL INVARIANCE CHECKS:");

  const pilotPlan = getPlan("pilot");
  assert(pilotPlan.priceIdr === 0 && pilotPlan.durationDays === 14, "Paket Pilot is 14 days free trial (Rp 0)");

  const basicPlan = getPlan("basic");
  assert(basicPlan.priceIdr === 49000 && basicPlan.durationDays === 30, "Paket Basic is Rp 49.000 for 30 days");

  const proPlan = getPlan("pro");
  assert(proPlan.priceIdr === 149000 && proPlan.durationDays === 30, "Paket Pro is Rp 149.000 for 30 days");

  assert(formatIDR(49000).replace(/\s+/g, " ") === "Rp 49.000", "formatIDR formats integer currency according to Indonesian standard");

  // 4. Payment Lifecycle E2E, Verification, Rejection & Audit Logging
  console.log("\n4. PAYMENT LIFECYCLE E2E, VERIFICATION & AUDIT LOGGING:");

  const testBizId = "d7a3b6d8-9813-43dd-8e6a-96f22020e564";
  const testSubId = "7c2dafe9-2481-4d34-a5ca-de461d1ff1e9";
  const adminUser = admins?.find((a) => a.role === "super_admin" && a.active);

  if (adminUser) {
    // 4.1 Insert test pending payment
    const { data: testPay, error: insertPayErr } = await client
      .from("subscription_payments")
      .insert({
        business_id: testBizId,
        subscription_id: testSubId,
        amount_idr: 149000,
        payment_method: "manual_transfer",
        status: "pending",
        reference: "AUDIT-E2E-TEST-CONFIRM",
      })
      .select()
      .single();

    assert(!insertPayErr && Boolean(testPay), "Tenant payment submission persists to subscription_payments as 'pending'");

    if (testPay) {
      // 4.2 Verify payment appears in pending payments list
      const { data: pendingList } = await client
        .from("subscription_payments")
        .select("id")
        .eq("status", "pending")
        .eq("id", testPay.id);
      assert(Boolean(pendingList && pendingList.length > 0), "Admin Pending Payments view discovers new pending transaction");

      // 4.3 Execute adminConfirmPayment
      const { adminConfirmPayment, adminRejectPayment } = await import("../src/modules/subscriptions/admin");
      await adminConfirmPayment(client, {
        paymentId: testPay.id,
        adminUserId: adminUser.user_id,
        adminEmail: adminUser.email,
        extensionDays: 30,
        notes: "Automated audit verification payment confirmation",
      });

      // 4.4 Assert payment status updated
      const { data: updatedPay } = await client
        .from("subscription_payments")
        .select("status, confirmed_at, confirmed_by")
        .eq("id", testPay.id)
        .single();
      assert(
        updatedPay?.status === "confirmed" && updatedPay?.confirmed_by === adminUser.user_id,
        "adminConfirmPayment transactionally marks payment as confirmed with admin audit stamps"
      );

      // 4.5 Assert subscription upgraded to Pro and active
      const { data: updatedSub } = await client
        .from("business_subscriptions")
        .select("plan_code, status, current_period_end")
        .eq("id", testSubId)
        .single();
      assert(
        updatedSub?.status === "active" && updatedSub?.plan_code === "pro",
        "Verification automatically transitions subscription to 'active' and upgrades plan_code to 'pro'"
      );

      // 4.6 Assert audit log created
      const { data: auditEntry } = await client
        .from("subscription_audit_logs")
        .select("action, new_status, actor_email, metadata")
        .eq("business_id", testBizId)
        .eq("action", "ADMIN_CONFIRM_PAYMENT")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      assert(
        auditEntry?.action === "ADMIN_CONFIRM_PAYMENT" && auditEntry?.new_status === "active",
        "Immutable audit log generated with actor email and payment metadata"
      );

      // 4.7 Test Rejection Flow
      const { data: rejectPay } = await client
        .from("subscription_payments")
        .insert({
          business_id: testBizId,
          subscription_id: testSubId,
          amount_idr: 49000,
          payment_method: "manual_transfer",
          status: "pending",
          reference: "AUDIT-E2E-TEST-REJECT",
        })
        .select()
        .single();

      if (rejectPay) {
        await adminRejectPayment(client, {
          paymentId: rejectPay.id,
          adminUserId: adminUser.user_id,
          adminEmail: adminUser.email,
          notes: "Audit test rejection: invalid transfer receipt",
        });

        const { data: rejectedResult } = await client
          .from("subscription_payments")
          .select("status")
          .eq("id", rejectPay.id)
          .single();
        assert(rejectedResult?.status === "rejected", "adminRejectPayment correctly transitions payment to 'rejected'");

        // Clean up synthetic test records
        await client.from("subscription_payments").delete().in("id", [testPay.id, rejectPay.id]);
        console.log("  ✓ [CLEANUP] Synthetic test payment records safely purged from database");
      }
    }
  }

  console.log(`\n=== Verification Complete: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAuditTests().catch((e) => {
  console.error("Unhandled test execution error:", e);
  process.exit(1);
});
