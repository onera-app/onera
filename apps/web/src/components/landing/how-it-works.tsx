import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Key, Shield, MessageSquare } from "lucide-react";

const steps = [
  {
    number: 1,
    icon: UserPlus,
    title: "Create your account",
    description:
      "Sign up in seconds. We generate your unique encryption keys locally on your device.",
  },
  {
    number: 2,
    icon: Key,
    title: "Add your API keys",
    description:
      "Connect your own OpenAI, Anthropic, or other provider keys. They're encrypted and never leave your device.",
  },
  {
    number: 3,
    icon: Shield,
    title: "End-to-end encryption kicks in",
    description:
      "Every message is encrypted client-side before transmission. Your data hits our servers as unreadable ciphertext.",
  },
  {
    number: 4,
    icon: MessageSquare,
    title: "Chat with zero surveillance",
    description:
      "No logs. No training on your data. No third-party access. Just you and the AI.",
  },
];

export function HowItWorks() {
  return (
    <section className="relative py-16 sm:py-24 px-4 overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px]" />
        {/* Gradient orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-neutral-100/40 dark:bg-neutral-800/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-10 sm:mb-16 px-2">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Start Chatting Privately
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground max-w-md mx-auto">
            Get started in under a minute. No technical setup required.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {steps.map((step) => (
            <Card 
              key={step.number} 
              className="relative pt-8 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border-neutral-200/60 dark:border-neutral-700/60 shadow-sm hover:shadow-md hover:bg-white/90 dark:hover:bg-neutral-800/90 transition-all duration-300"
            >
              <CardContent className="pt-0">
                {/* Number Badge */}
                <div className="absolute -top-0 left-4 sm:left-6 -translate-y-1/2">
                  <div className="size-9 sm:size-10 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-semibold shadow-lg shadow-neutral-900/20 dark:shadow-neutral-950/30 text-sm sm:text-base">
                    {step.number}
                  </div>
                </div>

                {/* Icon */}
                <div className="mt-3 sm:mt-4 mb-4 sm:mb-6 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/80 p-2.5 sm:p-3 w-fit">
                  <step.icon className="size-5 sm:size-6 text-neutral-700 dark:text-neutral-300" strokeWidth={1.5} />
                </div>

                {/* Content */}
                <h3 className="font-semibold text-base sm:text-lg mb-1.5 sm:mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
