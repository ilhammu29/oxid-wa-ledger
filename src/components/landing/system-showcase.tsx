import {
  MessageSquare,
  Cpu,
  Database,
  LayoutDashboard,
  FileSpreadsheet,
} from "lucide-react";

export function SystemShowcase() {
  const pipeline = [
    {
      step: "01",
      icon: MessageSquare,
      title: "Input Chat Kasir",
      desc: "Kasir kirim teks via Telegram",
      badge: "Telegram API",
    },
    {
      step: "02",
      icon: Cpu,
      title: "Parser Deterministik",
      desc: "Ekstraksi qty, produk, harga",
      badge: "< 50ms engine",
    },
    {
      step: "03",
      icon: Database,
      title: "PostgreSQL Ledger",
      desc: "Tercatat di database ACID",
      badge: "Row-Level Security",
    },
    {
      step: "04",
      icon: LayoutDashboard,
      title: "Dashboard Web",
      desc: "Update metrik & grafik live",
      badge: "Real-time console",
    },
    {
      step: "05",
      icon: FileSpreadsheet,
      title: "Cermin Sheets",
      desc: "Baris baru tertulis rapi",
      badge: "Google API 1-Arah",
    },
  ];

  return (
    <section id="alur" className="py-20 sm:py-28 bg-surface border-b border-border relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-primary/10 text-primary border border-primary/20 mb-3">
            <span>Aliran Data Sistem</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            Satu alur terintegrasi. Bukan lima aplikasi terpisah.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">
            Data penjualan mengalir dari pesan chat di lapangan langsung ke
            database dan spreadsheet usaha tanpa jeda manual.
          </p>
        </div>

        {/* Pipeline Steps (Horizontal Desktop / Stacked Mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 lg:gap-4 relative mb-12">
          {pipeline.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="relative rounded-xl border border-border bg-background p-4 sm:p-5 flex flex-col justify-between hover:border-primary/50 transition-colors shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-primary">
                      {item.step}
                    </span>
                    <Icon className="h-4 w-4 text-muted" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground mb-1">
                    {item.title}
                  </h4>
                  <p className="text-xs text-muted leading-relaxed mb-3">
                    {item.desc}
                  </p>
                </div>
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-surface border border-border text-muted">
                    {item.badge}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Technical Guarantee Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 rounded-2xl border border-border bg-background/60 backdrop-blur-sm">
          <div className="space-y-1">
            <div className="text-xs font-mono text-muted">Latensi End-to-End</div>
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              &lt; 800ms
            </div>
            <div className="text-[11px] text-muted">
              Pesan terkirim hingga dibalas bot
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono text-muted">Presisi Aritmatika</div>
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              100% Akurat
            </div>
            <div className="text-[11px] text-muted">
              Tanpa galat pembulatan desimal float
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono text-muted">Keamanan Data</div>
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              PostgreSQL RLS
            </div>
            <div className="text-[11px] text-muted">
              Isolasi multi-tenant level perbankan
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono text-muted">Integritas Backup</div>
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              Mirror 1-Arah
            </div>
            <div className="text-[11px] text-muted">
              Google Sheets tidak menimpa DB
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
