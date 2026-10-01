import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { getOverviewKPIs, getDailySalesSeries } from "@/modules/transactions";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { RecentTransactionsTable } from "@/components/dashboard/recent-transactions-table";
import Link from "next/link";
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Selamat datang kembali</span>
            <span className="text-lg">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Ringkasan performa dan aktivitas transaksi usaha <span className="font-semibold text-foreground">{business.name}</span>.
          </p>
        </div>
      </div>

      {/* Onboarding Checklist Card (Shown until onboarding is 100% complete) */}
      {!onboardingProgress.completedAt && (
        <div className="p-4 sm:p-5 bg-surface border border-border rounded-xl space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Mulai Menggunakan OXID Ledger ({onboardingProgress.percentage}% Selesai)
                </h3>
                <p className="text-xs text-muted">
                  Selesaikan langkah awal agar pencatatan otomatis via bot Telegram berjalan optimal.
                </p>
              </div>
            </div>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium text-xs shadow-xs self-start sm:self-center transition-colors"
            >
              <span>Lanjutkan Pengaturan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-3 border-t border-border text-xs">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>1. Profil Bisnis</span>
            </div>
            <div className={`flex items-center gap-2 ${onboardingProgress.productCompleted ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted"}`}>
              {onboardingProgress.productCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-border text-[10px] flex items-center justify-center">2</span>
              )}
              <span>2. Tambah Produk</span>
            </div>
            <div className={`flex items-center gap-2 ${onboardingProgress.telegramCompleted ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted"}`}>
              {onboardingProgress.telegramCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-border text-[10px] flex items-center justify-center">3</span>
              )}
              <span>3. Hubungkan Telegram</span>
            </div>
            <div className={`flex items-center gap-2 ${onboardingProgress.firstTransactionCompleted ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted"}`}>
              {onboardingProgress.firstTransactionCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-border text-[10px] flex items-center justify-center">4</span>
              )}
              <span>4. Transaksi Pertama</span>
            </div>
            <div className={`flex items-center gap-2 ${onboardingProgress.googleSheetsCompleted ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted"}`}>
              {onboardingProgress.googleSheetsCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-border text-[10px] flex items-center justify-center">5</span>
              )}
              <span>5. Google Sheets</span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid (4 Core Metrics, Dense & High-Hierarchy) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Omzet Hari Ini */}
        <div className="p-4 rounded-xl bg-surface border border-border hover:border-primary/40 transition-colors shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Omzet Hari Ini</span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              Hari ini
            </span>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold text-foreground font-mono tracking-tight">
              {formatIDR(kpis.todayRevenue)}
            </p>
            <p className="text-[11px] text-muted mt-1">
              Minggu ini: {formatIDR(kpis.weekRevenue)}
            </p>
          </div>
        </div>

        {/* KPI 2: Omzet Bulan Ini */}
        <div className="p-4 rounded-xl bg-surface border border-border hover:border-primary/40 transition-colors shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Omzet Bulan Ini</span>
            <span className="text-[10px] font-medium text-muted bg-surface-hover px-1.5 py-0.5 rounded border border-border">
              Bulan berjalan
            </span>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold text-foreground font-mono tracking-tight">
              {formatIDR(kpis.monthRevenue)}
            </p>
            <p className="text-[11px] text-muted mt-1">
              Akumulasi bulan kalender
            </p>
          </div>
        </div>

        {/* KPI 3: Total Transaksi */}
        <div className="p-4 rounded-xl bg-surface border border-border hover:border-primary/40 transition-colors shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Transaksi Hari Ini</span>
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
              Sukses
            </span>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold text-foreground font-mono tracking-tight">
              {kpis.todayTransactionCount}
            </p>
            <p className="text-[11px] text-muted mt-1">
              Tercatat via bot & dashboard
            </p>
          </div>
        </div>

        {/* KPI 4: Total Qty Terjual */}
        <div className="p-4 rounded-xl bg-surface border border-border hover:border-primary/40 transition-colors shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Volume Terjual</span>
            <span className="text-[10px] font-medium text-muted bg-surface-hover px-1.5 py-0.5 rounded border border-border">
              Komoditas
            </span>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold text-foreground font-mono tracking-tight">
              {kpis.todayQuantity}{" "}
              <span className="text-xs font-normal text-muted">kg</span>
            </p>
            <p className="text-[11px] text-muted mt-1">
              Total kuantitas hari ini
            </p>
          </div>
        </div>
      </div>

      {/* Middle Section: Chart & Catalog Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left (2 Cols): 14-Day Sales Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                Grafik Omzet
              </h3>
              <p className="text-xs text-muted">
                Perkembangan omzet 14 hari terakhir ({business.timezone})
              </p>
            </div>
            <div className="flex items-center gap-1.5 self-start sm:self-center">
              <span className="px-2.5 py-1 rounded-md bg-surface-hover border border-border text-foreground text-xs font-medium">
                Harian
              </span>
            </div>
          </div>
          <SalesChart data={dailySeries} />
        </div>

        {/* Right (1 Col): Penjualan per Produk / Ringkasan Katalog */}
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-sm font-semibold text-foreground tracking-tight">Katalog Produk</h3>
                <p className="text-[11px] text-muted">Produk aktif terdaftar</p>
              </div>
              <Link
                href="/dashboard/products"
                className="text-xs font-medium text-primary hover:underline transition-colors"
              >
                Kelola →
              </Link>
            </div>

            {/* List of Products */}
            <div className="space-y-2 mt-3">
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
                    className="p-2.5 rounded-lg bg-surface-hover/50 border border-border flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                      <span className="font-medium text-foreground">{name}</span>
                    </div>
                    <span className="text-[11px] text-muted font-mono">Aktif</span>
                  </div>
                );
              })}
              {productMap.size === 0 && (
                <div className="text-center py-6 text-muted text-xs">
                  Belum ada produk aktif
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-border">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Total Volume Hari Ini:</span>
              <span className="font-semibold text-foreground font-mono">{kpis.todayQuantity} kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              Aktivitas Transaksi Terbaru
            </h3>
            <p className="text-xs text-muted">
              Transaksi tercatat via bot Telegram atau dashboard
            </p>
          </div>
          <Link
            href="/dashboard/transactions"
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 transition-colors"
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

      {/* Panduan Cepat Chat Telegram */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
          <HelpCircle className="w-4 h-4 text-primary" />
          <span>Panduan Cepat Chat Telegram</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          <div className="p-3 rounded-lg bg-surface-hover/50 border border-border space-y-1">
            <span className="font-medium text-muted block text-[11px]">Catat Penjualan:</span>
            <p className="font-mono text-primary text-[11px] bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
              &ldquo;Kejual lele 10kg&rdquo;
            </p>
            <p className="text-[11px] text-muted">Mencatat kg dan menghitung total rupiah.</p>
          </div>
          <div className="p-3 rounded-lg bg-surface-hover/50 border border-border space-y-1">
            <span className="font-medium text-muted block text-[11px]">Laporan Hari Ini:</span>
            <p className="font-mono text-sky-600 dark:text-sky-400 text-[11px] bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">
              &ldquo;Laporan hari ini&rdquo;
            </p>
            <p className="text-[11px] text-muted">Melihat rekap omzet & volume produk.</p>
          </div>
          <div className="p-3 rounded-lg bg-surface-hover/50 border border-border space-y-1">
            <span className="font-medium text-muted block text-[11px]">Tanpa Penjualan:</span>
            <p className="font-mono text-amber-600 dark:text-amber-400 text-[11px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
              &ldquo;Gak ada penjualan&rdquo;
            </p>
            <p className="text-[11px] text-muted">Konfirmasi kas tetap nol hari ini.</p>
          </div>
          <div className="p-3 rounded-lg bg-surface-hover/50 border border-border space-y-1">
            <span className="font-medium text-muted block text-[11px]">Toko Tutup / Libur:</span>
            <p className="font-mono text-rose-600 dark:text-rose-400 text-[11px] bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
              &ldquo;Libur hari ini&rdquo;
            </p>
            <p className="text-[11px] text-muted">Mencatat status libur operasional.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
