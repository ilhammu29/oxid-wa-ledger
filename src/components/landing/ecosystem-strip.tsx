import { MessageSquare, FileSpreadsheet, LayoutDashboard, Smartphone } from "lucide-react";

export function EcosystemStrip() {
  const integrations = [
    {
      name: "Telegram Bot",
      desc: "Catat transaksi via grup kasir",
      icon: MessageSquare,
    },
    {
      name: "Web Dashboard",
      desc: "Pantau omzet & kontrol produk",
      icon: LayoutDashboard,
    },
    {
      name: "Google Sheets",
      desc: "Cermin laporan otomatis realtime",
      icon: FileSpreadsheet,
    },
    {
      name: "Smartphone Kasir",
      desc: "Tanpa perlu beli mesin POS baru",
      icon: Smartphone,
    },
  ];

  return (
    <section id="integrasi" className="py-10 border-y border-border bg-surface/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Label */}
          <div className="text-center md:text-left shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted block">
              Ekosistem Operasional
            </span>
            <span className="text-sm font-bold text-foreground">
              Terhubung dengan alat kerja harian Anda
            </span>
          </div>

          {/* Integration Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full md:w-auto">
            {integrations.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-surface hover:border-border/90 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-xs text-foreground truncate">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-muted truncate">
                      {item.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
