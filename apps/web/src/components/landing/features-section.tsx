"use client";

import { motion } from "framer-motion";
import { Cpu, CheckCircle, Lock, Key } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "We can't read your chats",
    description:
      "Your messages are processed inside protected hardware enclaves. Even our own engineers can't access them.",
    icon: Cpu,
    className: "md:col-span-2",
  },
  {
    title: "You can verify it",
    description:
      "Your browser automatically verifies our servers are running exactly the code we published. No blind trust required.",
    icon: CheckCircle,
    className: "md:col-span-1",
  },
  {
    title: "Encrypted history",
    description:
      "Your chat history is encrypted with a key only you hold. We store data we can't read.",
    icon: Lock,
    className: "md:col-span-1",
  },
  {
    title: "Bring your own keys",
    description:
      "Use your own OpenAI or Anthropic API keys if you prefer. Your chat history stays encrypted either way.",
    icon: Key,
    className: "md:col-span-2",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-32 px-4 border-t border-neutral-100 dark:border-neutral-800/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 sm:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 sm:mb-5 text-neutral-900 dark:text-white">
              Private by design.
            </h2>
            <p className="text-lg sm:text-xl text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto">
              Not just a promise — we built it so we can't access your data.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className={cn(
                "rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 flex flex-col bg-white dark:bg-neutral-900/50 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors",
                feature.className
              )}
            >
              <div className="size-11 rounded-xl flex items-center justify-center mb-5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                <feature.icon className="size-5" />
              </div>

              <h3 className="text-lg sm:text-xl font-semibold mb-2 text-neutral-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-sm sm:text-base">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
