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
    <main className="min-h-screen bg-landing text-landing-foreground antialiased selection:bg-landing-foreground/10">
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
