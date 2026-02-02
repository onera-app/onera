import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Lock, Shield, Key } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

export function Hero() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen px-4 pt-28 sm:pt-32 pb-16 sm:pb-20 overflow-hidden">
      {/* Premium Hero Background - Enhances the page gradient */}
      <div className="absolute inset-0 -z-10">
        {/* Spotlight effect from top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[60%] bg-[radial-gradient(ellipse_at_center,rgba(64,64,64,0.08)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)]" />
        
        {/* Animated gradient orbs for hero section - neutral */}
        <div className="absolute top-[10%] left-[15%] w-[300px] h-[300px] rounded-full bg-gradient-to-br from-neutral-400/12 to-neutral-500/8 dark:from-white/12 dark:to-white/6 blur-[80px] animate-gradient-float" />
        <div className="absolute top-[20%] right-[10%] w-[350px] h-[350px] rounded-full bg-gradient-to-bl from-neutral-500/10 to-neutral-400/6 dark:from-white/10 dark:to-white/5 blur-[90px] animate-gradient-float-delayed" />
        <div className="absolute bottom-[15%] left-[5%] w-[280px] h-[280px] rounded-full bg-gradient-to-tr from-neutral-400/8 to-neutral-300/4 dark:from-white/8 dark:to-white/4 blur-[70px] animate-gradient-float-slow" />
        <div className="absolute bottom-[25%] right-[15%] w-[250px] h-[250px] rounded-full bg-gradient-to-tl from-neutral-500/8 to-neutral-400/4 dark:from-white/8 dark:to-white/4 blur-[60px] animate-gradient-float-reverse" />
        
        {/* Center glow for text emphasis */}
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(100,100,100,0.06)_0%,transparent_60%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08)_0%,transparent_60%)]" />
        
        {/* Grid pattern overlay for texture */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.01)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black_40%,transparent_100%)]" />
      </div>

      <div className="container relative z-10 flex flex-col items-center text-center max-w-4xl">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Badge
            variant="outline"
            className="mb-6 sm:mb-8 px-4 py-1.5 text-sm font-medium bg-neutral-100/80 dark:bg-white/5 backdrop-blur-md border-neutral-200 dark:border-white/10 shadow-lg rounded-full text-neutral-700 dark:text-white/90"
          >
            <Lock className="size-3.5 mr-2 text-neutral-700 dark:text-white" />
            <span>Private AI Chat</span>
          </Badge>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-foreground"
        >
          Your AI. <br className="hidden sm:block" />
          <span className="text-neutral-500 dark:text-white/75">
            Your privacy.
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="mt-6 sm:mt-8 text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed px-2"
        >
          Have conversations you'd never type into ChatGPT. We built Onera so your chats stay completely private — from everyone, including us.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4 sm:px-0"
        >
          {!isAuthenticated ? (
            <Link to="/auth" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 rounded-full text-base sm:text-lg font-semibold shadow-xl transition-all hover:scale-105 active:scale-95">
                Start Chatting Free
                <ArrowRight className="ml-2 size-4 sm:size-5" />
              </Button>
            </Link>
          ) : (
            <Link to="/app" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 rounded-full text-base sm:text-lg font-semibold shadow-xl transition-all hover:scale-105 active:scale-95">
                Go to Dashboard
                <ArrowRight className="ml-2 size-4 sm:size-5" />
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 rounded-full text-base sm:text-lg font-medium transition-all hover:scale-105 active:scale-95"
            onClick={() => document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" })}
          >
            How It Works
          </Button>
        </motion.div>

        {/* App Preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="mt-16 sm:mt-20 w-full max-w-5xl"
        >
          <div className="relative">
            {/* Glow effect behind */}
            <div className="absolute -inset-4 bg-gradient-to-r from-neutral-200/50 via-neutral-100/30 to-neutral-200/50 dark:from-neutral-800/50 dark:via-neutral-900/30 dark:to-neutral-800/50 rounded-2xl blur-2xl opacity-60" />
            
            <div className="relative rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 shadow-2xl shadow-neutral-900/10 dark:shadow-black/40 overflow-hidden">
              {/* Window Header */}
              <div className="flex items-center px-4 py-2.5 border-b border-neutral-200/80 dark:border-neutral-800 bg-neutral-100/80 dark:bg-neutral-900/80">
                <div className="flex gap-1.5">
                  <div className="size-3 rounded-full bg-[#FF5F56]" />
                  <div className="size-3 rounded-full bg-[#FFBD2E]" />
                  <div className="size-3 rounded-full bg-[#27CA40]" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-3 py-1 rounded-md bg-neutral-200/60 dark:bg-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                    onera.chat
                  </div>
                </div>
                <div className="w-[52px]" />
              </div>

              {/* App Layout */}
              <div className="flex min-h-[340px] sm:min-h-[400px]">
                {/* Sidebar */}
                <div className="hidden sm:flex w-56 flex-col border-r border-neutral-200/80 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Chats</span>
                    <div className="size-5 rounded bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
                      <span className="text-[10px] text-neutral-500">+</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="p-2 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700">
                      <div className="flex items-center gap-2">
                        <Lock className="size-3 text-emerald-500" />
                        <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">Privacy research</span>
                      </div>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-500 mt-1 truncate">Zero-knowledge encryption...</p>
                    </div>
                    <div className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Lock className="size-3 text-neutral-400" />
                        <span className="text-xs text-neutral-600 dark:text-neutral-400 truncate">Code review</span>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Lock className="size-3 text-neutral-400" />
                        <span className="text-xs text-neutral-600 dark:text-neutral-400 truncate">Writing assistant</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Encryption badge */}
                  <div className="mt-auto pt-3 border-t border-neutral-200/80 dark:border-neutral-800">
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-500">
                      <Shield className="size-3" />
                      <span>All chats encrypted</span>
                    </div>
                  </div>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col bg-white dark:bg-neutral-950">
                  {/* Chat header */}
                  <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 dark:from-neutral-300 dark:to-neutral-100 flex items-center justify-center">
                        <span className="text-[10px] text-white dark:text-neutral-900 font-medium">AI</span>
                      </div>
                      <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">LLM</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                      <Lock className="size-2.5 text-emerald-600 dark:text-emerald-500" />
                      <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">Private</span>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 p-4 space-y-4 overflow-hidden">
                    <div className="flex justify-end">
                      <div className="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-br-sm bg-neutral-900 dark:bg-neutral-700 text-white text-sm">
                        Explain end-to-end encryption simply
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <div className="size-6 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 dark:from-neutral-300 dark:to-neutral-100 flex-shrink-0 flex items-center justify-center">
                        <span className="text-[9px] text-white dark:text-neutral-900 font-medium">AI</span>
                      </div>
                      <div className="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-tl-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-sm leading-relaxed">
                        Think of it like sending a letter in a locked box. Only you and the recipient have the key. Even the postal service can't open it.
                      </div>
                    </div>
                  </div>

                  {/* Input */}
                  <div className="p-3 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                      <span className="text-sm text-neutral-400 flex-1">Message...</span>
                      <Key className="size-3.5 text-neutral-400" />
                    </div>
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
