import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { getOverviewKPIs, getDailySalesSeries } from "@/modules/transactions";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { RecentTransactionsTable } from "@/components/dashboard/recent-transactions-table";
import Link from "next/link";
import {
  TrendingUp,
  Calendar,
  Layers,
  Scale,
  Hash,
  FileSpreadsheet,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  // 1. Fetch KPIs & 14-day sales time-series
  const [kpis, dailySeries] = await Promise.all([
    getOverviewKPIs(supabase, business.id),
    getDailySalesSeries(supabase, business.id, 14),
  ]);

  // 2. Fetch products map
  const { data: productsData } = await supabase
    .from("products")
    .select("id, name")
    .eq("business_id", business.id);

  const productMap = new Map<string, string>();
  (productsData || []).forEach((p) => productMap.set(p.id, p.name));

  // 3. Fetch latest 10 transactions
  const { data: txData } = await supabase
    .from("transactions")
    .select(
      "id, product_id, transaction_at, source, quantity, unit, unit_price, total_amount, status, raw_message"
    )
    .eq("business_id", business.id)
    .order("transaction_at", { ascending: false })
    .limit(10);

  const recentTransactions = (txData || []).map((t) => ({
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
  }));

  // 4. Fetch Google Sheets connection status for optional onboarding card (Requirement 44)
  const { data: sheetsConn } = await supabase
    .from("google_sheets_connections")
    .select("enabled, spreadsheet_id")
    .eq("business_id", business.id)
    .maybeSingle();

  const formatIDR = (amount: number) =>
    `Rp${new Intl.NumberFormat("id-ID").format(amount)}`;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
          Ringkasan Operasional
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
          Pantau omzet, volume ikan, dan transaksi terkonfirmasi secara real-time.
        </p>
      </div>

      {/* Optional Google Sheets Onboarding Card */}
      {(!sheetsConn || !sheetsConn.spreadsheet_id) && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-900">Hubungkan Google Sheets</p>
              <p className="text-[11px] text-zinc-600">
                Buat mirror laporan spreadsheet otomatis satu arah dari buku kas Anda.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/settings/google-sheets"
            className="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs whitespace-nowrap"
          >
            Hubungkan Sekarang &rarr;
          </Link>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Omzet Hari Ini */}
        <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Omzet Hari Ini
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-950 font-mono tracking-tight">
            {formatIDR(kpis.todayRevenue)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">Hari kalender berjalan</p>
        </div>

        {/* KPI 2: Omzet Minggu Ini */}
        <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Omzet Minggu Ini
            </span>
            <Calendar className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-950 font-mono tracking-tight">
            {formatIDR(kpis.weekRevenue)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">Senin – Minggu</p>
        </div>

        {/* KPI 3: Omzet Bulan Ini */}
        <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Omzet Bulan Ini
            </span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-950 font-mono tracking-tight">
            {formatIDR(kpis.monthRevenue)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">Bulan kalender berjalan</p>
        </div>

        {/* KPI 4: Qty Terjual Hari Ini */}
        <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Qty Terjual Hari Ini
            </span>
            <Scale className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-950 font-mono tracking-tight">
            {kpis.todayQuantity}{" "}
            <span className="text-sm font-sans font-normal text-zinc-500">kg</span>
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">Volume terjual hari ini</p>
        </div>

        {/* KPI 5: Transaksi Hari Ini */}
        <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Transaksi Hari Ini
            </span>
            <Hash className="w-4 h-4 text-violet-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-950 font-mono tracking-tight">
            {kpis.todayTransactionCount}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">Transaksi terkonfirmasi</p>
        </div>
      </div>

      {/* 14-Day Sales Chart Section */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
              Omzet 14 Hari Terakhir
            </h3>
            <p className="text-xs text-zinc-500">
              Grafik penjualan harian berdasarkan zona waktu bisnis ({business.timezone})
            </p>
          </div>
        </div>
        <SalesChart data={dailySeries} />
      </div>

      {/* Recent Transactions Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
              Transaksi Terkini (10 Terakhir)
            </h3>
            <p className="text-xs text-zinc-500">
              Klik pada baris transaksi untuk melihat detail audit ledger
            </p>
          </div>
        </div>

        <RecentTransactionsTable
          transactions={recentTransactions}
          timezone={business.timezone}
        />
      </div>
    </div>
  );
}
