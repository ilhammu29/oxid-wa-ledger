import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { PurchasesClientView, PurchaseRow } from "@/components/dashboard/purchases-client-view";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  const { data: purchases } = await supabase
    .from("purchases")
    .select("id, purchase_date, item_name, quantity, unit, unit_cost, total_amount, is_credit, supplier_name, status, created_at")
    .eq("business_id", business.id)
    .order("purchase_date", { ascending: false });

  const rows: PurchaseRow[] = (purchases || []).map((p) => ({
    id: p.id,
    purchase_date: p.purchase_date,
    item_name: p.item_name,
    quantity: Number(p.quantity) || 0,
    unit: p.unit || "kg",
    unit_cost: Number(p.unit_cost) || 0,
    total_amount: Number(p.total_amount) || 0,
    is_credit: Boolean(p.is_credit),
    supplier_name: p.supplier_name,
    status: p.status || "active",
    created_at: p.created_at,
  }));

  return <PurchasesClientView purchases={rows} timezone={business.timezone || "Asia/Jakarta"} />;
}
