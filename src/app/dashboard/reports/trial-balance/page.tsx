import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { getTrialBalance } from "@/modules/accounting/reports";
import { formatRupiah } from "@/modules/transactions/money";
import { CheckCircle2, AlertTriangle, FileDown } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    asOfDate?: string;
  }>;
}

export default async function TrialBalancePage({ searchParams }: PageProps) {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  const sp = await searchParams;
  const asOfDate = sp.asOfDate || new Date().toISOString().slice(0, 10);

  const tb = await getTrialBalance(supabase, {
    businessId: business.id,
    asOfDate,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Neraca Saldo (Trial Balance)
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Posisi per <span className="font-mono font-medium text-foreground">{asOfDate}</span> (Verifikasi Keseimbangan Debit = Kredit)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/export/accounting-excel?endDate=${asOfDate}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-fg hover:bg-primary/90 transition-colors shadow-xs"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Download Excel</span>
          </a>
        </div>
      </div>

      {/* Balance Indicator Banner */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between shadow-xs ${
          tb.isBalanced
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
            : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
        }`}
      >
        <div className="flex items-center gap-3">
          {tb.isBalanced ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <div>
            <h4 className="font-semibold text-xs sm:text-sm">
              {tb.isBalanced ? "Neraca Saldo Sempurna & Seimbang" : "Peringatan: Selisih Saldo Terdeteksi"}
            </h4>
            <p className="text-xs opacity-90 font-mono">
              Total Debit ({formatRupiah(tb.totalDebit)}) = Total Kredit ({formatRupiah(tb.totalCredit)})
            </p>
          </div>
        </div>
      </div>

      {/* Trial Balance Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">Daftar Akun & Saldo</h3>
          <span className="text-xs text-muted font-mono">{tb.items.length} akun</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-surface-hover text-muted uppercase font-mono text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="px-4 py-3">Kode</th>
                <th className="px-4 py-3">Nama Akun</th>
                <th className="px-4 py-3">Tipe</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Kredit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-sans">
              {tb.items.map((line) => (
                <tr key={line.accountCode} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-foreground">{line.accountCode}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{line.accountName}</td>
                  <td className="px-4 py-3 text-muted">
                    <span className="px-1.5 py-0.5 rounded bg-surface-hover border border-border text-[10px] font-mono">
                      {line.accountType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                    {line.debit > 0 ? formatRupiah(line.debit) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                    {line.credit > 0 ? formatRupiah(line.credit) : "-"}
                  </td>
                </tr>
              ))}
              {tb.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    Belum ada transaksi di Chart of Accounts.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-surface-hover font-bold border-t-2 border-border text-foreground">
              <tr>
                <td colSpan={3} className="px-4 py-3 uppercase tracking-wider text-right font-mono">
                  TOTAL
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold">
                  {formatRupiah(tb.totalDebit)}
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold">
                  {formatRupiah(tb.totalCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
