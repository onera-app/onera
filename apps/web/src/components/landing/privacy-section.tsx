import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Lock, Server, EyeOff } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "True end-to-end encryption",
    description:
      "Your data is encrypted before it leaves your browser. We never see your plaintext.",
  },
  {
    icon: Lock,
    title: "Your keys, your control",
    description:
      "Use your own API keys. Connect directly to AI providers without middlemen.",
  },
  {
    icon: Server,
    title: "Zero-knowledge storage",
    description:
      "We store encrypted blobs only. Even we cannot decrypt your conversations.",
  },
  {
    icon: EyeOff,
    title: "Recovery key backup",
    description:
      "Your recovery phrase lets you restore access. No backdoors, no master keys.",
  },
];

export function PrivacySection() {
  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Background with subtle pattern */}
      <div className="absolute inset-0 -z-10 bg-neutral-50 dark:bg-neutral-900">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px]" />
        {/* Gradient orbs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-white/60 dark:bg-neutral-800/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-white/60 dark:bg-neutral-800/30 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Your data stays yours.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Built from the ground up with privacy and security as the foundation
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {features.map((feature) => (
            <Card 
              key={feature.title} 
              className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm border-neutral-200/60 dark:border-neutral-700/60 shadow-sm hover:shadow-md hover:bg-white/90 dark:hover:bg-neutral-700/90 transition-all duration-300"
            >
              <CardContent className="pt-6">
                {/* Icon */}
                <div className="mb-4 rounded-xl bg-neutral-100/80 dark:bg-neutral-700/80 p-3 w-fit">
                  <feature.icon className="size-6 text-neutral-700 dark:text-neutral-300" strokeWidth={1.5} />
                </div>

                {/* Content */}
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom Badge */}
        <div className="mt-12 flex justify-center">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm border border-neutral-200/60 dark:border-neutral-700/60 text-sm text-muted-foreground shadow-sm">
            <Lock className="size-4 text-emerald-600 dark:text-emerald-500" />
            Even we have no access to your data.
          </div>
        </div>
      </div>
    </section>
  );
}
