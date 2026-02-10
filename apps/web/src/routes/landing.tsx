import {
  Header,
  Hero,
  HowItWorks,
  FeaturesSection,
  PricingSection,
  FAQSection,
  Footer,
} from "@/components/landing";

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden relative bg-white dark:bg-neutral-950">
      {/* Content */}
      <Header />
      <Hero />
      <div id="how-it-works">
        <HowItWorks />
      </div>
      <FeaturesSection />
      <div id="pricing">
        <PricingSection />
      </div>
      <div id="faq">
        <FAQSection />
      </div>
      <Footer />
    </main>
  );
}
