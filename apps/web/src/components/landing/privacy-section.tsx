"use client";

import { motion } from "framer-motion";
import { Cpu, Lock, Eye, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export function PrivacySection() {
  return (
    <section id="security" className="py-20 sm:py-32 px-4 bg-white dark:bg-neutral-950 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium mb-4 sm:mb-6">
              <Lock className="size-4" />
              <span>How We Protect You</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 sm:mb-6">
              Locked away. <br className="hidden sm:block" />
              <span className="text-neutral-500 dark:text-neutral-400">Not just locked up.</span>
            </h2>

            <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 mb-6 sm:mb-8 leading-relaxed">
              Your conversations are processed inside special protected hardware — a locked room that even we can't enter. Combined with encryption, your data is protected at every step.
            </p>

            <ul className="space-y-3 sm:space-y-4 mb-8 sm:mb-10">
              {[
                { icon: Cpu, text: "Processed in protected hardware" },
                { icon: Eye, text: "Even we can't see your chats" },
                { icon: Fingerprint, text: "Your browser verifies every connection" },
                { icon: Lock, text: "Chat history encrypted with your key" },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="flex-shrink-0 size-8 rounded-lg bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-900 dark:text-white">
                    <item.icon className="size-4" />
                  </div>
                  <span className="text-neutral-700 dark:text-neutral-300 font-medium text-sm sm:text-base">{item.text}</span>
                </li>
              ))}
            </ul>

            <Link to="/auth">
              <Button size="lg" className="rounded-full">
                Start Chatting Privately
              </Button>
            </Link>
          </motion.div>

          {/* Visual Content: Encryption Animation Simulation */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative order-1 lg:order-2"
          >
            {/* Abstract representation of encryption */}
            <div className="relative aspect-square sm:aspect-[4/3] rounded-2xl sm:rounded-3xl overflow-hidden bg-neutral-900 dark:bg-neutral-900 border border-neutral-800 shadow-2xl">
              {/* Grid Background */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />

              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="relative w-full max-w-sm">
                  {/* Sender (You) */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/4 sm:-translate-x-1/2 z-10 flex flex-col items-center gap-2">
                    <div className="size-12 sm:size-16 rounded-xl sm:rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-white/10">
                      <span className="font-bold text-neutral-900 text-[10px] sm:text-xs">YOUR<br/>PROMPT</span>
                    </div>
                  </div>

                  {/* Connectors */}
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-neutral-800 -translate-y-1/2" />

                  {/* The Vault (Encryption) */}
                  <motion.div
                    animate={{
                      boxShadow: ["0 0 0 0px rgba(16, 185, 129, 0)", "0 0 0 20px rgba(16, 185, 129, 0)"],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="relative z-20 size-16 sm:size-24 mx-auto rounded-full bg-neutral-800 border-4 border-emerald-500/50 flex items-center justify-center"
                  >
                    <Cpu className="size-7 sm:size-10 text-emerald-500" />
                  </motion.div>

                  {/* Floating Particles */}
                  <motion.div
                    animate={{ x: [-100, 100], opacity: [0, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 left-1/2 -mt-6 w-8 sm:w-12 h-1 bg-emerald-500/50 blur-sm rounded-full"
                  />
                  <motion.div
                    animate={{ x: [100, -100], opacity: [0, 1, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 left-1/2 mt-6 w-6 sm:w-8 h-1 bg-blue-500/50 blur-sm rounded-full"
                  />

                  {/* Server (Encrypted Blob) */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 sm:translate-x-1/2 z-10 flex flex-col items-center gap-2">
                    <div className="size-12 sm:size-16 rounded-xl sm:rounded-2xl bg-emerald-900 border border-emerald-700 flex items-center justify-center shadow-lg">
                      <span className="font-mono text-emerald-400 text-[10px] sm:text-xs text-center p-1">
                        SECURE<br/>ENCLAVE
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Card Overlay */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="absolute -bottom-4 sm:-bottom-6 left-2 sm:-left-6 bg-white dark:bg-neutral-800 p-3 sm:p-4 rounded-xl shadow-xl border border-neutral-100 dark:border-neutral-700 flex items-center gap-2 sm:gap-3 max-w-[200px] sm:max-w-xs"
            >
              <div className="size-8 sm:size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <Lock className="size-4 sm:size-5" />
              </div>
              <div className="text-xs sm:text-sm">
                <div className="font-semibold text-neutral-900 dark:text-white">Protected Hardware</div>
                <div className="text-neutral-600 dark:text-neutral-300">Your data stays locked</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
