import { X, CheckCircle2, Sparkles } from "lucide-react";

export function WhyOxid() {
  const comparisons = [
    {
      title: "Aplikasi POS Tradisional",
      drawbacks: [
        "Wajib instal aplikasi berat di tablet atau HP kasir",
        "Form input rumit dengan banyak klik dan popup bertingkat",
        "Biaya langganan perangkat keras (hardware) mahal",
        "Staf lapangan sering malas membuka aplikasi kasir",
      ],
      isPositive: false,
    },
    {
      title: "Spreadsheet Kosongan Manual",
      drawbacks: [
        "Rumus dan formula rawan tertimpa atau terhapus tidak sengaja",
        "Sering konflik atau lag saat dibuka banyak kasir dari HP",
        "Tidak ada audit log siapa yang menambah atau mengubah baris",
        "Pembulatan harga dan pecahan desimal sering memicu selisih",
      ],
      isPositive: false,
    },
    {
      title: "OXID Ledger",
      benefits: [
        "Operator cukup chat di Telegram yang sudah terbiasa dipakai",
        "Parser deterministik cepat (< 50ms) tanpa salah hitung",
        "PostgreSQL ACID menjamin integritas riwayat transaksi",
        "Cermin Google Sheets 1-arah otomatis untuk kemudahan analisis",
      ],
      isPositive: true,
    },
  ];

  return (
    <section className="py-16 sm:py-24 border-b border-border bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="max-w-2xl mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-primary/10 text-primary border border-primary/20 mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Prinsip Produk</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            Kenapa memilih OXID Ledger?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">
            Menghilangkan gesekan pencatatan bagi staf di toko, sekaligus
            memberikan kepastian data finansial bagi pemilik usaha.
          </p>
        </div>

        {/* 3-Column Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {comparisons.map((col, idx) => {
            const isHighlight = col.isPositive;
            return (
              <div
                key={idx}
                className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all ${
                  isHighlight
                    ? "bg-surface border-2 border-primary shadow-md relative"
                    : "bg-surface/50 border border-border"
                }`}
              >
                {isHighlight && (
                  <span className="absolute -top-3 left-6 px-3 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-primary text-primary-fg shadow-sm">
                    Rekomendasi
                  </span>
                )}

                <div>
                  <h3
                    className={`text-base sm:text-lg font-bold mb-4 ${
                      isHighlight ? "text-foreground" : "text-muted"
                    }`}
                  >
                    {col.title}
                  </h3>

                  <ul className="space-y-3 text-xs sm:text-sm">
                    {col.isPositive
                      ? col.benefits?.map((item, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="text-foreground">{item}</span>
                          </li>
                        ))
                      : col.drawbacks?.map((item, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <X className="h-4 w-4 text-rose-500/70 shrink-0 mt-0.5" />
                            <span className="text-muted">{item}</span>
                          </li>
                        ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-border/80 text-[11px] font-mono text-muted">
                  {isHighlight
                    ? "Dirancang untuk efisiensi UMKM harian"
                    : "Sering menimbulkan kendala operasional"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
