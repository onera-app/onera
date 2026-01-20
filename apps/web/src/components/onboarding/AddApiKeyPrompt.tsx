"use client";

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Key,
  ArrowRight,
  ExternalLink,
  Sparkles,
  HardDrive,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/uiStore";

interface AddApiKeyPromptProps {
  onSkip: () => void;
}

export function AddApiKeyPrompt({ onSkip }: AddApiKeyPromptProps) {
  const navigate = useNavigate();
  const { openSettingsModal } = useUIStore();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleAddKey = () => {
    setIsNavigating(true);
    // Navigate to app, then open settings modal to connections tab
    navigate({ to: '/app' }).then(() => {
      openSettingsModal('connections');
    });
  };

  const handleSkip = () => {
    toast.success('Setup complete! You can add API keys anytime in Settings.');
    onSkip();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-gradient-to-tl from-primary/5 to-transparent blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent ring-1 ring-primary/20 flex items-center justify-center">
              <Key className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Add Your First API Key</CardTitle>
              <CardDescription>
                Connect an AI provider to start chatting
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Provider options */}
            <div className="space-y-3">
              <ProviderOption
                name="OpenAI"
                description="GPT-4, GPT-4o, and more"
                link="https://platform.openai.com/api-keys"
              />
              <ProviderOption
                name="Anthropic"
                description="Claude 3.5 Sonnet, Opus, and more"
                link="https://console.anthropic.com/settings/keys"
              />
              <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border/60 bg-muted/20">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                  <HardDrive className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Local with Ollama</p>
                  <p className="text-xs text-muted-foreground">
                    No API key needed. Run AI locally.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleAddKey}
                disabled={isNavigating}
                className="w-full gap-2"
                size="lg"
              >
                <Key className="h-4 w-4" />
                Add API Key
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={isNavigating}
                className="w-full"
              >
                I'll do this later
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Your API keys are encrypted and stored only on your device.
              We never see them.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProviderOption({
  name,
  description,
  link,
}: {
  name: string;
  description: string;
  link: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Sparkles className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">{name}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
