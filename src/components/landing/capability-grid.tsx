import { Users, WifiOff, Scale, ShieldCheck } from "lucide-react";

export function CapabilityGrid() {
  const capabilities = [
    {
      icon: Users,
      title: "Multi-Kasir Terkontrol",
      desc: "Setiap kasir mencatat dari akun Telegram masing-masing. Nama operator otomatis tertera pada tiap nota tanpa berbagi kata sandi utama toko.",
    },
    {
      icon: WifiOff,
      title: "Ringan & Tahan Sinyal Lemah",
      desc: "Bekerja lancar di ponsel murah sekalipun dan stabil di jaringan seluler pasar tradisional tanpa harus unduh aplikasi POS berukuran besar.",
    },
    {
      icon: Scale,
      title: "Rekonsiliasi Fisik Kas",
      desc: "Hitung uang tunai di laci kasir dan bandingkan dengan mutasi bot saat tutup kasir untuk mencegah selisih uang yang merugikan.",
    },
    {
      icon: ShieldCheck,
      title: "Data Terisolasi & Terlindungi",
      desc: "Riwayat transaksi tersimpan permanen dan tidak dapat diubah diam-diam. Hanya pemilik terdaftar yang memiliki otoritas penuh atas pembukuan.",
    },
  ];

  return (
    <section className="py-16 sm:py-24 border-t border-border bg-surface/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Keunggulan operasional tanpa kerumitan.
          </h3>
          <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">
            Dibuat untuk kebutuhan nyata pedagang dan pemilik toko di lapangan.
          </p>
        </div>

        {/* 4-Item Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {capabilities.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl border border-border bg-surface hover:border-border/90 hover:shadow-sm transition-all space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-base text-foreground">
                  {item.title}
                </h4>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
