"use client";

import Link from "next/link";
import { Lock, Sparkles, Check, ArrowRight, ShieldCheck } from "lucide-react";

interface UpgradeGateCardProps {
  featureName?: string;
  description?: string;
}

export function UpgradeGateCard({
  featureName = "Akuntansi Lengkap",
  description,
}: UpgradeGateCardProps) {
  const proFeatures = [
    "Laporan Keuangan Otomatis (Laba Rugi, Neraca, Arus Kas)",
    "Buku Besar (General Ledger) & Neraca Saldo Seimbang",
    "Pencatatan Piutang Usaha (AR) & Hutang Supplier (AP)",
    "HPP Otomatis & Penilaian Nilai Persediaan Gudang",
    "Export Excel 14 Sheet Komprehensif Sesuai Standar Akuntansi",
    "Grafik Tren Keuangan & Analitik Bisnis Mendalam",
    "Multi-operator s.d. 10 staf/kasir usaha",
  ];

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      <div className="rounded-3xl border border-border bg-surface p-6 sm:p-10 shadow-lg relative overflow-hidden text-center sm:text-left">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Lock className="w-3.5 h-3.5" />
              <span>Fitur Eksklusif Paket Pro</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Buka Akses {featureName}
            </h2>

            <p className="text-sm text-muted leading-relaxed">
              {description ||
                "Fitur ini tersedia di Paket Pro. Dapatkan Laba Rugi, Neraca, Arus Kas, Buku Besar, Piutang, Hutang, dan laporan Excel 14-sheet untuk kemudahan evaluasi keuangan usaha Anda."}
            </p>
          </div>

          <div className="sm:text-right shrink-0">
            <span className="text-xs text-muted block">Biaya Investasi</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-primary tabular-nums mt-0.5">
              Rp149.000
            </div>
            <span className="text-[11px] text-muted block">per bulan / usaha</span>
          </div>
        </div>

        {/* Pro Benefits Grid */}
        <div className="mt-8 pt-8 border-t border-border">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-4 flex items-center justify-center sm:justify-start gap-1.5 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Manfaat Paket Usaha Berkembang (Pro):</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {proFeatures.map((feat) => (
              <div key={feat} className="flex items-start gap-2.5 text-foreground">
                <div className="p-0.5 rounded-full bg-emerald-500/10 text-emerald-500 shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action Buttons */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-muted">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Riwayat transaksi Anda tetap aman dan terhubung utuh.</span>
          </div>

          <Link
            href="/dashboard/subscription"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-fg hover:bg-primary/90 font-semibold text-xs transition-all shadow-md active:scale-[0.98]"
          >
            <span>Upgrade ke Paket Pro Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
