import { UserPlus, Bot, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export function HowItWorks() {
  const steps = [
    {
      num: "01",
      icon: UserPlus,
      title: "Daftar Akun Toko",
      desc: "Buat akun bisnis Anda dalam 2 menit. Tanpa kartu kredit, langsung dapat uji coba 14 hari penuh.",
    },
    {
      num: "02",
      icon: Bot,
      title: "Hubungkan Bot Telegram",
      desc: "Tambahkan bot kasir ke grup Telegram operasional toko Anda dan masukkan kasir atau admin Anda.",
    },
    {
      num: "03",
      icon: CheckCircle,
      title: "Kasir Siap Mencatat",
      desc: "Kasir langsung mengetik penjualan di chat. Laporan otomatis tersaji di dashboard web dan Google Sheets.",
    },
  ];

  return (
    <section id="cara-kerja" className="py-20 sm:py-28 border-t border-border/80 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-primary mb-3">
            LANGKAH SEDERHANA
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Mulai dalam beberapa menit.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted leading-relaxed">
            Tidak butuh teknisi IT atau instalasi rumit. Siap dipakai hari ini juga.
          </p>
        </div>

        {/* 3 Step Sequence Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="p-7 rounded-xl border border-border/80 bg-surface/70 flex flex-col justify-between space-y-6 hover:border-border transition-all shadow-2xs"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-mono font-semibold text-primary">
                      {step.num}
                    </span>
                    <Icon className="w-5 h-5 text-muted" />
                  </div>

                  <h3 className="text-lg font-semibold text-foreground tracking-tight">
                    {step.title}
                  </h3>

                  <p className="text-sm text-muted leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="pt-2 text-xs font-mono text-muted/80">
                  Langkah {idx + 1} dari 3
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Bar below steps */}
        <div className="mt-12 text-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover transition-colors"
          >
            <span>Daftar Akun Toko Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
