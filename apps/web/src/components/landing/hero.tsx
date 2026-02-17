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
    <section id="home" className="px-4 pb-24 pt-36 sm:px-6 sm:pb-32 sm:pt-44 md:pb-40 md:pt-52">
      <div className="mx-auto max-w-[980px] text-center">
        <h1 className="mx-auto max-w-[820px] font-landing text-5xl font-semibold leading-[1.05] tracking-tight text-landing-foreground sm:text-7xl md:text-8xl">
          Your prompts are
          <br />
          nobody's business.
        </h1>

        <p className="mx-auto mt-6 max-w-[540px] font-landing text-lg leading-relaxed text-landing-muted-foreground sm:mt-8 sm:text-xl">
          AI chat that encrypts everything before it leaves your device. No provider, no server, not even Onera can read what you send.
        </p>

        <div className="mt-8 flex flex-col items-center gap-5 sm:mt-10">
          <div className="flex items-center justify-center gap-3">
            <Link
              to={isAuthenticated ? "/app" : "/auth"}
              className="inline-flex h-12 items-center rounded-full bg-landing-foreground px-8 font-landing text-base font-medium text-landing transition-opacity hover:opacity-85"
            >
              {isAuthenticated ? "Open App" : "Get Started"}
            </Link>
            <a
              href="https://docs.onera.chat"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center rounded-full border border-landing-foreground/20 px-8 font-landing text-base font-medium text-landing-foreground transition-colors hover:bg-landing-foreground/5"
            >
              Docs
            </a>
          </div>

          <a
            href="https://apps.apple.com/app/onera"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 transition-opacity hover:opacity-70"
            aria-label="Download on the App Store"
          >
            <svg
              viewBox="0 0 120 40"
              className="h-10"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect width="120" height="40" rx="6" fill="currentColor" className="text-landing-foreground" />
              <g fill="currentColor" className="text-landing">
                <path d="M24.77 20.3a4.95 4.95 0 0 1 2.36-4.15 5.07 5.07 0 0 0-3.99-2.16c-1.68-.18-3.31 1.01-4.17 1.01-.87 0-2.18-.99-3.6-.96a5.31 5.31 0 0 0-4.47 2.72c-1.93 3.34-.49 8.27 1.36 10.97.93 1.33 2.01 2.82 3.43 2.76 1.39-.06 1.91-.88 3.58-.88 1.66 0 2.14.88 3.59.85 1.49-.02 2.42-1.33 3.32-2.67a11 11 0 0 0 1.52-3.09 4.78 4.78 0 0 1-2.93-4.4zM22.04 12.21a4.87 4.87 0 0 0 1.12-3.49 4.96 4.96 0 0 0-3.21 1.66 4.64 4.64 0 0 0-1.14 3.37 4.11 4.11 0 0 0 3.23-1.54z" />
                <text x="36" y="15" fontSize="8" fontFamily="-apple-system, system-ui, sans-serif" fontWeight="400" letterSpacing="0.02em">Download on the</text>
                <text x="36" y="28" fontSize="14" fontFamily="-apple-system, system-ui, sans-serif" fontWeight="600" letterSpacing="-0.01em">App Store</text>
              </g>
            </svg>
          </a>
        </div>

        <FloatingPreview />
      </div>
    </section>
  );
}
