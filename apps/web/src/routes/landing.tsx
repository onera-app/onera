import {
  Header,
  Hero,
  HowItWorks,
  FeaturesSection,
  PricingSection,
  FAQSection,
  Footer,
  ComparisonSection,
  UseCasesSection,
  TestimonialsSection,
  ComplianceSection,
} from "@/components/landing";

export function LandingPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-background selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-neutral-900">
      <Header />
      <Hero />
      <FeaturesSection />
      <ComparisonSection />
      <UseCasesSection />
      <HowItWorks />
      <TestimonialsSection />
      <ComplianceSection />
      <PricingSection />
      <FAQSection />
      <Footer />
    </main>
  );
}
