import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AccountSettings, InterfaceSettings, E2EESettings } from '@/components/settings';

type SettingsTab = 'account' | 'interface' | 'e2ee';

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'account',
    label: 'Account',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: 'interface',
    label: 'Interface',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    id: 'e2ee',
    label: 'Encryption',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Settings
        </h2>
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <span className={cn(
                activeTab === tab.id
                  ? 'text-blue-500'
                  : 'text-gray-400'
              )}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-950">
        <div className="max-w-2xl mx-auto p-8">
          {activeTab === 'account' && <AccountSettings />}
          {activeTab === 'interface' && <InterfaceSettings />}
          {activeTab === 'e2ee' && <E2EESettings />}
        </div>
      </div>
    </div>
  );
}
