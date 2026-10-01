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
  Sparkles,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  Package,
  Receipt,
} from "lucide-react";
import { getBusinessOnboardingState } from "@/modules/onboarding/client-launch";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  // 1. Fetch KPIs, 14-day sales time-series, and onboarding progress
  const [kpis, dailySeries, onboardingProgress] = await Promise.all([
    getOverviewKPIs(supabase, business.id),
    getDailySalesSeries(supabase, business.id, 14),
    getBusinessOnboardingState(supabase, business.id),
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

      {/* Onboarding Checklist Card (Step 10J) - Shown until onboarding is 100% complete */}
      {!onboardingProgress.completedAt && (
        <div className="p-5 bg-white border border-emerald-500/40 rounded-2xl space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                <Sparkles className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  Mulai Menggunakan OXID Ledger ({onboardingProgress.percentage}% Selesai)
                </h3>
                <p className="text-xs text-zinc-500">
                  Selesaikan beberapa langkah awal agar pencatatan otomatis via Telegram berjalan optimal.
                </p>
              </div>
            </div>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs self-start sm:self-center transition-colors"
            >
              <span>Lanjutkan Pengaturan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-3 border-t border-zinc-100 text-xs">
            <div className="flex items-center gap-2 text-emerald-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>1. Profil Bisnis</span>
            </div>
            <div className={`flex items-center gap-2 ${onboardingProgress.productCompleted ? "text-emerald-700 font-medium" : "text-zinc-400"}`}>
              {onboardingProgress.productCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <span className="w-4 h-4 rounded-full border border-zinc-300 text-[10px] flex items-center justify-center">2</span>
              )}
              <span>2. Tambah Produk</span>
            </div>
            <div className={`flex items-center gap-2 ${onboardingProgress.telegramCompleted ? "text-emerald-700 font-medium" : "text-zinc-400"}`}>
              {onboardingProgress.telegramCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <span className="w-4 h-4 rounded-full border border-zinc-300 text-[10px] flex items-center justify-center">3</span>
              )}
              <span>3. Hubungkan Telegram</span>
            </div>
            <div className={`flex items-center gap-2 ${onboardingProgress.firstTransactionCompleted ? "text-emerald-700 font-medium" : "text-zinc-400"}`}>
              {onboardingProgress.firstTransactionCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <span className="w-4 h-4 rounded-full border border-zinc-300 text-[10px] flex items-center justify-center">4</span>
              )}
              <span>4. Transaksi Pertama</span>
            </div>
            <div className={`flex items-center gap-2 ${onboardingProgress.googleSheetsCompleted ? "text-emerald-700 font-medium" : "text-zinc-400"}`}>
              {onboardingProgress.googleSheetsCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <span className="w-4 h-4 rounded-full border border-zinc-300 text-[10px] flex items-center justify-center">5</span>
              )}
              <span>5. Google Sheets</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions (Step 10J) - Shown when onboarding is complete */}
      {onboardingProgress.completedAt && (
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/transactions"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-800 text-xs font-semibold shadow-2xs transition-colors"
          >
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>Lihat Semua Transaksi</span>
          </Link>
          <Link
            href="/dashboard/products"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-800 text-xs font-semibold shadow-2xs transition-colors"
          >
            <Package className="w-4 h-4 text-sky-600" />
            <span>Kelola Produk & Alias</span>
          </Link>
          <a
            href="/api/export/ledger.xlsx"
            download
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-800 text-xs font-semibold shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Unduh Laporan Excel</span>
          </a>
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

      {/* Contextual Help Card (Step 10M) */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
          <HelpCircle className="w-4 h-4 text-emerald-600" />
          <span>Panduan Cepat Chat Telegram</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
            <span className="font-semibold text-zinc-700 block">Catat Penjualan:</span>
            <p className="font-mono text-emerald-700 text-[11px] bg-emerald-50 px-2 py-1 rounded">&ldquo;Kejual lele 10kg&rdquo;</p>
            <p className="text-[11px] text-zinc-500">Mencatat kg dan menghitung total rupiah.</p>
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
            <span className="font-semibold text-zinc-700 block">Laporan Hari Ini:</span>
            <p className="font-mono text-sky-700 text-[11px] bg-sky-50 px-2 py-1 rounded">&ldquo;Laporan hari ini&rdquo;</p>
            <p className="text-[11px] text-zinc-500">Melihat rekap omzet & volume produk.</p>
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
            <span className="font-semibold text-zinc-700 block">Tanpa Penjualan:</span>
            <p className="font-mono text-amber-700 text-[11px] bg-amber-50 px-2 py-1 rounded">&ldquo;Gak ada penjualan&rdquo;</p>
            <p className="text-[11px] text-zinc-500">Konfirmasi kas tetap nol hari ini.</p>
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
            <span className="font-semibold text-zinc-700 block">Toko Tutup / Libur:</span>
            <p className="font-mono text-rose-700 text-[11px] bg-rose-50 px-2 py-1 rounded">&ldquo;Libur hari ini&rdquo;</p>
            <p className="text-[11px] text-zinc-500">Mencatat status libur operasional.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
