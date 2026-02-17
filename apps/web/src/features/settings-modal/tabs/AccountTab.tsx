import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
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
import { User, Mail, Lock, Loader2 } from 'lucide-react';

export function AccountTab() {
  const { user } = useAuth();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

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
            <User className="h-4 w-4 inline mr-2" />
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
            <Mail className="h-4 w-4 inline mr-2" />
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
              <Lock className="h-4 w-4 inline mr-2" />
              Password
            </Label>
            <p className="text-xs text-gray-500 dark:text-gray-400">Change your account password</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)}>
            Change Password
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
