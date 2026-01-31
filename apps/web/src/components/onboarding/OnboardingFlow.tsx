"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  Shield,
  Lock,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OnboardingFlowProps {
  onComplete: () => void;
}

const steps = [
  {
    id: "welcome",
    title: "Welcome to Onera",
    subtitle: "Private AI, powered by secure enclaves",
  },
  {
    id: "protection",
    title: "How We Protect You",
    subtitle: "Your prompts never leave a hardware vault",
  },
  {
    id: "verification",
    title: "Verified Security",
    subtitle: "Trust, but verify — automatically",
  },
  {
    id: "recovery",
    title: "Your Recovery Key",
    subtitle: "The key to your encrypted data",
  },
];

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-gradient-to-tl from-primary/5 to-transparent blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Progress indicator */}
        <div className="mb-8 flex justify-center gap-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index === currentStep
                  ? "w-8 bg-primary"
                  : index < currentStep
                  ? "w-4 bg-primary/50"
                  : "w-4 bg-muted"
              )}
            />
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step.id === "welcome" && <WelcomeStep />}
            {step.id === "protection" && <ProtectionStep />}
            {step.id === "verification" && <VerificationStep />}
            {step.id === "recovery" && <RecoveryStep />}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-8 flex gap-3">
          {currentStep > 0 && (
            <Button variant="outline" onClick={handleBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <Button onClick={handleNext} className="flex-1 gap-2">
            {currentStep === steps.length - 1 ? (
              <>
                Get Started
                <Sparkles className="h-4 w-4" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Skip link */}
        {currentStep < steps.length - 1 && (
          <button
            onClick={onComplete}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip introduction
          </button>
        )}
      </div>
    </div>
  );
}

function WelcomeStep() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent ring-1 ring-primary/20">
        <Sparkles className="h-10 w-10 text-primary" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-3">
        Welcome to Onera
      </h1>
      <p className="text-lg text-muted-foreground mb-8">
        The AI assistant that's private by design — not just by policy.
      </p>
      <div className="space-y-3 text-left">
        <Feature icon={Cpu} text="Hardware-isolated inference" />
        <Feature icon={CheckCircle} text="Cryptographically verified" />
        <Feature icon={Lock} text="Zero-knowledge storage" />
      </div>
    </div>
  );
}

function ProtectionStep() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent ring-1 ring-emerald-500/20">
        <Cpu className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-3">
        Your Prompts Stay in a Vault
      </h1>
      <p className="text-muted-foreground mb-8">
        Unlike other AI services, your messages are processed inside secure enclaves — hardware-isolated environments that even our engineers can't access.
      </p>

      {/* Visual diagram */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
              <span className="text-xs font-medium">You</span>
            </div>
          </div>

          <div className="flex-1 flex items-center">
            <div className="h-0.5 flex-1 bg-gradient-to-r from-muted via-emerald-500 to-muted" />
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center ring-2 ring-emerald-500/30">
              <Cpu className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>

          <div className="flex-1 flex items-center">
            <div className="h-0.5 flex-1 bg-gradient-to-r from-muted via-emerald-500 to-muted" />
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
              <span className="text-xs font-medium">AI</span>
            </div>
          </div>
        </div>
        <div className="flex justify-center mt-3">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            Secure Enclave — Isolated from everything
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 text-left">
        <div className="rounded-lg border p-3">
          <p className="text-xs font-medium">AMD SEV-SNP</p>
          <p className="text-[10px] text-muted-foreground">Hardware isolation</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs font-medium">Encrypted Memory</p>
          <p className="text-[10px] text-muted-foreground">Even RAM is protected</p>
        </div>
      </div>
    </div>
  );
}

function VerificationStep() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-transparent ring-1 ring-blue-500/20">
        <CheckCircle className="h-10 w-10 text-blue-600 dark:text-blue-400" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-3">
        Trust, But Verify
      </h1>
      <p className="text-muted-foreground mb-8">
        Every time you connect, your browser automatically verifies the enclave is running exactly the code we published. No blind trust required.
      </p>

      {/* Visual flow */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-14 rounded-xl bg-muted flex items-center justify-center">
              <Cpu className="h-5 w-5" />
            </div>
            <span className="text-[10px] text-muted-foreground">Enclave</span>
          </div>

          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="h-0.5 w-full bg-gradient-to-r from-muted via-blue-500 to-muted" />
            <span className="text-[9px] text-muted-foreground">"Here's my proof"</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-14 rounded-xl bg-muted flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-[10px] text-muted-foreground">Browser</span>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-medium">
              ✓ Verified
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-card p-4 text-left">
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
            <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-sm">Cryptographic Attestation</p>
            <p className="text-xs text-muted-foreground">
              Mathematical proof that the enclave is genuine and unmodified
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecoveryStep() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-red-500/10 ring-1 ring-amber-500/20">
        <Lock className="h-10 w-10 text-amber-600 dark:text-amber-400" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-3">
        Your Recovery Key
      </h1>
      <p className="text-muted-foreground mb-6">
        In the next step, you'll receive a recovery phrase. This is crucial.
      </p>
      
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-amber-500/10 to-orange-500/5 p-4 text-left space-y-3">
        <div className="flex gap-3">
          <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-amber-900 dark:text-amber-100">
              It's your master key
            </p>
            <p className="text-xs text-amber-800/80 dark:text-amber-200/70">
              This phrase decrypts all your data. Without it, your encrypted conversations cannot be recovered.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-amber-900 dark:text-amber-100">
              We can't reset it
            </p>
            <p className="text-xs text-amber-800/80 dark:text-amber-200/70">
              This is by design. Only you have access to your data.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-amber-900 dark:text-amber-100">
              Store it safely
            </p>
            <p className="text-xs text-amber-800/80 dark:text-amber-200/70">
              Write it down or save in a password manager. You'll need it to access your data on new devices.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Ready? Let's create your recovery phrase.
      </p>
    </div>
  );
}

function Feature({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card/50 p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}
