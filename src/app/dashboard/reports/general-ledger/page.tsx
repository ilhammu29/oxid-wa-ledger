import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { getGeneralLedger } from "@/modules/accounting/reports";
import { ensureBusinessChartOfAccounts } from "@/modules/accounting/coa";
import { formatRupiah } from "@/modules/transactions/money";
import { getBusinessTimezone } from "@/modules/transactions/service";
import { getMonthUtcRange } from "@/modules/transactions/timezone";
import { FileDown } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    accountCode?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function GeneralLedgerPage({ searchParams }: PageProps) {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  const sp = await searchParams;
  const selectedCode = sp.accountCode || "1100"; // default: Kas
  let startDate = sp.startDate;
  let endDate = sp.endDate;

  if (!startDate || !endDate) {
    const timezone = await getBusinessTimezone(supabase, business.id);
    const range = getMonthUtcRange(new Date(), timezone);
    startDate = range.startAt.toISOString().slice(0, 10);
    endDate = range.endAt.toISOString().slice(0, 10);
  }

  const allAccounts = await ensureBusinessChartOfAccounts(supabase, business.id);

  let ledgerData = null;
  try {
    ledgerData = await getGeneralLedger(supabase, {
      businessId: business.id,
      accountCode: selectedCode,
      startDate,
      endDate,
    });
  } catch (err) {
    console.warn(`[GeneralLedgerPage] Could not load ledger for ${selectedCode}:`, err);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Buku Besar (General Ledger)
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Riwayat kronologis mutasi akun dan saldo berjalan per akun buku besar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/export/accounting-excel?startDate=${startDate}&endDate=${endDate}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-fg hover:bg-primary/90 transition-colors shadow-xs"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Download Excel</span>
          </a>
        </div>
      </div>

      {/* Account Selector Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-surface border border-border">
        {allAccounts.map((acc) => {
          const isSelected = acc.code === selectedCode;
          return (
            <Link
              key={acc.id}
              href={`/dashboard/reports/general-ledger?accountCode=${acc.code}&startDate=${startDate}&endDate=${endDate}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isSelected
                  ? "bg-primary text-primary-fg shadow-2xs font-semibold"
                  : "text-muted hover:text-foreground hover:bg-surface-hover"
              }`}
            >
              <span className="font-mono mr-1.5">{acc.code}</span>
              {acc.name}
            </Link>
          );
        })}
      </div>

      {/* Account Info and Summary */}
      {ledgerData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
            <span className="text-xs text-muted">Saldo Awal Periode</span>
            <p className="text-xl font-bold text-foreground mt-1 tabular-nums font-mono">
              {formatRupiah(ledgerData.openingBalance)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
            <span className="text-xs text-muted">Mutasi Periode Ini</span>
            <p className="text-xl font-bold text-foreground mt-1 tabular-nums font-mono">
              {formatRupiah(ledgerData.closingBalance - ledgerData.openingBalance)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
            <span className="text-xs text-muted">Saldo Akhir Berjalan</span>
            <p className="text-xl font-bold text-primary mt-1 tabular-nums font-mono">
              {formatRupiah(ledgerData.closingBalance)}
            </p>
          </div>
        </div>
      )}

      {/* Ledger Lines Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">
            Buku Besar: {ledgerData?.accountName || selectedCode}
          </h3>
          <span className="text-xs text-muted font-mono">
            {ledgerData?.items.length || 0} entri
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-surface-hover text-muted uppercase font-mono text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">No. Jurnal</th>
                <th className="px-4 py-3">Sumber</th>
                <th className="px-4 py-3">Keterangan</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Kredit</th>
                <th className="px-4 py-3 text-right">Saldo Berjalan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-sans">
              {ledgerData?.items.map((line, idx) => (
                <tr key={idx} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-muted">{line.date}</td>
                  <td className="px-4 py-3 font-mono text-muted">{line.entryNumber}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-muted">{line.sourceType}</td>
                  <td className="px-4 py-3 text-foreground max-w-[250px] truncate">{line.description || line.reference || "-"}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-foreground">
                    {line.debit > 0 ? formatRupiah(line.debit) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-foreground">
                    {line.credit > 0 ? formatRupiah(line.credit) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                    {formatRupiah(line.runningBalance)}
                  </td>
                </tr>
              ))}
              {(!ledgerData || ledgerData.items.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    Tidak ada mutasi jurnal pada akun ini untuk periode terpilih.
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
