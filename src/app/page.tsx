import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAllPlans } from "@/modules/subscriptions/plans";
import { EntryLoader } from "@/components/landing/entry-loader";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingHero } from "@/components/landing/landing-hero";
import { ProductConsole } from "@/components/landing/product-console";
import { ProductProofStrip } from "@/components/landing/product-proof-strip";
import { ProductTour } from "@/components/landing/product-tour";
import { CapabilitySections } from "@/components/landing/capability-sections";
import { SystemShowcase } from "@/components/landing/system-showcase";
import { WhyOxid } from "@/components/landing/why-oxid";
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      {/* Entry Loader (remembers visit in sessionStorage) */}
      <EntryLoader />

      {/* Top Sticky Navbar */}
      <LandingNavbar isAuthenticated={Boolean(user)} />

      {/* Main Experience */}
      <main className="flex-1">
        {/* 1. Hero Section */}
        <LandingHero isAuthenticated={Boolean(user)} />

        {/* 2. Realistic Product Console */}
        <ProductConsole />

        {/* 3. Architectural Proof Strip */}
        <ProductProofStrip />

        {/* 4. Interactive Step-by-Step Tour */}
        <ProductTour />

        {/* 5. Feature Capability Deep-Dives */}
        <CapabilitySections />

        {/* 6. High-Contrast System Showcase Pipeline */}
        <SystemShowcase />

        {/* 7. Product Principles (Why OXID) */}
        <WhyOxid />

        {/* 8. Authoritative Subscription Plans */}
        <PricingSection plans={plans} />

        {/* 9. Accessible FAQ Accordion */}
        <FaqSection />

        {/* 10. Closing Call to Action */}
        <FinalCta />
      </main>

      {/* Structured Footer */}
      <LandingFooter />
    </div>
  );
}
