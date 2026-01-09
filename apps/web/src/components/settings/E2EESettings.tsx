import { useState } from 'react';
import { useE2EE } from '@/providers/E2EEProvider';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { cn } from '@/lib/utils';

export function E2EESettings() {
  const { isUnlocked, lock } = useE2EE();
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          End-to-End Encryption
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your encryption keys and security settings
        </p>
      </div>

      {/* Status Card */}
      <div className={cn(
        'p-4 rounded-lg border',
        isUnlocked
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            isUnlocked
              ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300'
              : 'bg-yellow-100 dark:bg-yellow-800 text-yellow-600 dark:text-yellow-300'
          )}>
            {isUnlocked ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <p className={cn(
              'font-medium',
              isUnlocked
                ? 'text-green-700 dark:text-green-300'
                : 'text-yellow-700 dark:text-yellow-300'
            )}>
              E2EE is {isUnlocked ? 'Unlocked' : 'Locked'}
            </p>
            <p className={cn(
              'text-sm',
              isUnlocked
                ? 'text-green-600 dark:text-green-400'
                : 'text-yellow-600 dark:text-yellow-400'
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
        </div>
      </div>

      {/* Security Info */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          How E2EE Works
        </h4>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Your data is encrypted before leaving your device
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Only you hold the keys to decrypt your data
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Chats are sent directly to your LLM provider
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            The server never sees your unencrypted content
          </li>
        </ul>
      </div>

      {/* Key Management */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Key Management
        </h4>

        {/* Recovery Key */}
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Recovery Key</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              24-word phrase to recover your keys if you forget your password
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowRecoveryModal(true)}>
            View Recovery Key
          </Button>
        </div>

        {/* Change E2EE Password */}
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">E2EE Password</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Change the password used to unlock your encrypted data
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowChangePasswordModal(true)}>
            Change Password
          </Button>
        </div>
      </div>

      {/* Warning */}
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">Important Warning</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              If you lose both your password and recovery key, your encrypted data cannot be recovered.
              Make sure to save your recovery key in a safe place.
            </p>
          </div>
        </div>
      </div>

      {/* Recovery Key Modal */}
      <Modal
        open={showRecoveryModal}
        onClose={() => setShowRecoveryModal(false)}
        title="Recovery Key"
      >
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Your recovery key is a 24-word phrase that can be used to recover your encryption keys
          if you forget your password. Store it in a safe place.
        </p>
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-sm text-gray-900 dark:text-white">
          {/* In real implementation, this would show the actual recovery phrase */}
          <p className="text-gray-400 dark:text-gray-500 italic">
            Unlock E2EE to view your recovery key
          </p>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={() => setShowRecoveryModal(false)}>
            Close
          </Button>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        open={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        title="Change E2EE Password"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Enter your current password and a new password to change your E2EE password.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              placeholder="Enter current E2EE password"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              New Password
            </label>
            <input
              type="password"
              placeholder="Enter new E2EE password"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              placeholder="Confirm new E2EE password"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowChangePasswordModal(false)}>
            Cancel
          </Button>
          <Button>
            Change Password
          </Button>
        </div>
      </Modal>
    </div>
  );
}
