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
    <section id="harga" className="py-20 sm:py-28 border-t border-border bg-surface/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface text-xs font-medium text-foreground mb-4">
            <span>HARGA & PAKET</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            Pilihan paket sesuai skala usaha Anda.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted leading-relaxed">
            Semua pengguna baru mendapatkan masa uji coba 14 hari penuh. Tanpa
            kartu kredit, tanpa kewajiban kontrak jangka panjang.
          </p>
        </div>

        {/* 3-Column Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {planList.map((plan) => {
            const isPilot = plan.code === "pilot";
            const isPro = plan.code === "pro";

            return (
              <div
                key={plan.code}
                className={`rounded-2xl p-7 sm:p-8 flex flex-col justify-between transition-all bg-surface border ${
                  isPro
                    ? "border-primary shadow-lg ring-1 ring-primary/30 relative md:-translate-y-2"
                    : "border-border hover:border-border/90"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                      {plan.name.split(" ")[0]} {plan.name.split(" ")[1] || ""}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-border bg-background text-muted">
                      {plan.maxOperators} Kasir
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold text-foreground tabular-nums tracking-tight">
                        {isPilot ? "Rp0" : formatIDR(plan.priceIdr)}
                      </span>
                      <span className="text-xs text-muted">
                        {isPilot ? "/ 14 hari" : "/ bulan"}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-muted leading-relaxed min-h-[36px]">
                      {plan.description}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-border space-y-3">
                    <span className="text-xs font-semibold text-foreground block mb-2">
                      Fitur Termasuk:
                    </span>
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-foreground">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border">
                  <Link
                    href={`/signup?plan=${plan.code}`}
                    className={`w-full inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isPro
                        ? "bg-primary hover:bg-primary-hover text-white shadow-md shadow-primary/20 hover:scale-[1.02]"
                        : "bg-surface-hover hover:bg-border text-foreground border border-border"
                    }`}
                  >
                    <span>
                      {isPilot
                        ? "Mulai Coba 14 Hari Gratis"
                        : `Pilih Paket ${plan.name.split(" ")[0]} ${plan.name.split(" ")[1] || ""}`}
                    </span>
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
