import { useAuth } from "@/hooks/useAuth";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

const features = [
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
    <section id="pricing" className="py-16 px-4 bg-neutral-50 dark:bg-neutral-900/30">
      <div className="max-w-[980px] mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-neutral-900 dark:text-white mb-4">
            Free during early access
          </h2>
          <p className="text-lg text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto text-balance">
            All features are free while we're in early access. No credit card required.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="mb-6 text-center">
              <p className="text-base font-medium text-neutral-900 dark:text-white mb-1">
                Free
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Encrypted AI chat — all features included
              </p>
            </div>

            <div className="flex items-baseline justify-center gap-1 mb-6">
              <span className="text-4xl font-bold text-neutral-900 dark:text-white tracking-tight">
                $0
              </span>
              <span className="text-neutral-400 font-medium">/mo</span>
            </div>

            <div className="space-y-2 mb-6">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
                    <Check className="size-2.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-neutral-600 dark:text-neutral-300 text-sm">
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            <Link to={isAuthenticated ? "/app" : "/auth"}>
              <Button className="w-full h-10 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 font-medium text-sm transition-transform hover:scale-[1.02]">
                {isAuthenticated ? "Open App" : "Get Started"}
              </Button>
            </Link>

            <p className="mt-4 text-xs text-center text-neutral-400 dark:text-neutral-500">
              Your conversations stay private with end-to-end encryption
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
