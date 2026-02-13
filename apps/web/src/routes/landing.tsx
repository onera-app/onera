import {
  Header,
  Hero,
  FeaturesSection,
  HowItWorks,
  FAQSection,
  PricingSection,
  Footer,
} from "@/components/landing";

export function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f2f2f0] text-[#262525] selection:bg-[#262525] selection:text-[#f2f2f0]">
      <Header />
      <Hero />
      <FeaturesSection />
      <HowItWorks />
      <FAQSection />
      <PricingSection />
      <Footer />
    </main>
  );
}
