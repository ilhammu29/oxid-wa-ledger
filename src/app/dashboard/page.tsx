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
  Sparkles,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  Package,
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
      {/* Page Title & Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Selamat datang kembali!</span>
            <span className="text-xl">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Ini ringkasan penjualan dan aktivitas bisnis <span className="font-semibold text-slate-200">{business.name}</span> pada bulan ini.
          </p>
        </div>
      </div>

      {/* Onboarding Checklist Card (Shown until onboarding is 100% complete) */}
      {!onboardingProgress.completedAt && (
        <div className="p-5 bg-gradient-to-br from-[#121B30] to-[#101626] border border-violet-500/30 rounded-2xl space-y-4 shadow-lg glow-purple-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 flex items-center justify-center font-bold shrink-0">
                <Sparkles className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Mulai Menggunakan OXID Ledger ({onboardingProgress.percentage}% Selesai)
                </h3>
                <p className="text-xs text-slate-400">
                  Selesaikan langkah awal agar pencatatan otomatis via bot Telegram berjalan optimal.
                </p>
              </div>
            </div>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-900/40 self-start sm:self-center transition-colors"
            >
              <span>Lanjutkan Pengaturan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-3 border-t border-white/[0.08] text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>1. Profil Bisnis</span>
            </div>
            <div className={`flex items-center gap-2 ${onboardingProgress.productCompleted ? "text-emerald-400 font-medium" : "text-slate-500"}`}>
              {onboardingProgress.productCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <span className="w-4 h-4 rounded-full border border-slate-600 text-[10px] flex items-center justify-center">2</span>
              )}
              <span>2. Tambah Produk</span>
            </div>
            <div className={`flex items-center gap-2 ${onboardingProgress.telegramCompleted ? "text-emerald-400 font-medium" : "text-slate-500"}`}>
              {onboardingProgress.telegramCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <span className="w-4 h-4 rounded-full border border-slate-600 text-[10px] flex items-center justify-center">3</span>
              )}
              <span>3. Hubungkan Telegram</span>
            </div>
            <div className={`flex items-center gap-2 ${onboardingProgress.firstTransactionCompleted ? "text-emerald-400 font-medium" : "text-slate-500"}`}>
              {onboardingProgress.firstTransactionCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <span className="w-4 h-4 rounded-full border border-slate-600 text-[10px] flex items-center justify-center">4</span>
              )}
              <span>4. Transaksi Pertama</span>
            </div>
            <div className={`flex items-center gap-2 ${onboardingProgress.googleSheetsCompleted ? "text-emerald-400 font-medium" : "text-slate-500"}`}>
              {onboardingProgress.googleSheetsCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <span className="w-4 h-4 rounded-full border border-slate-600 text-[10px] flex items-center justify-center">5</span>
              )}
              <span>5. Google Sheets</span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid (5 Cards from Reference) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* KPI 1: Omzet Hari Ini */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#111726] border border-white/[0.08] hover:border-violet-500/30 transition-all shadow-sm space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Hari ini
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Omzet Hari Ini</p>
            <p className="text-lg sm:text-xl font-bold text-white font-mono tracking-tight mt-0.5">
              {formatIDR(kpis.todayRevenue)}
            </p>
          </div>
        </div>

        {/* KPI 2: Omzet Minggu Ini */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#111726] border border-white/[0.08] hover:border-violet-500/30 transition-all shadow-sm space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Minggu ini
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Omzet Minggu Ini</p>
            <p className="text-lg sm:text-xl font-bold text-white font-mono tracking-tight mt-0.5">
              {formatIDR(kpis.weekRevenue)}
            </p>
          </div>
        </div>

        {/* KPI 3: Omzet Bulan Ini */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#111726] border border-white/[0.08] hover:border-violet-500/30 transition-all shadow-sm space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
              Bulan ini
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Omzet Bulan Ini</p>
            <p className="text-lg sm:text-xl font-bold text-white font-mono tracking-tight mt-0.5">
              {formatIDR(kpis.monthRevenue)}
            </p>
          </div>
        </div>

        {/* KPI 4: Total Transaksi */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#111726] border border-white/[0.08] hover:border-violet-500/30 transition-all shadow-sm space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Hash className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
              Sukses
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Total Transaksi</p>
            <p className="text-lg sm:text-xl font-bold text-white font-mono tracking-tight mt-0.5">
              {kpis.todayTransactionCount}
            </p>
          </div>
        </div>

        {/* KPI 5: Total Qty Terjual */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#111726] border border-white/[0.08] hover:border-violet-500/30 transition-all shadow-sm space-y-3 relative overflow-hidden group col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Scale className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              Volume
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Total Qty Terjual</p>
            <p className="text-lg sm:text-xl font-bold text-white font-mono tracking-tight mt-0.5">
              {kpis.todayQuantity}{" "}
              <span className="text-xs font-normal text-slate-400">kg</span>
            </p>
          </div>
        </div>
      </div>

      {/* Middle Section: Chart & Operational Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Cols): 14-Day Sales Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.08] bg-[#111726] p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Grafik Omzet</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Perkembangan omzet 14 hari terakhir ({business.timezone})
              </p>
            </div>
            <div className="flex items-center gap-1.5 self-start sm:self-center">
              <span className="px-3 py-1 rounded-xl bg-violet-600 text-white text-xs font-semibold shadow-xs">
                Harian
              </span>
            </div>
          </div>
          <SalesChart data={dailySeries} />
        </div>

        {/* Right (1 Col): Penjualan per Produk / Ringkasan Katalog */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#111726] p-5 sm:p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Katalog Produk</h3>
                  <p className="text-[11px] text-slate-400">Produk aktif terdaftar</p>
                </div>
              </div>
              <Link
                href="/dashboard/products"
                className="text-[11px] font-semibold text-violet-400 hover:text-violet-300 transition-colors"
              >
                Kelola →
              </Link>
            </div>

            {/* List of Products */}
            <div className="space-y-2.5 mt-4">
              {Array.from(productMap.entries()).slice(0, 5).map(([id, name], idx) => {
                const colors = [
                  "bg-violet-500",
                  "bg-indigo-500",
                  "bg-emerald-500",
                  "bg-amber-500",
                  "bg-sky-500",
                ];
                const dotColor = colors[idx % colors.length];
                return (
                  <div
                    key={id}
                    className="p-3 rounded-xl bg-[#161F33] border border-white/[0.05] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                      <span className="font-semibold text-white">{name}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">Aktif</span>
                  </div>
                );
              })}
              {productMap.size === 0 && (
                <div className="text-center py-6 text-slate-500 text-xs">
                  Belum ada produk aktif
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.06]">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total Volume Hari Ini:</span>
              <span className="font-bold text-white font-mono">{kpis.todayQuantity} kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Aktivitas Transaksi Terbaru
            </h3>
            <p className="text-xs text-slate-400">
              Transaksi tercatat via bot Telegram atau dashboard
            </p>
          </div>
          <Link
            href="/dashboard/transactions"
            className="text-xs font-semibold text-violet-400 hover:text-violet-300 inline-flex items-center gap-1 transition-colors"
          >
            Lihat Semua
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <RecentTransactionsTable
          transactions={recentTransactions}
          timezone={business.timezone}
        />
      </div>

      {/* Panduan Cepat Chat Telegram (Reference Design) */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111726] p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <HelpCircle className="w-4 h-4 text-violet-400" />
          <span>Panduan Cepat Chat Telegram</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#161F33] border border-white/[0.05] space-y-1.5">
            <span className="font-semibold text-slate-300 block">Catat Penjualan:</span>
            <p className="font-mono text-violet-300 text-[11px] bg-violet-500/10 border border-violet-500/20 px-2 py-1 rounded-lg">
              &ldquo;Kejual lele 10kg&rdquo;
            </p>
            <p className="text-[11px] text-slate-400">Mencatat kg dan menghitung total rupiah.</p>
          </div>
          <div className="p-3 rounded-xl bg-[#161F33] border border-white/[0.05] space-y-1.5">
            <span className="font-semibold text-slate-300 block">Laporan Hari Ini:</span>
            <p className="font-mono text-sky-300 text-[11px] bg-sky-500/10 border border-sky-500/20 px-2 py-1 rounded-lg">
              &ldquo;Laporan hari ini&rdquo;
            </p>
            <p className="text-[11px] text-slate-400">Melihat rekap omzet & volume produk.</p>
          </div>
          <div className="p-3 rounded-xl bg-[#161F33] border border-white/[0.05] space-y-1.5">
            <span className="font-semibold text-slate-300 block">Tanpa Penjualan:</span>
            <p className="font-mono text-amber-300 text-[11px] bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
              &ldquo;Gak ada penjualan&rdquo;
            </p>
            <p className="text-[11px] text-slate-400">Konfirmasi kas tetap nol hari ini.</p>
          </div>
          <div className="p-3 rounded-xl bg-[#161F33] border border-white/[0.05] space-y-1.5">
            <span className="font-semibold text-slate-300 block">Toko Tutup / Libur:</span>
            <p className="font-mono text-rose-300 text-[11px] bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg">
              &ldquo;Libur hari ini&rdquo;
            </p>
            <p className="text-[11px] text-slate-400">Mencatat status libur operasional.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
