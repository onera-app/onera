"use client";

import { useState } from "react";
import {
  User,
  Code,
  Shield,
  Lock,
  Zap,
  FileText,
  Scale,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "personal", label: "Personal", icon: User },
  { id: "legal", label: "Legal", icon: Scale },
  { id: "developer", label: "Developer", icon: Code },
];

const useCases = {
  personal: {
    title: "Your Thoughts Stay Yours",
    description:
      "Ask about health symptoms, relationship advice, or financial questions without your data being harvested, sold, or used to train AI models. ChatGPT stores everything. We store nothing.",
    features: [
      {
        icon: Shield,
        title: "Zero data retention",
        description: "Conversations deleted after session",
      },
      {
        icon: Heart,
        title: "Never used for training",
        description: "Your prompts stay private",
      },
      {
        icon: Lock,
        title: "Encrypted sync",
        description: "Access history across devices securely",
      },
    ],
    highlight: "01",
  },
  legal: {
    title: "Attorney-Client Privilege Protected",
    description:
      "Discuss case details, analyze contracts, and draft legal documents with cryptographic guarantees. The only AI platform trusted by law firms for privileged communications.",
    features: [
      {
        icon: Scale,
        title: "Privilege protected",
        description: "Legally compliant communications",
      },
      {
        icon: FileText,
        title: "Contract analysis",
        description: "Review NDAs and agreements securely",
      },
      {
        icon: Shield,
        title: "Audit trail",
        description: "Verifiable privacy for compliance",
      },
    ],
    highlight: "02",
  },
  developer: {
    title: "Build Privacy-First Applications",
    description:
      "Integrate end-to-end encrypted AI into your products. OpenAI-compatible API with cryptographic proof that user data is protected. Ship features users can trust.",
    features: [
      {
        icon: Code,
        title: "OpenAI-compatible",
        description: "Drop-in replacement for existing code",
      },
      {
        icon: Zap,
        title: "Low latency",
        description: "Production-ready performance",
      },
      {
        icon: Shield,
        title: "Attestation proofs",
        description: "Verifiable privacy for compliance",
      },
    ],
    highlight: "03",
  },
};

export function UseCasesSection() {
  const [activeTab, setActiveTab] = useState("personal");
  const activeCase = useCases[activeTab as keyof typeof useCases];

  return (
    <section className="py-16 md:py-32">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {/* Header */}
        <div className="mb-6 text-center md:mb-10">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl text-neutral-900 dark:text-white">
            Built for How You Work
          </h2>
          <p className="text-muted-foreground mt-3 text-sm md:mt-4 md:text-lg">
            Whether you're protecting personal conversations, client privilege,
            or building secure applications
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex justify-center md:mb-10">
          <div className="inline-flex rounded-lg border border-border p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:gap-2 sm:px-4 sm:py-2 sm:text-sm",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <tab.icon className="size-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
          {/* Left - Text Content */}
          <div className="order-2 lg:order-1">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-6xl font-bold text-muted-foreground/20 md:text-7xl">
                {activeCase.highlight}
              </span>
            </div>
            <h3 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white md:text-3xl">
              {activeCase.title}
            </h3>
            <p className="text-muted-foreground mt-4 text-base leading-relaxed md:text-lg">
              {activeCase.description}
            </p>

            <ul className="mt-8 space-y-4">
              {activeCase.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <feature.icon className="size-5 text-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {feature.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Right - Visual */}
          <div className="relative order-1 lg:order-2">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-slate-50 to-slate-100 dark:from-neutral-900 dark:to-neutral-800 sm:rounded-3xl">
              {/* Mock Chat Interface */}
              <div className="absolute inset-4 flex flex-col rounded-xl border border-border bg-card shadow-lg sm:inset-6">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                  <div className="size-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Onera</p>
                    <p className="text-xs text-muted-foreground">
                      End-to-end encrypted
                    </p>
                  </div>
                  <div className="ml-auto">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-300/20">
                      <Lock className="size-3" />
                      Private
                    </span>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 space-y-4 overflow-hidden p-4">
                  <div className="flex gap-3">
                    <div className="size-6 shrink-0 rounded-full bg-muted" />
                    <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2">
                      <p className="text-sm">How can I help you today?</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-2 text-primary-foreground">
                      <p className="text-sm">
                        I need help with something private...
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="size-6 shrink-0 rounded-full bg-muted" />
                    <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2">
                      <p className="text-sm">
                        Your conversation is encrypted. Only you can read it.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Input */}
                <div className="border-t border-border p-3">
                  <div className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2">
                    <span className="text-sm text-muted-foreground">
                      Message Onera...
                    </span>
                    <div className="ml-auto size-6 rounded-full bg-primary/20" />
                  </div>
                </div>
              </div>

              {/* Decorative Shield */}
              <div className="absolute -right-4 -top-4 size-24 rounded-full bg-emerald-500/10 blur-2xl" />
              <div className="absolute -bottom-4 -left-4 size-32 rounded-full bg-blue-500/10 blur-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
