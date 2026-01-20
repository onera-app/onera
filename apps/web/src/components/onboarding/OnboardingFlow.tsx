"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Key,
  Shield,
  Lock,
  Server,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Cloud,
  HardDrive,
  Check,
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
    subtitle: "Private AI chat, built differently",
  },
  {
    id: "api-keys",
    title: "Bring Your Own API Keys",
    subtitle: "You control which AI providers to use",
  },
  {
    id: "encryption",
    title: "End-to-End Encrypted",
    subtitle: "Your conversations are cryptographically private",
  },
  {
    id: "providers",
    title: "Cloud or Local",
    subtitle: "Choose your privacy level",
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
            {step.id === "api-keys" && <ApiKeysStep />}
            {step.id === "encryption" && <EncryptionStep />}
            {step.id === "providers" && <ProvidersStep />}
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
        The AI assistant that keeps your conversations truly private.
      </p>
      <div className="space-y-3 text-left">
        <Feature icon={Key} text="Bring your own API keys" />
        <Feature icon={Shield} text="End-to-end encrypted chats" />
        <Feature icon={Server} text="Cloud or fully local AI" />
      </div>
    </div>
  );
}

function ApiKeysStep() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent ring-1 ring-amber-500/20">
        <Key className="h-10 w-10 text-amber-600 dark:text-amber-400" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-3">
        Bring Your Own API Keys
      </h1>
      <p className="text-muted-foreground mb-8">
        Connect your own OpenAI, Anthropic, or other provider keys. 
        This is how Onera stays private.
      </p>
      
      <div className="rounded-xl border bg-card p-4 text-left space-y-4">
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-medium text-sm">Your keys, your control</p>
            <p className="text-xs text-muted-foreground">
              API keys are encrypted and stored only on your device
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-medium text-sm">Pay providers directly</p>
            <p className="text-xs text-muted-foreground">
              We never see your keys or proxy your requests
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-medium text-sm">Multiple providers supported</p>
            <p className="text-xs text-muted-foreground">
              OpenAI, Anthropic, and local Ollama
            </p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        You'll add your API key after setup. Get one from{" "}
        <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          OpenAI
        </a>{" "}
        or{" "}
        <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Anthropic
        </a>.
      </p>
    </div>
  );
}

function EncryptionStep() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent ring-1 ring-emerald-500/20">
        <Shield className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-3">
        End-to-End Encrypted
      </h1>
      <p className="text-muted-foreground mb-8">
        Your conversations and API keys are encrypted before they leave your device.
        We can't read them. Nobody can.
      </p>
      
      {/* Visual encryption flow */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
              <span className="text-xs font-medium">Your data</span>
            </div>
          </div>
          
          <div className="flex-1 flex items-center">
            <div className="h-0.5 flex-1 bg-gradient-to-r from-muted via-primary to-muted" />
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center ring-2 ring-primary/30">
              <Lock className="h-5 w-5 text-primary" />
            </div>
          </div>
          
          <div className="flex-1 flex items-center">
            <div className="h-0.5 flex-1 bg-gradient-to-r from-muted via-primary to-muted" />
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
              <span className="text-[10px] font-mono text-muted-foreground">#@!%</span>
            </div>
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Plaintext</span>
          <span>Encrypted</span>
          <span>Ciphertext</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 text-left">
        <div className="rounded-lg border p-3">
          <p className="text-xs font-medium">AES-256-GCM</p>
          <p className="text-[10px] text-muted-foreground">Military-grade encryption</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs font-medium">Argon2id</p>
          <p className="text-[10px] text-muted-foreground">Secure key derivation</p>
        </div>
      </div>
    </div>
  );
}

function ProvidersStep() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-transparent ring-1 ring-blue-500/20">
        <Server className="h-10 w-10 text-blue-600 dark:text-blue-400" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-3">
        Cloud or Local
      </h1>
      <p className="text-muted-foreground mb-6">
        Choose your privacy level based on your needs.
      </p>
      
      <div className="space-y-3">
        {/* Cloud option */}
        <div className="rounded-xl border bg-card p-4 text-left">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              <Cloud className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium">Cloud Providers</p>
              <p className="text-sm text-muted-foreground">
                GPT-4, Claude, etc. via your own API keys
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Prompts are sent to provider for inference
              </p>
            </div>
          </div>
        </div>

        {/* Local option */}
        <div className="rounded-xl border bg-card p-4 text-left">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
              <HardDrive className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-medium">Local with Ollama</p>
              <p className="text-sm text-muted-foreground">
                Run Llama, Mistral, etc. on your own machine
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                Fully air-gapped, prompts never leave your device
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Both options keep your chat history encrypted. Local Ollama provides maximum privacy 
        for sensitive conversations.
      </p>
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
