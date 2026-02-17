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

        <div className="mt-8 flex items-center justify-center gap-3 sm:mt-10">
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
          <a
            href="https://apps.apple.com/app/onera"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-landing-foreground/20 text-landing-foreground transition-colors hover:bg-landing-foreground/5"
            aria-label="Download on the App Store"
          >
            <svg
              viewBox="0 0 17 20"
              className="h-5 w-[17px]"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M14.94 10.56a4.77 4.77 0 0 1 2.27-4 4.89 4.89 0 0 0-3.85-2.08c-1.62-.17-3.19.97-4.02.97-.84 0-2.1-.95-3.47-.93a5.12 5.12 0 0 0-4.31 2.63c-1.86 3.22-.47 7.97 1.31 10.58.9 1.28 1.94 2.71 3.31 2.66 1.34-.06 1.84-.85 3.45-.85 1.6 0 2.06.85 3.46.82 1.44-.02 2.34-1.28 3.2-2.57a10.6 10.6 0 0 0 1.47-2.98 4.61 4.61 0 0 1-2.82-4.25zM12.31 2.72A4.7 4.7 0 0 0 13.39.36 4.78 4.78 0 0 0 10.3 1.96a4.47 4.47 0 0 0-1.1 3.25 3.96 3.96 0 0 0 3.11-1.49z" />
            </svg>
          </a>
        </div>

        <FloatingPreview />
      </div>
    </section>
  );
}
