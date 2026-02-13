"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Lock,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  MessageSquare,
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
    subtitle: "Private AI chat you can actually trust",
  },
  {
    id: "recovery",
    title: "Your Recovery Phrase",
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
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--chat-shell-bg)" }}
    >
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-black/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg rounded-3xl chat-surface-elevated p-6 sm:p-8">
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
                    : "w-4 bg-muted",
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
                I Understand
                <Check className="h-4 w-4" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Skip link - only on first step */}
        {currentStep === 0 && (
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
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl chat-surface">
        <MessageSquare className="h-9 w-9 text-foreground/80" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-3">
        Welcome to Onera
      </h1>
      <p className="text-lg text-muted-foreground mb-8">
        Private AI chat that actually keeps your conversations private.
      </p>
      <div className="space-y-3 text-left">
        <Feature icon={Lock} text="Your chats are end-to-end encrypted" />
        <Feature
          icon={Shield}
          text="Processed in secure hardware we can't access"
        />
        <Feature
          icon={CheckCircle}
          text="Your browser verifies every connection"
        />
      </div>
    </div>
  );
}

function RecoveryStep() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/15 to-red-500/10 ring-1 ring-amber-500/20">
        <Lock className="h-10 w-10 text-amber-600 dark:text-amber-400" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-3">
        Your Recovery Phrase
      </h1>
      <p className="text-muted-foreground mb-6">
        In the next step, you'll receive a recovery phrase. This is important.
      </p>

      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-amber-500/8 to-orange-500/5 p-4 text-left space-y-3">
        <div className="flex gap-3">
          <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-amber-900 dark:text-amber-100">
              It's your backup key
            </p>
            <p className="text-xs text-amber-800/80 dark:text-amber-200/70">
              Use it to recover your data if you lose access to your passkey or
              password.
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
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Save it somewhere safe. You'll see it after setting up your unlock
        method.
      </p>
    </div>
  );
}

function Feature({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl chat-surface p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/12">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}
