"use client";

import { useState } from "react";
import { AdminAuditLogRow } from "@/modules/subscriptions/admin";
import { ScrollText, Search, Eye, X } from "lucide-react";

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
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.actor_email && log.actor_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.notes && log.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      bizName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.business_id.toLowerCase().includes(searchTerm.toLowerCase());

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
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari aksi, operator, atau bisnis..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none"
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

      {/* Audit Logs Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800 font-medium">
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
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-zinc-500">
                    Tidak ada catatan audit yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const bizName = businessMap[log.business_id] || "Bisnis";

                  return (
                    <tr key={log.id} className="hover:bg-zinc-800/30">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>

                      <td className="py-3.5 px-4 font-bold font-mono text-zinc-100">{log.action}</td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-200">{bizName}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{log.business_id}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-zinc-300 font-medium">{log.actor_email || "System Service"}</div>
                        {log.actor_user_id && (
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{log.actor_user_id}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-mono font-bold text-zinc-300">
                          {log.new_status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-zinc-400 truncate max-w-xs">{log.notes || "-"}</td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
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

      {/* Metadata Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-zinc-100 font-mono">{selectedLog.action}</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-zinc-800 pb-1.5">
                <span className="text-zinc-500">ID Log Audit:</span>
                <span className="font-mono text-zinc-300">{selectedLog.id}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-1.5">
                <span className="text-zinc-500">Waktu Eksekusi:</span>
                <span className="text-zinc-300">{formatDate(selectedLog.created_at)}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-1.5">
                <span className="text-zinc-500">Pelaku (Actor):</span>
                <span className="text-zinc-300">{selectedLog.actor_email || selectedLog.actor_user_id || "System"}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-1.5">
                <span className="text-zinc-500">Status Sebelum:</span>
                <span className="font-mono text-zinc-400">{selectedLog.previous_status || "N/A"}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-1.5">
                <span className="text-zinc-500">Status Sesudah:</span>
                <span className="font-mono text-emerald-400">{selectedLog.new_status}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-1.5">
                <span className="text-zinc-500">Catatan:</span>
                <span className="text-zinc-300">{selectedLog.notes || "-"}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-zinc-300 mb-1.5">Metadata (Sanitized / Zero Secrets):</p>
              <pre className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-48">
                {JSON.stringify(selectedLog.metadata || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
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
