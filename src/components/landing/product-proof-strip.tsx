import { Bot, Database, FileSpreadsheet, ShieldCheck, Coins } from "lucide-react";

export function ProductProofStrip() {
  const proofs = [
    {
      icon: Bot,
      title: "Input via Telegram",
      subtitle: "Kasir catat secepat chat biasa",
    },
    {
      icon: Database,
      title: "PostgreSQL ACID",
      subtitle: "Database utama dengan riwayat audit",
    },
    {
      icon: FileSpreadsheet,
      title: "Cermin Google Sheets",
      subtitle: "Sinkron 1-arah otomatis & rapi",
    },
    {
      icon: ShieldCheck,
      title: "Isolasi Tenant RLS",
      subtitle: "Data aman terpisah antar bisnis",
    },
    {
      icon: Coins,
      title: "Presisi Rupiah",
      subtitle: "Bebas selisih pembulatan koma",
    },
  ];

  return (
    <div className="border-y border-border bg-surface/40 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <p className="text-center text-[11px] font-mono uppercase tracking-wider text-muted mb-4">
          Fondasi Arsitektur OXID Ledger
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
          {proofs.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-border/60 bg-surface/60 hover:bg-surface transition-colors"
              >
                <div className="h-8 w-8 shrink-0 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-muted truncate">
                    {item.subtitle}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
