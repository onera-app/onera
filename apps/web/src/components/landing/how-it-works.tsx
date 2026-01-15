import { Card, CardContent } from "@/components/ui/card";
import { KeyRound, Server, MessageSquare } from "lucide-react";

const steps = [
  {
    number: 1,
    icon: KeyRound,
    title: "Add your API keys",
    description:
      "Connect your OpenAI, Anthropic, or other AI provider keys. They're encrypted and stored securely.",
  },
  {
    number: 2,
    icon: Server,
    title: "We encrypt everything",
    description:
      "Your messages, chats, and credentials are end-to-end encrypted. Only you can read them.",
  },
  {
    number: 3,
    icon: MessageSquare,
    title: "Start chatting privately",
    description:
      "Chat with AI models directly. Your conversations never touch our servers unencrypted.",
  },
];

export function HowItWorks() {
  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px]" />
        {/* Gradient orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neutral-100/40 dark:bg-neutral-800/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Get your private AI workspace in three simple steps
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <Card 
              key={step.number} 
              className="relative pt-8 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border-neutral-200/60 dark:border-neutral-700/60 shadow-sm hover:shadow-md hover:bg-white/90 dark:hover:bg-neutral-800/90 transition-all duration-300"
            >
              <CardContent className="pt-0">
                {/* Number Badge */}
                <div className="absolute -top-0 left-6 -translate-y-1/2">
                  <div className="size-10 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-semibold shadow-lg shadow-neutral-900/20 dark:shadow-neutral-950/30">
                    {step.number}
                  </div>
                </div>

                {/* Icon */}
                <div className="mt-4 mb-6 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/80 p-3 w-fit">
                  <step.icon className="size-6 text-neutral-700 dark:text-neutral-300" strokeWidth={1.5} />
                </div>

                {/* Content */}
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
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
