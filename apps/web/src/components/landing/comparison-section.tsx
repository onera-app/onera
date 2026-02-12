"use client";

import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

const traditionalAI = [
  "Your data trains their models",
  "Closed-source, unverifiable claims",
  "Conversations stored indefinitely",
  "Data breaches expose your prompts",
];

const privateAI = [
  "Zero data retention policy",
  "Open-source, verifiable encryption",
  "End-to-end encrypted storage",
  "Hardware-secured enclaves",
];

export function ComparisonSection() {
  return (
    <section className="py-16 md:py-32">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-medium sm:text-4xl md:text-5xl lg:text-6xl text-neutral-900 dark:text-white">
            Traditional AI vs Private AI
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground sm:mt-6 sm:text-xl">
            The AI you use shouldn't own your data. Choose privacy and
            transparency.
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="relative mt-8 grid gap-6 sm:mt-10 md:mt-12 lg:grid-cols-2 lg:gap-10 xl:gap-14">
          {/* Traditional AI Card */}
          <div className="relative h-full">
            <div className="relative aspect-[4/5] min-h-[400px] overflow-hidden rounded-2xl bg-zinc-900 sm:aspect-[0.9] sm:min-h-[480px] sm:rounded-3xl md:min-h-[520px]">
              {/* Background Image */}
              <img
                src="https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&auto=format&fit=crop&q=80"
                alt="Traditional AI"
                className="absolute inset-0 h-full w-full object-cover opacity-60"
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-black via-black/80 to-transparent" />

              {/* Provider Tags */}
              <div className="absolute left-4 top-4 flex flex-wrap gap-2 sm:left-6 sm:top-6">
                {["ChatGPT", "Claude", "Gemini", "Copilot"].map((name) => (
                  <span
                    key={name}
                    className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
                  >
                    {name}
                  </span>
                ))}
              </div>

              {/* Content */}
              <div className="absolute bottom-0 w-full space-y-4 p-4 sm:p-6 lg:p-8 xl:p-10">
                <h3 className="text-xl font-semibold text-white sm:text-2xl lg:text-3xl">
                  Traditional AI
                </h3>
                <ul className="space-y-2 text-sm text-white/70 sm:text-base">
                  {traditionalAI.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <X className="mt-0.5 size-4 shrink-0 text-red-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Private AI Card */}
          <div className="relative h-full">
            <div className="relative aspect-[4/5] min-h-[400px] overflow-hidden rounded-2xl sm:aspect-[0.9] sm:min-h-[480px] sm:rounded-3xl md:min-h-[520px]">
              {/* Background Image */}
              <img
                src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80"
                alt="Private AI"
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-emerald-950 via-emerald-950/80 to-transparent" />

              {/* Provider Tags */}
              <div className="absolute left-4 top-4 flex flex-wrap gap-2 sm:left-6 sm:top-6">
                {["GPT-4o", "Claude 3.5", "Gemini Pro", "Llama 3"].map(
                  (name) => (
                    <span
                      key={name}
                      className="rounded-full bg-emerald-900/80 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
                    >
                      {name}
                    </span>
                  ),
                )}
              </div>

              {/* Content */}
              <div className="absolute bottom-0 w-full space-y-4 p-4 sm:p-6 lg:p-8 xl:p-10">
                <h3 className="text-xl font-semibold text-white sm:text-2xl lg:text-3xl">
                  Onera Private AI
                </h3>
                <ul className="space-y-2 text-sm text-white/90 sm:text-base">
                  {privateAI.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* VS Badge */}
          <div className="absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
            <div className="flex size-16 items-center justify-center rounded-full border-4 border-white bg-neutral-900 text-sm font-bold text-white shadow-xl dark:border-neutral-700 dark:bg-white dark:text-neutral-900">
              VS
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 text-center sm:mt-12">
          <Link to="/auth">
            <Button
              size="lg"
              className="h-10 rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              Try Private AI Free
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
