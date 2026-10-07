import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { getBalanceSheet } from "@/modules/accounting/reports";
import { formatRupiah } from "@/modules/transactions/money";
import { Wallet, Landmark, ArrowLeftRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CashBankPage() {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  const todayStr = new Date().toISOString().slice(0, 10);
  const bs = await getBalanceSheet(supabase, { businessId: business.id, asOfDate: todayStr });

  const cashBalance = bs.currentAssets.cash;
  const bankBalance = bs.currentAssets.bank;
  const totalLiquidity = cashBalance + bankBalance;

  // Fetch recent cash & bank mutations
  const { data: mutations } = await supabase
    .from("journal_lines")
    .select(`
      id, debit, credit, description, created_at,
      chart_of_accounts!inner(code, name),
      journal_entries!inner(entry_number, journal_date, source_type, reference)
    `)
    .eq("journal_entries.business_id", business.id)
    .neq("journal_entries.status", "voided")
    .in("chart_of_accounts.code", ["1100", "1200"])
    .order("created_at", { ascending: false })
    .limit(50);

interface CashBankMutationRow {
  id: string;
  debit: number | string;
  credit: number | string;
  description: string | null;
  created_at: string;
  chart_of_accounts: { code: string; name: string } | null;
  journal_entries: { entry_number: string; journal_date: string; source_type: string; reference: string | null } | null;
}

  const rows = (mutations || []) as unknown as CashBankMutationRow[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Kas & Bank
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Status likuiditas saldo kas tunai dan rekening bank berdasarkan buku besar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/reports/cash-flow"
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground transition-colors"
          >
            Laporan Arus Kas
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Kas Tunai (1100)</span>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {formatRupiah(cashBalance)}
          </p>
          <p className="text-[11px] text-muted mt-1">Uang fisik di outlet / laci kas</p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Rekening Bank (1200)</span>
            <Landmark className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {formatRupiah(bankBalance)}
          </p>
          <p className="text-[11px] text-muted mt-1">Saldo giro / tabungan operasional</p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Total Likuiditas</span>
            <ArrowLeftRight className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {formatRupiah(totalLiquidity)}
          </p>
          <p className="text-[11px] text-muted mt-1">Kas + Bank tersedia saat ini</p>
        </div>
      </div>

      {/* Mutation Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">Mutasi Kas & Bank Terakhir</h3>
          <span className="text-xs text-muted font-mono">{rows.length} mutasi</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-surface-hover text-muted uppercase font-mono text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">No. Jurnal</th>
                <th className="px-4 py-3">Akun</th>
                <th className="px-4 py-3">Sumber / Deskripsi</th>
                <th className="px-4 py-3 text-right">Debit (Masuk)</th>
                <th className="px-4 py-3 text-right">Kredit (Keluar)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-sans">
              {rows.map((row: CashBankMutationRow) => {
                const debit = Number(row.debit) || 0;
                const credit = Number(row.credit) || 0;
                return (
                  <tr key={row.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-muted">
                      {row.journal_entries?.journal_date}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted">
                      {row.journal_entries?.entry_number}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      <span className="px-1.5 py-0.5 rounded bg-surface-hover border border-border font-mono text-[11px] mr-1.5">
                        {row.chart_of_accounts?.code}
                      </span>
                      {row.chart_of_accounts?.name}
                    </td>
                    <td className="px-4 py-3 text-foreground/90 max-w-[280px] truncate">
                      {row.description || row.journal_entries?.reference || "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {debit > 0 ? formatRupiah(debit) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                      {credit > 0 ? formatRupiah(credit) : "-"}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    Belum ada mutasi kas atau bank tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
