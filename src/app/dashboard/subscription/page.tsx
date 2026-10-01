import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import {
  getBusinessSubscriptionState,
  getBusinessPayments,
  getAllPlans,
  getBillingPaymentSettings,
} from "@/modules/subscriptions";
import { SubscriptionView } from "@/components/dashboard/subscription-view";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  const subscriptionState = await getBusinessSubscriptionState(supabase, business.id);
  const payments = await getBusinessPayments(supabase, business.id);
  const allPlans = getAllPlans();
  const paymentSettings = await getBillingPaymentSettings(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
          Status & Paket Langganan
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
          Kelola paket langganan OXID Ledger, riwayat pembayaran, dan masa aktif operasional bisnis Anda.
        </p>
      </div>

      <SubscriptionView
        subscriptionState={subscriptionState}
        payments={payments}
        plans={allPlans}
        paymentSettings={paymentSettings}
        role={session.role || "member"}
      />
    </div>
  );
}
