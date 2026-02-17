import { useTranslation } from 'react-i18next';
import { useUIStore, type Theme, type ChatDensity } from '@/stores/uiStore';
import { supportedLanguages } from '@/i18n';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sun, Moon, Monitor, Smartphone } from 'lucide-react';

export function InterfaceTab() {
  const { t, i18n } = useTranslation();
  const {
    theme,
    setTheme,
    uiScale,
    setUIScale,
    chatDensity,
    setChatDensity,
    useRichTextInput,
    setUseRichTextInput,
  } = useUIStore();

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="h-5 w-5" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="h-5 w-5" /> },
    { value: 'oled-dark', label: 'OLED Dark', icon: <Smartphone className="h-5 w-5" /> },
    { value: 'system', label: 'System', icon: <Monitor className="h-5 w-5" /> },
  ];

  const densities: { value: ChatDensity; label: string }[] = [
    { value: 'compact', label: 'Compact' },
    { value: 'normal', label: 'Normal' },
    { value: 'comfortable', label: 'Comfortable' },
  ];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Interface Settings</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Customize the appearance and behavior
        </p>
      </div>

      {/* Theme Selection */}
      <div className="space-y-3">
        <Label>Theme</Label>
        <div className="grid grid-cols-4 gap-3">
          {themes.map((t) => (
            <Card
              key={t.value}
              className={cn(
                'cursor-pointer transition-colors',
                theme === t.value
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/50'
              )}
              onClick={() => setTheme(t.value)}
            >
              <CardContent className="flex flex-col items-center gap-2 p-3">
                <div
                  className={cn(
                    theme === t.value ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
                  )}
                >
                  {t.icon}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium',
                    theme === t.value ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
                  )}
                >
                  {t.label}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* UI Scale */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>UI Scale</Label>
          <span className="text-sm text-gray-500 dark:text-gray-400">{(uiScale * 100).toFixed(0)}%</span>
        </div>
        <Slider
          value={[uiScale]}
          onValueChange={([value]: number[]) => setUIScale(value)}
          min={0.75}
          max={1.5}
          step={0.05}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Adjust the overall size of text and UI elements
        </p>
      </div>

      {/* Chat Density */}
      <div className="space-y-3">
        <Label>Chat Density</Label>
        <div className="flex gap-2">
          {densities.map((d) => (
            <button
              key={d.value}
              onClick={() => setChatDensity(d.value)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                chatDensity === d.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-gray-100 dark:bg-gray-850 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Control spacing between messages
        </p>
      </div>

      {/* Language */}
      <div className="space-y-3">
        <Label>{t('settings.interface.language')}</Label>
        <Select value={i18n.language} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {supportedLanguages.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.nativeName} ({lang.name})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Rich Text Input */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="rich-text">Rich Text Input</Label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Enable formatting and @mentions in the message input
          </p>
        </div>
        <Switch
          id="rich-text"
          checked={useRichTextInput}
          onCheckedChange={setUseRichTextInput}
        />
      </div>

      {/* Chat Display Options */}
      <div className="space-y-4 pt-2">
        <Label className="text-base">Chat Display</Label>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="widescreen" className="font-normal">
              Widescreen Mode
            </Label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Use full width for chat messages
            </p>
          </div>
          <Switch id="widescreen" disabled />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="timestamps" className="font-normal">
              Show Timestamps
            </Label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Display time for each message
            </p>
          </div>
          <Switch id="timestamps" disabled />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="code-collapse" className="font-normal">
              Collapse Code Blocks
            </Label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Collapse long code blocks by default
            </p>
          </div>
          <Switch id="code-collapse" disabled />
        </div>
      </div>
    </div>
  );
}
