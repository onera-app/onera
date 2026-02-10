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
    <main className="min-h-screen bg-white dark:bg-[#0a0a0a] selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-neutral-900">
      <Header />
      <Hero />
      <FeaturesSection />
      <HowItWorks />
      <PricingSection />
      <FAQSection />
      <Footer />
    </main>
  );
}
