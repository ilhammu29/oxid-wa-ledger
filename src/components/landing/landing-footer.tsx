import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="bg-background text-foreground border-t border-border py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 pb-12 border-b border-border">
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xs">
                OX
              </div>
              <span className="font-bold text-base tracking-tight text-foreground">
                OXID Ledger
              </span>
            </div>
            <p className="text-sm text-muted leading-relaxed max-w-sm">
              Sistem pencatatan penjualan cerdas untuk UMKM. Kasir mencatat lewat
              Telegram, pantau omzet dari dashboard, dan simpan laporan usaha secara otomatis.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border text-xs text-muted">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sistem Operasional Normal</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                Navigasi
              </div>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="#fitur" className="text-muted hover:text-foreground transition-colors">
                    Fitur Utama
                  </a>
                </li>
                <li>
                  <a href="#cara-kerja" className="text-muted hover:text-foreground transition-colors">
                    Cara Kerja
                  </a>
                </li>
                <li>
                  <a href="#integrasi" className="text-muted hover:text-foreground transition-colors">
                    Integrasi
                  </a>
                </li>
                <li>
                  <a href="#harga" className="text-muted hover:text-foreground transition-colors">
                    Pilihan Paket
                  </a>
                </li>
                <li>
                  <a href="#faq" className="text-muted hover:text-foreground transition-colors">
                    Pertanyaan Umum
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                Akses
              </div>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link href="/login" className="text-muted hover:text-foreground transition-colors">
                    Masuk Akun
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="text-muted hover:text-foreground transition-colors">
                    Mulai Uji Coba (14 Hari)
                  </Link>
                </li>
                <li>
                  <Link href="/onboarding" className="text-muted hover:text-foreground transition-colors">
                    Setup Toko
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="text-muted hover:text-foreground transition-colors">
                    Buka Dashboard
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                Keandalan
              </div>
              <ul className="space-y-2 text-xs text-muted">
                <li>Server Cloud Berkecepatan Tinggi</li>
                <li>Enkripsi Data Terisolasi</li>
                <li>Koneksi Webhook Telegram</li>
                <li>Otomasi Google Sheets</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div>
            &copy; {new Date().getFullYear()} OXID Ledger. Seluruh hak cipta dilindungi.
          </div>
          <div>
            Dirancang untuk efisiensi operasional pedagang & UMKM Indonesia.
          </div>
        </div>
      </div>
    </footer>
  );
}
