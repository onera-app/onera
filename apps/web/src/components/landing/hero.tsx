import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Lock, LockOpen, ShieldCheck } from "lucide-react";
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
    ? "border-[#bdd6c1] bg-[#e8f3ea] text-[#2f6c3b]"
    : "border-[#c5d0e2] bg-[#eef3fb] text-[#2d3a53]";
  const promptPreview = isPrivateMode
    ? "\"[Encrypted] Internal workforce planning for next quarter...\""
    : "\"Internal workforce planning and layoff scenarios for next quarter...\"";
  const footerCopy = isPrivateMode
    ? "Private mode on: message content is protected end to end."
    : "Standard mode: external services may access message content.";

  return (
    <div className="relative mx-auto mt-10 w-full max-w-[980px] md:mt-16 md:h-[620px]">
      <div className="absolute left-1/2 top-[28%] hidden h-72 w-72 -translate-x-[82%] rounded-full bg-[#f0b9b0]/45 blur-3xl md:block" />
      <div className="absolute left-1/2 top-[46%] hidden h-72 w-72 -translate-x-[2%] rounded-full bg-[#b8d8ba]/45 blur-3xl md:block" />
      <div className="absolute left-1/2 top-[36%] hidden h-60 w-60 -translate-x-[36%] rounded-full bg-[#c8d9f4]/38 blur-3xl md:block" />

      <article className="relative z-20 mx-auto w-[96%] rounded-[34px] border border-[#c8c4be] bg-[#f9f9f8] p-6 shadow-[0_32px_90px_rgba(40,38,36,0.14)] md:absolute md:inset-x-0 md:top-[10%] md:w-[900px] md:p-8">
        <p className="text-center font-['Manrope','Avenir_Next','Inter','sans-serif'] text-xs font-medium tracking-[0.06em] text-[#66615f] uppercase sm:text-sm">
          Privacy Playground
        </p>
        <h3 className="mt-2 text-center font-['Manrope','Avenir_Next','Inter','sans-serif'] text-xl font-semibold text-[#2f2d2d] sm:text-2xl md:text-3xl">
          See what changes when you switch modes
        </h3>

        <div className="mt-5 flex justify-center">
          <div className="inline-flex items-center rounded-full border border-[#cfd5df] bg-white p-1 shadow-[0_8px_24px_rgba(65,70,84,0.09)]">
            <button
              type="button"
              onClick={() => setIsPrivateMode(false)}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-xs font-semibold sm:px-4 sm:py-2 sm:text-sm md:text-base ${
                !isPrivateMode
                  ? "bg-[#2f2d2d] text-white"
                  : "text-[#616778] hover:bg-[#f4f5f7]"
              }`}
              aria-pressed={!isPrivateMode}
            >
              <LockOpen className="h-4 w-4" />
              Standard
            </button>
            <button
              type="button"
              onClick={() => setIsPrivateMode(true)}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-xs font-semibold sm:px-4 sm:py-2 sm:text-sm md:text-base ${
                isPrivateMode
                  ? "bg-[#2f2d2d] text-white"
                  : "text-[#616778] hover:bg-[#f4f5f7]"
              }`}
              aria-pressed={isPrivateMode}
            >
              <Lock className="h-4 w-4" />
              Private
            </button>
          </div>
        </div>

        <div className="mt-8 grid items-center gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <div className="rounded-2xl border border-[#cdc8c3] bg-white/95 p-5 text-center shadow-[0_8px_22px_rgba(71,66,60,0.06)]">
            <p className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-sm font-medium text-[#636a78]">
              Your message
            </p>
            <p className="mt-3 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-sm leading-snug text-[#3e3e44] sm:text-base md:text-lg">
              {promptPreview}
            </p>
          </div>

          <div className="hidden justify-center md:flex">
            <ArrowRight className="h-6 w-6 text-[#4e5563]" />
          </div>

          <div
            className={`rounded-2xl border p-5 text-center shadow-[0_8px_22px_rgba(66,82,114,0.08)] ${modeTone}`}
          >
            <p className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-sm font-medium">
              AI processing
            </p>
            <p className="mt-3 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-xl font-semibold sm:text-2xl">
              {modeTitle}
            </p>
          </div>

          <div className="hidden justify-center md:flex">
            <ArrowRight className="h-6 w-6 text-[#4e5563]" />
          </div>

          <div className="rounded-2xl border border-[#cdc8c3] bg-white/95 p-5 text-center shadow-[0_8px_22px_rgba(71,66,60,0.06)]">
            <p className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-sm font-medium text-[#636a78]">
              Model response
            </p>
            <p className="mt-3 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-sm leading-snug text-[#3e3e44] sm:text-base md:text-lg">
              "Here is a concise summary you can share with leadership..."
            </p>
          </div>
        </div>

        <div className="mt-7 rounded-3xl border border-[#bfcde0] bg-[#eaf0fa] px-5 py-4 text-left">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[#3e5a8a]" />
            <p className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-sm text-[#4f5e7a] sm:text-base md:text-lg">
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
        <h1 className="mx-auto max-w-[920px] font-['Manrope','Avenir_Next','Inter','sans-serif'] text-3xl font-semibold leading-[1.08] tracking-tight text-[#2b2929] sm:text-5xl md:text-7xl">
          Protect your data.
          <br />
          Keep your productivity.
        </h1>

        <p className="mx-auto mt-6 max-w-[640px] font-['Manrope','Avenir_Next','Inter','sans-serif'] text-base leading-relaxed text-[#706b68] sm:mt-8 sm:text-lg md:text-3xl">
          Onera gives you secure AI chat with end-to-end encryption, passkeys,
          and control over which models you use.
        </p>

        <Link to={isAuthenticated ? "/app" : "/auth"}>
          <Button className="mt-8 h-11 rounded-full bg-[#2f2d2d] px-8 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-base font-medium text-white hover:bg-[#1f1d1d] sm:mt-10 sm:h-14 sm:px-12 sm:text-xl">
            {isAuthenticated ? "Open app" : "Get started for free"}
          </Button>
        </Link>

        <FloatingPreview />

        <div className="mt-12 grid gap-6 border-t border-[#ddd9d6] pt-8 sm:mt-14 sm:gap-8 sm:pt-10 md:grid-cols-3">
          {quickFacts.map((item) => (
            <div key={item.title} className="text-center md:text-left">
              <p className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-xl font-semibold text-[#2f2d2d] sm:text-2xl md:text-3xl">
                {item.title}
              </p>
              <p className="mt-2 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-base leading-relaxed text-[#706b68] sm:mt-3 sm:text-lg">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
