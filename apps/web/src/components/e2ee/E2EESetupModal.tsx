/**
 * E2EE Setup Error Modal
 *
 * This modal is shown when a user is authenticated but has no key shares.
 * With Shamir's secret sharing, keys are created during the OAuth callback.
 * If we reach this state, something went wrong and the user needs to re-authenticate.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { MandatoryLogoutConfirm } from './MandatoryLogoutConfirm';

export function E2EESetupModal() {
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleSignOut = () => {
    window.location.href = '/auth';
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && setShowSignOutConfirm(true)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-850" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Encryption Setup Required
            </DialogTitle>
            <DialogDescription>
              Your encryption keys were not properly initialized.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This can happen if your initial sign-in was interrupted. Please sign out
              and sign in again to complete the encryption setup.
            </p>
          </div>

          <DialogFooter>
            <Button onClick={handleSignOut} className="w-full sm:w-auto" variant="destructive">
              Sign Out and Re-authenticate
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
