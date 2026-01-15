import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const freePlan = {
  name: "Free Forever",
  description: "Bring your own API keys",
  price: 0,
  features: [
    "Unlimited encrypted chats",
    "Connect multiple AI providers",
    "End-to-end encryption",
    "Notes & prompt templates",
    "Recovery key backup",
    "No data limits",
  ],
};

export function PricingSection() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-16">
          <Badge 
            variant="outline" 
            className="mb-6 px-4 py-1.5 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border-neutral-200/60 dark:border-neutral-700/60"
          >
            <Sparkles className="size-4 mr-1" />
            Simple Pricing
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Free. Forever.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Use your own API keys. Pay only for what you use with AI providers.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="max-w-md mx-auto">
          <div className="relative">
            {/* Recommended badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
              <Badge className="px-4 py-1 shadow-md bg-emerald-600 hover:bg-emerald-600">
                BYOK Model
              </Badge>
            </div>
            
            <Card className="relative bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-2 border-emerald-500/50 shadow-xl shadow-neutral-200/40 dark:shadow-neutral-950/40 overflow-hidden">
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/50 dark:from-neutral-800/50 to-transparent pointer-events-none" />
              
              <CardHeader className="relative pb-4 pt-6">
                <CardTitle className="text-xl">{freePlan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {freePlan.description}
                </p>
              </CardHeader>
              <CardContent className="relative">
                {/* Price */}
                <div className="mb-6">
                  <span className="text-5xl font-bold">${freePlan.price}</span>
                  <span className="text-muted-foreground ml-1">/month</span>
                </div>

                {/* CTA Button */}
                {!isAuthenticated ? (
                  <Link to="/auth">
                    <Button
                      className="w-full mb-6 shadow-lg shadow-neutral-900/10 hover:shadow-xl hover:shadow-neutral-900/15 transition-all"
                      size="lg"
                    >
                      Get Started Free
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/app">
                    <Button
                      className="w-full mb-6 shadow-lg shadow-neutral-900/10 hover:shadow-xl hover:shadow-neutral-900/15 transition-all"
                      size="lg"
                    >
                      Go to Dashboard
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </Link>
                )}

                {/* Features List */}
                <ul className="space-y-3">
                  {freePlan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Badges */}
        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border border-neutral-200/60 dark:border-neutral-700/60 text-sm shadow-sm">
            <span className="size-2 rounded-full bg-emerald-500" />
            Your API keys are encrypted and stored securely
          </div>
          <p className="text-sm text-muted-foreground">
            Works with OpenAI, Anthropic, Ollama, and more
          </p>
        </div>
      </div>
    </section>
  );
}
