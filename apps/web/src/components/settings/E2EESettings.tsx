import { useState } from 'react';
import { useE2EE } from '@/providers/E2EEProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Lock, Unlock, Check, AlertTriangle, Key, ShieldCheck } from 'lucide-react';

export function E2EESettings() {
  const { isUnlocked, lock } = useE2EE();
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">End-to-End Encryption</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your encryption keys and security settings
        </p>
      </div>

      {/* Status Card */}
      <Card className={cn(
        isUnlocked
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
          : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
      )}>
        <CardContent className="flex items-center gap-4 p-4">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            isUnlocked
              ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300'
              : 'bg-amber-100 dark:bg-amber-800 text-amber-600 dark:text-amber-300'
          )}>
            {isUnlocked ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          </div>
          <div className="flex-1">
            <p className={cn(
              'font-medium',
              isUnlocked
                ? 'text-green-700 dark:text-green-300'
                : 'text-amber-700 dark:text-amber-300'
            )}>
              E2EE is {isUnlocked ? 'Unlocked' : 'Locked'}
            </p>
            <p className={cn(
              'text-sm',
              isUnlocked
                ? 'text-green-600 dark:text-green-400'
                : 'text-amber-600 dark:text-amber-400'
            )}>
              {isUnlocked
                ? 'Your chats and notes are accessible'
                : 'Unlock to access encrypted content'}
            </p>
          </div>
          {isUnlocked && (
            <Button variant="secondary" size="sm" onClick={lock}>
              Lock Now
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Security Info */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            How E2EE Works
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              Your data is encrypted before leaving your device
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              Only you hold the keys to decrypt your data
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              Chats are sent directly to your LLM provider
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              The server never sees your unencrypted content
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Key Management */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Key Management</h4>

        {/* Recovery Key */}
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Recovery Key</p>
                <p className="text-xs text-muted-foreground">
                  24-word phrase to recover your keys if you forget your password
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowRecoveryModal(true)}>
              View
            </Button>
          </CardContent>
        </Card>

        {/* Change E2EE Password */}
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">E2EE Password</p>
                <p className="text-xs text-muted-foreground">
                  Change the password used to unlock your encrypted data
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowChangePasswordModal(true)}>
              Change
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Warning */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Important Warning</AlertTitle>
        <AlertDescription>
          If you lose both your password and recovery key, your encrypted data cannot be recovered.
          Make sure to save your recovery key in a safe place.
        </AlertDescription>
      </Alert>

      {/* Recovery Key Modal */}
      <Dialog open={showRecoveryModal} onOpenChange={setShowRecoveryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recovery Key</DialogTitle>
            <DialogDescription>
              Your recovery key is a 24-word phrase that can be used to recover your encryption keys
              if you forget your password. Store it in a safe place.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-muted rounded-lg font-mono text-sm">
            <p className="text-muted-foreground italic">
              Unlock E2EE to view your recovery key
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecoveryModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={showChangePasswordModal} onOpenChange={setShowChangePasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change E2EE Password</DialogTitle>
            <DialogDescription>
              Enter your current password and a new password to change your E2EE password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-e2ee-password">Current Password</Label>
              <Input
                id="current-e2ee-password"
                type="password"
                placeholder="Enter current E2EE password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-e2ee-password">New Password</Label>
              <Input
                id="new-e2ee-password"
                type="password"
                placeholder="Enter new E2EE password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-e2ee-password">Confirm New Password</Label>
              <Input
                id="confirm-e2ee-password"
                type="password"
                placeholder="Confirm new E2EE password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePasswordModal(false)}>
              Cancel
            </Button>
            <Button>Change Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
