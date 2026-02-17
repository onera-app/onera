import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { LockOpen, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

function FloatingPreview() {
  const [phase, setPhase] = useState<"plaintext" | "scrambling" | "encrypted">("plaintext");
  const [displayText, setDisplayText] = useState("");

  const plaintext = "Confidential: projected Q3 revenue decline and restructuring options...";
  const ciphertext = "xK9mZTv3nRqW8jLpY2aHdB5cVf9kL2pZ5mX8nRqW3jLpY2aHdB5cVf9kL2pZ5mX8...";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let scrambleInterval: NodeJS.Timeout;

    const runAnimation = () => {
      // PHASE 1: Plaintext (Start)
      setPhase("plaintext");
      setDisplayText(plaintext);

      timeout = setTimeout(() => {
        // PHASE 2: Scrambling
        setPhase("scrambling");
        let contrast = 0;

        scrambleInterval = setInterval(() => {
          contrast += 2;
          if (contrast > 100) {
            clearInterval(scrambleInterval);
            // PHASE 3: Encrypted
            setPhase("encrypted");
            setDisplayText(ciphertext);

            timeout = setTimeout(() => {
              // Loop back to start
              runAnimation();
            }, 3000); // Hold encrypted for 3s
            return;
          }

          // Generate scrambled text
          const scrambled = plaintext.split('').map((char) => {
            if (char === ' ') return ' ';
            // Progressive scrambling: earlier chars scramble first, or random
            return Math.random() * 100 < contrast ? chars[Math.floor(Math.random() * chars.length)] : char;
          }).join('');

          setDisplayText(scrambled);
        }, 50);

      }, 3000); // Hold plaintext for 3s
    };

    runAnimation();

    return () => {
      clearTimeout(timeout);
      clearInterval(scrambleInterval);
    };
  }, []);

  return (
    <div className="mx-auto mt-16 w-full max-w-[680px] sm:mt-20">
      {/* Status Badges */}
      <div className="flex justify-center h-8 mb-6">
        <div className="relative">
          {/* Plaintext Badge */}
          <div
            className={`absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-landing text-xs font-medium transition-all duration-500 ${phase === "plaintext" || phase === "scrambling"
              ? "opacity-100 transform-none"
              : "opacity-0 translate-y-2"
              } bg-landing-warning-bg text-landing-warning-text`}
          >
            <LockOpen className="h-3 w-3" />
            Visible to provider
          </div>

          {/* Encrypted Badge */}
          <div
            className={`absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-landing text-xs font-medium transition-all duration-500 delay-100 ${phase === "encrypted"
              ? "opacity-100 transform-none scale-100"
              : "opacity-0 -translate-y-2 scale-95"
              } bg-landing-green-bg text-landing-green-text`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="font-semibold">Zero-knowledge encrypted by Onera</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-landing-muted/60 p-6 relative overflow-hidden group border border-transparent transition-colors duration-500 data-[phase=encrypted]:border-landing-green-border/30" data-phase={phase}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-shimmer" />

        <p className="font-landing text-[11px] font-medium uppercase tracking-widest text-[#6e6e73] flex justify-between items-center">
          <span>What leaves your device</span>
          <span className={`transition-colors duration-300 ${phase === 'encrypted' ? 'text-landing-green-text font-semibold' : 'text-landing-warning-text'}`}>
            {phase === 'encrypted' ? 'PROTECTED' : 'UNSECURE'}
          </span>
        </p>

        <p className="mt-4 font-landing text-lg leading-relaxed text-landing-foreground sm:text-xl min-h-[3.5rem] break-all">
          <span className={`${phase === 'encrypted' ? 'font-mono text-sm sm:text-base text-landing-muted-foreground' : ''} transition-all duration-300`}>
            {displayText}
          </span>
        </p>

        {/* Progress Bar / Visual Indicator */}
        <div className="mt-5 h-1 w-full bg-landing-muted-foreground/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-in-out ${phase === 'encrypted' ? 'bg-landing-green-text w-full' : 'bg-landing-warning-text w-[10%]'}`}
          />
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
            href="https://apps.apple.com/us/app/onera-private-ai-chat/id6758128954"
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
