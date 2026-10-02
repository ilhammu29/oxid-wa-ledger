import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { getAllPlans, formatIDR } from "@/modules/subscriptions/plans";
import { SubscriptionPlan } from "@/modules/subscriptions/types";

interface PricingSectionProps {
  plans?: SubscriptionPlan[];
}

export function PricingSection({ plans }: PricingSectionProps) {
  const planList = plans && plans.length > 0 ? plans : getAllPlans();

  return (
    <section id="harga" className="py-20 sm:py-28 border-t border-border/80 bg-surface/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-primary mb-3">
            PILIHAN INVESTASI USAHA
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Pilihan paket sesuai skala usaha Anda.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted leading-relaxed">
            Semua pengguna baru mendapatkan masa uji coba 14 hari penuh. Tanpa
            kartu kredit, tanpa kewajiban kontrak jangka panjang.
          </p>
        </div>

        {/* 3-Column Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch max-w-6xl mx-auto">
          {planList.map((plan) => {
            const isPilot = plan.code === "pilot";
            const isPro = plan.code === "pro";

            return (
              <div
                key={plan.code}
                className={`rounded-xl p-7 sm:p-8 flex flex-col justify-between transition-all bg-surface border ${
                  isPro
                    ? "border-primary/80 shadow-[0_0_32px_rgba(124,58,237,0.15)] ring-1 ring-primary/40 relative md:-translate-y-1.5"
                    : "border-border/80 hover:border-border"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                      {plan.name.split(" ")[0]} {plan.name.split(" ")[1] || ""}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono border border-border bg-background text-muted">
                      {plan.maxOperators} Kasir
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums tracking-tight">
                        {isPilot ? "Rp0" : formatIDR(plan.priceIdr)}
                      </span>
                      <span className="text-xs text-muted font-mono">
                        {isPilot ? "/ 14 hari" : "/ bulan"}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-2 leading-relaxed">
                      {plan.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border/80 space-y-3">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-muted font-semibold">
                      Fitur Termasuk:
                    </div>
                    <ul className="space-y-2.5 text-xs text-foreground">
                      {plan.features.map((feature, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-8">
                  <Link
                    href="/signup"
                    className={`w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg text-xs font-semibold transition-all ${
                      isPro
                        ? "bg-primary hover:bg-primary-hover text-white shadow-xs hover:scale-[1.02] active:scale-[0.98]"
                        : "border border-border bg-surface hover:bg-surface-hover text-foreground hover:border-primary/50"
                    }`}
                  >
                    <span>{isPilot ? "Mulai Uji Coba 14 Hari" : "Pilih Paket Ini"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
