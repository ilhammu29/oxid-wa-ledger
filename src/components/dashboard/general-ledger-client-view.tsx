"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileDown,
  Search,
  ChevronDown,
  BookOpen,
  Calendar,
  Check,
  Filter,
} from "lucide-react";
import { formatRupiah } from "@/modules/transactions/money";
import type { ChartOfAccount, GeneralLedgerAccountReport } from "@/modules/accounting/types";

interface GeneralLedgerClientViewProps {
  allAccounts: ChartOfAccount[];
  ledgerData: GeneralLedgerAccountReport | null;
  selectedCode: string;
  startDate: string;
  endDate: string;
}

// Group COA accounts by standard financial taxonomy
function groupAccounts(accounts: ChartOfAccount[]) {
  const groups: { label: string; accounts: ChartOfAccount[] }[] = [
    {
      label: "Aset",
      accounts: accounts.filter((a) => a.type === "ASSET"),
    },
    {
      label: "Kewajiban",
      accounts: accounts.filter((a) => a.type === "LIABILITY"),
    },
    {
      label: "Ekuitas",
      accounts: accounts.filter((a) => a.type === "EQUITY"),
    },
    {
      label: "Pendapatan",
      accounts: accounts.filter((a) => a.type === "REVENUE"),
    },
    {
      label: "Harga Pokok Penjualan (HPP)",
      accounts: accounts.filter((a) => a.type === "COGS"),
    },
    {
      label: "Beban Operasional",
      accounts: accounts.filter((a) => a.type === "EXPENSE"),
    },
  ];

  return groups.filter((g) => g.accounts.length > 0);
}

export function GeneralLedgerClientView({
  allAccounts,
  ledgerData,
  selectedCode,
  startDate: initialStartDate,
  endDate: initialEndDate,
}: GeneralLedgerClientViewProps) {
  const router = useRouter();

  const [selectedAccCode, setSelectedAccCode] = useState(selectedCode);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);

  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [accountSearch, setAccountSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAccountDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedAccount = useMemo(() => {
    return allAccounts.find((a) => a.code === selectedAccCode) || allAccounts[0];
  }, [allAccounts, selectedAccCode]);

  const filteredGroups = useMemo(() => {
    const rawGroups = groupAccounts(allAccounts);
    if (!accountSearch.trim()) return rawGroups;

    const q = accountSearch.toLowerCase().trim();
    return rawGroups
      .map((g) => ({
        label: g.label,
        accounts: g.accounts.filter(
          (a) => a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.accounts.length > 0);
  }, [allAccounts, accountSearch]);

  const handleApplyFilter = (newCode?: string) => {
    const code = newCode || selectedAccCode;
    const params = new URLSearchParams();
    params.set("accountCode", code);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    router.push(`/dashboard/reports/general-ledger?${params.toString()}`);
  };

  const handleSelectAccount = (code: string) => {
    setSelectedAccCode(code);
    setAccountDropdownOpen(false);
    handleApplyFilter(code);
  };

  // Compute mutations summary
  const totalDebit = ledgerData?.items.reduce((acc, it) => acc + it.debit, 0) || 0;
  const totalCredit = ledgerData?.items.reduce((acc, it) => acc + it.credit, 0) || 0;
  const netMutation = totalDebit - totalCredit;

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & EXCEL EXPORT
      ────────────────────────────────────────────────────────────── */}
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
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-fg hover:bg-primary/90 transition-colors shadow-xs"
          >
            <FileDown className="w-4 h-4" />
            <span>Download Excel</span>
          </a>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. TOOLBAR: ACCOUNT SELECTOR + DATE RANGE + APPLY
      ────────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
        {/* Searchable Account Selector Dropdown */}
        <div className="relative flex-1" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
            className="w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-border bg-surface-hover/50 hover:bg-surface-hover text-foreground text-xs font-medium transition-colors text-left"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-[11px]">
                {selectedAccount ? selectedAccount.code : selectedAccCode}
              </span>
              <span className="truncate font-semibold text-foreground">
                {selectedAccount ? selectedAccount.name : "Pilih Akun"}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-muted shrink-0" />
          </button>

          {accountDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-full sm:w-80 rounded-xl border border-border bg-surface shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Search box inside dropdown */}
              <div className="p-2 border-b border-border bg-surface-hover/30">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari kode atau nama akun..."
                    value={accountSearch}
                    onChange={(e) => setAccountSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-foreground placeholder:text-muted focus:outline-hidden focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                </div>
              </div>

              {/* Grouped Account Options */}
              <div className="max-h-72 overflow-y-auto p-1 divide-y divide-border/50">
                {filteredGroups.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted">
                    Akun tidak ditemukan.
                  </div>
                ) : (
                  filteredGroups.map((group) => (
                    <div key={group.label} className="py-1">
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted font-mono">
                        {group.label}
                      </div>
                      {group.accounts.map((acc) => {
                        const isSelected = acc.code === selectedAccCode;
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => handleSelectAccount(acc.code)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                              isSelected
                                ? "bg-primary/10 text-primary font-semibold"
                                : "text-foreground hover:bg-surface-hover"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-mono text-[11px] text-muted font-medium w-10 text-left">
                                {acc.code}
                              </span>
                              <span className="truncate">{acc.name}</span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface text-xs text-muted">
            <Calendar className="w-3.5 h-3.5 text-muted shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-foreground text-xs focus:outline-hidden font-mono"
            />
          </div>
          <span className="text-muted text-xs">s/d</span>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface text-xs text-muted">
            <Calendar className="w-3.5 h-3.5 text-muted shrink-0" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-foreground text-xs focus:outline-hidden font-mono"
            />
          </div>
        </div>

        {/* Terapkan Button */}
        <button
          type="button"
          onClick={() => handleApplyFilter()}
          className="w-full sm:w-auto px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface-hover text-foreground text-xs font-semibold transition-colors shrink-0 flex items-center justify-center gap-1.5 shadow-2xs"
        >
          <Filter className="w-3.5 h-3.5 text-primary" />
          <span>Terapkan</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. SUMMARY METRICS CARDS
      ────────────────────────────────────────────────────────────── */}
      {ledgerData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs">
            <span className="text-xs text-muted font-medium">Saldo Awal Periode</span>
            <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums font-mono">
              {formatRupiah(ledgerData.openingBalance)}
            </p>
            <p className="text-[11px] text-muted mt-1">Sebelum tanggal {startDate}</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs">
            <div className="flex items-center justify-between text-xs text-muted font-medium">
              <span>Mutasi Debit / Kredit</span>
              <span className="text-[11px] font-mono">
                {ledgerData.items.length} transaksi
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums font-mono">
              {formatRupiah(netMutation)}
            </p>
            <p className="text-[11px] text-muted mt-1 font-mono">
              Debit: {formatRupiah(totalDebit)} · Kredit: {formatRupiah(totalCredit)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs">
            <span className="text-xs text-muted font-medium">Saldo Akhir Berjalan</span>
            <p className="text-2xl font-bold text-primary mt-1.5 tabular-nums font-mono">
              {formatRupiah(ledgerData.closingBalance)}
            </p>
            <p className="text-[11px] text-muted mt-1">Per tanggal {endDate}</p>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. GENERAL LEDGER ENTRIES TABLE (DESKTOP) & CARDS (MOBILE)
      ────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-hover/30">
          <div>
            <h3 className="font-semibold text-sm text-foreground">
              Mutasi Akun: {selectedAccount ? selectedAccount.name : selectedAccCode}
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Normal Balance: <strong className="font-mono text-foreground">{ledgerData?.normalBalance || selectedAccount?.normalBalance || "DEBIT"}</strong>
            </p>
          </div>
          <span className="text-xs text-muted font-mono">
            {ledgerData ? `${ledgerData.items.length} baris` : "0 baris"}
          </span>
        </div>

        {/* Empty state */}
        {(!ledgerData || ledgerData.items.length === 0) ? (
          <div className="p-12 text-center text-muted space-y-3">
            <BookOpen className="w-8 h-8 text-muted/40 mx-auto" />
            <p className="text-xs font-medium">
              Tidak ada mutasi transaksi untuk akun {selectedAccCode} pada rentang tanggal ini.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 z-10 bg-surface-hover text-muted uppercase font-mono text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="px-4 py-3 w-28">Tanggal</th>
                    <th className="px-4 py-3 w-36">No. Jurnal</th>
                    <th className="px-4 py-3 w-28">Sumber</th>
                    <th className="px-4 py-3">Keterangan</th>
                    <th className="px-4 py-3 text-right w-32">Debit</th>
                    <th className="px-4 py-3 text-right w-32">Kredit</th>
                    <th className="px-4 py-3 text-right w-36">Saldo Berjalan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-sans">
                  {ledgerData.items.map((it, idx) => (
                    <tr
                      key={`${it.entryNumber}-${idx}`}
                      className="hover:bg-surface-hover/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-muted text-[11px] whitespace-nowrap">
                        {it.date}
                      </td>
                      <td className="px-4 py-3 font-mono text-foreground font-semibold whitespace-nowrap">
                        {it.entryNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-surface-hover border border-border text-muted">
                          {it.sourceType}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 max-w-xs truncate text-foreground"
                        title={it.description}
                      >
                        {it.description || "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                        {it.debit > 0 ? formatRupiah(it.debit) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                        {it.credit > 0 ? formatRupiah(it.credit) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-foreground whitespace-nowrap">
                        {formatRupiah(it.runningBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="sm:hidden p-3 space-y-2.5">
              {ledgerData.items.map((it, idx) => (
                <div
                  key={`${it.entryNumber}-${idx}`}
                  className="p-3.5 rounded-xl bg-surface border border-border space-y-2 text-xs shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-foreground text-[11px]">
                      {it.entryNumber}
                    </span>
                    <span className="font-mono text-muted text-[10px]">{it.date}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted text-[11px]">
                    <span className="truncate max-w-[200px]" title={it.description}>
                      {it.description || "-"}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-hover border border-border">
                      {it.sourceType}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <div className="space-x-2 font-mono text-[11px]">
                      {it.debit > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          +{formatRupiah(it.debit)}
                        </span>
                      )}
                      {it.credit > 0 && (
                        <span className="text-rose-600 dark:text-rose-400 font-medium">
                          -{formatRupiah(it.credit)}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted block">Saldo:</span>
                      <span className="font-mono font-bold text-foreground text-xs">
                        {formatRupiah(it.runningBalance)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
