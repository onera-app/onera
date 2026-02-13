"use client";

import { motion } from "framer-motion";
import { Cpu, Lock, Eye, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export function PrivacySection() {
  return (
    <section
      id="security"
      className="py-20 sm:py-32 px-4 border-t border-neutral-100 dark:border-neutral-700"
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="order-2 lg:order-1"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-5 text-neutral-900 dark:text-white">
              Locked away. <br className="hidden sm:block" />
              <span className="text-neutral-400 dark:text-neutral-300">
                Not just locked up.
              </span>
            </h2>

            <p className="text-lg text-neutral-500 dark:text-neutral-300 mb-8 leading-relaxed">
              Your conversations are processed inside protected hardware — a
              locked room that even we can't enter. Combined with encryption,
              your data is protected at every step.
            </p>

            <ul className="space-y-4 mb-10">
              {[
                { icon: Cpu, text: "Processed in protected hardware enclaves" },
                { icon: Eye, text: "Even we can't see your conversations" },
                {
                  icon: Fingerprint,
                  text: "Your browser verifies every connection",
                },
                { icon: Lock, text: "Chat history encrypted with your key" },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="flex-shrink-0 size-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                    <item.icon className="size-4" />
                  </div>
                  <span className="text-neutral-700 dark:text-neutral-300 text-sm sm:text-base">
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>

            <Link to="/auth">
              <Button
                size="lg"
                className="rounded-full px-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100"
              >
                Start Chatting Privately
              </Button>
            </Link>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative order-1 lg:order-2"
          >
            <div className="relative aspect-square sm:aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800">
              {/* Grid */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="relative w-full max-w-sm">
                  {/* Connection line */}
                  <div className="absolute inset-x-0 top-1/2 h-px bg-neutral-800 -translate-y-1/2" />

                  {/* Your prompt */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/4 sm:-translate-x-1/3 z-10">
                    <div className="size-14 sm:size-16 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-white/5">
                      <span className="font-bold text-neutral-900 text-xs sm:text-xs text-center leading-tight">
                        YOUR
                        <br />
                        PROMPT
                      </span>
                    </div>
                  </div>

                  {/* Enclave */}
                  <motion.div
                    animate={{
                      boxShadow: [
                        "0 0 0 0px rgba(16, 185, 129, 0)",
                        "0 0 0 15px rgba(16, 185, 129, 0)",
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="relative z-20 size-18 sm:size-24 mx-auto rounded-full bg-neutral-900 border-2 border-emerald-500/40 flex items-center justify-center"
                  >
                    <Cpu className="size-8 sm:size-10 text-emerald-500" />
                  </motion.div>

                  {/* Secure enclave */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 sm:translate-x-1/3 z-10">
                    <div className="size-14 sm:size-16 rounded-2xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center shadow-lg">
                      <span className="font-mono text-emerald-400 text-xs sm:text-xs text-center leading-tight">
                        SECURE
                        <br />
                        ENCLAVE
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
