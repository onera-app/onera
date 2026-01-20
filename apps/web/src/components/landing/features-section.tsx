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
    gradient: "from-white/10 to-transparent",
    textGradient: "text-white"
  },
  {
    title: "Local-First Storage",
    description: "All your conversations and embeddings are stored locally in your browser (IndexedDB).",
    icon: Database,
    className: "md:col-span-1",
    gradient: "from-white/10 to-transparent",
    textGradient: "text-white"
  },
  {
    title: "End-to-End Encryption",
    description: "Sync between devices securely. Your data is encrypted before it ever leaves your device.",
    icon: Lock,
    className: "md:col-span-1",
    gradient: "from-white/10 to-transparent",
    textGradient: "text-white"
  },
  {
    title: "Multi-LLM Support",
    description: "Switch seamlessly between GPT-4o, Claude 3.5 Sonnet, and DeepSeek V3 in the same chat.",
    icon: Layers,
    className: "md:col-span-2",
    gradient: "from-white/10 to-transparent",
    textGradient: "text-white"
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-32 px-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-transparent" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-white">
              Powerful features, <span className="text-white/70">zero compromise.</span>
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Onera combines the modernized chat interface you love with the security of an offline vault.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(0,1fr)]">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className={cn(
                "group relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-8 flex flex-col transition-all duration-300 hover:bg-white/10 hover:shadow-2xl hover:border-white/20",
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
                  "size-14 rounded-2xl flex items-center justify-center mb-6 bg-black/40 border border-white/5 group-hover:scale-110 transition-transform duration-300 shadow-lg",
                  feature.textGradient
                )}>
                  <feature.icon className="size-7" />
                </div>

                <h3 className="text-2xl font-semibold mb-3 text-white">
                  {feature.title}
                </h3>
                <p className="text-white/80 leading-relaxed text-base">
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
