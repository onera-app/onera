import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/common/Button';
import { cn } from '@/lib/utils';
import { supportedLanguages } from '@/i18n';

type Theme = 'light' | 'dark' | 'system';
type ChatWidth = 'narrow' | 'normal' | 'wide';

export function InterfaceSettings() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useUIStore();
  const [chatWidth, setChatWidth] = useState<ChatWidth>('normal');
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [sendOnEnter, setSendOnEnter] = useState(true);

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    {
      value: 'light',
      label: 'Light',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ),
    },
    {
      value: 'system',
      label: 'System',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  const chatWidths: { value: ChatWidth; label: string }[] = [
    { value: 'narrow', label: 'Narrow' },
    { value: 'normal', label: 'Normal' },
    { value: 'wide', label: 'Wide' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Interface Settings</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Customize the appearance and behavior
        </p>
      </div>

      {/* Theme Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Theme
        </label>
        <div className="flex gap-3">
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
                theme === t.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <div className={cn(
                theme === t.value ? 'text-blue-500' : 'text-gray-400'
              )}>
                {t.icon}
              </div>
              <span className={cn(
                'text-sm font-medium',
                theme === t.value
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
              )}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Width */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Chat Width
        </label>
        <div className="flex gap-2">
          {chatWidths.map((w) => (
            <button
              key={w.value}
              onClick={() => setChatWidth(w.value)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                chatWidth === w.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle Options */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Chat Options
        </label>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Show Timestamps</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Display time for each message</p>
          </div>
          <button
            onClick={() => setShowTimestamps(!showTimestamps)}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              showTimestamps ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                showTimestamps ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Send on Enter</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Press Enter to send, Shift+Enter for new line</p>
          </div>
          <button
            onClick={() => setSendOnEnter(!sendOnEnter)}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              sendOnEnter ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                sendOnEnter ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>
      </div>

      {/* Language Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t('settings.interface.language')}
        </label>
        <select
          value={i18n.language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className={cn(
            'w-full px-3 py-2 rounded-lg',
            'border border-gray-200 dark:border-gray-700',
            'bg-white dark:bg-gray-800',
            'text-gray-900 dark:text-white',
            'focus:outline-none focus:ring-2 focus:ring-blue-500'
          )}
        >
          {supportedLanguages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.nativeName} ({lang.name})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
