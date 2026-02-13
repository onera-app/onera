import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const freeFeatures = [
  "Unlimited inference requests",
  "Unlimited BYOK inference",
  "Unlimited storage",
  "End-to-end encryption",
];

export function PricingPage() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();

  return (
    <div className="min-h-screen bg-background px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Free during early access
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
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
              if (isSignedIn) {
                navigate({ to: "/app" });
              } else {
                navigate({ to: "/auth" });
              }
            }}
          >
            {isSignedIn ? "Open App" : "Get Started"}
          </Button>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Paid plans coming soon. We'll give plenty of notice before any changes.
        </p>
      </div>
    </div>
  );
}
