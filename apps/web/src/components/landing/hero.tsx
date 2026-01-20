
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ShieldCheck, Lock, Sparkles, Cpu, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

export function Hero() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen px-4 pt-32 pb-20 overflow-hidden">
      {/* Premium Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-white/5 blur-[150px] animate-pulse-soft" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-white/5 blur-[150px] animate-pulse-soft delay-1000" />
      </div>

      <div className="container relative z-10 flex flex-col items-center text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Badge
            variant="outline"
            className="mb-8 px-4 py-1.5 text-sm font-medium bg-white/5 backdrop-blur-md border-white/10 shadow-lg rounded-full text-white/90"
          >
            <ShieldCheck className="size-3.5 mr-2 text-white" />
            <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              End-to-End Encrypted Architecture
            </span>
          </Badge>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="text-6xl md:text-8xl font-bold tracking-tight max-w-5xl text-foreground drop-shadow-2xl"
        >
          Your private AI workspace. <br className="hidden md:block" />
          <span className="text-white/50">
            Uncompromisingly secure.
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="mt-8 text-xl text-white/60 max-w-2xl leading-relaxed"
        >
          Experience the power of advanced LLMs with the peace of mind that your data never leaves your device unencrypted. A sanctuary for your thoughts.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="mt-10 flex flex-col sm:flex-row gap-5 w-full sm:w-auto"
        >
          {!isAuthenticated ? (
            <Link to="/auth" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 rounded-full text-lg font-semibold bg-white text-black hover:bg-white/90 shadow-xl shadow-white/10 transition-all hover:scale-105 active:scale-95">
                Start My Private Workspace
                <ArrowRight className="ml-2 size-5" />
              </Button>
            </Link>
          ) : (
            <Link to="/app" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 rounded-full text-lg font-semibold bg-white text-black hover:bg-white/90 shadow-xl shadow-white/10 transition-all hover:scale-105 active:scale-95">
                Go to Dashboard
                <ArrowRight className="ml-2 size-5" />
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto h-14 px-8 rounded-full text-lg font-medium bg-white/5 backdrop-blur-md hover:bg-white/10 text-white border-white/10 transition-all hover:scale-105 active:scale-95"
            onClick={() => document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" })}
          >
            How it Works
          </Button>
        </motion.div>

        {/* Abstract Floating UI / Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, rotateX: 20 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ duration: 1, delay: 0.5, type: "spring", bounce: 0.4 }}
          className="mt-24 relative perspective-1000 w-full max-w-5xl"
        >
          <div className="relative z-10 bg-black/40 p-3 rounded-3xl border border-white/10 backdrop-blur-2xl shadow-2xl ring-1 ring-white/5">
            <div className="relative rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/5 shadow-inner min-h-[400px]">
              {/* Fake UI Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5 backdrop-blur-md">
                <div className="flex gap-2">
                  <div className="size-3 rounded-full bg-red-500/80" />
                  <div className="size-3 rounded-full bg-amber-500/80" />
                  <div className="size-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex items-center gap-2 text-xs text-white/40 font-mono bg-black/40 px-3 py-1 rounded-full border border-white/5">
                  <Lock className="size-3" />
                  onera.enc
                </div>
              </div>

              {/* Fake UI Body */}
              <div className="p-10 flex flex-col items-center justify-center gap-8 relative overflow-hidden min-h-[400px]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(66,66,66,0.1)_0%,_transparent_50%)]" />

                {/* Floating cards */}
                <motion.div
                  animate={{ y: [-15, 15, -15], rotate: [-2, 2, -2] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute left-[10%] top-[20%] p-5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl max-w-[240px] z-20"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                      <Cpu className="size-5" />
                    </div>
                    <div className="h-2.5 w-20 bg-white/10 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 w-full bg-white/5 rounded-full" />
                    <div className="h-2 w-3/4 bg-white/5 rounded-full" />
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [15, -15, 15], rotate: [2, -2, 2] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute right-[10%] bottom-[20%] p-5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl max-w-[240px] z-20"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400">
                      <Globe className="size-5" />
                    </div>
                    <div className="h-2.5 w-20 bg-white/10 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 w-full bg-white/5 rounded-full" />
                    <div className="h-2 w-3/4 bg-white/5 rounded-full" />
                  </div>
                </motion.div>

                {/* Central Focus */}
                <div className="z-10 text-center relative">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-[60px] rounded-full" />
                  <div className="relative inline-flex items-center justify-center p-5 mb-6 rounded-3xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl shadow-indigo-500/20">
                    <Sparkles className="size-10 text-primary" />
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-2 tracking-tight">Secure Intelligence</h3>
                  <p className="text-white/50 text-base">Your data staying exactly where it belongs.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Reflection */}
          <div className="absolute -bottom-16 inset-x-20 h-32 bg-gradient-to-t from-primary/10 to-transparent blur-3xl opacity-40 transform scale-y-[-1]" />
        </motion.div>
      </div>
    </section>
  );
}
