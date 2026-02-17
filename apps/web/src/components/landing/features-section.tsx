import { Lock, Shield, Zap, Layers, Cpu, KeyRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: Lock,
    title: "Encrypted on-device",
    description: "Messages are encrypted before they leave your browser.",
  },
  {
    icon: Cpu,
    title: "Secure enclave inference",
    description: "Models run inside trusted execution environments. Your data stays sealed in hardware.",
  },
  {
    icon: Shield,
    title: "Zero retention",
    description: "No logs, no training data, no copies on third-party servers.",
  },
  {
    icon: KeyRound,
    title: "Passkey authentication",
    description: "No passwords to phish or leak. Your key never leaves your device.",
  },
  {
    icon: Layers,
    title: "Multi-model, single workspace",
    description: "OpenAI, Anthropic, Google — one private interface for all of them.",
  },
  {
    icon: Zap,
    title: "No infrastructure needed",
    description: "Air-gapped privacy, cloud convenience. Nothing to deploy.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-[980px]">
        <div className="text-center">
          <h2 className="font-landing text-3xl font-semibold leading-tight tracking-tight text-landing-foreground sm:text-4xl md:text-5xl">
            Private by design.
          </h2>
          <p className="mx-auto mt-4 max-w-[480px] font-landing text-base leading-relaxed text-landing-muted-foreground sm:text-lg">
            Not by policy — by encryption, secure enclaves, and zero-knowledge architecture.
          </p>
        </div>

        <div className="mt-14 grid gap-x-10 gap-y-8 sm:mt-20 sm:grid-cols-2 md:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title}>
              <feature.icon className="h-5 w-5 text-landing-foreground" strokeWidth={1.5} />
              <h3 className="mt-2.5 font-landing text-base font-semibold text-landing-foreground">
                {feature.title}
              </h3>
              <p className="mt-1 font-landing text-sm leading-relaxed text-landing-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
