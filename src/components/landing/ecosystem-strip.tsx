import { MessageSquare, FileSpreadsheet, LayoutDashboard, Smartphone } from "lucide-react";

export function EcosystemStrip() {
  const integrations = [
    {
      name: "Bot Telegram",
      desc: "Catat transaksi kasir via grup",
      icon: MessageSquare,
    },
    {
      name: "Dashboard Web",
      desc: "Pantau omzet & kontrol produk",
      icon: LayoutDashboard,
    },
    {
      name: "Google Sheets",
      desc: "Laporan otomatis realtime",
      icon: FileSpreadsheet,
    },
    {
      name: "Smartphone Kasir",
      desc: "Tanpa mesin kasir mahal",
      icon: Smartphone,
    },
  ];

  return (
    <section id="integrasi" className="py-10 border-y border-border/80 bg-surface/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Label */}
          <div className="text-center md:text-left shrink-0">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-primary block">
              Integrasi Bawaan
            </span>
            <span className="text-sm font-bold text-foreground">
              Terhubung langsung ke perangkat kerja harian Anda
            </span>
          </div>

          {/* Integration Items - Clean Editorial Layout without colored square boxes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full md:w-auto">
            {integrations.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-border/70 bg-surface/80 hover:border-border transition-colors shadow-2xs"
                >
                  <Icon className="w-4 h-4 text-zinc-400 shrink-0" />
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
