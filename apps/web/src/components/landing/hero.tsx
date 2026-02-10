import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lock, Shield, Key, Github } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

export function Hero() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen px-4 pt-28 sm:pt-32 pb-16 sm:pb-20 overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:64px_64px]" />
        {/* Fade the grid at edges */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,transparent_40%,white_100%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,transparent_40%,rgb(10,10,10)_100%)]" />
      </div>

      <div className="container relative z-10 flex flex-col items-center text-center max-w-4xl">
        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-4xl sm:text-5xl md:text-7xl lg:text-[5.25rem] font-bold tracking-tight leading-[1.08] text-neutral-900 dark:text-white"
        >
          Chat with AI.{" "}
          <br className="hidden sm:block" />
          <span className="text-neutral-400 dark:text-neutral-500">
            Keep your privacy.
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="mt-6 sm:mt-8 text-lg sm:text-xl text-neutral-500 dark:text-neutral-400 max-w-lg leading-relaxed"
        >
          End-to-end encrypted AI chat. Your conversations stay private — from everyone, including us.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 w-full sm:w-auto px-4 sm:px-0"
        >
          {!isAuthenticated ? (
            <Link to="/auth" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-12 px-8 rounded-full text-base font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
              >
                Get Started
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          ) : (
            <Link to="/app" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-12 px-8 rounded-full text-base font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
              >
                Open App
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto h-12 px-8 rounded-full text-base font-medium border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
            onClick={() => document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" })}
          >
            How It Works
          </Button>
        </motion.div>

        {/* Links row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35, ease: "easeOut" }}
          className="mt-6 flex items-center gap-5"
        >
          <a
            href="https://github.com/onera-app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <Github className="size-4" />
            <span>Star on GitHub</span>
          </a>
          <span className="text-neutral-300 dark:text-neutral-700">|</span>
          <a
            href="https://apps.apple.com/us/app/onera-private-ai-chat/id6758128954"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 21.99C7.79 22.03 6.8 20.68 5.96 19.47C4.25 16.99 2.97 12.5 4.7 9.56C5.55 8.08 7.13 7.16 8.82 7.14C10.1 7.12 11.32 8.01 12.11 8.01C12.89 8.01 14.37 6.94 15.92 7.1C16.57 7.13 18.39 7.36 19.56 9.07C19.47 9.13 17.29 10.39 17.31 13.05C17.34 16.24 20.06 17.27 20.09 17.28C20.06 17.35 19.67 18.72 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.09 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
            </svg>
            <span>Download for iOS</span>
          </a>
        </motion.div>

        {/* App Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="mt-16 sm:mt-20 w-full max-w-5xl"
        >
          <div className="relative rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl shadow-neutral-900/5 dark:shadow-black/30 overflow-hidden">
            {/* Window Header */}
            <div className="flex items-center px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
              <div className="flex gap-1.5">
                <div className="size-3 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                <div className="size-3 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                <div className="size-3 rounded-full bg-neutral-300 dark:bg-neutral-700" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
                  onera.chat
                </div>
              </div>
              <div className="w-[52px]" />
            </div>

            {/* App Layout */}
            <div className="flex min-h-[340px] sm:min-h-[400px]">
              {/* Sidebar */}
              <div className="hidden sm:flex w-56 flex-col border-r border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Chats</span>
                  <div className="size-5 rounded bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                    <span className="text-[10px] text-neutral-400">+</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="p-2 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700">
                    <div className="flex items-center gap-2">
                      <Lock className="size-3 text-emerald-500" />
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200 truncate">Privacy research</span>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-1 truncate">Zero-knowledge encryption...</p>
                  </div>
                  <div className="p-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Lock className="size-3 text-neutral-300 dark:text-neutral-600" />
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">Code review</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Lock className="size-3 text-neutral-300 dark:text-neutral-600" />
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">Writing assistant</span>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-500">
                    <Shield className="size-3" />
                    <span>All chats encrypted</span>
                  </div>
                </div>
              </div>

              {/* Main Chat Area */}
              <div className="flex-1 flex flex-col bg-white dark:bg-neutral-950">
                <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-full bg-neutral-900 dark:bg-neutral-200 flex items-center justify-center">
                      <span className="text-[10px] text-white dark:text-neutral-900 font-medium">AI</span>
                    </div>
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">LLM</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
                    <Lock className="size-2.5 text-emerald-600 dark:text-emerald-500" />
                    <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">E2EE</span>
                  </div>
                </div>

                <div className="flex-1 p-4 space-y-4 overflow-hidden">
                  <div className="flex justify-end">
                    <div className="max-w-[80%] px-3.5 py-2 rounded-2xl rounded-br-sm bg-neutral-900 dark:bg-neutral-700 text-white text-sm">
                      Explain end-to-end encryption simply
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="size-6 rounded-full bg-neutral-900 dark:bg-neutral-200 flex-shrink-0 flex items-center justify-center">
                      <span className="text-[9px] text-white dark:text-neutral-900 font-medium">AI</span>
                    </div>
                    <div className="max-w-[80%] px-3.5 py-2 rounded-2xl rounded-tl-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-sm leading-relaxed">
                      Think of it like sending a letter in a locked box. Only you and the recipient have the key. Even the postal service can't open it.
                    </div>
                  </div>
                </div>

                <div className="p-3 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <span className="text-sm text-neutral-400 flex-1">Message...</span>
                    <Key className="size-3.5 text-neutral-300 dark:text-neutral-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
