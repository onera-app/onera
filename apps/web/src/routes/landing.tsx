import {
  Header,
  Hero,
  HowItWorks,
  PrivacySection,
  FeaturesSection,
  PricingSection,
  Footer,
} from "@/components/landing";

export function LandingPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950">
      <Header />
      <Hero />
      <div id="how-it-works">
        <HowItWorks />
      </div>
      <div id="security">
        <PrivacySection />
      </div>
      <FeaturesSection />
      <div id="pricing">
        <PricingSection />
      </div>
      <Footer />
    </main>
  );
}
