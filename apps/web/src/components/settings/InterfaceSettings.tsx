import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';
import { supportedLanguages } from '@/i18n';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sun, Moon, Monitor } from 'lucide-react';

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
    { value: 'light', label: 'Light', icon: <Sun className="h-5 w-5" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="h-5 w-5" /> },
    { value: 'system', label: 'System', icon: <Monitor className="h-5 w-5" /> },
  ];

  const chatWidths: { value: ChatWidth; label: string }[] = [
    { value: 'narrow', label: 'Narrow' },
    { value: 'normal', label: 'Normal' },
    { value: 'wide', label: 'Wide' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Interface Settings</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize the appearance and behavior
        </p>
      </div>

      {/* Theme Selection */}
      <div className="space-y-3">
        <Label>Theme</Label>
        <div className="flex gap-3">
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
              <CardContent className="flex flex-col items-center gap-2 p-4">
                <div className={cn(
                  theme === t.value ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {t.icon}
                </div>
                <span className={cn(
                  'text-sm font-medium',
                  theme === t.value ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {t.label}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Chat Width */}
      <div className="space-y-3">
        <Label>Chat Width</Label>
        <RadioGroup
          value={chatWidth}
          onValueChange={(value) => setChatWidth(value as ChatWidth)}
          className="flex gap-2"
        >
          {chatWidths.map((w) => (
            <div key={w.value} className="flex items-center">
              <RadioGroupItem value={w.value} id={`width-${w.value}`} className="sr-only" />
              <Label
                htmlFor={`width-${w.value}`}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors',
                  chatWidth === w.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {w.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Toggle Options */}
      <div className="space-y-4">
        <Label>Chat Options</Label>

        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <Label htmlFor="timestamps" className="font-normal">Show Timestamps</Label>
            <p className="text-xs text-muted-foreground">Display time for each message</p>
          </div>
          <Switch
            id="timestamps"
            checked={showTimestamps}
            onCheckedChange={setShowTimestamps}
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <Label htmlFor="send-enter" className="font-normal">Send on Enter</Label>
            <p className="text-xs text-muted-foreground">Press Enter to send, Shift+Enter for new line</p>
          </div>
          <Switch
            id="send-enter"
            checked={sendOnEnter}
            onCheckedChange={setSendOnEnter}
          />
        </div>
      </div>

      {/* Language Selection */}
      <div className="space-y-3">
        <Label>{t('settings.interface.language')}</Label>
        <Select
          value={i18n.language}
          onValueChange={handleLanguageChange}
        >
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
    </div>
  );
}
