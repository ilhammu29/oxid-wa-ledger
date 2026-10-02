import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="bg-background text-foreground border-t border-border py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 pb-12 border-b border-border">
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary text-primary-fg flex items-center justify-center font-bold text-xs">
                OX
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-foreground">
                  OXID Ledger
                </span>
                <span className="text-[10px] text-muted font-mono tracking-tight">
                  Buku Kas Operasional UMKM
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-sm">
              Sistem pencatatan penjualan chat-to-ledger untuk UMKM Indonesia. Kasir
              mencatat lewat Telegram, data tersimpan di basis data ACID PostgreSQL,
              dan otomatis tercermin ke Google Sheets.
            </p>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-surface border border-border text-[11px] font-mono text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Semua Layanan Berjalan Normal</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-muted">
                Navigasi
              </div>
              <ul className="space-y-2 text-xs">
                <li>
                  <a
                    href="#alur-transaksi"
                    className="text-muted hover:text-foreground transition-colors"
                  >
                    Alur Transaksi
                  </a>
                </li>
                <li>
                  <a
                    href="#konsol-produk"
                    className="text-muted hover:text-foreground transition-colors"
                  >
                    Konsol Operasional
                  </a>
                </li>
                <li>
                  <a
                    href="#kemampuan"
                    className="text-muted hover:text-foreground transition-colors"
                  >
                    Kapabilitas
                  </a>
                </li>
                <li>
                  <a
                    href="#harga"
                    className="text-muted hover:text-foreground transition-colors"
                  >
                    Paket Investasi
                  </a>
                </li>
                <li>
                  <a
                    href="#faq"
                    className="text-muted hover:text-foreground transition-colors"
                  >
                    Pertanyaan Umum
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-muted">
                Akses
              </div>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link
                    href="/login"
                    className="text-muted hover:text-foreground transition-colors"
                  >
                    Masuk Akun
                  </Link>
                </li>
                <li>
                  <Link
                    href="/signup"
                    className="text-muted hover:text-foreground transition-colors"
                  >
                    Mulai Uji Coba 14 Hari
                  </Link>
                </li>
                <li>
                  <Link
                    href="/onboarding"
                    className="text-muted hover:text-foreground transition-colors"
                  >
                    Setup Bisnis Baru
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard"
                    className="text-muted hover:text-foreground transition-colors"
                  >
                    Konsol Kasir
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-muted">
                Integritas Sistem
              </div>
              <ul className="space-y-2 text-xs font-mono text-[11px] text-muted">
                <li>PostgreSQL ACID</li>
                <li>Row-Level Security (RLS)</li>
                <li>Tabular Currency Format</li>
                <li>Google Sheets Mirror</li>
                <li>Telegram Bot Webhook</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div>
            &copy; {new Date().getFullYear()} OXID Ledger. Seluruh hak cipta
            dilindungi.
          </div>
          <div className="text-[11px] font-mono">
            Dirancang untuk efisiensi operasional pedagang & UMKM Indonesia.
          </div>
        </div>
      </div>
    </footer>
  );
}
