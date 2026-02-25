import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, Loading02Icon, LockIcon, Mail01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useApiTokens, useCreateApiToken, useRevokeApiToken } from '@/hooks/queries/useApiTokens';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function AccountTab() {
  const { user } = useAuth();
  const { data: apiTokensData } = useApiTokens();
  const createApiToken = useCreateApiToken();
  const revokeApiToken = useRevokeApiToken();

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newTokenName, setNewTokenName] = useState('Moltbot');
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const apiTokens = apiTokensData ?? [];

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      // Password changes are handled through Supabase Auth
      // and don't require re-encrypting E2EE keys (sharding system handles this)
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });
      if (error) throw error;

      toast.success('Password changed successfully');
      setShowPasswordDialog(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?';

  const handleCreateApiToken = async () => {
    try {
      const result = await createApiToken.mutateAsync({
        name: newTokenName.trim() || 'Moltbot',
      });
      setNewlyCreatedToken(result.token);
      setShowTokenDialog(true);
      toast.success('API token created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create API token');
    }
  };

  const handleRevokeApiToken = async (tokenId: string) => {
    try {
      await revokeApiToken.mutateAsync({ tokenId });
      toast.success('API token revoked');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke API token');
    }
  };

  const copyToken = async () => {
    if (!newlyCreatedToken) return;
    await navigator.clipboard.writeText(newlyCreatedToken);
    toast.success('Token copied');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Account Settings</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your profile and security</p>
      </div>

      {/* Profile Section */}
      <div className="space-y-4">
        <Label className="text-base">Profile</Label>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user?.imageUrl || undefined} alt={user?.name || 'User'} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email || ''}</p>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            <HugeiconsIcon icon={UserIcon} className="h-4 w-4 inline mr-2" />
            Name
          </Label>
          <Input
            id="name"
            value={user?.name || ''}
            disabled
            placeholder="Your name"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">
            <HugeiconsIcon icon={Mail01Icon} className="h-4 w-4 inline mr-2" />
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={user?.email || ''}
            disabled
            placeholder="your@email.com"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Email changes are managed through your account settings.
          </p>
        </div>
      </div>

      {/* Security Section */}
      <div className="space-y-4 pt-4 border-t">
        <Label className="text-base">Security</Label>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="change-password" className="font-normal">
              <HugeiconsIcon icon={LockIcon} className="h-4 w-4 inline mr-2" />
              Password
            </Label>
            <p className="text-xs text-gray-500 dark:text-gray-400">Change your account password</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)}>
            Change Password
          </Button>
        </div>
      </div>

      {/* API Access */}
      <div className="space-y-4 pt-4 border-t">
        <Label className="text-base">API Access</Label>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Create a personal token to use with any OpenAI compatible client. Set the base URL to:
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-xs font-mono select-all">
            {`${import.meta.env.VITE_API_URL || 'https://api.onera.chat'}/v1`}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(`${import.meta.env.VITE_API_URL || 'https://api.onera.chat'}/v1`);
              toast.success('URL copied');
            }}
          >
            Copy
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={newTokenName}
            onChange={(e) => setNewTokenName(e.target.value)}
            placeholder="Token name"
            className="max-w-xs"
          />
          <Button onClick={handleCreateApiToken} disabled={createApiToken.isPending}>
            {createApiToken.isPending ? 'Creating...' : 'Create Token'}
          </Button>
        </div>

        <div className="space-y-2">
          {apiTokens.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">No API tokens yet.</p>
          ) : (
            apiTokens.map((token) => (
              <div key={token.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{token.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {token.tokenPrefix}... {token.revokedAt ? 'Revoked' : 'Active'}
                  </p>
                </div>
                {!token.revokedAt && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevokeApiToken(token.id)}
                    disabled={revokeApiToken.isPending}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="space-y-4 pt-4 border-t">
        <Label className="text-base text-destructive">Danger Zone</Label>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="font-normal">
              <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4 inline mr-2" />
              Delete Account
            </Label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Permanently delete your account and all associated data
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => window.open('/settings/account/delete', '_blank')}
          >
            Delete Account
          </Button>
        </div>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    currentPassword: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)} disabled={isChangingPassword}>
              Cancel
            </Button>
            <Button onClick={handlePasswordChange} disabled={isChangingPassword}>
              {isChangingPassword ? (
                <>
                  <HugeiconsIcon icon={Loading02Icon} className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>API Token Created</DialogTitle>
            <DialogDescription>
              This token is shown only once. Copy it now and store it securely.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-api-token">Token</Label>
              <Input id="new-api-token" value={newlyCreatedToken ?? ''} readOnly className="font-mono text-xs" />
            </div>

            <div className="space-y-2">
              <Label>Base URL</Label>
              <code className="block rounded-md border bg-muted px-3 py-2 text-xs font-mono select-all">
                {`${import.meta.env.VITE_API_URL || 'https://api.onera.chat'}/v1`}
              </code>
            </div>

            <div className="rounded-md border bg-muted/50 p-3 space-y-1">
              <p className="text-xs font-medium">OpenAI compatible</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Use this token with any OpenAI SDK or client. Set the base URL and pass the token as the API key.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTokenDialog(false)}>
              Close
            </Button>
            <Button onClick={copyToken} disabled={!newlyCreatedToken}>
              Copy Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
