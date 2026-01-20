import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ShieldCheck, Lock, Sparkles, Cpu, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

export function Hero() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative flex flex-col items-center justify-center min-h-[90vh] px-4 pt-32 pb-16 overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 -z-10 bg-white dark:bg-neutral-950">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        {/* Animated Orbs */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-500/20 rounded-full blur-[100px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, -30, 0],
            y: [0, 50, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px]" 
        />
      </div>

      <div className="container relative z-10 flex flex-col items-center text-center">
        {/* Badge */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5 }}
        >
          <Badge 
            variant="outline" 
            className="mb-8 px-4 py-1.5 text-sm font-medium bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md border-neutral-200 dark:border-neutral-800 shadow-sm rounded-full"
          >
            <ShieldCheck className="size-3.5 mr-2 text-emerald-500" />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              End-to-End Encrypted Architecture
            </span>
          </Badge>
        </motion.div>

        {/* Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight max-w-5xl bg-clip-text text-transparent bg-gradient-to-b from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400"
        >
          Your private AI workspace. <br className="hidden md:block"/>
          <span className="text-neutral-900 dark:text-white">Uncompromisingly secure.</span>
        </motion.h1>

        {/* Subheading */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed"
        >
          Experience the power of advanced LLMs with the peace of mind that your data never leaves your device unencrypted. A sanctuary for your thoughts.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
        >
          {!isAuthenticated ? (
            <Link to="/auth" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 rounded-full text-base font-medium shadow-lg shadow-neutral-900/10 dark:shadow-neutral-950/30 hover:shadow-xl transition-all">
                Start My Private Workspace
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          ) : (
            <Link to="/app" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 rounded-full text-base font-medium shadow-lg shadow-neutral-900/10 dark:shadow-neutral-950/30 hover:shadow-xl transition-all">
                Go to Dashboard
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto h-12 px-8 rounded-full text-base font-medium bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm hover:bg-white dark:hover:bg-neutral-800 transition-all border-neutral-200 dark:border-neutral-800"
            onClick={() => document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" })}
          >
            How it Works
          </Button>
        </motion.div>

        {/* Abstract Floating UI / Illustration */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, rotateX: 20 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ duration: 0.8, delay: 0.4, type: "spring" }}
          className="mt-20 relative perspective-1000"
        >
          <div className="relative z-10 bg-neutral-900/5 dark:bg-white/5 p-2 rounded-2xl border border-neutral-200/20 dark:border-white/10 backdrop-blur-xl shadow-2xl">
            <div className="relative rounded-xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-inner">
              {/* Fake UI Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                <div className="flex gap-1.5">
                  <div className="size-3 rounded-full bg-red-400/80" />
                  <div className="size-3 rounded-full bg-amber-400/80" />
                  <div className="size-3 rounded-full bg-emerald-400/80" />
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
                  <Lock className="size-3" />
                  onera.enc
                </div>
              </div>
              
              {/* Fake UI Body */}
              <div className="p-8 w-[80vw] max-w-4xl aspect-[16/9] md:aspect-[21/9] flex flex-col items-center justify-center gap-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-sky-50 to-indigo-50 dark:from-sky-950/20 dark:to-indigo-950/20 opacity-50" />
                
                {/* Floating cards */}
                <motion.div 
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute left-10 top-10 p-4 rounded-xl bg-white dark:bg-neutral-800 shadow-lg border border-neutral-100 dark:border-neutral-700 max-w-[200px]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      <Cpu className="size-4" />
                    </div>
                    <div className="h-2 w-16 bg-neutral-100 dark:bg-neutral-700 rounded-full" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-700 rounded-full" />
                    <div className="h-1.5 w-2/3 bg-neutral-100 dark:bg-neutral-700 rounded-full" />
                  </div>
                </motion.div>

                <motion.div 
                  animate={{ y: [15, -15, 15] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute right-10 bottom-10 p-4 rounded-xl bg-white dark:bg-neutral-800 shadow-lg border border-neutral-100 dark:border-neutral-700 max-w-[200px]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400">
                      <Globe className="size-4" />
                    </div>
                    <div className="h-2 w-16 bg-neutral-100 dark:bg-neutral-700 rounded-full" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-700 rounded-full" />
                    <div className="h-1.5 w-3/4 bg-neutral-100 dark:bg-neutral-700 rounded-full" />
                  </div>
                </motion.div>

                <div className="z-10 text-center">
                   <div className="inline-flex items-center justify-center p-3 mb-4 rounded-2xl bg-white dark:bg-neutral-800 shadow-xl shadow-indigo-500/10 dark:shadow-indigo-900/20">
                     <Sparkles className="size-6 text-indigo-500" />
                   </div>
                   <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">Secure Intelligence</h3>
                   <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Your data staying exactly where it belongs.</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Reflection */}
          <div className="absolute -bottom-10 inset-x-10 h-20 bg-gradient-to-t from-neutral-200/50 to-transparent dark:from-neutral-800/50 blur-xl opacity-50 transform scale-y-[-1]" />
        </motion.div>
      </div>
    </section>
  );
}
