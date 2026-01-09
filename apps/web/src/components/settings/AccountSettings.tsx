import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { cn } from '@/lib/utils';

export function AccountSettings() {
  const { user } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement user update API call
      console.log('Saving user settings:', { name, email });
      await new Promise((resolve) => setTimeout(resolve, 500));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Account Settings</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your account information
        </p>
      </div>

      {/* Profile Picture */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-medium">
          {name.charAt(0).toUpperCase() || '?'}
        </div>
        <div>
          <Button variant="secondary" size="sm">
            Change Avatar
          </Button>
          <p className="mt-1 text-xs text-gray-500">JPG, GIF or PNG. Max 1MB</p>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Name
        </label>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Email
        </label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
        />
      </div>

      {/* Password Change */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Change Password
        </h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Current Password
            </label>
            <Input type="password" placeholder="Enter current password" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              New Password
            </label>
            <Input type="password" placeholder="Enter new password" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Confirm New Password
            </label>
            <Input type="password" placeholder="Confirm new password" />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
