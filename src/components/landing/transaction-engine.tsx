import {
  MessageSquare,
  Cpu,
  Layers,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export function TransactionEngine() {
  const steps = [
    {
      num: "01",
      icon: MessageSquare,
      title: "Ketik Pesan Kasir",
      sub: "Bebas atau semi-terstruktur",
      desc: "Kasir cukup mengirim pesan via grup Telegram toko dari smartphone mereka. Tidak butuh instalasi aplikasi baru atau input manual yang rumit.",
      example: '"Lele 4kg @27rb tunai"',
      badge: "Telegram Webhook",
    },
    {
      num: "02",
      icon: Cpu,
      title: "Ekstraksi Deterministik",
      sub: "Validasi entitas < 400ms",
      desc: "Parser mencocokkan nama produk ke katalog aktif, memverifikasi harga satuan, membedakan tunai vs transfer, dan menghitung total harga secara akurat.",
      example: "Produk: Lele | Qty: 4 kg | Total: Rp108.000",
      badge: "62+ Regex Rules",
    },
    {
      num: "03",
      icon: Layers,
      title: "Posting Jurnal & Stok",
      sub: "Prinsip akuntansi ganda",
      desc: "Sistem mendebit kas toko, mengkredit pendapatan penjualan, serta mengurangi stok fisik produk secara otomatis dalam transaksi ACID database.",
      example: "Debit Kas 101 / Kredit Penjualan 401",
      badge: "PostgreSQL ACID",
    },
    {
      num: "04",
      icon: FileSpreadsheet,
      title: "Cermin Sheets & Rekap",
      sub: "Sinkronisasi realtime",
      desc: "Setiap transaksi otomatis tercatat ke baris Google Sheets Anda. Di akhir shift, kasir dan pemilik menerima notifikasi rekap kas via Telegram.",
      example: "Sheet 'Penjualan' row #185 synced",
      badge: "Google Sheets Sync",
    },
  ];

  return (
    <section id="alur-transaksi" className="py-16 sm:py-24 border-b border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="px-2.5 py-0.5 rounded-md border border-border bg-surface text-[11px] font-mono font-medium text-foreground tracking-wide">
              ALUR KERJA OPERASIONAL
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground font-sans">
            Bagaimana pesan kasir bertransformasi menjadi pembukuan resmi.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">
            Tidak ada sihir gelap atau AI yang menebak-nebak angka uang Anda. OXID
            Ledger menggunakan alur deterministic yang menjamin presisi matematis
            dan kepatuhan pembukuan.
          </p>
        </div>

        {/* 4-Step Ruled Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x divide-border border-y border-border">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="py-8 px-0 sm:px-6 lg:px-6 flex flex-col justify-between space-y-6"
              >
                {/* Step Header */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-mono font-bold text-muted/40">
                      {step.num}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono border border-border bg-surface text-muted">
                      {step.badge}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-foreground font-bold text-base sm:text-lg tracking-tight">
                      <Icon className="w-4 h-4 text-primary" />
                      <span>{step.title}</span>
                    </div>
                    <div className="text-xs font-mono text-muted">
                      {step.sub}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                {/* Step Snippet Display */}
                <div className="rounded-lg border border-border bg-surface p-3 space-y-1.5">
                  <div className="text-[10px] font-mono text-muted uppercase flex items-center justify-between">
                    <span>Output Tahap {step.num}</span>
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  </div>
                  <div className="text-xs font-mono text-foreground font-medium truncate">
                    {step.example}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Technical Assurance */}
        <div className="mt-8 p-4 rounded-xl border border-border bg-surface/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-muted">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-mono text-foreground font-medium">
              Zero Hallucination:
            </span>
            <span>Semua format dicek aturan deterministik sebelum tersimpan ke database.</span>
          </div>
          <a
            href="#konsol-produk"
            className="inline-flex items-center gap-1.5 text-primary hover:text-primary-hover font-medium font-mono text-xs cursor-pointer"
          >
            <span>Buka Tinjauan Konsol</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
