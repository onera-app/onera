/**
 * Tools Settings Component
 * Configure search providers and other tool integrations
 */

import { useState, useCallback } from 'react';
import { Globe, Key, ExternalLink, Check, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useToolsStore, SEARCH_PROVIDERS } from '@/stores/toolsStore';
import { useE2EE } from '@/providers/E2EEProvider';
import type { SearchProvider } from '@onera/types';

export function ToolsSettings() {
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
  } = useToolsStore();

  const configuredProviders = getConfiguredProviders();

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Globe className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Unlock to Configure Tools</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Tools settings are encrypted with your master key. Unlock E2EE to
          configure search providers and other integrations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Web Search Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5" />
          <h3 className="text-lg font-medium">Web Search</h3>
        </div>

        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Search Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="search-default">Enable by default</Label>
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
              <div className="space-y-2">
                <Label>Default provider</Label>
                <Select
                  value={defaultSearchProvider || undefined}
                  onValueChange={(v) => setDefaultSearchProvider(v as SearchProvider)}
                >
                  <SelectTrigger>
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

        {/* Provider Cards */}
        <div className="space-y-3">
          <Label>Search Providers</Label>
          <p className="text-xs text-muted-foreground mb-3">
            Add API keys for the search providers you want to use. Keys are
            encrypted with your master key.
          </p>

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
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{provider.name}</span>
              {isConfigured && (
                <Badge variant="secondary" className="text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  Configured
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {provider.description}
            </p>
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
            >
              Get API key
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="flex items-center gap-2 ml-4">
            {isConfigured && !isEditing && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
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
                    <AlertDialogAction onClick={onRemoveKey}>
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
                <Key className="h-4 w-4 mr-1.5" />
                {isConfigured ? 'Update' : 'Add'} Key
              </Button>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder={`Enter ${provider.name} API key`}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
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
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
