import { UserPlus, Bot, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export function HowItWorks() {
  const steps = [
    {
      num: "1",
      icon: UserPlus,
      title: "Daftar Akun Toko",
      desc: "Buat akun bisnis Anda dalam 2 menit. Tanpa kartu kredit, langsung dapat uji coba 14 hari penuh.",
    },
    {
      num: "2",
      icon: Bot,
      title: "Hubungkan Bot Telegram",
      desc: "Tambahkan bot kasir ke grup Telegram operasional toko Anda dan masukkan kasir atau admin Anda.",
    },
    {
      num: "3",
      icon: CheckCircle,
      title: "Kasir Siap Mencatat",
      desc: "Kasir langsung mengetik penjualan di chat. Laporan otomatis tersaji di dashboard web dan Google Sheets.",
    },
  ];

  return (
    <section id="cara-kerja" className="py-20 sm:py-28 border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface text-xs font-medium text-foreground mb-4">
            <span>ALUR MUDAH</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            Mulai dalam beberapa menit.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted leading-relaxed">
            Tidak butuh teknisi IT atau instalasi rumit. Siap dipakai hari ini juga.
          </p>
        </div>

        {/* 3 Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="relative p-7 rounded-2xl border border-border bg-surface flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-3xl font-extrabold text-muted/30">
                      0{step.num}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-foreground">
                    {step.title}
                  </h3>

                  <p className="text-sm text-muted leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="pt-2 text-xs font-semibold text-primary flex items-center gap-1">
                  <span>Langkah {step.num}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Link */}
        <div className="mt-12 text-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <span>Daftarkan Toko Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
