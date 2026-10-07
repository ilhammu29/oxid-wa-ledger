import { SupabaseClient } from "@supabase/supabase-js";
import { postSaleToAccounting } from "./posting";

/**
 * Idempotently backfills existing confirmed transactions into the double-entry accounting journal.
 * Safe to run multiple times: skips any transactions that already have a posted journal entry.
 */
export async function backfillHistoricalSalesToJournal(
  client: SupabaseClient,
  businessId: string
): Promise<{ totalFound: number; backfilled: number; skipped: number }> {
  // 1. Fetch confirmed transactions for business
  const { data: transactions, error: txErr } = await client
    .from("transactions")
    .select(`
      id,
      business_id,
      total_amount,
      quantity,
      transaction_at,
      created_by_user_id,
      product_id,
      products (
        name,
        unit_cost
      )
    `)
    .eq("business_id", businessId)
    .eq("status", "confirmed")
    .order("transaction_at", { ascending: true });

  if (txErr || !transactions) {
    throw new Error(`Failed to fetch transactions for backfill: ${txErr?.message}`);
  }

  // 2. Fetch existing journals for this business
  const { data: existingJournals } = await client
    .from("journal_entries")
    .select("source_id")
    .eq("business_id", businessId)
    .eq("source_type", "SALE")
    .neq("status", "voided");

  const existingSourceIds = new Set((existingJournals || []).map((j) => j.source_id));

  let backfilled = 0;
  let skipped = 0;

  for (const tx of transactions) {
    if (existingSourceIds.has(tx.id)) {
      skipped++;
      continue;
    }

    const prod = (tx.products as unknown as { name?: string; unit_cost?: number }) || {};
    const unitCost = Number(prod.unit_cost) || 0;
    const quantity = Number(tx.quantity) || 0;
    const totalAmount = Number(tx.total_amount) || 0;
    const transactionDate = String(tx.transaction_at).slice(0, 10);

    try {
      await postSaleToAccounting(client, {
        businessId,
        transactionId: tx.id,
        totalAmount,
        unitCost,
        quantity,
        transactionDate,
        description: `Penjualan ${prod.name || "Produk"}`,
        actorUserId: tx.created_by_user_id,
      });
      backfilled++;
    } catch (err: unknown) {
      console.warn(`[Backfill] Failed for tx ${tx.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return {
    totalFound: transactions.length,
    backfilled,
    skipped,
  };
}
