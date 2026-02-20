import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loading02Icon } from "@hugeicons/core-free-icons";
import { MandatoryLogoutConfirm } from "./MandatoryLogoutConfirm";

export function E2EESetupModal() {
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      window.location.href = "/auth";
    } catch (err) {
      console.error("Sign out failed:", err);
      window.location.href = "/auth";
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => !open && setShowSignOutConfirm(true)}
      >
        <DialogContent
          className="sm:max-w-md bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-850"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Alert01Icon}
                className="h-5 w-5 text-destructive"
              />
              Encryption Setup Required
            </DialogTitle>
            <DialogDescription>
              Your encryption keys were not properly initialized.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This can happen if your initial sign-in was interrupted. Please
              sign out and sign in again to complete the encryption setup.
            </p>
          </div>

          <DialogFooter>
            <Button
              onClick={handleSignOut}
              className="w-full sm:w-auto"
              variant="destructive"
              disabled={isSigningOut}
            >
              {isSigningOut ? (
                <>
                  <HugeiconsIcon
                    icon={Loading02Icon}
                    className="mr-2 h-4 w-4 animate-spin"
                  />
                  Signing out...
                </>
              ) : (
                "Sign Out and Re-authenticate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MandatoryLogoutConfirm
        open={showSignOutConfirm}
        onOpenChange={setShowSignOutConfirm}
        description="Your encryption keys were not properly initialized. If you exit now, you will be signed out."
      />
    </>
  );
}
