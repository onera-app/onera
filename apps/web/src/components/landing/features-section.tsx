import { BentoGrid, BentoCard } from "./bento-grid";
import { Shield, Fingerprint, Lock, Key } from "lucide-react";

const features = [
  {
    title: "Enclave Encrypted",
    description: "Your chats are processed inside a secure enclave. The hardware guarantees that no one—not even us—can see your data.",
    icon: <Shield className="w-6 h-6" />,
    className: "md:col-span-2",
  },
  {
    title: "Verifiable Code",
    description: "Don't trust, verify. Your browser cryptographically checks that our server runs exactly the code we published.",
    icon: <Fingerprint className="w-6 h-6" />,
    className: "md:col-span-1",
  },
  {
    title: "End-to-End Private",
    description: "History is encrypted with a key only you hold. We store opaque blobs of data that are mathematically impossible for us to read.",
    icon: <Lock className="w-6 h-6" />,
    className: "md:col-span-1",
  },
  {
    title: "BYO Keys",
    description: "Connect your own Anthropic or OpenAI API keys. We act as a blind tunnel, never seeing the content of your requests.",
    icon: <Key className="w-6 h-6" />,
    className: "md:col-span-2",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-4 bg-neutral-50/50 dark:bg-neutral-900/20">
      <div className="max-w-[980px] mx-auto">
        <div className="mb-16 text-center">
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-neutral-900 dark:text-white mb-6">
            Privacy isn't a policy.
            <br />
            <span className="text-neutral-500 dark:text-neutral-400">
              It's physics.
            </span>
          </h2>
          <p className="text-xl text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto text-balance">
            We architected Onera so we physically cannot access your data, even if compelled.
          </p>
        </div>

        <BentoGrid>
          {features.map((feature, i) => (
            <BentoCard
              key={i}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
              className={feature.className}
            />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}
