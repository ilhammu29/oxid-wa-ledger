import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { processIncomingTelegramWebhook } from "../src/modules/telegram/service";
import { getProfitAndLoss, getBalanceSheet, getTrialBalance } from "../src/modules/accounting/reports";
import { generateAccountingExcelWorkbook } from "../src/modules/export/accounting-excel";
import ExcelJS from "exceljs";

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

async function main() {
  const businessId = "5abb177a-374b-4a91-bbdd-4bbaa2d88d3c"; // Isolated test business
  const testTelegramUserId = 999888777;
  const todayStr = new Date().toISOString().slice(0, 10);
  const startOfMonth = `${todayStr.slice(0, 7)}-01`;
  const endOfMonth = `${todayStr.slice(0, 7)}-31`;

  console.log("=== Telegram Accounting Live Verification ===");

  async function sendTelegramMessage(text: string): Promise<any> {
    const updateId = Math.floor(1000000 + Math.random() * 8000000);
    const result = await processIncomingTelegramWebhook(
      supabase,
      {
        update_id: updateId,
        message: {
          message_id: Math.floor(Math.random() * 10000),
          from: { id: testTelegramUserId, is_bot: false, first_name: "TestOp" },
          chat: { id: testTelegramUserId, type: "private" },
          date: Math.floor(Date.now() / 1000),
          text,
        },
      },
      { sendOutbound: false }
    );
    return result;
  }

  // 1. Sale via Telegram: "Kejual Lele Test 10kg"
  console.log("\n1. Testing Telegram Sale: 'Kejual Lele Test 10kg'");
  const saleRes = await sendTelegramMessage("Kejual Lele Test 10kg");
  console.log("Sale result:", saleRes.type, saleRes.action);

  const pnlAfterTgSale = await getProfitAndLoss(supabase, { businessId, startDate: startOfMonth, endDate: endOfMonth });
  console.log("Gross sales after Telegram sale:", pnlAfterTgSale.grossSales);

  // 2. Void via Telegram: "batal terakhir"
  console.log("\n2. Testing Telegram Void: 'batal terakhir'");
  const cancelRes = await sendTelegramMessage("batal terakhir");
  console.log("Cancel result:", cancelRes.type, cancelRes.action);

  const pnlAfterTgCancel = await getProfitAndLoss(supabase, { businessId, startDate: startOfMonth, endDate: endOfMonth });
  console.log("Gross sales after Telegram cancel:", pnlAfterTgCancel.grossSales);
  console.log("Sale delta from cancel:", pnlAfterTgCancel.grossSales - pnlAfterTgSale.grossSales);

  // 3. Correction via Telegram:
  console.log("\n3. Testing Telegram Sale + Correction:");
  await sendTelegramMessage("Kejual Lele Test 10kg");
  const pnlBeforeCorrect = await getProfitAndLoss(supabase, { businessId, startDate: startOfMonth, endDate: endOfMonth });
  console.log("Gross sales before correction:", pnlBeforeCorrect.grossSales);

  const correctRes = await sendTelegramMessage("ubah terakhir jadi 15kg");
  console.log("Correction result:", correctRes.type, correctRes.action);

  const pnlAfterCorrect = await getProfitAndLoss(supabase, { businessId, startDate: startOfMonth, endDate: endOfMonth });
  console.log("Gross sales after correction:", pnlAfterCorrect.grossSales);
  console.log("Sales delta from correction:", pnlAfterCorrect.grossSales - pnlBeforeCorrect.grossSales);

  // 4. Expense via Telegram: "Listrik 100 ribu"
  console.log("\n4. Testing Telegram Expense: 'Listrik 100 ribu'");
  const expRes = await sendTelegramMessage("Listrik 100 ribu");
  console.log("Expense result:", expRes.type, expRes.action);

  // 5. Capital via Telegram: "Modal masuk 5 juta"
  console.log("\n5. Testing Telegram Capital: 'Modal masuk 5 juta'");
  const capRes = await sendTelegramMessage("Modal masuk 5 juta");
  console.log("Capital result:", capRes.type, capRes.action);

  // 6. Prive via Telegram: "Ambil uang 200 ribu buat pribadi"
  console.log("\n6. Testing Telegram Prive: 'Ambil uang 200 ribu buat pribadi'");
  const priveRes = await sendTelegramMessage("Ambil uang 200 ribu buat pribadi");
  console.log("Prive result:", priveRes.type, priveRes.action);

  // 7. Balance Sheet via Telegram: "Neraca"
  console.log("\n7. Testing Telegram Balance Sheet: 'Neraca'");
  const bsRes = await sendTelegramMessage("Neraca");
  console.log("Balance sheet result:", bsRes.type, bsRes.action);

  // 8. Cash Flow via Telegram: "Arus kas"
  console.log("\n8. Testing Telegram Cash Flow: 'Arus kas'");
  const cfRes = await sendTelegramMessage("Arus kas");
  console.log("Cash flow result:", cfRes.type, cfRes.action);

  // 9. Trial Balance via Telegram: "Neraca saldo"
  console.log("\n9. Testing Telegram Trial Balance: 'Neraca saldo'");
  const tbRes = await sendTelegramMessage("Neraca saldo");
  console.log("Trial balance result:", tbRes.type, tbRes.action);

  // 10. Excel Export via Telegram: "export laporan"
  console.log("\n10. Testing Telegram Excel Export: 'export laporan'");
  const excelRes = await sendTelegramMessage("export laporan");
  console.log("Excel export result:", excelRes.type, excelRes.action);

  // 11. Final Balance Check
  console.log("\n11. Final Trial Balance Check:");
  const finalTb = await getTrialBalance(supabase, { businessId, asOfDate: todayStr });
  console.log(`Debit: ${finalTb.totalDebit}, Credit: ${finalTb.totalCredit}, Balanced: ${finalTb.isBalanced}, Discrepancy: ${finalTb.discrepancy}`);

  const finalBs = await getBalanceSheet(supabase, { businessId, asOfDate: todayStr });
  console.log(`Assets: ${finalBs.totalAssets}, Liab+Eq: ${finalBs.totalLiabilitiesAndEquity}, Balanced: ${finalBs.isBalanced}`);
}

main().catch(console.error);
