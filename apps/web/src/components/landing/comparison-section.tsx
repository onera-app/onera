"use client";

import { useState } from "react";
import { ArrowRight, Lock, LockOpen, ShieldCheck } from "lucide-react";

const principles = [
  "End-to-end encryption",
  "Passkey authentication",
  "Private sync",
  "Multi-provider AI support",
  "No model training on your chats",
  "Built for teams and individuals",
];

export function ComparisonSection() {
  const [isPrivateMode, setIsPrivateMode] = useState(false);

  const modeLabel = isPrivateMode ? "Protected" : "Unprotected";
  const modeTone = isPrivateMode
    ? "border-[#bcd6c0] bg-[#e8f3ea] text-[#2f6c3b]"
    : "border-[#c5d0e2] bg-gradient-to-b from-[#eef3fb] to-[#e5edf9] text-[#2d3a53]";
  const exposureCopy = isPrivateMode
    ? "In Private mode, conversation content stays protected end to end."
    : "In standard mode, conversation content may be accessible to external services.";
  const statusCopy = isPrivateMode
    ? "Private mode is on: messages are encrypted and protected."
    : "Switch to Private mode to keep conversations protected end to end.";
  const statusTone = isPrivateMode
    ? "border-[#bcd6c0] bg-[#e8f3ea] text-[#2f6c3b]"
    : "border-[#bfcde0] bg-[#eaf0fa] text-[#4f5e7a]";

  return (
    <section id="coverage" className="px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-[1180px] overflow-hidden rounded-[46px] bg-[#f0efec] px-6 py-14 md:px-12 md:py-20">
        <div className="mx-auto max-w-[840px] text-center">
          <p className="mx-auto inline-flex rounded-full border border-white/70 bg-white/50 px-5 py-2 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-lg text-[#5f5a58]">
            Privacy mode explained
          </p>
          <h2 className="mt-7 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-[2.4rem] font-semibold leading-[1.08] tracking-tight text-[#2f2c2c] md:text-[4.2rem]">
            One switch. Different exposure.
          </h2>
          <p className="mx-auto mt-6 max-w-[680px] font-['Manrope','Avenir_Next','Inter','sans-serif'] text-xl leading-relaxed text-[#6f6a67]">
            Onera makes privacy visible so teams can understand risk before they
            send.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-[980px] rounded-[36px] border border-[#d9d5d1] bg-[#f7f8f6] p-6 md:p-8">
          <div className="flex justify-center">
            <div className="inline-flex items-center rounded-full border border-[#cfd5df] bg-white p-1 shadow-[0_8px_24px_rgba(65,70,84,0.09)]">
              <button
                type="button"
                onClick={() => setIsPrivateMode(false)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-sm font-semibold md:text-base ${
                  !isPrivateMode
                    ? "bg-[#2f2d2d] text-white"
                    : "text-[#616778] hover:bg-[#f4f5f7]"
                }`}
                aria-pressed={!isPrivateMode}
              >
                <LockOpen className="h-4 w-4" />
                Standard mode
              </button>
              <button
                type="button"
                onClick={() => setIsPrivateMode(true)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-sm font-semibold md:text-base ${
                  isPrivateMode
                    ? "bg-[#2f2d2d] text-white"
                    : "text-[#616778] hover:bg-[#f4f5f7]"
                }`}
                aria-pressed={isPrivateMode}
              >
                <Lock className="h-4 w-4" />
                Private mode
              </button>
            </div>
          </div>

          <div className="mt-10 grid items-center gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <div className="rounded-2xl border border-[#cdc8c3] bg-white/95 p-5 text-center shadow-[0_8px_22px_rgba(71,66,60,0.06)]">
              <p className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-sm font-medium text-[#636a78]">
                Your message
              </p>
              <p className="mt-3 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-lg leading-snug text-[#3e3e44]">
                "Please summarize our internal hiring plan for next quarter..."
              </p>
            </div>

            <div className="hidden justify-center md:flex">
              <ArrowRight className="h-6 w-6 text-[#4e5563]" />
            </div>

            <div
              className={`rounded-2xl border p-5 text-center shadow-[0_8px_22px_rgba(66,82,114,0.08)] ${modeTone}`}
            >
              <p className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-sm font-medium text-[#54607a]">
                AI processing
              </p>
              <p className="mt-3 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-2xl font-semibold">
                {modeLabel}
              </p>
            </div>

            <div className="hidden justify-center md:flex">
              <ArrowRight className="h-6 w-6 text-[#4e5563]" />
            </div>

            <div className="rounded-2xl border border-[#cdc8c3] bg-white/95 p-5 text-center shadow-[0_8px_22px_rgba(71,66,60,0.06)]">
              <p className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-sm font-medium text-[#636a78]">
                Model response
              </p>
              <p className="mt-3 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-lg leading-snug text-[#3e3e44]">
                "Here is a concise summary you can share with leadership..."
              </p>
            </div>
          </div>

          <p className="mt-8 text-center font-['Manrope','Avenir_Next','Inter','sans-serif'] text-xl font-medium text-[#2f3340]">
            {exposureCopy}
          </p>

          <div className={`mt-7 rounded-3xl border px-5 py-4 ${statusTone}`}>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5" />
              <p className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-lg">
                {statusCopy}
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-8 flex max-w-[950px] flex-wrap justify-center gap-3">
          {principles.map((item) => (
            <span
              key={item}
              className="rounded-full border border-[#ddd9d5] bg-white px-5 py-3 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-lg text-[#4d4846] shadow-[0_8px_18px_rgba(95,89,83,0.06)]"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
