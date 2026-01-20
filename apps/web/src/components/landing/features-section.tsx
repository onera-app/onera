"use client";

import { motion } from "framer-motion";
import {
  Shield,
  Key,
  Lock,
  Sparkles,
  ServerOff,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "Bring Your Own API Keys",
    description: "Use your own OpenAI, Anthropic, or other provider keys. They're stored encrypted on your device, never on our servers. We literally can't see them.",
    icon: Key,
    className: "md:col-span-2",
  },
  {
    title: "Client-Side Encryption",
    description: "All data is encrypted in your browser using AES-256-GCM before transmission. Our servers only ever see ciphertext.",
    icon: Shield,
    className: "md:col-span-1",
  },
  {
    title: "Zero-Knowledge Architecture",
    description: "Your master key never leaves your device. We can't decrypt your data, reset your password, or comply with data requests.",
    icon: Lock,
    className: "md:col-span-1",
  },
  {
    title: "Local Ollama Support",
    description: "For maximum privacy, run models locally via Ollama. Your prompts never leave your machine. Combined with E2EE storage, this is fully air-gapped AI.",
    icon: ServerOff,
    className: "md:col-span-1",
  },
  {
    title: "Self-Host Privacy, Zero DevOps",
    description: "Get the privacy of self-hosting without managing servers, updates, or backups. E2EE sync across devices, automatic encrypted backups, polished UI. Your data, our infrastructure.",
    icon: RefreshCw,
    className: "md:col-span-1",
  },
  {
    title: "Cloud or Local, Your Choice",
    description: "Use GPT-4, Claude, or run Llama/Mistral locally. Switch between cloud speed and local privacy based on your needs. All with the same encrypted chat history.",
    icon: Sparkles,
    className: "md:col-span-2",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-32 px-4 relative overflow-hidden bg-neutral-50 dark:bg-transparent">
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-12 sm:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 sm:mb-6 px-2">
              All the power. <span className="text-muted-foreground">None of the snooping.</span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Finally, an AI assistant that respects your privacy as much as you do.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 auto-rows-[minmax(0,1fr)]">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className={cn(
                "group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-white/5 backdrop-blur-md border border-neutral-200/60 dark:border-white/10 p-6 sm:p-8 flex flex-col transition-all duration-300 hover:bg-neutral-50 dark:hover:bg-white/10 hover:shadow-xl dark:hover:shadow-2xl hover:border-neutral-300/60 dark:hover:border-white/20",
                feature.className
              )}
            >
              <div className="relative z-10">
                <div className="size-12 sm:size-14 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 bg-neutral-100 dark:bg-black/40 border border-neutral-200/60 dark:border-white/5 group-hover:scale-110 transition-transform duration-300 shadow-lg text-neutral-700 dark:text-white">
                  <feature.icon className="size-6 sm:size-7" />
                </div>

                <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
