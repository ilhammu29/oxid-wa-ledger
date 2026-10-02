import { Users, WifiOff, Scale, ShieldCheck } from "lucide-react";
import { Reveal } from "./reveal";

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
      desc: "Bekerja lancar di ponsel standar dan stabil di jaringan seluler pasar tradisional tanpa harus mengunduh aplikasi POS berukuran besar.",
    },
    {
      icon: Scale,
      title: "Rekonsiliasi Fisik Kas",
      desc: "Hitung uang tunai di laci kasir dan bandingkan dengan mutasi bot saat tutup kasir untuk mencegah selisih uang yang merugikan.",
    },
    {
      icon: ShieldCheck,
      title: "Data Terisolasi & Terlindungi",
      desc: "Riwayat transaksi tersimpan permanen dan terlindungi enkripsi. Hanya pemilik terdaftar yang memiliki otoritas penuh atas pembukuan.",
    },
  ];

  return (
    <section className="py-16 sm:py-24 border-t border-border/80 bg-surface/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <Reveal delay={0} y={12} duration={500}>
            <div className="text-xs font-mono font-semibold uppercase tracking-wider text-primary mb-3">
              KEANDALAN OPERASIONAL
            </div>
          </Reveal>
          <Reveal delay={80} y={16} duration={550}>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Dibuat untuk kebutuhan nyata pedagang di lapangan.
            </h3>
          </Reveal>
          <Reveal delay={160} y={16} duration={550}>
            <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">
              Menghilangkan beban teknis sehingga Anda bisa fokus melayani pembeli.
            </p>
          </Reveal>
        </div>

        {/* 4-Column Refined Editorial Grid with subtle stagger */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {capabilities.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Reveal key={idx} delay={idx * 70} y={16} duration={500}>
                <div className="p-6 rounded-xl border border-border/70 bg-surface/60 hover:bg-surface hover:border-border transition-all space-y-3.5 h-full">
                  <Icon className="w-5 h-5 text-primary shrink-0" />
                  <h4 className="font-semibold text-base text-foreground tracking-tight">
                    {item.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
