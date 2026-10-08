import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { getBusinessSubscriptionState, hasPlanFeature } from "@/modules/subscriptions";
import { UpgradeGateCard } from "@/components/dashboard/upgrade-gate-card";
import { PayablesClientView, PayableRow } from "@/components/dashboard/payables-client-view";

export const dynamic = "force-dynamic";

export default async function PayablesPage() {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  // Authoritative Feature Entitlement Check
  const subState = await getBusinessSubscriptionState(supabase, business.id);
  if (!hasPlanFeature(subState.plan.code, "ar_ap")) {
    return (
      <UpgradeGateCard
        featureName="Manajemen Hutang Usaha (AP)"
        description="Pencatatan tagihan pembelian kredit, tempo supplier, dan jadwal cicilan hutang usaha hanya tersedia pada Paket Pro."
      />
    );
  }

  const { data: payables } = await supabase
    .from("payables")
    .select("id, supplier_name, total_amount, paid_amount, status, due_date, created_at")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const rows: PayableRow[] = (payables || []).map((p) => ({
    id: p.id,
    supplier_name: p.supplier_name,
    total_amount: Number(p.total_amount) || 0,
    paid_amount: Number(p.paid_amount) || 0,
    status: p.status,
    due_date: p.due_date,
    created_at: p.created_at,
  }));

  return <PayablesClientView payables={rows} timezone={business.timezone || "Asia/Jakarta"} />;
}
