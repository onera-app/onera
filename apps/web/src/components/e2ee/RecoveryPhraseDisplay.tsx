/**
 * Recovery Phrase Display Component
 * A premium, security-focused UI for displaying and saving recovery phrases
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Check, Copy, Download, Shield, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RecoveryKeyInfo } from '@onera/crypto';

interface RecoveryPhraseDisplayProps {
  recoveryInfo: RecoveryKeyInfo;
  onContinue: () => void;
  continueLabel?: string;
}

export function RecoveryPhraseDisplay({
  recoveryInfo,
  onContinue,
  continueLabel = "I've saved my recovery phrase",
}: RecoveryPhraseDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [isRevealed, setIsRevealed] = useState(true);
  const words = recoveryInfo.mnemonic.split(' ');

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(recoveryInfo.mnemonic);
      setCopied(true);
      toast.success('Recovery phrase copied to clipboard', {
        description: 'Make sure to store it securely and clear your clipboard',
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }, [recoveryInfo.mnemonic]);

  const handleDownload = useCallback(() => {
    const content = `ONERA RECOVERY PHRASE
=====================
Generated: ${new Date().toISOString()}

IMPORTANT: Keep this file secure and private.
Anyone with this phrase can access your encrypted data.

Your ${recoveryInfo.wordCount}-word recovery phrase:

${words.map((word, i) => `${String(i + 1).padStart(2, ' ')}. ${word}`).join('\n')}

=====================
Store this in a secure location like a password manager.
Delete this file after storing the phrase safely.
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `onera-recovery-phrase-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Recovery phrase downloaded', {
      description: 'Store it securely and delete the file after',
    });
  }, [recoveryInfo.wordCount, words]);

  return (
    <div className="space-y-6">
      {/* Security Notice */}
      <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-amber-500/10 to-orange-500/5 p-4">
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl" />
        <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-orange-500/10 blur-2xl" />
        <div className="relative flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 ring-1 ring-amber-500/30">
            <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-100">
              Backup these {recoveryInfo.wordCount} words
            </p>
            <p className="mt-0.5 text-sm text-amber-800/80 dark:text-amber-200/70">
              This is your backup if you ever lose your passkey or forget your password.
            </p>
          </div>
        </div>
      </div>

      {/* Word Grid */}
      <div className="relative">
        {/* Blur overlay when hidden */}
        {!isRevealed && (
          <div
            className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center rounded-xl bg-white dark:bg-gray-900 transition-all"
            onClick={() => setIsRevealed(true)}
          >
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Eye className="h-6 w-6" />
              <span className="text-sm font-medium">Click to reveal</span>
            </div>
          </div>
        )}

        <div className="rounded-xl border bg-gradient-to-b from-gray-50 dark:from-gray-900 to-gray-100 dark:to-gray-850 p-1">
          <div className="rounded-lg bg-white dark:bg-gray-900 p-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {words.map((word, index) => (
                <div
                  key={index}
                  className={cn(
                    "group relative flex items-center gap-2 rounded-lg border border-gray-100 dark:border-gray-850 bg-gray-50 dark:bg-gray-900 px-2.5 py-2 transition-all duration-200 overflow-hidden",
                    "hover:border-primary/30 hover:bg-gray-50 dark:hover:bg-gray-850",
                    "animate-in fade-in-up"
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-semibold tabular-nums text-primary">
                    {index + 1}
                  </span>
                  <span className="font-mono text-xs font-medium tracking-tight truncate">
                    {word}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsRevealed(!isRevealed)}
          className="flex-1 gap-2"
        >
          {isRevealed ? (
            <>
              <EyeOff className="h-4 w-4" />
              Hide
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              Reveal
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className={cn(
            "flex-1 gap-2 transition-colors",
            copied && "border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400"
          )}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="flex-1 gap-2"
        >
          <Download className="h-4 w-4" />
          Download
        </Button>
      </div>

      {/* Tips */}
      <div className="space-y-2 rounded-lg border border-dashed border-gray-100 dark:border-gray-850 bg-gray-50 dark:bg-gray-900 p-3">
        <p className="text-xs font-medium text-muted-foreground">Quick save options:</p>
        <ul className="space-y-1 text-xs text-muted-foreground/80">
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            Copy to your password manager
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            Download and store securely
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            Write it down and keep it safe
          </li>
        </ul>
      </div>

      {/* Continue Button */}
      <Button onClick={onContinue} className="w-full" size="lg">
        {continueLabel}
      </Button>
    </div>
  );
}
