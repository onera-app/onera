import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Lock, LockOpen, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const quickFacts = [
  {
    title: "Protect your conversations",
    detail: "End-to-end encryption keeps your chat content private.",
  },
  {
    title: "Sign in securely",
    detail: "Passkeys improve account safety without extra friction.",
  },
  {
    title: "Work with any model",
    detail: "Use top AI providers in one secure workspace.",
  },
];

function FloatingPreview() {
  const [isPrivateMode, setIsPrivateMode] = useState(true);

  const modeTitle = isPrivateMode ? "Protected" : "Unprotected";
  const modeTone = isPrivateMode
    ? "border-landing-green-border bg-landing-green-bg text-landing-green-text"
    : "border-landing-warning-border bg-landing-warning-bg text-landing-warning-text";
  const promptPreview = isPrivateMode
    ? "\"[Encrypted] Internal workforce planning for next quarter...\""
    : "\"Internal workforce planning and layoff scenarios for next quarter...\"";
  const footerCopy = isPrivateMode
    ? "Private mode on: message content is protected end to end."
    : "Standard mode: external services may access message content.";

  return (
    <div className="relative mx-auto mt-10 w-full max-w-[980px] md:mt-16">
      <div className="absolute left-1/2 top-[28%] hidden h-72 w-72 -translate-x-[82%] rounded-full bg-[#f0b9b0]/45 blur-3xl md:block" />
      <div className="absolute left-1/2 top-[46%] hidden h-72 w-72 -translate-x-[2%] rounded-full bg-landing-green-bg/45 blur-3xl md:block" />
      <div className="absolute left-1/2 top-[36%] hidden h-60 w-60 -translate-x-[36%] rounded-full bg-landing-blue-bg/38 blur-3xl md:block" />

      <article className="relative z-20 mx-auto w-[96%] rounded-[34px] border border-landing-border bg-landing-card p-6 shadow-[0_32px_90px_rgba(40,38,36,0.14)] md:w-[900px] md:p-8">
        <p className="text-center font-landing text-xs font-medium uppercase tracking-[0.06em] text-landing-muted-foreground sm:text-sm">
          Privacy Playground
        </p>
        <h3 className="mt-2 text-center font-landing text-xl font-semibold text-landing-foreground sm:text-2xl md:text-3xl">
          See what changes when you switch modes
        </h3>

        <div className="mt-5 flex justify-center">
          <div className="inline-flex items-center rounded-full border border-landing-border bg-white p-1 shadow-[0_8px_24px_rgba(65,70,84,0.09)]">
            <button
              type="button"
              onClick={() => setIsPrivateMode(false)}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-landing text-xs font-semibold sm:px-4 sm:py-2 sm:text-sm md:text-base ${!isPrivateMode
                ? "bg-landing-accent text-white"
                : "text-landing-muted-foreground hover:bg-landing-card"
                }`}
              aria-pressed={!isPrivateMode}
            >
              <LockOpen className="h-4 w-4" />
              Standard
            </button>
            <button
              type="button"
              onClick={() => setIsPrivateMode(true)}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-landing text-xs font-semibold sm:px-4 sm:py-2 sm:text-sm md:text-base ${isPrivateMode
                ? "bg-landing-accent text-white"
                : "text-landing-muted-foreground hover:bg-landing-card"
                }`}
              aria-pressed={isPrivateMode}
            >
              <Lock className="h-4 w-4" />
              Private
            </button>
          </div>
        </div>

        <div className="mt-8 grid items-center gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <div className="rounded-2xl border border-landing-border bg-white/95 p-5 text-center shadow-[0_8px_22px_rgba(71,66,60,0.06)]">
            <p className="font-landing text-sm font-medium text-landing-muted-foreground">
              Your message
            </p>
            <p className="mt-3 font-landing text-sm leading-snug text-landing-foreground sm:text-base md:text-lg">
              {promptPreview}
            </p>
          </div>

          <div className="hidden justify-center md:flex">
            <ArrowRight className="h-6 w-6 text-landing-muted-foreground" />
          </div>

          <div
            className={`rounded-2xl border p-5 text-center shadow-[0_8px_22px_rgba(66,82,114,0.08)] ${modeTone}`}
          >
            <p className="font-landing text-sm font-medium">
              AI processing
            </p>
            <div className="group/status relative mt-3 inline-flex cursor-default items-center justify-center gap-2">
              {isPrivateMode ? (
                <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
              ) : (
                <TriangleAlert className="h-5 w-5 sm:h-6 sm:w-6" />
              )}
              <p className="font-landing text-xl font-semibold sm:text-2xl">
                {modeTitle}
              </p>
              <span className="pointer-events-none absolute -bottom-12 left-1/2 z-30 w-56 -translate-x-1/2 rounded-xl bg-landing-accent px-3 py-2 text-center font-landing text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/status:opacity-100 sm:w-64 sm:text-sm">
                {isPrivateMode
                  ? "Your prompt is encrypted before it leaves your device."
                  : "Your prompt is sent in plaintext — the provider can read it."}
              </span>
            </div>
          </div>

          <div className="hidden justify-center md:flex">
            <ArrowRight className="h-6 w-6 text-landing-muted-foreground" />
          </div>

          <div className="rounded-2xl border border-landing-border bg-white/95 p-5 text-center shadow-[0_8px_22px_rgba(71,66,60,0.06)]">
            <p className="font-landing text-sm font-medium text-landing-muted-foreground">
              Model response
            </p>
            <p className="mt-3 font-landing text-sm leading-snug text-landing-foreground sm:text-base md:text-lg">
              "Here is a concise summary you can share with leadership..."
            </p>
          </div>
        </div>

        <div className="mt-7 rounded-3xl border border-landing-blue-border bg-landing-blue-bg px-5 py-4 text-left">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-landing-blue-text" />
            <p className="font-landing text-sm text-landing-blue-text sm:text-base md:text-lg">
              {footerCopy}
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}

export function Hero() {
  const { isAuthenticated } = useAuth();

  return (
    <section id="home" className="px-4 pb-10 pt-24 sm:px-5 sm:pb-12 sm:pt-28 md:px-8 md:pt-36">
      <div className="mx-auto max-w-[1180px] text-center">
        <h1 className="mx-auto max-w-[920px] font-landing text-3xl font-semibold leading-[1.08] tracking-tight text-landing-foreground sm:text-5xl md:text-7xl">
          Protect your data.
          <br />
          Keep your productivity.
        </h1>

        <p className="mx-auto mt-6 max-w-[640px] font-landing text-base leading-relaxed text-landing-muted-foreground sm:mt-8 sm:text-lg md:text-xl">
          Onera gives you secure AI chat with end-to-end encryption, passkeys,
          and control over which models you use.
        </p>

        <Link to={isAuthenticated ? "/app" : "/auth"}>
          <Button className="mt-8 h-11 rounded-full bg-landing-accent px-8 font-landing text-base font-medium text-landing-accent-foreground hover:bg-landing-accent/90 sm:mt-10 sm:h-14 sm:px-12 sm:text-xl">
            {isAuthenticated ? "Open app" : "Get started for free"}
          </Button>
        </Link>

        <FloatingPreview />

        <div className="mt-12 grid gap-6 border-t border-landing-border pt-8 sm:mt-14 sm:gap-8 sm:pt-10 md:grid-cols-3">
          {quickFacts.map((item) => (
            <div key={item.title} className="text-center md:text-left">
              <p className="font-landing text-xl font-semibold text-landing-foreground sm:text-2xl md:text-3xl">
                {item.title}
              </p>
              <p className="mt-2 font-landing text-base leading-relaxed text-landing-muted-foreground sm:mt-3 sm:text-lg">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
