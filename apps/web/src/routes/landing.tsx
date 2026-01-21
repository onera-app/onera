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
    <main className="min-h-screen overflow-x-hidden relative">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 -z-50">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(64,64,64,0.08),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.08),rgba(0,0,0,0))]" />
        
        {/* Mesh gradient layer - neutral tones */}
        <div className="absolute inset-0 
          bg-[radial-gradient(at_40%_20%,rgba(120,120,120,0.06)_0px,transparent_50%),radial-gradient(at_80%_0%,rgba(100,100,100,0.05)_0px,transparent_50%),radial-gradient(at_0%_50%,rgba(140,140,140,0.05)_0px,transparent_50%),radial-gradient(at_80%_50%,rgba(110,110,110,0.04)_0px,transparent_50%),radial-gradient(at_0%_100%,rgba(130,130,130,0.04)_0px,transparent_50%),radial-gradient(at_80%_100%,rgba(90,90,90,0.03)_0px,transparent_50%)]
          dark:bg-[radial-gradient(at_40%_20%,rgba(255,255,255,0.08)_0px,transparent_50%),radial-gradient(at_80%_0%,rgba(255,255,255,0.06)_0px,transparent_50%),radial-gradient(at_0%_50%,rgba(255,255,255,0.06)_0px,transparent_50%),radial-gradient(at_80%_50%,rgba(255,255,255,0.05)_0px,transparent_50%),radial-gradient(at_0%_100%,rgba(255,255,255,0.05)_0px,transparent_50%),radial-gradient(at_80%_100%,rgba(255,255,255,0.04)_0px,transparent_50%)]"
        />
        
        {/* Animated gradient orbs - neutral */}
        <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-neutral-400/15 via-neutral-500/8 to-transparent dark:from-white/10 dark:via-white/5 blur-[100px] animate-gradient-float" />
        <div className="absolute top-[40%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-neutral-500/12 via-neutral-400/8 to-transparent dark:from-white/8 dark:via-white/4 blur-[120px] animate-gradient-float-delayed" />
        <div className="absolute bottom-[-10%] left-[20%] w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-neutral-400/10 via-neutral-300/5 to-transparent dark:from-white/8 dark:via-white/4 blur-[100px] animate-gradient-float-slow" />
        <div className="absolute top-[60%] left-[-10%] w-[400px] h-[400px] rounded-full bg-gradient-to-r from-neutral-500/8 via-neutral-400/5 to-transparent dark:from-white/6 dark:via-white/3 blur-[80px] animate-gradient-float-reverse" />
        
        {/* Subtle noise texture for depth */}
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")" }} />
        
        {/* Base background color */}
        <div className="absolute inset-0 -z-10 bg-white/80 dark:bg-neutral-950/90" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
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
      </div>
    </main>
  );
}
