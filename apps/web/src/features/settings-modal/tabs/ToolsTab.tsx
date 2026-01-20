/**
 * Tools Tab - Configure search providers and tool integrations
 */

import { useState, useCallback } from 'react';
import { Globe, Key, ExternalLink, Check, Trash2, Eye, EyeOff, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useToolsStore, SEARCH_PROVIDERS, type NativeSearchProvider } from '@/stores/toolsStore';
import { useE2EE } from '@/providers/E2EEProvider';
import type { SearchProvider } from '@onera/types';

// Native search provider definitions
const NATIVE_SEARCH_PROVIDERS: Array<{
  id: NativeSearchProvider;
  name: string;
  description: string;
  features: string[];
}> = [
  {
    id: 'google',
    name: 'Google Search (Gemini)',
    description: 'Native search grounding for Google Gemini models',
    features: ['Real-time search results', 'Source citations', 'Grounding metadata'],
  },
  {
    id: 'xai',
    name: 'Web Search (Grok)',
    description: 'Native web search for xAI Grok models',
    features: ['Live web search', 'Image understanding', 'Domain filtering'],
  },
];

export function ToolsTab() {
  const { isUnlocked } = useE2EE();
  const {
    searchEnabledByDefault,
    defaultSearchProvider,
    setSearchEnabledByDefault,
    setDefaultSearchProvider,
    setProviderApiKey,
    removeProviderApiKey,
    hasProviderApiKey,
    getConfiguredProviders,
    nativeSearchSettings,
    setNativeSearchEnabled,
    setNativeSearchSettings,
  } = useToolsStore();

  const configuredProviders = getConfiguredProviders();

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium">Encryption locked</p>
        <p className="text-sm text-muted-foreground mt-1">
          Unlock E2EE to configure tool integrations
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Tools</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure search providers and other tool integrations. API keys are encrypted end-to-end.
        </p>
      </div>

      {/* Web Search Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Web Search</h4>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="search-default" className="text-sm font-medium">
                  Enable by default
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automatically enable web search for new messages
                </p>
              </div>
              <Switch
                id="search-default"
                checked={searchEnabledByDefault}
                onCheckedChange={setSearchEnabledByDefault}
                disabled={configuredProviders.length === 0}
              />
            </div>

            {configuredProviders.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm">Default provider</Label>
                <Select
                  value={defaultSearchProvider || undefined}
                  onValueChange={(v) => setDefaultSearchProvider(v as SearchProvider)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select default provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {configuredProviders.map((id) => {
                      const provider = SEARCH_PROVIDERS.find((p) => p.id === id);
                      return (
                        <SelectItem key={id} value={id}>
                          {provider?.name || id}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Native AI Search */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Native AI Search</h4>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Built-in search tools for supported AI providers. No additional API keys required.
        </p>

        <div className="grid gap-2">
          {NATIVE_SEARCH_PROVIDERS.map((provider) => (
            <Card key={provider.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{provider.name}</span>
                      {nativeSearchSettings[provider.id]?.enabled && (
                        <Badge variant="secondary" className="text-micro px-1.5 py-0">
                          Enabled
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {provider.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {provider.features.map((feature) => (
                        <span
                          key={feature}
                          className="text-micro px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Switch
                    checked={nativeSearchSettings[provider.id]?.enabled ?? false}
                    onCheckedChange={(checked) => setNativeSearchEnabled(provider.id, checked)}
                  />
                </div>

                {/* xAI-specific settings */}
                {provider.id === 'xai' && nativeSearchSettings.xai?.enabled && (
                  <div className="mt-4 pt-3 border-t space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-medium">Image understanding</Label>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Allow Grok to analyze images from search results
                        </p>
                      </div>
                      <Switch
                        checked={nativeSearchSettings.xai?.enableImageUnderstanding ?? true}
                        onCheckedChange={(checked) =>
                          setNativeSearchSettings('xai', { enableImageUnderstanding: checked })
                        }
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Search Providers */}
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-medium">External Search Providers</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add API keys for third-party search providers
          </p>
        </div>

        <div className="grid gap-2">
          {SEARCH_PROVIDERS.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              isConfigured={hasProviderApiKey(provider.id)}
              onSaveKey={(apiKey) => {
                setProviderApiKey(provider.id, apiKey);
                toast.success(`${provider.name} API key saved`);
              }}
              onRemoveKey={() => {
                removeProviderApiKey(provider.id);
                toast.success(`${provider.name} API key removed`);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ProviderCardProps {
  provider: {
    id: SearchProvider;
    name: string;
    description: string;
    docsUrl: string;
  };
  isConfigured: boolean;
  onSaveKey: (apiKey: string) => void;
  onRemoveKey: () => void;
}

function ProviderCard({
  provider,
  isConfigured,
  onSaveKey,
  onRemoveKey,
}: ProviderCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleSave = useCallback(() => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }
    onSaveKey(apiKey.trim());
    setApiKey('');
    setIsEditing(false);
  }, [apiKey, onSaveKey]);

  const handleCancel = useCallback(() => {
    setApiKey('');
    setIsEditing(false);
  }, []);

  return (
    <Card className={isConfigured ? 'border-status-success/30 bg-status-success/5' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{provider.name}</span>
              {isConfigured && (
                <Badge variant="success" className="text-micro px-1.5 py-0">
                  <Check className="h-3 w-3 mr-0.5" />
                  Connected
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {provider.description}
            </p>
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-micro text-primary hover:underline mt-1.5"
            >
              Get API key
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isConfigured && !isEditing && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove API Key</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove the {provider.name} API key?
                      You'll need to add it again to use this search provider.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onRemoveKey}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {!isEditing && (
              <Button
                variant={isConfigured ? 'outline' : 'default'}
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Key className="h-3.5 w-3.5 mr-1.5" />
                {isConfigured ? 'Update' : 'Add'}
              </Button>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="mt-4 space-y-3 pt-3 border-t">
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder={`Enter ${provider.name} API key`}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
                className="pr-10"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
