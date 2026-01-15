import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ShieldCheck, Lock, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function Hero() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative flex flex-col items-center px-4 pt-32 pb-16 overflow-hidden">
      {/* Boxy Grid Background */}
      <div className="absolute inset-0 -z-10">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:80px_80px]" />
        {/* Gradient orbs for depth */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neutral-200/40 dark:bg-neutral-700/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-neutral-100/60 dark:bg-neutral-800/30 rounded-full blur-3xl" />
        {/* Top fade */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white dark:from-neutral-950 to-transparent" />
      </div>

      {/* Badge */}
      <Badge 
        variant="outline" 
        className="mb-8 px-4 py-1.5 text-sm font-normal bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border-neutral-200/60 dark:border-neutral-700/60 shadow-sm"
      >
        <ShieldCheck className="size-4 mr-1.5 text-emerald-600 dark:text-emerald-500" />
        End-to-end encrypted
      </Badge>

      {/* Headline */}
      <h1 className="text-center text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl">
        Your private AI assistant.
        <br />
        <span className="text-muted-foreground">Always ready.</span>
      </h1>

      {/* Subheading */}
      <p className="mt-6 text-center text-lg text-muted-foreground max-w-xl leading-relaxed">
        A personal AI workspace that belongs to you. Your conversations stay private, 
        encrypted, and accessible only by you.
      </p>

      {/* CTA Buttons */}
      <div className="mt-10 flex flex-col sm:flex-row gap-4">
        {!isAuthenticated ? (
          <Link to="/auth">
            <Button size="lg" className="px-8 shadow-lg shadow-neutral-900/10 dark:shadow-neutral-950/30 hover:shadow-xl hover:shadow-neutral-900/15 dark:hover:shadow-neutral-950/40 transition-all">
              Start My Private Workspace
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
        ) : (
          <Link to="/app">
            <Button size="lg" className="px-8 shadow-lg shadow-neutral-900/10 dark:shadow-neutral-950/30 hover:shadow-xl hover:shadow-neutral-900/15 dark:hover:shadow-neutral-950/40 transition-all">
              Go to Dashboard
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
        )}
        <button 
          onClick={() => document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" })}
        >
          <Button variant="outline" size="lg" className="px-8 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm hover:bg-white dark:hover:bg-neutral-800 transition-all">
            See How It Works
          </Button>
        </button>
      </div>

      {/* Trust Badges */}
      <div className="mt-8 flex flex-wrap justify-center items-center gap-6 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500" />
          No data shared. Ever.
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500" />
          No credit card required
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500" />
          Use your own API keys
        </span>
      </div>

      {/* Workspace Preview Card */}
      <div className="mt-20 w-full max-w-3xl">
        <div className="relative rounded-3xl bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl border border-white/60 dark:border-neutral-700/60 p-16 flex flex-col items-center justify-center shadow-xl shadow-neutral-200/40 dark:shadow-neutral-950/40">
          {/* Subtle inner glow */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/50 dark:from-neutral-800/50 to-transparent pointer-events-none" />
          
          <div className="relative rounded-2xl bg-white dark:bg-neutral-800 p-5 shadow-lg shadow-neutral-200/50 dark:shadow-neutral-950/50 border border-neutral-100 dark:border-neutral-700">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-neutral-900 dark:bg-white p-2.5">
                <Lock className="size-5 text-white dark:text-neutral-900" strokeWidth={1.5} />
              </div>
              <Sparkles className="size-5 text-neutral-400 dark:text-neutral-500" />
            </div>
          </div>
          
          <h3 className="relative mt-6 font-semibold text-lg">Your private AI workspace</h3>
          <p className="relative mt-1 text-sm text-muted-foreground">
            Secure, encrypted, and always available
          </p>
        </div>
      </div>
    </section>
  );
}
