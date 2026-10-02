import {
  MessageSquare,
  LayoutDashboard,
  Package,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

export function FeatureShowcases() {
  return (
    <section id="fitur" className="py-20 sm:py-28 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24 sm:space-y-32">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-primary mb-3">
            01 — 04 · KEMAMPUAN UTAMA
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Didesain untuk operasional harian yang cepat.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted leading-relaxed">
            Semua yang Anda butuhkan untuk mencatat penjualan, menjaga stok,
            dan melihat keuntungan bersih tanpa membebani kasir.
          </p>
        </div>

        {/* FEATURE 01: Catat lewat chat (Text Left, Visual Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Text Left (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
              <MessageSquare className="w-4 h-4" />
              <span>01 · Telegram Kasir</span>
            </div>

            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              Catat penjualan secepat mengirim pesan chat.
            </h3>

            <p className="text-sm sm:text-base text-muted leading-relaxed">
              Kasir cukup mengirim pesan seperti biasa di grup Telegram toko Anda.
              Tidak ada tombol rumit, tidak perlu belajar menu aplikasi baru,
              dan menghemat waktu antrean pelanggan.
            </p>

            <div className="pt-2 space-y-3">
              <div className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Kasir mengetik bebas: &quot;Lele 5kg @28rb tunai&quot; langsung terbaca</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Bot otomatis mengonfirmasi nota dan total harga seketika</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Multi-kasir teridentifikasi otomatis dari akun Telegram masing-masing</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover transition-colors"
              >
                <span>Coba Catat Transaksi</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Visual Right (7 cols): Telegram Chat Mockup */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-7 shadow-xl space-y-4 max-w-xl mx-auto lg:max-w-none">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center shrink-0 shadow-2xs">
                    <BrandLogo size="sm" container="none" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground">
                      Grup Kasir Toko Sejahtera
                    </div>
                    <div className="text-xs text-muted">
                      3 anggota · Bot Aktif
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Online
                </span>
              </div>

              {/* Chat Thread */}
              <div className="space-y-3.5 py-2">
                {/* Kasir Message */}
                <div className="flex items-start gap-2.5 max-w-[85%]">
                  <div className="w-7 h-7 rounded-full bg-border flex items-center justify-center text-[11px] font-bold text-muted shrink-0">
                    B
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-muted">Budi (Kasir 01) · 08:42</span>
                    <div className="p-3 rounded-2xl rounded-tl-xs bg-surface-hover border border-border text-sm text-foreground font-medium">
                      Kejual lele 5kg @28rb tunai
                    </div>
                  </div>
                </div>

                {/* Bot Response Message */}
                <div className="flex items-start gap-2.5 max-w-[90%] ml-auto flex-row-reverse">
                  <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    BOT
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[11px] font-medium text-muted">OXID Assistant · 08:42</span>
                    <div className="p-4 rounded-2xl rounded-tr-xs bg-primary/10 border border-primary/20 text-sm text-foreground text-left space-y-2">
                      <div className="flex items-center justify-between gap-4 font-bold text-foreground pb-2 border-b border-primary/20">
                        <span>Nota Penjualan #2904</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-extrabold tabular-nums">
                          Rp140.000
                        </span>
                      </div>
                      <div className="text-xs text-muted space-y-1">
                        <div className="flex justify-between">
                          <span>Produk:</span>
                          <span className="text-foreground font-medium">Ikan Lele Segar</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Kuantitas:</span>
                          <span className="text-foreground font-medium">5 kg x Rp28.000</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Metode:</span>
                          <span className="text-foreground font-medium">Tunai</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-primary/10 text-emerald-600 dark:text-emerald-400 font-medium">
                          <span>Sisa Stok:</span>
                          <span>140 kg (Berkurang 5 kg)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-center text-xs text-muted">
                Kasir cukup kirim pesan · Pembukuan langsung beres
              </div>
            </div>
          </div>
        </div>

        {/* FEATURE 02: Pantau dari satu dashboard (Visual Left, Text Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Visual Left (7 cols): Analytics & Cash Breakdown Mockup */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-7 shadow-xl space-y-5 max-w-xl mx-auto lg:max-w-none">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    Ringkasan Kas Masuk Hari Ini
                  </h4>
                  <span className="text-xs text-muted">Realtime dari semua transaksi kasir</span>
                </div>
                <span className="text-xs font-semibold text-primary">Live Update</span>
              </div>

              {/* 2 Big Split Cards: Tunai vs Transfer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border bg-background/60 space-y-1.5">
                  <div className="text-xs text-muted flex items-center justify-between">
                    <span>Kas Tunai di Toko</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-500 font-semibold">
                      Uang Fisik
                    </span>
                  </div>
                  <div className="text-2xl font-extrabold text-foreground tabular-nums">
                    Rp2.420.000
                  </div>
                  <div className="text-xs text-muted">24 nota kasir tunai</div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-background/60 space-y-1.5">
                  <div className="text-xs text-muted flex items-center justify-between">
                    <span>Transfer Rekening Bank</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-semibold">
                      BCA / Mandiri
                    </span>
                  </div>
                  <div className="text-2xl font-extrabold text-foreground tabular-nums">
                    Rp1.420.000
                  </div>
                  <div className="text-xs text-muted">6 nota transfer rekening</div>
                </div>
              </div>

              {/* Cash Reconciliation Status */}
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Uang kas fisik toko cocok dengan total transaksi bot kasir.</span>
                </div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                  0 Selisih
                </span>
              </div>
            </div>
          </div>

          {/* Text Right (5 cols) */}
          <div className="lg:col-span-5 space-y-5 order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
              <LayoutDashboard className="w-4 h-4" />
              <span>02 · Dashboard Terpadu</span>
            </div>

            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              Pantau omzet dan arus kas dari satu dashboard.
            </h3>

            <p className="text-sm sm:text-base text-muted leading-relaxed">
              Seluruh penjualan dari semua kasir dan cabang terkumpul realtime
              di konsol web. Cek total pemasukan tunai vs transfer perbankan
              dalam satu pandangan tanpa ribet hitung struk kertas.
            </p>

            <div className="pt-2 space-y-3">
              <div className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Pemisahan kas tunai vs transfer bank secara instan</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Grafik omzet harian yang mudah dibaca pemilik usaha</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Rekonsiliasi uang laci kasir otomatis saat tutup shift</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover transition-colors"
              >
                <span>Lihat Tinjauan Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* FEATURE 03: Produk dan harga tetap teratur (Text Left, Visual Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Text Left (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
              <Package className="w-4 h-4" />
              <span>03 · Katalog & Stok</span>
            </div>

            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              Katalog produk dan stok barang selalu sinkron.
            </h3>

            <p className="text-sm sm:text-base text-muted leading-relaxed">
              Kelola harga jual satuan dan monitor sisa persediaan barang tanpa
              pencatatan ganda. Bot otomatis mengenali nama barang, varian, dan
              memotong stok fisik seketika.
            </p>

            <div className="pt-2 space-y-3">
              <div className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Dukungan satuan fleksibel: kilogram, sak, ikat, porsi, ekor</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Peringatan dini saat persediaan barang menipis</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Ubah harga di web langsung aktif ke bot kasir tanpa delay</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover transition-colors"
              >
                <span>Kelola Produk Usaha</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Visual Right (7 cols): Catalog & Stock Table Mockup */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-7 shadow-xl space-y-4 max-w-xl mx-auto lg:max-w-none">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    Daftar Produk & Stok Aktif
                  </h4>
                  <span className="text-xs text-muted">Sinkron dengan kamus bot Telegram</span>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-surface-hover text-muted border border-border">
                  4 Produk Utama
                </span>
              </div>

              <div className="divide-y divide-border text-xs">
                {[
                  {
                    name: "Ikan Lele Segar",
                    sku: "LLE-01",
                    stock: "140 kg",
                    price: "Rp28.000 / kg",
                    status: "Tersedia",
                  },
                  {
                    name: "Ikan Nila Super",
                    sku: "NLA-02",
                    stock: "68 kg",
                    price: "Rp35.000 / kg",
                    status: "Tersedia",
                  },
                  {
                    name: "Pakan Nila Starter",
                    sku: "PKN-01",
                    stock: "14 sak",
                    price: "Rp150.000 / sak",
                    status: "Tersedia",
                  },
                  {
                    name: "Ikan Gurame Hidup",
                    sku: "GRM-03",
                    stock: "8 kg",
                    price: "Rp55.000 / kg",
                    status: "Menipis",
                  },
                ].map((item, i) => (
                  <div key={i} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-foreground text-sm">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-muted">
                        SKU: {item.sku} · Stok: {item.stock}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-foreground tabular-nums">
                        {item.price}
                      </div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.status === "Menipis"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FEATURE 04: Laporan tersimpan otomatis (Visual Left, Text Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Visual Left (7 cols): Google Sheets Preview Mockup */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-7 shadow-xl space-y-4 max-w-xl mx-auto lg:max-w-none">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                    GS
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">
                      Pembukuan_Toko_2026.xlsx
                    </h4>
                    <span className="text-xs text-muted">Google Sheets Mirror</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Auto-Sync Aktif
                </span>
              </div>

              {/* Table Preview */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-border text-[11px] font-semibold text-muted bg-surface-hover/50">
                      <th className="p-2">Waktu</th>
                      <th className="p-2">No. Nota</th>
                      <th className="p-2">Produk</th>
                      <th className="p-2 text-right">Nominal</th>
                      <th className="p-2 text-center">Metode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      { time: "08:42", id: "TX-2904", item: "Lele Segar 5kg", val: "Rp140.000", met: "Tunai" },
                      { time: "08:35", id: "TX-2903", item: "Pakan Nila 2 sak", val: "Rp300.000", met: "Tunai" },
                      { time: "08:12", id: "TX-2902", item: "Nila Segar 12kg", val: "Rp420.000", met: "Transfer" },
                      { time: "07:55", id: "TX-2901", item: "Gurame 3kg", val: "Rp165.000", met: "Tunai" },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-surface-hover/40 transition-colors">
                        <td className="p-2 text-muted">{row.time}</td>
                        <td className="p-2 font-mono font-medium text-foreground">#{row.id}</td>
                        <td className="p-2 text-foreground">{row.item}</td>
                        <td className="p-2 text-right font-bold text-foreground tabular-nums">{row.val}</td>
                        <td className="p-2 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-surface-hover text-muted">
                            {row.met}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-2 text-xs text-muted flex items-center justify-between border-t border-border">
                <span>Tiap transaksi otomatis append baris baru</span>
                <span className="text-emerald-500 font-medium">Bebas buat rumus sendiri</span>
              </div>
            </div>
          </div>

          {/* Text Right (5 cols) */}
          <div className="lg:col-span-5 space-y-5 order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
              <FileSpreadsheet className="w-4 h-4" />
              <span>04 · Laporan & Cermin Data</span>
            </div>

            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              Laporan tersimpan otomatis di Google Sheets.
            </h3>

            <p className="text-sm sm:text-base text-muted leading-relaxed">
              Hentikan kebiasaan merepotkan mengunduh file CSV atau mengetik ulang
              pembukuan setiap malam. Setiap mutasi yang dicatat kasir otomatis
              tertulis di lembar kerja Google Sheets bisnis Anda.
            </p>

            <div className="pt-2 space-y-3">
              <div className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Bebas membuat rumus formula dan pivot table akuntansi sendiri</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Akuntan atau keluarga bisa pantau omzet tanpa harus login dashboard</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Arsip data permanen yang tetap menjadi milik Anda sepenuhnya</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover transition-colors"
              >
                <span>Mulai Cermin Google Sheets</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
