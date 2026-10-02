import {
  Users,
  WifiOff,
  FileSpreadsheet,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export function LedgerCapabilities() {
  const capabilities = [
    {
      num: "01",
      icon: Users,
      badge: "Multi-Operator",
      title: "Kontrol Banyak Kasir Tanpa Berbagi Password Akun",
      desc: "Setiap kasir atau pelayan mencatat dari akun Telegram masing-masing di grup operasional toko. Sistem otomatis merekam nama kasir pada setiap nota penjualan, mencegah saling lempar tanggung jawab saat ada selisih uang kas.",
      points: [
        "Masing-masing kasir teridentifikasi otomatis dari ID Telegram",
        "Pemilik bisnis memegang kendali penuh atas hak akses admin",
        "Riwayat audit transaksi mencatat persis siapa yang input dan jam berapa",
      ],
      mockup: {
        label: "Identifikasi Operator",
        lines: [
          { who: "Budi (Kasir Shift Pagi)", act: "Input Penjualan Rp140.000", time: "08:42" },
          { who: "Siti (Admin Toko)", act: "Validasi Beban Operasional Rp60.000", time: "09:15" },
          { who: "Ahmad (Kasir Shift Siang)", act: "Input Transfer BCA Rp280.000", time: "13:00" },
        ],
      },
    },
    {
      num: "02",
      icon: WifiOff,
      badge: "Infrastruktur Ringan",
      title: "Tahan Jaringan Lemah di Pasar Tradisional & Tanpa Aplikasi Berat",
      desc: "Aplikasi POS konvensional sering lambat, butuh update ukuran ratusan megabyte, dan mogok saat sinyal drop. Telegram beroperasi lancar bahkan di jaringan seluler lemah pedesaan atau pasar basah.",
      points: [
        "Tidak perlu install aplikasi kasir baru yang menghabiskan memori ponsel",
        "Bekerja di ponsel Android murah sekalipun tanpa kendala spesifikasi",
        "Pesan yang tertunda akibat sinyal langsung diproses otomatis saat kembali online",
      ],
      mockup: {
        label: "Konsumsi Sumber Daya",
        lines: [
          { who: "Ponsel Kasir", act: "Aplikasi Telegram Standar (0 MB Tambahan)", time: "Ringan" },
          { who: "Koneksi Jaringan", act: "Stabil pada 3G / 4G / Wi-Fi Pasar", time: "Efisien" },
          { who: "Waktu Muat", act: "Respon instan tanpa loading screen berat", time: "<1.2s" },
        ],
      },
    },
    {
      num: "03",
      icon: FileSpreadsheet,
      badge: "Google Sheets Sync",
      title: "Cermin Otomatis ke Google Sheets Tanpa Export Manual Tiap Malam",
      desc: "Hentikan kebiasaan merepotkan mengunduh file CSV atau mengetik ulang pembukuan setiap malam. Setiap mutasi yang diverifikasi bot seketika tertulis pada baris baru di spreadsheet Google Sheets Anda.",
      points: [
        "Bebas membuat rumus formula dan pivot table sendiri di Sheets",
        "Akuntan atau keluarga bisa memeriksa omzet tanpa harus login ke dashboard",
        "Arsip data permanen yang tetap menjadi milik Anda sepenuhnya",
      ],
      mockup: {
        label: "Live Google Sheets Stream",
        lines: [
          { who: "Baris #184", act: "TX-2904 | Lele Segar 5kg | Rp140.000 | Tunai", time: "Synced" },
          { who: "Baris #185", act: "TX-2905 | Pakan Nila 2 sak | Rp300.000 | Kas", time: "Synced" },
          { who: "Baris #186", act: "TX-2906 | Nila Segar 12kg | Rp420.000 | BCA", time: "Synced" },
        ],
      },
    },
    {
      num: "04",
      icon: ShieldCheck,
      badge: "Audit & Keamanan",
      title: "Audit Trail Lengkap dan Deteksi Transaksi Janggal",
      desc: "Keamanan operasional UMKM tidak boleh ditawar. Tidak ada penjualan yang bisa dihapus sembarangan tanpa jejak. Sistem membukukan setiap pembatalan atau koreksi sebagai jurnal pembalik resmi.",
      points: [
        "Tidak ada transaksi 'hilang' diam-diam di tengah pergantian shift",
        "Notifikasi seketika kepada pemilik jika ada nilai penjualan tidak lazim",
        "Rekonsiliasi kas fisik otomatis membandingkan uang laci vs catatan",
      ],
      mockup: {
        label: "Integritas Pembukuan",
        lines: [
          { who: "Jurnal Pembalik", act: "Void TX-2890 membutuhkan otorisasi admin", time: "Aman" },
          { who: "Audit Log", act: "Tidak ada baris yang bisa dihapus manual", time: "ACID" },
          { who: "Tutup Kasir", act: "Selisih fisik kas langsung terhitung akurat", time: "0 Selisih" },
        ],
      },
    },
  ];

  return (
    <section id="kemampuan" className="py-16 sm:py-24 border-b border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="px-2.5 py-0.5 rounded-md border border-border bg-surface text-[11px] font-mono font-medium text-foreground tracking-wide">
              KAPABILITAS OPERASIONAL
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground font-sans">
            Menjawab masalah nyata di lapangan, bukan sekadar janji fitur.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">
            Didesain khusus untuk ritel, warung makan, peternak, dan distributor
            yang menginginkan kerapian pembukuan tanpa mempersulit kasir di garis depan.
          </p>
        </div>

        {/* Ruled Ledger Capability Rows */}
        <div className="border-t border-border divide-y divide-border">
          {capabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.num}
                className="py-10 sm:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                {/* Left Column: Number & Description (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-muted/60">
                      {cap.num}
                    </span>
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-mono border border-border bg-surface text-foreground font-medium">
                      {cap.badge}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
                    {cap.title}
                  </h3>

                  <p className="text-sm text-muted leading-relaxed">
                    {cap.desc}
                  </p>

                  <div className="pt-2 space-y-2">
                    {cap.points.map((pt, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column: Ruled Operational Snippet (5 cols) */}
                <div className="lg:col-span-5">
                  <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-primary" />
                        <span className="text-xs font-mono font-medium text-foreground">
                          {cap.mockup.label}
                        </span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      {cap.mockup.lines.map((line, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg border border-border/80 bg-background/50 flex items-center justify-between gap-2"
                        >
                          <div className="truncate">
                            <span className="text-[10px] text-muted block uppercase">
                              {line.who}
                            </span>
                            <span className="text-foreground text-xs font-medium">
                              {line.act}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted shrink-0">
                            {line.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
