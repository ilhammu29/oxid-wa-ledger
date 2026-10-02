import Link from "next/link";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { getAllPlans, formatIDR } from "@/modules/subscriptions/plans";
import { SubscriptionPlan } from "@/modules/subscriptions/types";
import { ScrollReveal } from "./scroll-reveal";

interface PricingSectionProps {
  plans?: SubscriptionPlan[];
}

export function PricingSection({ plans }: PricingSectionProps) {
  const planList = plans || getAllPlans();

  return (
    <section id="harga" className="py-16 sm:py-24 border-b border-border bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <ScrollReveal>
          <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-primary/10 text-primary border border-primary/20 mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Biaya Transparan</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              Pilihan paket sesuai skala usaha Anda.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">
              Semua pengguna baru mendapatkan masa uji coba 14 hari penuh. Tanpa
              kartu kredit, tanpa kewajiban kontrak jangka panjang.
            </p>
          </div>
        </ScrollReveal>

        {/* 3-Column Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {planList.map((plan, idx) => {
            const isPro = plan.code === "pro";
            const isPilot = plan.code === "pilot";

            return (
              <ScrollReveal key={plan.code} delayMs={idx * 100} className="h-full">
                <div
                  className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all h-full ${
                  isPro
                    ? "bg-surface border-2 border-primary shadow-lg relative md:-translate-y-2"
                    : "bg-surface/60 border border-border hover:border-border/90"
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-primary text-primary-fg shadow-sm">
                    Paling Populer
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted">
                      {plan.name}
                    </span>
                    {isPilot && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-500 font-medium">
                        14 Hari Gratis
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-bold text-foreground font-mono">
                        {isPilot ? "Rp 0" : formatIDR(plan.priceIdr)}
                      </span>
                      <span className="text-xs text-muted font-sans">
                        {isPilot ? "/ 14 hari" : "/ bulan"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted leading-relaxed">
                      {plan.description}
                    </p>
                  </div>

                  <div className="py-4 border-t border-border">
                    <div className="text-[11px] font-mono font-semibold text-muted mb-3 uppercase tracking-wider">
                      Termasuk Fitur:
                    </div>
                    <ul className="space-y-2.5 text-xs">
                      <li className="flex items-start gap-2.5 text-foreground">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>Maksimal {plan.maxOperators} staf operator</span>
                      </li>
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-foreground">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border">
                  <Link
                    href="/signup"
                    className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      isPro
                        ? "bg-primary text-primary-fg hover:opacity-95 shadow-sm"
                        : "bg-surface-hover hover:bg-border text-foreground border border-border"
                    }`}
                  >
                    <span>
                      {isPilot ? "Mulai Uji Coba Gratis" : "Pilih Paket Ini"}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          );
        })}
        </div>

        {/* Pricing Reassurance note */}
        <div className="mt-12 text-center text-xs text-muted max-w-xl mx-auto">
          Masa percobaan otomatis aktif saat pendaftaran pertama. Tidak ada tagihan
          otomatis yang terpotong tanpa persetujuan Anda. Pembayaran langganan
          dapat dilakukan melalui transfer bank atau QRIS.
        </div>
      </div>
    </section>
  );
}
