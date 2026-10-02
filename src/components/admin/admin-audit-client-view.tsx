"use client";

import { useState } from "react";
import { AdminAuditLogRow } from "@/modules/subscriptions/admin";
import { ScrollText, Search, Eye, X } from "lucide-react";
import { formatShortId } from "@/lib/admin-utils";

interface AdminAuditClientViewProps {
  logs: AdminAuditLogRow[];
  businessMap: Record<string, string>;
}

export function AdminAuditClientView({ logs, businessMap }: AdminAuditClientViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AdminAuditLogRow | null>(null);

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action)));

  const filteredLogs = logs.filter((log) => {
    const bizName = businessMap[log.business_id] || "";
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      log.action.toLowerCase().includes(q) ||
      (log.actor_email && log.actor_email.toLowerCase().includes(q)) ||
      (log.notes && log.notes.toLowerCase().includes(q)) ||
      bizName.toLowerCase().includes(q) ||
      log.business_id.toLowerCase().includes(q);

    if (actionFilter === "all") return matchesSearch;
    return matchesSearch && log.action === actionFilter;
  });

  const formatDate = (isoStr: string) => {
    try {
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(isoStr));
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* ─────────────────────────────────────────────────────────────
          1. SEARCH AND FILTERS TOOLBAR
      ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari aksi, operator, atau bisnis..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary/50"
          >
            <option value="all">Semua Tipe Aksi ({logs.length})</option>
            {uniqueActions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. AUDIT LOGS TABLE FOR DESKTOP (>= 768px)
      ────────────────────────────────────────────────────────────── */}
      <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30 text-muted-foreground border-b border-border font-semibold">
              <tr>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Aksi Administratif</th>
                <th className="py-3 px-4">Bisnis Terkait</th>
                <th className="py-3 px-4">Operator / Pelaku</th>
                <th className="py-3 px-4">Status Baru</th>
                <th className="py-3 px-4">Catatan Operasional</th>
                <th className="py-3 px-4 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-foreground">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                    Tidak ada catatan audit yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const bizName = businessMap[log.business_id] || "Bisnis";

                  return (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-foreground">{log.action}</td>

                      <td className="py-3 px-4 max-w-xs min-w-0">
                        <div className="font-semibold text-foreground truncate" title={bizName}>{bizName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5" title={log.business_id}>
                          {formatShortId(log.business_id)}
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-xs min-w-0">
                        <div className="text-foreground font-medium truncate" title={log.actor_email || "System Service"}>
                          {log.actor_email || "System Service"}
                        </div>
                        {log.actor_user_id && (
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5" title={log.actor_user_id}>
                            {formatShortId(log.actor_user_id)}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono font-bold text-foreground border border-border">
                          {log.new_status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-muted-foreground truncate max-w-xs">{log.notes || "-"}</td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Lihat Metadata Sanitized"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. RESPONSIVE STRUCTURED EVENT CARDS FOR MOBILE (< 768px)
      ────────────────────────────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="p-6 rounded-2xl bg-card border border-border text-center text-xs text-muted-foreground">
            Tidak ada catatan audit yang cocok.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const bizName = businessMap[log.business_id] || "Bisnis";

            return (
              <div
                key={log.id}
                className="p-4 rounded-2xl bg-card border border-border shadow-2xs space-y-2.5 min-w-0"
              >
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <span className="font-mono font-bold text-xs text-foreground block truncate">{log.action}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{formatDate(log.created_at)}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono font-bold text-foreground border border-border shrink-0">
                    {log.new_status}
                  </span>
                </div>

                <div className="text-xs space-y-1 py-1.5 border-y border-border/60">
                  <div className="flex justify-between gap-2 min-w-0">
                    <span className="text-[11px] text-muted-foreground shrink-0">Bisnis:</span>
                    <span className="font-semibold text-foreground truncate text-right">{bizName}</span>
                  </div>
                  <div className="flex justify-between gap-2 min-w-0">
                    <span className="text-[11px] text-muted-foreground shrink-0">Pelaku:</span>
                    <span className="text-muted-foreground font-mono text-[11px] truncate text-right">
                      {log.actor_email || "System"}
                    </span>
                  </div>
                  {log.notes && (
                    <div className="pt-1 min-w-0">
                      <span className="text-[11px] text-muted-foreground block">Catatan:</span>
                      <p className="text-[11px] text-foreground italic break-words">{log.notes}</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSelectedLog(log)}
                  className="w-full py-1.5 rounded-xl bg-muted/60 hover:bg-muted text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-border"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Lihat Detail Metadata</span>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. METADATA DETAIL MODAL
      ────────────────────────────────────────────────────────────── */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <ScrollText className="w-4 h-4 text-primary shrink-0" />
                <h3 className="text-sm font-bold text-foreground font-mono truncate">{selectedLog.action}</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-2 border-b border-border pb-1.5 min-w-0">
                <span className="text-muted-foreground shrink-0">ID Log Audit:</span>
                <span className="font-mono text-foreground break-all text-right">{selectedLog.id}</span>
              </div>
              <div className="flex justify-between gap-2 border-b border-border pb-1.5 min-w-0">
                <span className="text-muted-foreground shrink-0">Waktu Eksekusi:</span>
                <span className="text-foreground text-right">{formatDate(selectedLog.created_at)}</span>
              </div>
              <div className="flex justify-between gap-2 border-b border-border pb-1.5 min-w-0">
                <span className="text-muted-foreground shrink-0">Pelaku (Actor):</span>
                <span className="text-foreground truncate text-right">
                  {selectedLog.actor_email || selectedLog.actor_user_id || "System"}
                </span>
              </div>
              <div className="flex justify-between gap-2 border-b border-border pb-1.5 min-w-0">
                <span className="text-muted-foreground shrink-0">Status Sebelum:</span>
                <span className="font-mono text-muted-foreground">{selectedLog.previous_status || "N/A"}</span>
              </div>
              <div className="flex justify-between gap-2 border-b border-border pb-1.5 min-w-0">
                <span className="text-muted-foreground shrink-0">Status Sesudah:</span>
                <span className="font-mono text-emerald-500 font-bold">{selectedLog.new_status}</span>
              </div>
              <div className="flex justify-between gap-2 border-b border-border pb-1.5 min-w-0">
                <span className="text-muted-foreground shrink-0">Catatan:</span>
                <span className="text-foreground break-words text-right">{selectedLog.notes || "-"}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground mb-1.5">Metadata (Sanitized / Zero Secrets):</p>
              <pre className="p-3 rounded-xl bg-muted/40 border border-border text-[11px] font-mono text-foreground overflow-x-auto max-h-48 leading-relaxed">
                {JSON.stringify(selectedLog.metadata || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition-colors border border-border"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
