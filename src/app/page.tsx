import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAllPlans } from "@/modules/subscriptions/plans";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LedgerHero } from "@/components/landing/ledger-hero";
import { OperationalRail } from "@/components/landing/operational-rail";
import { TransactionEngine } from "@/components/landing/transaction-engine";
import { LedgerConsole } from "@/components/landing/ledger-console";
import { LedgerCapabilities } from "@/components/landing/ledger-capabilities";
import { PlanMatrix } from "@/components/landing/plan-matrix";
import { LedgerFaq } from "@/components/landing/ledger-faq";
import { LedgerClosingCta } from "@/components/landing/ledger-closing-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const plans = getAllPlans();
  const isAuthenticated = Boolean(user);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      {/* 1. Topbar Navigation */}
      <LandingNavbar isAuthenticated={isAuthenticated} />

      {/* Main Experience */}
      <main className="flex-1">
        {/* 2. Asymmetrical Ledger Hero with Transaction Transformation Rail */}
        <LedgerHero isAuthenticated={isAuthenticated} />

        {/* 3. Operational Metrics Rail */}
        <OperationalRail />

        {/* 4. The 4-Stage Transaction Engine */}
        <TransactionEngine />

        {/* 5. Realistic Interactive Product Console */}
        <LedgerConsole />

        {/* 6. Ruled Ledger Capabilities (No Card Spam) */}
        <LedgerCapabilities />

        {/* 7. Transparent Pricing Matrix */}
        <PlanMatrix plans={plans} />

        {/* 8. Operational FAQ Accordion */}
        <LedgerFaq />

        {/* 9. Compact Closing Call to Action */}
        <LedgerClosingCta isAuthenticated={isAuthenticated} />
      </main>

      {/* 10. Ruled Footer */}
      <LandingFooter />
    </div>
  );
}
