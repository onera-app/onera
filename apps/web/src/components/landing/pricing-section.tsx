import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const betaPlan = {
  name: "Beta Access",
  description: "Get early access to all features",
  price: 0,
  features: [
    "Unlimited private conversations",
    "Bank-level encryption",
    "Sync across all your devices",
    "Save your favorite prompts",
    "Secure backup & recovery",
    "No ads, no data selling",
  ],
};

export function PricingSection() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative py-16 sm:py-24 px-4 overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-10 sm:mb-16 px-2">
          <Badge 
            variant="outline" 
            className="mb-4 sm:mb-6 px-4 py-1.5 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border-neutral-200/60 dark:border-neutral-700/60"
          >
            <Sparkles className="size-4 mr-1" />
            Early Access
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Free During Beta
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground max-w-md mx-auto">
            Join now and get full access while we're in beta. No credit card required.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="max-w-md mx-auto px-4 sm:px-0">
          <div className="relative">
            {/* Recommended badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
              <Badge className="px-4 py-1 shadow-md bg-violet-600 hover:bg-violet-600">
                Limited Time
              </Badge>
            </div>
            
            <Card className="relative bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-2 border-violet-500/50 shadow-xl shadow-neutral-200/40 dark:shadow-neutral-950/40 overflow-hidden">
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/50 dark:from-neutral-800/50 to-transparent pointer-events-none" />
              
              <CardHeader className="relative pb-3 sm:pb-4 pt-5 sm:pt-6">
                <CardTitle className="text-lg sm:text-xl">{betaPlan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {betaPlan.description}
                </p>
              </CardHeader>
              <CardContent className="relative">
                {/* Price */}
                <div className="mb-5 sm:mb-6">
                  <span className="text-4xl sm:text-5xl font-bold">${betaPlan.price}</span>
                  <span className="text-muted-foreground ml-1">/month</span>
                  <span className="ml-2 text-sm text-violet-600 dark:text-violet-400 font-medium">during beta</span>
                </div>

                {/* CTA Button */}
                {!isAuthenticated ? (
                  <Link to="/auth">
                    <Button
                      className="w-full mb-5 sm:mb-6 shadow-lg shadow-neutral-900/10 hover:shadow-xl hover:shadow-neutral-900/15 transition-all h-11 sm:h-12 bg-violet-600 hover:bg-violet-700"
                      size="lg"
                    >
                      Join the Beta
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/app">
                    <Button
                      className="w-full mb-5 sm:mb-6 shadow-lg shadow-neutral-900/10 hover:shadow-xl hover:shadow-neutral-900/15 transition-all h-11 sm:h-12 bg-violet-600 hover:bg-violet-700"
                      size="lg"
                    >
                      Go to Dashboard
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </Link>
                )}

                {/* Features List */}
                <ul className="space-y-2.5 sm:space-y-3">
                  {betaPlan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 sm:gap-3">
                      <Check className="size-4 sm:size-5 text-violet-600 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Badges */}
        <div className="mt-10 sm:mt-12 flex flex-col items-center gap-3 sm:gap-4 px-4">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border border-neutral-200/60 dark:border-neutral-700/60 text-xs sm:text-sm shadow-sm text-center">
            <span className="size-2 rounded-full bg-violet-500 flex-shrink-0" />
            <span>Be one of the first to experience private AI</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            Early users will get special perks when we launch
          </p>
        </div>
      </div>
    </section>
  );
}
