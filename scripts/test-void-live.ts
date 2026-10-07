import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { postSaleToAccounting, voidSaleFromAccounting } from "../src/modules/accounting/posting";
import { getProfitAndLoss, getBalanceSheet, getTrialBalance, getGeneralLedger } from "../src/modules/accounting/reports";
import { executeConversationAction } from "../src/modules/conversation/executor";

const envFiles = [".env.local", ".env"];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["\x27]|["\x27]$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testVoidAndCorrection() {
  const businessId = "5abb177a-374b-4a91-bbdd-4bbaa2d88d3c"; // Use our verified test business
  const testOwnerId = "dba29d14-3bbb-4e5a-965b-72e9baa6ea30";
  const todayStr = new Date().toISOString().slice(0, 10);
  const startOfMonth = `${todayStr.slice(0, 7)}-01`;
  const endOfMonth = `${todayStr.slice(0, 7)}-31`;

  console.log("=== Testing Void & Correction on Live Supabase ===");

  // 1. Get product
  const { data: prod } = await supabase.from("products").select("id").eq("business_id", businessId).limit(1).single();
  const productId = prod!.id;

  // 2. Post a distinct sale to test voiding: 5 kg @ 100k = 500k, HPP: 300k
  const { data: saleTx } = await supabase
    .from("transactions")
    .insert({
      business_id: businessId,
      product_id: productId,
      quantity: 5,
      unit: "kg",
      unit_price: 100000,
      total_amount: 500000,
      status: "confirmed",
      transaction_type: "sale",
      source: "dashboard",
      created_by_user_id: testOwnerId,
    })
    .select("id")
    .single();

  await postSaleToAccounting(supabase, {
    businessId,
    transactionId: saleTx!.id,
    totalAmount: 500000,
    quantity: 5,
    unitCost: 60000,
    description: "Penjualan Khusus Void Test 5kg",
    actorUserId: testOwnerId,
  });

  const pnlBeforeVoid = await getProfitAndLoss(supabase, { businessId, startDate: startOfMonth, endDate: endOfMonth });
  console.log("P&L before void: Gross Sales =", pnlBeforeVoid.grossSales, "Net Profit =", pnlBeforeVoid.netProfit);

  // 3. Void the sale
  console.log("Voiding sale transaction:", saleTx!.id);
  await voidSaleFromAccounting(supabase, {
    businessId,
    transactionId: saleTx!.id,
    voidReason: "Pembeli membatalkan pesanan (E2E Void Test)",
    actorUserId: testOwnerId,
  });

  // 4. Update transaction status to cancelled
  await supabase.from("transactions").update({ status: "cancelled" }).eq("id", saleTx!.id);

  // 5. Inspect journal entries for this transaction
  const { data: journals } = await supabase
    .from("journal_entries")
    .select("id, entry_number, source_type, source_id, status, total_debit, total_credit")
    .or(`source_id.eq.${saleTx!.id},source_type.eq.VOID_REVERSAL`)
    .eq("business_id", businessId);

  console.log("Journals for void test:", journals);

  // 6. Inspect P&L after void
  const pnlAfterVoid = await getProfitAndLoss(supabase, { businessId, startDate: startOfMonth, endDate: endOfMonth });
  console.log("P&L after void: Gross Sales =", pnlAfterVoid.grossSales, "Net Profit =", pnlAfterVoid.netProfit);

  // 7. Check if P&L returned to previous state (before the 500k sale)
  console.log("Sales change due to void: ", pnlAfterVoid.grossSales - pnlBeforeVoid.grossSales);
}

testVoidAndCorrection().catch(console.error);
