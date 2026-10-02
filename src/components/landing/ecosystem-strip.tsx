import { MessageSquare, FileSpreadsheet, LayoutDashboard, Smartphone } from "lucide-react";
import { Reveal } from "./reveal";

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
    <section
      id="integrasi"
      className="relative z-30 -mt-6 sm:-mt-10 lg:-mt-12 py-8 sm:py-10 border-y border-border/80 bg-background/95 backdrop-blur-md shadow-xs"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Label */}
          <Reveal delay={0} y={12} duration={500} className="text-center md:text-left shrink-0">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-primary block">
              Integrasi Bawaan
            </span>
            <span className="text-sm font-bold text-foreground">
              Terhubung langsung ke perangkat kerja harian Anda
            </span>
          </Reveal>

          {/* Integration Items - Clean Editorial Layout with subtle staggered reveal */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full md:w-auto">
            {integrations.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Reveal key={idx} delay={idx * 60} y={16} duration={500}>
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-border/70 bg-surface/80 hover:border-border transition-colors shadow-2xs">
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
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
