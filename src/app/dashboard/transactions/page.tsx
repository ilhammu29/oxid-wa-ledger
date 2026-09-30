import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { TransactionsView } from "@/components/dashboard/transactions-view";
import { TransactionRowData } from "@/components/dashboard/transaction-detail-modal";

export const dynamic = "force-dynamic";

interface TransactionsPageProps {
  searchParams: Promise<{
    page?: string;
    source?: string;
    status?: string;
    productId?: string;
    q?: string;
  }>;
}

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const params = await searchParams;
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  const PAGE_SIZE = 15;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // 1. Fetch products for product filter & names
  const { data: productsData } = await supabase
    .from("products")
    .select("id, name")
    .eq("business_id", business.id)
    .order("name", { ascending: true });

  const productMap = new Map<string, string>();
  (productsData || []).forEach((p) => productMap.set(p.id, p.name));

  // 2. Build filtered transactions query
  let query = supabase
    .from("transactions")
    .select(
      "id, product_id, transaction_at, source, quantity, unit, unit_price, total_amount, status, raw_message",
      { count: "exact" }
    )
    .eq("business_id", business.id);

  if (params.source && params.source !== "all") {
    query = query.eq("source", params.source);
  }

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.productId && params.productId !== "all") {
    query = query.eq("product_id", params.productId);
  }

  if (params.q) {
    query = query.ilike("raw_message", `%${params.q.trim()}%`);
  }

  query = query
    .order("transaction_at", { ascending: false })
    .range(from, to);

  const { data: txData, count } = await query;

  const transactions: TransactionRowData[] = (txData || []).map((t) => ({
    id: t.id,
    transaction_at: t.transaction_at,
    product_id: t.product_id,
    product_name: t.product_id ? productMap.get(t.product_id) || "Produk" : "Produk Default",
    quantity: Number(t.quantity),
    unit: t.unit,
    unit_price: Number(t.unit_price),
    total_amount: Number(t.total_amount),
    source: t.source,
    status: t.status as "confirmed" | "cancelled" | "corrected",
    raw_message: t.raw_message,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
          Riwayat Transaksi
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
          Daftar seluruh transaksi yang tercatat dari WhatsApp, Telegram, dan Dashboard.
        </p>
      </div>

      <TransactionsView
        transactions={transactions}
        products={productsData || []}
        totalCount={count || 0}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        timezone={business.timezone}
      />
    </div>
  );
}
