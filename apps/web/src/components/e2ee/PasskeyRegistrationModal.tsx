/**
 * Passkey Registration Modal
 *
 * Wizard-style modal for registering a new passkey with PRF extension.
 * Explains the difference between single-device and cross-device passkeys.
 */

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Fingerprint,
  Smartphone,
  Cloud,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { usePasskeyRegistration } from "@/hooks/useWebAuthn";
import { usePasskeySupport } from "@/hooks/useWebAuthnSupport";
import { getDecryptedMasterKey } from "@onera/crypto";

interface PasskeyRegistrationModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onOpenChange: (open: boolean) => void;
  /** Callback when registration succeeds */
  onSuccess?: () => void;
  /** Optional pre-provided master key (for initial setup) */
  masterKey?: Uint8Array;
}

type Step = "intro" | "naming" | "registering" | "success" | "error";

export function PasskeyRegistrationModal({
  open,
  onOpenChange,
  onSuccess,
  masterKey: providedMasterKey,
}: PasskeyRegistrationModalProps) {
  const [step, setStep] = useState<Step>("intro");
  const [passkeyName, setPasskeyName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { registerPasskey } = usePasskeyRegistration();
  const { isSupported, reason } = usePasskeySupport();

  const handleClose = () => {
    if (step !== "registering") {
      onOpenChange(false);
      // Reset state after close animation
      setTimeout(() => {
        setStep("intro");
        setPasskeyName("");
        setErrorMessage(null);
      }, 200);
    }
  };

  const handleStartRegistration = async () => {
    setStep("registering");
    setErrorMessage(null);

    try {
      // Get master key from provided or from crypto module
      const masterKey = providedMasterKey ?? getDecryptedMasterKey();

      if (!masterKey) {
        throw new Error(
          "Encryption must be unlocked before registering a passkey"
        );
      }

      await registerPasskey(masterKey, passkeyName || undefined);

      setStep("success");
      toast.success("Passkey registered successfully!");
      onSuccess?.();
    } catch (err) {
      console.error("Passkey registration failed:", err);
      const error = err instanceof Error ? err : new Error("Registration failed");

      // Check for user cancellation
      if (
        error.name === "NotAllowedError" ||
        error.message.includes("cancelled") ||
        error.message.includes("canceled")
      ) {
        setStep("naming");
        return;
      }

      setErrorMessage(error.message);
      setStep("error");
    }
  };

  // Check if passkey is supported
  if (!isSupported && open) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Passkey Not Supported
            </DialogTitle>
            <DialogDescription>
              Your browser or device doesn't support passkeys with the required
              security features.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">{reason}</p>
          </div>

          <DialogFooter>
            <Button onClick={handleClose} className="w-full sm:w-auto">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {/* Intro Step */}
        {step === "intro" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5 text-primary" />
                Add a Passkey
              </DialogTitle>
              <DialogDescription>
                Passkeys let you unlock your encryption quickly and securely
                using Face ID, Touch ID, or Windows Hello.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Smartphone className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Device Passkey</p>
                  <p className="text-xs text-muted-foreground">
                    Works only on this device. Fastest and most secure.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Cloud className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Synced Passkey</p>
                  <p className="text-xs text-muted-foreground">
                    Synced via iCloud or Google. Works across your devices.
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Your device will automatically choose the best option.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={() => setStep("naming")} className="w-full sm:w-auto">Continue</Button>
            </DialogFooter>
          </>
        )}

        {/* Naming Step */}
        {step === "naming" && (
          <>
            <DialogHeader>
              <DialogTitle>Name Your Passkey</DialogTitle>
              <DialogDescription>
                Give this passkey a name so you can identify it later.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="space-y-2">
                <Label htmlFor="passkey-name">Passkey Name (Optional)</Label>
                <Input
                  id="passkey-name"
                  placeholder="e.g., MacBook Pro, iPhone"
                  value={passkeyName}
                  onChange={(e) => setPasskeyName(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use the default name.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("intro")} className="w-full sm:w-auto">
                Back
              </Button>
              <Button onClick={handleStartRegistration} className="w-full sm:w-auto">
                <Fingerprint className="h-4 w-4 mr-2" />
                Create Passkey
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Registering Step */}
        {step === "registering" && (
          <>
            <DialogHeader>
              <DialogTitle>Creating Passkey</DialogTitle>
              <DialogDescription>
                Follow the prompts on your device to create your passkey.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground text-center">
                Use Face ID, Touch ID, or your device PIN when prompted...
              </p>
            </div>
          </>
        )}

        {/* Success Step */}
        {step === "success" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Passkey Created
              </DialogTitle>
              <DialogDescription>
                Your passkey has been registered successfully.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                You can now use this passkey to unlock your encryption on this
                device. It's faster and more convenient than entering your
                recovery phrase.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full sm:w-auto">Done</Button>
            </DialogFooter>
          </>
        )}

        {/* Error Step */}
        {step === "error" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Registration Failed
              </DialogTitle>
              <DialogDescription>
                We couldn't create your passkey.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                {errorMessage || "An unknown error occurred."}
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={() => setStep("naming")} className="w-full sm:w-auto">Try Again</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
