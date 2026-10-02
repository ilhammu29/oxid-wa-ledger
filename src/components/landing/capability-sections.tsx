import {
  Bot,
  Layers,
  CalendarCheck,
  FileSpreadsheet,
  CheckCircle2,
  Zap,
} from "lucide-react";

export function CapabilitySections() {
  return (
    <section id="fitur" className="py-16 sm:py-24 border-b border-border bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-20 sm:space-y-28">
        {/* Capability 1: Chat-first Recording */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-primary/10 text-primary border border-primary/20">
              <Bot className="h-3.5 w-3.5" />
              <span>Input Secepat Chat</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Catat transaksi tanpa membuka form atau aplikasi berat.
            </h3>
            <p className="text-sm sm:text-base text-muted leading-relaxed">
              Kasir atau staf operasional cukup mengetik di Telegram sebagaimana
              mereka biasa berkirim pesan. Tidak perlu training berhari-hari,
              tidak ada lag tablet kasir di jam sibuk.
            </p>

            <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-muted">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Format teks natural mendukung satuan kg, gram, ekor, porsi,
                  atau pack.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Konfirmasi bot seketika (&lt; 1 detik) lengkap dengan detail
                  harga dan total.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Mendukung status pembayaran (lunas, transfer, tempo/hutang)
                  secara eksplisit.
                </span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-border text-xs">
                <span className="font-semibold text-foreground">
                  Simulasi Telegram Bot
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-mono text-[11px]">
                  Terverifikasi
                </span>
              </div>

              <div className="space-y-3 font-sans text-xs">
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-fg px-3.5 py-2 rounded-2xl rounded-tr-sm max-w-[85%] font-mono">
                    ayam 3 ekor 35rb transfer
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="bg-background border border-border p-3.5 rounded-2xl rounded-tl-sm max-w-[90%] space-y-2">
                    <div className="flex items-center gap-1.5 text-emerald-500 font-semibold text-xs">
                      <Zap className="h-3.5 w-3.5" />
                      <span>Tercatat: Rp 105.000</span>
                    </div>
                    <div className="space-y-1 text-muted text-[11px] font-mono border-t border-border pt-1.5">
                      <div>Item: Ayam Potong Broiler</div>
                      <div>Kuantitas: 3 ekor @ Rp 35.000</div>
                      <div>Metode: Transfer Bank</div>
                    </div>
                    <div className="text-[10px] text-muted font-mono flex items-center justify-between pt-1">
                      <span>ID: TRX-202610-0941</span>
                      <span className="text-emerald-500">PostgreSQL ACID</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Capability 2: Smart Aliasing & Product Catalog */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 lg:order-2 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-primary/10 text-primary border border-primary/20">
              <Layers className="h-3.5 w-3.5" />
              <span>Kamus Alias Fleksibel</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Bebas sebut nama produk tanpa harus menghafal kode kaku.
            </h3>
            <p className="text-sm sm:text-base text-muted leading-relaxed">
              Setiap operator atau kasir punya cara singkat sendiri dalam
              mengetik. Sistem alias OXID Ledger mencocokkan nama produk secara
              deterministik tanpa tebak-tebakan AI liar.
            </p>

            <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-muted">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Tambahkan alias sebanyak yang dibutuhkan untuk tiap varian
                  produk.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Harga jual default otomatis dipakai jika kasir tidak mengetik
                  angka harga.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Anti-duplikasi dan terisolasi secara ketat di dalam tenant
                  toko Anda.
                </span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-6 lg:order-1">
            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-border text-xs">
                <span className="font-semibold text-foreground">
                  Pemetaan Alias Produk
                </span>
                <span className="text-[11px] font-mono text-muted">
                  Resolusi Cepat
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 rounded-lg border border-border bg-background space-y-2">
                  <div className="flex items-center justify-between text-foreground font-bold">
                    <span>Produk Master: Ikan Gurame</span>
                    <span className="text-primary">Rp 45.000 / kg</span>
                  </div>
                  <div className="text-[11px] text-muted">Variasi ketikan kasir:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {["gurame", "gurami", "grm", "gurame-segar"].map((al) => (
                      <span
                        key={al}
                        className="px-2 py-0.5 rounded bg-surface border border-border text-foreground text-[11px]"
                      >
                        &quot;{al}&quot; &rarr; Match
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-background space-y-2">
                  <div className="flex items-center justify-between text-foreground font-bold">
                    <span>Produk Master: Nila Hitam</span>
                    <span className="text-primary">Rp 32.000 / kg</span>
                  </div>
                  <div className="text-[11px] text-muted">Variasi ketikan kasir:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {["nila", "nl-hitam", "nila-h"].map((al) => (
                      <span
                        key={al}
                        className="px-2 py-0.5 rounded bg-surface border border-border text-foreground text-[11px]"
                      >
                        &quot;{al}&quot; &rarr; Match
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Capability 3: Daily Operations & Day Closure */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-primary/10 text-primary border border-primary/20">
              <CalendarCheck className="h-3.5 w-3.5" />
              <span>Operasional & Tutup Buku</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Ketahui kondisi harian toko Anda secara transparan.
            </h3>
            <p className="text-sm sm:text-base text-muted leading-relaxed">
              Tidak ada lagi pertanyaan &quot;apakah hari ini toko buka atau libur?&quot;.
              OXID Ledger mencatat status harian dan mengirimkan notifikasi
              pengingat tutup buku saat jam operasional usai.
            </p>

            <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-muted">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Status harian terdefinisi jelas: Buka, Libur, atau Belum
                  Tercatat.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Pengingat otomatis di sore atau malam hari agar kasir tidak
                  lupa tutup buku.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Ringkasan omzet dan jumlah transaksi harian langsung di ponsel
                  pemilik.
                </span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-border text-xs">
                <span className="font-semibold text-foreground">
                  Status Harian & Tutup Buku
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-mono text-[11px]">
                  Buka & Aktif
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                  <div className="space-y-0.5">
                    <div className="text-[11px] text-muted">Hari Ini</div>
                    <div className="font-bold text-foreground">
                      24 Transaksi Terbukukan
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-muted">Total Omzet</div>
                    <div className="font-bold text-emerald-500">Rp 3.840.000</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-background space-y-2">
                  <div className="text-[11px] text-muted">
                    Jadwal Pengingat Tutup Buku:
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-foreground">Pukul 21:00 WIB</span>
                    <span className="text-emerald-500 font-semibold">
                      Otomatis ke Telegram Pemilik
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Capability 4: One-way Google Sheets Mirror */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 lg:order-2 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-primary/10 text-primary border border-primary/20">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Cermin Google Sheets 1-Arah</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Kemudahan spreadsheet tanpa risiko rumus tertimpa atau data rusak.
            </h3>
            <p className="text-sm sm:text-base text-muted leading-relaxed">
              Google Sheets sering rusak jika dijadikan database utama yang
              diedit banyak orang. Di OXID Ledger, Google Sheets berfungsi
              sebagai cermin pelaporan satu arah yang otomatis terisi rapi.
            </p>

            <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-muted">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Setiap transaksi dicerminkan instan ke spreadsheet pribadi
                  Anda.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Bebas buat pivot table, rumus vlookup, atau integrasi Looker
                  Studio.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Jika spreadsheet terhapus tidak sengaja, data ledger tetap 100%
                  aman di database.
                </span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-6 lg:order-1">
            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-border text-xs">
                <span className="font-semibold text-foreground">
                  Google Sheets Mirror Engine
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-mono text-[11px]">
                  Sync Real-Time
                </span>
              </div>

              <div className="space-y-2.5 font-mono text-[11px]">
                <div className="p-2.5 rounded bg-background border border-border flex items-center justify-between">
                  <span className="text-muted">Target Sheet:</span>
                  <span className="font-semibold text-foreground">
                    &quot;Laporan_Penjualan_2026&quot;
                  </span>
                </div>
                <div className="p-2.5 rounded bg-background border border-border flex items-center justify-between">
                  <span className="text-muted">Status Baris Terakhir:</span>
                  <span className="text-emerald-500 font-bold">
                    Baris 1.428 (Baru saja)
                  </span>
                </div>
                <div className="p-2.5 rounded bg-background border border-border flex items-center justify-between">
                  <span className="text-muted">Arah Aliran Data:</span>
                  <span className="text-foreground">
                    PostgreSQL &rarr; Google Sheets (1-Arah)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
