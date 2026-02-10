import { useAuth } from "@/hooks/useAuth";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const freeFeatures = [
  "Unlimited AI conversations",
  "End-to-end encryption",
  "Bring your own API keys",
  "Voice input",
  "Custom API endpoints",
  "Cross-device sync",
];

export function PricingSection() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="py-20 sm:py-32 px-4 border-t border-neutral-100 dark:border-neutral-800/50">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Free during early access
          </h2>
          <p className="mt-4 text-lg text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
            All features included. No credit card required.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 p-8"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-4">
              Early Access
            </div>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-5xl font-bold text-neutral-900 dark:text-white">$0</span>
              <span className="text-neutral-400">/mo</span>
            </div>
          </div>

          <ul className="space-y-3 mb-8">
            {freeFeatures.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                <Check className="size-4 text-neutral-400 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          <Button
            className="w-full h-11 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 font-medium"
            onClick={() => {
              window.location.href = isAuthenticated ? "/app" : "/auth";
            }}
          >
            {isAuthenticated ? "Open App" : "Get Started"}
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
