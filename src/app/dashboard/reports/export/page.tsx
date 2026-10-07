import "server-only";

import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { FileDown, FileSpreadsheet, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const startDate = `${currentMonth}-01`;
  const endDate = now.toISOString().slice(0, 10);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Ekspor Laporan & Pembukuan Excel
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1">
          Unduh laporan akuntansi lengkap dan riwayat transaksi bisnis <span className="font-semibold text-foreground">{business.name}</span> dalam format Microsoft Excel (.xlsx).
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: 14-Sheet Accounting Workbook */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">
                Buku Akuntansi Lengkap (14 Lembar Kerja)
              </h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Mencakup Ringkasan Eksekutif, Laba Rugi, Neraca, Arus Kas, Perubahan Ekuitas, Neraca Saldo, Buku Besar, Jurnal Umum, Penjualan, Pengeluaran, Pembelian, Piutang, Hutang, dan Persediaan.
              </p>
            </div>
            <div className="pt-2 text-[11px] font-mono text-muted flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Double-entry verified & tenant-isolated</span>
            </div>
          </div>

          <a
            href={`/api/export/accounting-excel?startDate=${startDate}&endDate=${endDate}`}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-fg font-medium text-xs hover:bg-primary/90 transition-colors shadow-xs"
          >
            <FileDown className="w-4 h-4" />
            <span>Unduh Laporan Akuntansi (Bulan Ini)</span>
          </a>
        </div>

        {/* Card 2: Simple Sales Ledger */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-surface-hover text-muted flex items-center justify-center border border-border">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">
                Buku Kas Penjualan (Sales Ledger)
              </h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Rekapitulasi transaksi penjualan harian, kuantitas komoditas, omzet, dan status harian untuk pembukuan kas ringkas.
              </p>
            </div>
          </div>

          <a
            href="/api/export/ledger.xlsx"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground font-medium text-xs transition-colors"
          >
            <FileDown className="w-4 h-4" />
            <span>Unduh Ledger Penjualan</span>
          </a>
        </div>
      </div>
    </div>
  );
}
