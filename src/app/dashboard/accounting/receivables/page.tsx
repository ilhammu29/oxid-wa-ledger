import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { ReceivablesClientView, ReceivableRow } from "@/components/dashboard/receivables-client-view";

export const dynamic = "force-dynamic";

export default async function ReceivablesPage() {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  const { data: receivables } = await supabase
    .from("receivables")
    .select("id, customer_name, total_amount, paid_amount, status, due_date, created_at")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const rows: ReceivableRow[] = (receivables || []).map((r) => ({
    id: r.id,
    customer_name: r.customer_name,
    total_amount: Number(r.total_amount) || 0,
    paid_amount: Number(r.paid_amount) || 0,
    status: r.status,
    due_date: r.due_date,
    created_at: r.created_at,
  }));

  return <ReceivablesClientView receivables={rows} timezone={business.timezone || "Asia/Jakarta"} />;
}
