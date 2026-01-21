
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ShieldCheck, Lock, Sparkles, MessageCircle, Heart } from "lucide-react";
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
            <ShieldCheck className="size-3.5 mr-2 text-neutral-700 dark:text-white" />
            <span>Your conversations stay private</span>
          </Badge>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-foreground"
        >
          Chat with AI. <br className="hidden sm:block" />
          <span className="text-neutral-500 dark:text-white/75">
            Keep your privacy.
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="mt-6 sm:mt-8 text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed px-2"
        >
          Bring your own API keys or run models locally with Ollama. Your chats are end-to-end encrypted. We can't read them. Nobody can.
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
                Try It Free
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
            See How It Works
          </Button>
        </motion.div>

        {/* Abstract Floating UI / Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, rotateX: 20 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ duration: 1, delay: 0.5, type: "spring", bounce: 0.4 }}
          className="mt-16 sm:mt-24 relative perspective-1000 w-full max-w-5xl"
        >
          <div className="relative z-10 bg-neutral-100/80 dark:bg-black/40 p-2 sm:p-3 rounded-2xl sm:rounded-3xl border border-neutral-200/60 dark:border-white/10 backdrop-blur-2xl shadow-2xl">
            <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-neutral-50 dark:bg-[#0A0A0A] border border-neutral-200/60 dark:border-white/5 shadow-inner min-h-[280px] sm:min-h-[400px]">
              {/* Fake UI Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-200/60 dark:border-white/5 bg-neutral-100/80 dark:bg-white/5 backdrop-blur-md">
                <div className="flex gap-1.5 sm:gap-2">
                  <div className="size-2.5 sm:size-3 rounded-full bg-red-500/80" />
                  <div className="size-2.5 sm:size-3 rounded-full bg-amber-500/80" />
                  <div className="size-2.5 sm:size-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-neutral-600 dark:text-white/70 font-mono bg-neutral-200/80 dark:bg-black/40 px-2 sm:px-3 py-1 rounded-full border border-neutral-300/60 dark:border-white/10">
                  <Lock className="size-2.5 sm:size-3" />
                  Private Chat
                </div>
              </div>

              {/* Fake UI Body */}
              <div className="p-6 sm:p-10 flex flex-col items-center justify-center gap-6 sm:gap-8 relative overflow-hidden min-h-[220px] sm:min-h-[400px]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(66,66,66,0.05)_0%,_transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,_rgba(66,66,66,0.1)_0%,_transparent_50%)]" />

                {/* Floating cards - hidden on small screens */}
                <motion.div
                  animate={{ y: [-15, 15, -15], rotate: [-2, 2, -2] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="hidden md:block absolute left-[5%] lg:left-[10%] top-[20%] p-4 lg:p-5 rounded-2xl bg-white/90 dark:bg-black/60 backdrop-blur-xl border border-neutral-200/60 dark:border-white/10 shadow-2xl max-w-[180px] lg:max-w-[240px] z-20"
                >
                  <div className="flex items-center gap-2 lg:gap-3 mb-2 lg:mb-3">
                    <div className="p-1.5 lg:p-2 rounded-xl bg-indigo-500/20 text-indigo-500 dark:text-indigo-400">
                      <MessageCircle className="size-4 lg:size-5" />
                    </div>
                    <div className="h-2 lg:h-2.5 w-16 lg:w-20 bg-neutral-200 dark:bg-white/10 rounded-full" />
                  </div>
                  <div className="space-y-1.5 lg:space-y-2">
                    <div className="h-1.5 lg:h-2 w-full bg-neutral-100 dark:bg-white/5 rounded-full" />
                    <div className="h-1.5 lg:h-2 w-3/4 bg-neutral-100 dark:bg-white/5 rounded-full" />
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [15, -15, 15], rotate: [2, -2, 2] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="hidden md:block absolute right-[5%] lg:right-[10%] bottom-[20%] p-4 lg:p-5 rounded-2xl bg-white/90 dark:bg-black/60 backdrop-blur-xl border border-neutral-200/60 dark:border-white/10 shadow-2xl max-w-[180px] lg:max-w-[240px] z-20"
                >
                  <div className="flex items-center gap-2 lg:gap-3 mb-2 lg:mb-3">
                    <div className="p-1.5 lg:p-2 rounded-xl bg-pink-500/20 text-pink-500 dark:text-pink-400">
                      <Heart className="size-4 lg:size-5" />
                    </div>
                    <div className="h-2 lg:h-2.5 w-16 lg:w-20 bg-neutral-200 dark:bg-white/10 rounded-full" />
                  </div>
                  <div className="space-y-1.5 lg:space-y-2">
                    <div className="h-1.5 lg:h-2 w-full bg-neutral-100 dark:bg-white/5 rounded-full" />
                    <div className="h-1.5 lg:h-2 w-3/4 bg-neutral-100 dark:bg-white/5 rounded-full" />
                  </div>
                </motion.div>

                {/* Central Focus */}
                <div className="z-10 text-center relative">
                  <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/20 blur-[60px] rounded-full" />
                  <div className="relative inline-flex items-center justify-center p-4 sm:p-5 mb-4 sm:mb-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-black/80 backdrop-blur-xl border border-neutral-200/60 dark:border-white/10 shadow-2xl shadow-indigo-500/10 dark:shadow-indigo-500/20">
                    <Sparkles className="size-8 sm:size-10 text-primary" />
                  </div>
                  <h3 className="text-xl sm:text-3xl font-bold text-neutral-900 dark:text-white mb-1 sm:mb-2 tracking-tight">Private by Design</h3>
                  <p className="text-neutral-600 dark:text-white/75 text-sm sm:text-base">Your thoughts stay yours.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Reflection */}
          <div className="absolute -bottom-16 inset-x-10 sm:inset-x-20 h-32 bg-gradient-to-t from-primary/5 dark:from-primary/10 to-transparent blur-3xl opacity-40 transform scale-y-[-1]" />
        </motion.div>
      </div>
    </section>
  );
}
