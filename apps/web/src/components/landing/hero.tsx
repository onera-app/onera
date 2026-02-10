import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight } from "lucide-react";

export function Hero() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      <div className="relative z-10 max-w-[980px] mx-auto px-4 flex flex-col items-center text-center">

        <h1
          className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tight text-neutral-900 dark:text-white leading-[1.05] md:leading-[1.05] animate-slide-up-fade max-w-4xl"
          style={{ animationDelay: "100ms" }}
        >
          Chat with AI.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-br from-neutral-500 to-neutral-800 dark:from-neutral-200 dark:to-neutral-500">
            Keep your privacy.
          </span>
        </h1>

        <p
          className="mt-8 text-xl md:text-2xl text-neutral-500 dark:text-neutral-400 max-w-2xl leading-relaxed text-balance animate-slide-up-fade"
          style={{ animationDelay: "200ms" }}
        >
          Have conversations you'd never type into ChatGPT. Onera processes your chats in a secure enclave where no one—not even us—can see them.
        </p>

        <div
          className="mt-10 flex flex-col sm:flex-row items-center gap-4 animate-slide-up-fade"
          style={{ animationDelay: "300ms" }}
        >
          {!isAuthenticated ? (
            <Link to="/auth">
              <Button
                size="lg"
                className="h-12 px-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 text-lg transition-all hover:scale-105"
              >
                Get Started
              </Button>
            </Link>
          ) : (
            <Link to="/app">
              <Button
                size="lg"
                className="h-12 px-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 text-lg transition-all hover:scale-105"
              >
                Open App
              </Button>
            </Link>
          )}

          <a
            href="#features"
            className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 font-medium hover:text-neutral-900 dark:hover:text-white transition-colors h-12 px-6"
          >
            Learn more <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
