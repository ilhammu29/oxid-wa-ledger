import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getPlatformSystemStatus } from "@/modules/subscriptions";
import { Database, Bot, FileSpreadsheet, Clock, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  const supabase = await createClient();
  const services = await getPlatformSystemStatus(supabase);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
            <CheckCircle2 className="w-3 h-3" />
            Healthy
          </span>
        );
      case "deferred":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase">
            Deferred
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
            <AlertCircle className="w-3 h-3" />
            Warning
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase">
            Unavailable
          </span>
        );
    }
  };

  const getServiceIcon = (id: string) => {
    switch (id) {
      case "database":
        return <Database className="w-5 h-5 text-emerald-400" />;
      case "telegram":
        return <Bot className="w-5 h-5 text-blue-400" />;
      case "whatsapp":
        return <ShieldCheck className="w-5 h-5 text-zinc-400" />;
      case "sheets":
        return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
      default:
        return <Clock className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            Status Operasional & Arsitektur Sistem
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Status real-time infrastruktur backend, worker cron, adapter kanal pesan, dan integritas database.
          </p>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {services.map((svc) => (
          <div
            key={svc.id}
            className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                    {getServiceIcon(svc.id)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-zinc-100">{svc.name}</h3>
                    <span className="text-[10px] text-zinc-500 uppercase font-mono">{svc.category}</span>
                  </div>
                </div>
                {getStatusBadge(svc.status)}
              </div>

              <p className="text-xs text-zinc-300 font-medium mb-1">{svc.statusText}</p>
              {svc.notes && (
                <p className="text-[11px] text-zinc-500 leading-relaxed bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-850">
                  {svc.notes}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-zinc-800/80 space-y-1 text-[11px] text-zinc-500 font-mono">
              <div className="flex justify-between">
                <span>Pengecekan:</span>
                <span className="text-zinc-400">
                  {svc.lastExecutionAt
                    ? new Date(svc.lastExecutionAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Kegagalan Baru:</span>
                <span className={svc.recentFailureCount > 0 ? "text-rose-400 font-bold" : "text-zinc-400"}>
                  {svc.recentFailureCount}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
