import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { getStatementOfChangesInEquity } from "@/modules/accounting/reports";
import { CapitalClientView, CapitalMovementRow } from "@/components/dashboard/capital-client-view";

export const dynamic = "force-dynamic";

export default async function CapitalPage() {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  const now = new Date();
  const year = now.getFullYear();
  const startDate = `${year}-01-01`;
  const endDate = now.toISOString().slice(0, 10);

  const equity = await getStatementOfChangesInEquity(supabase, {
    businessId: business.id,
    startDate,
    endDate,
  });

  const { data: movements } = await supabase
    .from("capital_movements")
    .select("id, movement_date, type, amount, description, status, created_at")
    .eq("business_id", business.id)
    .order("movement_date", { ascending: false });

  const rows: CapitalMovementRow[] = (movements || []).map((m) => ({
    id: m.id,
    movement_date: m.movement_date,
    type: m.type as "CAPITAL_ADDITION" | "OWNER_DRAW",
    amount: Number(m.amount) || 0,
    description: m.description,
    status: m.status || "active",
    created_at: m.created_at,
  }));

  return (
    <CapitalClientView
      movements={rows}
      equity={equity}
      timezone={business.timezone || "Asia/Jakarta"}
    />
  );
}
