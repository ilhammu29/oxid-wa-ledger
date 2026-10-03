import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getPlatformAdminUser, hasPlatformPermission, getBusinessDetailForAdmin, getAllPlans } from "@/modules/subscriptions";
import { AdminBusinessDetailView } from "@/components/admin/admin-business-detail-view";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminBusinessDetailPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const adminRecord = await getPlatformAdminUser(user, supabase);
  if (!adminRecord || !adminRecord.active || !hasPlatformPermission(adminRecord.role, "businesses:read")) {
    redirect("/dashboard");
  }

  const detail = await getBusinessDetailForAdmin(supabase, businessId);
  if (!detail) {
    notFound();
  }

  const plans = getAllPlans();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <Link
          href="/admin/businesses"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Daftar Bisnis</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {detail.business.name}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="font-mono">{detail.business.id}</span>
              {detail.business.ownerEmail && (
                <>
                  <span className="mx-2 text-muted-foreground/40">·</span>
                  <span>Pemilik: <strong className="text-foreground font-mono">{detail.business.ownerEmail}</strong></span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <AdminBusinessDetailView detail={detail} plans={plans} />
    </div>
  );
}
