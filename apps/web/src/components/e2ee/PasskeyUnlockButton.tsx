/**
 * Passkey Unlock Button
 *
 * Button that triggers WebAuthn authentication to unlock E2EE using a passkey.
 * Uses PRF extension to derive the key encryption key.
 */

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Fingerprint } from "lucide-react";
import { usePasskeyAuthentication } from "@/hooks/useWebAuthn";
import { useE2EEStore } from "@/stores/e2eeStore";
import {
  setDecryptedKeys,
  getOrCreateDeviceId,
  decryptKey,
  fromBase64,
} from "@onera/crypto";
import { trpc } from "@/lib/trpc";

interface PasskeyUnlockButtonProps {
  /** Callback when unlock succeeds */
  onSuccess?: () => void;
  /** Callback when unlock fails */
  onError?: (error: Error) => void;
  /** Optional className for the button */
  className?: string;
  /** Whether to show the full button or just an icon */
  variant?: "full" | "icon";
}

export function PasskeyUnlockButton({
  onSuccess,
  onError,
  className,
  variant = "full",
}: PasskeyUnlockButtonProps) {
  const { setStatus, setError } = useE2EEStore();
  const { authenticateWithPasskey, isAuthenticating } =
    usePasskeyAuthentication();
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Get key shares for private key decryption
  const keySharesQuery = trpc.keyShares.get.useQuery(undefined, {
    retry: false,
  });

  // Update device last seen
  const updateLastSeenMutation = trpc.devices.updateLastSeen.useMutation();

  const handleUnlock = async () => {
    if (!keySharesQuery.data) {
      toast.error("Failed to load encryption keys");
      return;
    }

    setIsUnlocking(true);
    setStatus("unlocking");

    try {
      // Authenticate with passkey and get decrypted master key
      const masterKey = await authenticateWithPasskey();

      // Decrypt the private key using the master key
      const privateKey = decryptKey(
        {
          ciphertext: keySharesQuery.data.encryptedPrivateKey,
          nonce: keySharesQuery.data.privateKeyNonce,
        },
        masterKey
      );

      const publicKey = fromBase64(keySharesQuery.data.publicKey);

      // Set the decrypted keys in the crypto module
      setDecryptedKeys({
        masterKey,
        publicKey,
        privateKey,
      });

      // Update device last seen
      const deviceId = getOrCreateDeviceId();
      await updateLastSeenMutation.mutateAsync({ deviceId });

      setStatus("unlocked");
      toast.success("Unlocked with passkey!");
      onSuccess?.();
    } catch (err) {
      console.error("Passkey unlock failed:", err);
      const error =
        err instanceof Error ? err : new Error("Passkey authentication failed");

      // Check for user cancellation
      if (
        error.name === "NotAllowedError" ||
        error.message.includes("cancelled") ||
        error.message.includes("canceled")
      ) {
        setStatus("locked");
        setIsUnlocking(false);
        return; // Don't show error for user cancellation
      }

      setError(error.message);
      setStatus("locked");
      toast.error(error.message);
      onError?.(error);
    } finally {
      setIsUnlocking(false);
    }
  };

  const isLoading = isUnlocking || isAuthenticating;

  if (variant === "icon") {
    return (
      <Button
        onClick={handleUnlock}
        disabled={isLoading || keySharesQuery.isLoading}
        size="icon"
        variant="outline"
        className={className}
        title="Unlock with passkey"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Fingerprint className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleUnlock}
      disabled={isLoading || keySharesQuery.isLoading}
      className={className}
      variant="default"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Unlocking...
        </>
      ) : (
        <>
          <Fingerprint className="h-4 w-4 mr-2" />
          Unlock with Passkey
        </>
      )}
    </Button>
  );
}
