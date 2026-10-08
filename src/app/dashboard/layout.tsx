import "server-only";

import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { createClient } from "@/lib/supabase/server";
import { getBusinessSubscriptionState, getPlatformAdminUser } from "@/modules/subscriptions";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthenticatedBusiness();

  // If user has zero active businesses, route directly to onboarding wizard
  if (session.status === "NO_BUSINESS" || !session.business) {
    redirect("/onboarding");
  }

  const supabase = await createClient();

  // Fetch active products, subscription state, and platform admin status in parallel
  const [productsData, subscriptionState, platformAdmin] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, unit, default_price, is_default, active")
      .eq("business_id", session.business.id)
      .eq("active", true)
      .order("is_default", { ascending: false })
      .then((res) => res.data || []),
    getBusinessSubscriptionState(supabase, session.business.id),
    getPlatformAdminUser(session.user, supabase).catch(() => null),
  ]);

  const products = productsData.map((p) => ({
    id: p.id,
    name: p.name,
    unit: p.unit,
    default_price: Number(p.default_price),
    is_default: Boolean(p.is_default),
    active: Boolean(p.active),
  }));

  return (
    <DashboardShell
      business={session.business}
      role={session.role || "member"}
      userEmail={session.user.email || ""}
      products={products}
      subscriptionState={{
        status: subscriptionState.status,
        daysRemaining: subscriptionState.remainingDays,
        isTrial: subscriptionState.isTrial,
        planCode: subscriptionState.plan.code,
      }}
      isPlatformAdmin={Boolean(platformAdmin && platformAdmin.active)}
      platformAdminRole={platformAdmin?.role}
    >
      {children}
    </DashboardShell>
  );
}
