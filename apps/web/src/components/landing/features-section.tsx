import { Card, CardContent } from "@/components/ui/card";
import {
  MessageSquare,
  Shield,
  Zap,
  Globe,
  FileText,
  X,
} from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Multi-provider support",
    description: "Connect to OpenAI, Anthropic, Ollama, and more with your own API keys",
  },
  {
    icon: Shield,
    title: "Client-side encryption",
    description: "All encryption happens in your browser. Server only sees encrypted data",
  },
  {
    icon: Zap,
    title: "Direct API connections",
    description: "Chat directly with AI providers. No proxy, no delays, no middleman",
  },
  {
    icon: Globe,
    title: "Access anywhere",
    description: "Use from any device with a web browser. Your data syncs encrypted",
  },
  {
    icon: FileText,
    title: "Notes & prompts",
    description: "Save encrypted notes and prompt templates for quick access",
  },
  {
    icon: X,
    title: "No vendor lock-in",
    description: "Export your data anytime. Cancel whenever you want",
  },
];

export function FeaturesSection() {
  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            What You Get
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need for private AI conversations
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card 
              key={feature.title} 
              className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border-neutral-200/60 dark:border-neutral-700/60 shadow-sm hover:shadow-md hover:bg-white/90 dark:hover:bg-neutral-800/90 transition-all duration-300"
            >
              <CardContent className="pt-6">
                {/* Icon */}
                <div className="mb-4 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/80 p-3 w-fit">
                  <feature.icon className="size-6 text-neutral-700 dark:text-neutral-300" strokeWidth={1.5} />
                </div>

                {/* Content */}
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
