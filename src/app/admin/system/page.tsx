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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase">
            <CheckCircle2 className="w-3 h-3" />
            Healthy
          </span>
        );
      case "deferred":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border uppercase">
            Deferred
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase">
            <AlertCircle className="w-3 h-3" />
            Warning
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase">
            Unavailable
          </span>
        );
    }
  };

  const getServiceIcon = (id: string) => {
    switch (id) {
      case "database":
        return <Database className="w-4 h-4 text-emerald-500" />;
      case "telegram":
        return <Bot className="w-4 h-4 text-sky-500" />;
      case "whatsapp":
        return <ShieldCheck className="w-4 h-4 text-muted-foreground" />;
      case "sheets":
        return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
      default:
        return <Clock className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Status Operasional & Arsitektur Sistem
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Status real-time infrastruktur backend, worker cron, adapter kanal pesan, dan integritas database.
          </p>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((svc) => (
          <div
            key={svc.id}
            className="p-5 rounded-2xl bg-card border border-border shadow-2xs flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-muted/60 border border-border flex items-center justify-center shrink-0">
                    {getServiceIcon(svc.id)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{svc.name}</h3>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">{svc.category}</span>
                  </div>
                </div>
                {getStatusBadge(svc.status)}
              </div>

              <p className="text-xs text-foreground font-medium mb-1">{svc.statusText}</p>
              {svc.notes && (
                <p className="text-[11px] text-muted-foreground leading-relaxed bg-muted/40 p-2.5 rounded-xl border border-border/60">
                  {svc.notes}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-border/80 space-y-1 text-[11px] text-muted-foreground font-mono">
              <div className="flex justify-between">
                <span>Pengecekan:</span>
                <span className="text-foreground">
                  {svc.lastExecutionAt
                    ? new Date(svc.lastExecutionAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Kegagalan Baru:</span>
                <span className={svc.recentFailureCount > 0 ? "text-rose-500 font-bold" : "text-foreground"}>
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
