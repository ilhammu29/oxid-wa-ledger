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
    view?: string;
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

  // 1. Fetch products for product filter, names, and manual entry
  const { data: productsData } = await supabase
    .from("products")
    .select("id, name, unit, default_price, is_default, active")
    .eq("business_id", business.id)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  const productMap = new Map<string, string>();
  (productsData || []).forEach((p) => productMap.set(p.id, p.name));

  const productOptions = (productsData || []).map((p) => ({
    id: p.id,
    name: p.name,
    unit: p.unit || "kg",
    default_price: Number(p.default_price || 0),
    is_default: Boolean(p.is_default),
    active: Boolean(p.active),
  }));

  // 2. Build filtered transactions query
  let query = supabase
    .from("transactions")
    .select(
      "id, product_id, transaction_at, source, quantity, unit, unit_price, total_amount, status, raw_message, archived_at, archived_by, archive_reason",
      { count: "exact" }
    )
    .eq("business_id", business.id);

  // Archive filter: default to 'active' (hide archived)
  const viewFilter = params.view || "active";
  if (viewFilter === "active") {
    query = query.is("archived_at", null);
  } else if (viewFilter === "archived") {
    query = query.not("archived_at", "is", null);
  }
  // 'all' includes both active and archived

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
    archived_at: t.archived_at,
    archived_by: t.archived_by,
    archive_reason: t.archive_reason,
  }));

  return (
    <div className="space-y-6">
      <TransactionsView
        transactions={transactions}
        products={productOptions}
        totalCount={count || 0}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        timezone={business.timezone}
      />
    </div>
  );
}
