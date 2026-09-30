import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { ProductsView, ProductRecord } from "@/components/dashboard/products-view";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  const { data: productsData } = await supabase
    .from("products")
    .select("id, name, unit, default_price, active, is_default, created_at")
    .eq("business_id", business.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  const products: ProductRecord[] = (productsData || []).map((p) => ({
    id: p.id,
    name: p.name,
    unit: p.unit,
    default_price: Number(p.default_price),
    active: Boolean(p.active),
    is_default: Boolean(p.is_default),
    created_at: p.created_at,
  }));

  const canManage = session.role === "owner" || session.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
          Katalog Produk
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
          Kelola master komoditas, harga standar integer IDR, dan tetapkan produk default.
        </p>
      </div>

      <ProductsView products={products} canManage={canManage} />
    </div>
  );
}
