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
    <main className="min-h-screen bg-landing text-landing-foreground selection:bg-landing-foreground selection:text-landing">
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
