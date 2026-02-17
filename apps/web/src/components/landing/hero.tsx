import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Lock, LockOpen, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

function FloatingPreview() {
  const [isPrivateMode, setIsPrivateMode] = useState(true);

  return (
    <div className="mx-auto mt-16 w-full max-w-[680px] sm:mt-20">
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-0.5 rounded-full bg-landing-muted p-0.5">
          <button
            type="button"
            onClick={() => setIsPrivateMode(false)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-landing text-xs font-medium transition-all ${!isPrivateMode
              ? "bg-white text-landing-foreground shadow-sm"
              : "text-landing-muted-foreground"
              }`}
            aria-pressed={!isPrivateMode}
          >
            <LockOpen className="h-3 w-3" />
            Standard
          </button>
          <button
            type="button"
            onClick={() => setIsPrivateMode(true)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-landing text-xs font-medium transition-all ${isPrivateMode
              ? "bg-white text-landing-foreground shadow-sm"
              : "text-landing-muted-foreground"
              }`}
            aria-pressed={isPrivateMode}
          >
            <Lock className="h-3 w-3" />
            Private
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-landing-muted/60 p-6">
        <p className="font-landing text-[11px] font-medium uppercase tracking-widest text-landing-muted-foreground">
           What leaves your device
        </p>

        <p className="mt-4 font-landing text-lg leading-relaxed text-landing-foreground sm:text-xl">
          {isPrivateMode ? (
            <span className="font-mono text-sm text-landing-muted-foreground sm:text-base">
              xK9mZTv3nRqW8jLpY2aHdB5cVf...
            </span>
          ) : (
            "Confidential: projected Q3 revenue decline and restructuring options..."
          )}
        </p>

        <div className={`mt-5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-landing text-[11px] font-medium ${
          isPrivateMode
            ? "bg-landing-green-bg text-landing-green-text"
            : "bg-landing-warning-bg text-landing-warning-text"
        }`}>
          <ShieldCheck className="h-3 w-3" />
          {isPrivateMode ? "Zero-knowledge encrypted" : "Visible to the provider"}
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const { isAuthenticated } = useAuth();

  return (
    <section id="home" className="px-4 pb-16 pt-28 sm:px-6 sm:pb-24 sm:pt-36 md:pt-44">
      <div className="mx-auto max-w-[980px] text-center">
        <h1 className="mx-auto max-w-[760px] font-landing text-4xl font-semibold leading-[1.05] tracking-tight text-landing-foreground sm:text-6xl md:text-7xl">
          Your prompts are
          <br />
          nobody's business.
        </h1>

        <p className="mx-auto mt-5 max-w-[520px] font-landing text-base leading-relaxed text-landing-muted-foreground sm:mt-6 sm:text-lg">
          AI chat that encrypts everything before it leaves your device. No provider, no server, not even Onera can read what you send.
        </p>

        <div className="mt-8 flex items-center justify-center gap-4 sm:mt-10">
          <Link
            to={isAuthenticated ? "/app" : "/auth"}
            className="inline-flex h-11 items-center rounded-full bg-landing-pricing-blue px-7 font-landing text-sm font-medium text-white transition-opacity hover:opacity-85"
          >
            {isAuthenticated ? "Open app" : "Get started"}
          </Link>
          <a
            href="#features"
            className="font-landing text-sm text-landing-pricing-blue transition-opacity hover:opacity-70"
          >
            Learn more &rsaquo;
          </a>
        </div>

        <FloatingPreview />
      </div>
    </section>
  );
}
