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
    <SubscriptionView
      subscriptionState={subscriptionState}
      payments={payments}
      plans={allPlans}
      paymentSettings={paymentSettings}
      role={session.role || "member"}
    />
  );
}
