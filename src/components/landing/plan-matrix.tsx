import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { getAllPlans, formatIDR } from "@/modules/subscriptions/plans";
import { SubscriptionPlan } from "@/modules/subscriptions/types";

interface PlanMatrixProps {
  plans?: SubscriptionPlan[];
}

export function PlanMatrix({ plans }: PlanMatrixProps) {
  const planList = plans && plans.length > 0 ? plans : getAllPlans();

  return (
    <section id="harga" className="py-16 sm:py-24 border-b border-border bg-surface/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="px-2.5 py-0.5 rounded-md border border-border bg-surface text-[11px] font-mono font-medium text-foreground tracking-wide">
              PAKET & INVESTASI
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground font-sans">
            Transparan, terjangkau, dan tanpa ikatan kontrak rumit.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">
            Mulai dengan uji coba gratis 14 hari dengan fitur penuh. Naikkan paket
            kapan pun saat tim kasir dan volume cabang bisnis Anda bertambah.
          </p>
        </div>

        {/* 3-Column Ruled Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {planList.map((plan) => {
            const isPilot = plan.code === "pilot";
            const isPro = plan.code === "pro";

            return (
              <div
                key={plan.code}
                className={`rounded-xl border flex flex-col justify-between transition-colors bg-surface p-6 sm:p-7 ${
                  isPro
                    ? "border-primary shadow-xs ring-1 ring-primary/20"
                    : "border-border hover:border-border/90"
                }`}
              >
                {/* Header Information */}
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted">
                      {plan.name.split(" ")[0]} {plan.name.split(" ")[1] || ""}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono border border-border bg-background text-muted">
                      {plan.maxOperators} Operator Kasir
                    </span>
                  </div>

                  <p className="mt-4 text-xs text-muted leading-relaxed min-h-[36px]">
                    {plan.description}
                  </p>

                  {/* Price Tag */}
                  <div className="mt-5 pb-5 border-b border-border">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-sans tabular-nums">
                        {isPilot ? "Rp0" : formatIDR(plan.priceIdr)}
                      </span>
                      <span className="text-xs text-muted font-mono">
                        {isPilot ? "/ 14 hari" : "/ bulan"}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted font-mono mt-1 block">
                      {isPilot
                        ? "Uji coba tanpa bayar apapun"
                        : "Ditagih bulanan, batalkan kapan saja"}
                    </span>
                  </div>

                  {/* Features Checklist */}
                  <div className="mt-6 space-y-2.5">
                    <span className="text-[11px] font-mono text-muted uppercase tracking-wider block mb-2">
                      Fitur Termasuk:
                    </span>
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="mt-8 pt-6 border-t border-border">
                  <Link
                    href={`/signup?plan=${plan.code}`}
                    className={`w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      isPro
                        ? "bg-primary hover:bg-primary-hover text-primary-fg shadow-xs"
                        : "bg-surface-hover hover:bg-border text-foreground border border-border"
                    }`}
                  >
                    <span>
                      {isPilot
                        ? "Mulai Coba 14 Hari Gratis"
                        : `Pilih ${plan.name.split(" ")[0]} ${plan.name.split(" ")[1] || ""}`}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reassurance Footer */}
        <div className="mt-10 p-4 rounded-xl border border-border bg-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-muted">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Perlu bantuan migrasi data pembukuan lama atau integrasi banyak cabang?
            </span>
          </div>
          <Link
            href="/login"
            className="font-mono text-xs font-medium text-foreground hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <span>Hubungi Dukungan Teknis</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}
