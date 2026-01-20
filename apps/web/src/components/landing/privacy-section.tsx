"use client";

import { motion } from "framer-motion";
import { ShieldCheck, EyeOff, Lock, ServerOff, FileKey } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrivacySection() {
  return (
    <section id="security" className="py-32 px-4 bg-white dark:bg-neutral-950 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium mb-6">
              <ShieldCheck className="size-4" />
              <span>Privacy First Architecture</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              We can't see your data. <br />
              <span className="text-neutral-400">Even if we wanted to.</span>
            </h2>

            <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 leading-relaxed">
              Onera uses client-side encryption. Your chats are encrypted on your device before they ever touch our sync servers. The encryption keys never leave your custody.
            </p>

            <ul className="space-y-4 mb-10">
              {[
                { icon: EyeOff, text: "No eavesdropping on conversations" },
                { icon: ServerOff, text: "Zero-knowledge sync server" },
                { icon: FileKey, text: "You control your encryption keys" },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="flex-shrink-0 size-8 rounded-lg bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-900 dark:text-white">
                    <item.icon className="size-4" />
                  </div>
                  <span className="text-neutral-700 dark:text-neutral-300 font-medium">{item.text}</span>
                </li>
              ))}
            </ul>

            <Button size="lg" variant="outline" className="rounded-full">
              Read Security Whitepaper
            </Button>
          </motion.div>

          {/* Visual Content: Encryption Animation Simulation */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            {/* Abstract representation of encryption */}
            <div className="relative aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden bg-neutral-900 dark:bg-neutral-900 border border-neutral-800 shadow-2xl">
              {/* Grid Background */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-full max-w-sm">
                  {/* Sender (You) */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
                    <div className="size-16 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-white/10">
                      <span className="font-bold text-neutral-900 text-xs">PLAINTEXT</span>
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
                    className="relative z-20 size-24 mx-auto rounded-full bg-neutral-800 border-4 border-emerald-500/50 flex items-center justify-center"
                  >
                    <Lock className="size-10 text-emerald-500" />
                  </motion.div>

                  {/* Floating Particles */}
                  <motion.div
                    animate={{ x: [-100, 100], opacity: [0, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 left-1/2 -mt-6 w-12 h-1 bg-emerald-500/50 blur-sm rounded-full"
                  />
                  <motion.div
                    animate={{ x: [100, -100], opacity: [0, 1, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 left-1/2 mt-6 w-8 h-1 bg-blue-500/50 blur-sm rounded-full"
                  />

                  {/* Server (Encrypted Blob) */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 flex flex-col items-center gap-2">
                    <div className="size-16 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center shadow-lg">
                      <span className="font-mono text-neutral-500 text-xs text-center p-1 break-all leading-none opacity-50">
                        0x83F...
                        9A2B1...
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
              className="absolute -bottom-6 -left-6 bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-xl border border-neutral-100 dark:border-neutral-700 flex items-center gap-3 max-w-xs"
            >
              <div className="size-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                <ShieldCheck className="size-5" />
              </div>
              <div className="text-sm">
                <div className="font-semibold text-neutral-900 dark:text-white">AES-256-GCM</div>
                <div className="text-neutral-500 dark:text-neutral-400">Military-grade encryption</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
