import { Zap, ShieldCheck, Smartphone, RefreshCw } from "lucide-react";

export function OperationalRail() {
  const metrics = [
    {
      icon: Zap,
      stat: "< 1.2 dtk",
      label: "Latensi Parsing",
      desc: "Dari pesan terkirim di Telegram hingga terdata di buku kas.",
    },
    {
      icon: ShieldCheck,
      stat: "100% ACID",
      label: "Keandalan Ledger",
      desc: "Double-entry PostgreSQL berstandar perbankan, anti-selisih.",
    },
    {
      icon: Smartphone,
      stat: "0 Hardware",
      label: "Tanpa Mesin POS",
      desc: "Tidak wajib beli tablet kasir atau printer thermal baru.",
    },
    {
      icon: RefreshCw,
      stat: "Realtime",
      label: "Google Sheets Cermin",
      desc: "Tiap penjualan otomatis tercatat di baris spreadsheet Anda.",
    },
  ];

  return (
    <section className="border-b border-border bg-surface/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {metrics.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div
                key={idx}
                className="py-6 px-4 sm:px-6 flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center gap-2 text-muted">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-xs font-mono font-medium uppercase tracking-wider">
                    {m.label}
                  </span>
                </div>

                <div>
                  <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums font-sans">
                    {m.stat}
                  </div>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    {m.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
