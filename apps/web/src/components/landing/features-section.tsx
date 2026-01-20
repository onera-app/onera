"use client";

import { motion } from "framer-motion";
import {
  Key,
  Database,
  Lock,
  Layers
} from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "Bring Your Own Key",
    description: "Connect directly to OpenAI, Anthropic, or DeepSeek using your own API keys. No middleman markup.",
    icon: Key,
    className: "md:col-span-2",
    gradient: "from-blue-500/20 to-cyan-500/20",
    textGradient: "text-blue-500"
  },
  {
    title: "Local-First Storage",
    description: "All your conversations and embeddings are stored locally in your browser (IndexedDB).",
    icon: Database,
    className: "md:col-span-1",
    gradient: "from-emerald-500/20 to-teal-500/20",
    textGradient: "text-emerald-500"
  },
  {
    title: "End-to-End Encryption",
    description: "Sync between devices securely. Your data is encrypted before it ever leaves your device.",
    icon: Lock,
    className: "md:col-span-1",
    gradient: "from-orange-500/20 to-amber-500/20",
    textGradient: "text-orange-500"
  },
  {
    title: "Multi-LLM Support",
    description: "Switch seamlessly between GPT-4o, Claude 3.5 Sonnet, and DeepSeek V3 in the same chat.",
    icon: Layers,
    className: "md:col-span-2",
    gradient: "from-purple-500/20 to-pink-500/20",
    textGradient: "text-purple-500"
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-4 bg-neutral-50 dark:bg-neutral-900/50 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Powerful features, <span className="text-neutral-400">zero compromise.</span>
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              Onera combines the convenience of a modernized chat interface with the security of a vault.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(0,1fr)]">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className={cn(
                "group relative overflow-hidden rounded-3xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-8 flex flex-col transition-all duration-300 hover:shadow-2xl hover:shadow-neutral-200/50 dark:hover:shadow-neutral-900/50",
                feature.className
              )}
            >
              {/* Gradient Splash */}
              <div className={cn(
                "absolute -right-20 -top-20 w-64 h-64 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br",
                feature.gradient
              )} />

              <div className="relative z-10">
                <div className={cn(
                  "size-12 rounded-xl flex items-center justify-center mb-6 bg-neutral-100 dark:bg-neutral-900 group-hover:scale-110 transition-transform duration-300",
                  feature.textGradient
                )}>
                  <feature.icon className="size-6" />
                </div>

                <h3 className="text-xl font-semibold mb-3 text-neutral-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed">
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
