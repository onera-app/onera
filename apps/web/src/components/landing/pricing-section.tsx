import { useAuth } from "@/hooks/useAuth";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const freeFeatures = [
  "Unlimited inference requests",
  "Unlimited BYOK inference",
  "Unlimited storage",
  "End-to-end encryption",
  "Voice input",
  "Voice calls",
  "Custom API endpoints",
  "Custom models",
  "Large models (70B+) in TEE",
  "Dedicated enclaves",
];

export function PricingSection() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative py-16 sm:py-24 px-4 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-10 sm:mb-16 px-2">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Free during early access
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground max-w-md mx-auto">
            All features are free while we're in early access. No credit card required.
          </p>
        </div>

        {/* Single Free Plan Card */}
        <div className="rounded-2xl border border-primary bg-primary/5 shadow-lg p-6 sm:p-8">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold">Free</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Encrypted AI chat — all features included
            </p>
            <div className="mt-4">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-muted-foreground">/mo</span>
            </div>
          </div>

          <ul className="space-y-3 mb-8">
            {freeFeatures.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          <Button
            className="w-full"
            onClick={() => {
              window.location.href = isAuthenticated ? "/app" : "/auth";
            }}
          >
            {isAuthenticated ? "Open App" : "Get Started"}
          </Button>
        </div>

        <div className="mt-10 sm:mt-12 flex flex-col items-center gap-3 sm:gap-4 px-4">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border border-neutral-200/60 dark:border-neutral-700/60 text-xs sm:text-sm shadow-sm text-center">
            <span className="size-2 rounded-full bg-violet-500 flex-shrink-0" />
            <span>
              Your conversations stay private with end-to-end encryption
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
