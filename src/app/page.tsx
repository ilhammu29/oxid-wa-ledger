import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAllPlans } from "@/modules/subscriptions/plans";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingHero } from "@/components/landing/landing-hero";
import { EcosystemStrip } from "@/components/landing/ecosystem-strip";
import { FeatureShowcases } from "@/components/landing/feature-showcases";
import { CapabilityGrid } from "@/components/landing/capability-grid";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PricingSection } from "@/components/landing/pricing-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FinalCta } from "@/components/landing/final-cta";
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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary overflow-x-clip">
      {/* 1. Navbar */}
      <LandingNavbar isAuthenticated={isAuthenticated} />

      {/* Main Sections */}
      <main className="flex-1 overflow-x-clip">
        {/* 2. Hero with Product Showcase & Atmospheric Glow */}
        <LandingHero isAuthenticated={isAuthenticated} />

        {/* 3. Ecosystem / Integrations Strip */}
        <EcosystemStrip />

        {/* 4. Large Alternating Feature Showcases */}
        <FeatureShowcases />

        {/* 5. Product Capability Grid */}
        <CapabilityGrid />

        {/* 6. How It Works (Getting Started in 2 Minutes) */}
        <HowItWorks />

        {/* 7. Dedicated Pricing Section */}
        <PricingSection plans={plans} />

        {/* 8. Integrated Editorial FAQ */}
        <FaqSection />

        {/* 9. Compelling Final Call-To-Action */}
        <FinalCta isAuthenticated={isAuthenticated} />
      </main>

      {/* 10. Compact Footer */}
      <LandingFooter />
    </div>
  );
}
