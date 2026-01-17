import { useState, useMemo } from 'react';
import {
  useModelParamsStore,
  type ReasoningSummaryLevel,
  type ReasoningEffort,
} from '@/stores/modelParamsStore';
import { useCredentials } from '@/hooks/queries/useCredentials';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

// Providers that have configurable settings
const PROVIDERS_WITH_SETTINGS = ['openai', 'anthropic'] as const;

export function GeneralTab() {
  const {
    globalParams,
    systemPrompt,
    providerSettings,
    setGlobalParam,
    setSystemPrompt,
    setOpenAISettings,
    setAnthropicSettings,
    resetGlobalParams,
  } = useModelParamsStore();

  const credentials = useCredentials();

  // Determine which providers the user has credentials for
  const enabledProviders = useMemo(() => {
    if (!credentials) return new Set<string>();
    return new Set(credentials.map((c) => c.provider));
  }, [credentials]);

  // Check if any provider with settings is enabled
  const hasProviderWithSettings = useMemo(() => {
    return PROVIDERS_WITH_SETTINGS.some((p) => enabledProviders.has(p));
  }, [enabledProviders]);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [providerOpen, setProviderOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">General Settings</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure default model parameters and system prompt
        </p>
      </div>

      {/* System Prompt */}
      <div className="space-y-2">
        <Label htmlFor="system-prompt">System Prompt</Label>
        <Textarea
          id="system-prompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="You are a helpful assistant..."
          className="min-h-[100px] resize-y"
        />
        <p className="text-xs text-muted-foreground">
          This prompt is sent at the beginning of every conversation
        </p>
      </div>

      {/* Stream Response */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="stream-response">Stream Response</Label>
          <p className="text-xs text-muted-foreground">
            Show responses as they're generated
          </p>
        </div>
        <Switch
          id="stream-response"
          checked={globalParams.streamResponse}
          onCheckedChange={(checked) => setGlobalParam('streamResponse', checked)}
        />
      </div>

      {/* Provider-Specific Settings - only show if user has providers with settings */}
      {hasProviderWithSettings && (
        <Collapsible open={providerOpen} onOpenChange={setProviderOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between px-0">
              <span className="font-medium">Provider Settings</span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  providerOpen && 'rotate-180'
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-6 pt-4">
            {/* OpenAI Settings - only show if user has OpenAI credentials */}
            {enabledProviders.has('openai') && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">OpenAI</h4>

                {/* Reasoning Summary */}
                <div className="space-y-2">
                  <Label htmlFor="reasoning-summary">Reasoning Summary</Label>
                  <Select
                    value={providerSettings.openai.reasoningSummary}
                    onValueChange={(value: ReasoningSummaryLevel) =>
                      setOpenAISettings({ reasoningSummary: value })
                    }
                  >
                    <SelectTrigger id="reasoning-summary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="detailed">Detailed</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Controls reasoning output for o1, o3, and gpt-5 models
                  </p>
                </div>

                {/* Reasoning Effort */}
                <div className="space-y-2">
                  <Label htmlFor="reasoning-effort">Reasoning Effort</Label>
                  <Select
                    value={providerSettings.openai.reasoningEffort}
                    onValueChange={(value: ReasoningEffort) =>
                      setOpenAISettings({ reasoningEffort: value })
                    }
                  >
                    <SelectTrigger id="reasoning-effort">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How much effort the model spends on reasoning
                  </p>
                </div>
              </div>
            )}

            {/* Anthropic Settings - only show if user has Anthropic credentials */}
            {enabledProviders.has('anthropic') && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Anthropic</h4>

                {/* Extended Thinking */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="extended-thinking">Extended Thinking</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable extended thinking for Claude models
                    </p>
                  </div>
                  <Switch
                    id="extended-thinking"
                    checked={providerSettings.anthropic.extendedThinking}
                    onCheckedChange={(checked) =>
                      setAnthropicSettings({ extendedThinking: checked })
                    }
                  />
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Advanced Parameters */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between px-0">
            <span className="font-medium">Advanced Parameters</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                advancedOpen && 'rotate-180'
              )}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-6 pt-4">
          {/* Temperature */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Temperature</Label>
              <span className="text-sm text-muted-foreground">
                {globalParams.temperature.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[globalParams.temperature]}
              onValueChange={([value]: number[]) => setGlobalParam('temperature', value)}
              min={0}
              max={2}
              step={0.01}
            />
            <p className="text-xs text-muted-foreground">
              Higher values make output more random, lower values more focused
            </p>
          </div>

          {/* Top P */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Top P (Nucleus Sampling)</Label>
              <span className="text-sm text-muted-foreground">
                {globalParams.topP.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[globalParams.topP]}
              onValueChange={([value]: number[]) => setGlobalParam('topP', value)}
              min={0}
              max={1}
              step={0.01}
            />
            <p className="text-xs text-muted-foreground">
              Consider tokens with top_p probability mass
            </p>
          </div>

          {/* Top K */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Top K</Label>
              <span className="text-sm text-muted-foreground">{globalParams.topK}</span>
            </div>
            <Slider
              value={[globalParams.topK]}
              onValueChange={([value]: number[]) => setGlobalParam('topK', value)}
              min={1}
              max={100}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              Consider only top K tokens for each step
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <Label htmlFor="max-tokens">Max Tokens</Label>
            <Input
              id="max-tokens"
              type="number"
              value={globalParams.maxTokens ?? ''}
              onChange={(e) =>
                setGlobalParam(
                  'maxTokens',
                  e.target.value ? parseInt(e.target.value) : null
                )
              }
              placeholder="Model default"
              min={1}
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of tokens to generate (leave empty for model default)
            </p>
          </div>

          {/* Frequency Penalty */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Frequency Penalty</Label>
              <span className="text-sm text-muted-foreground">
                {globalParams.frequencyPenalty.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[globalParams.frequencyPenalty]}
              onValueChange={([value]: number[]) => setGlobalParam('frequencyPenalty', value)}
              min={-2}
              max={2}
              step={0.01}
            />
            <p className="text-xs text-muted-foreground">
              Reduce repetition of frequent tokens
            </p>
          </div>

          {/* Presence Penalty */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Presence Penalty</Label>
              <span className="text-sm text-muted-foreground">
                {globalParams.presencePenalty.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[globalParams.presencePenalty]}
              onValueChange={([value]: number[]) => setGlobalParam('presencePenalty', value)}
              min={-2}
              max={2}
              step={0.01}
            />
            <p className="text-xs text-muted-foreground">
              Encourage talking about new topics
            </p>
          </div>

          {/* Seed */}
          <div className="space-y-2">
            <Label htmlFor="seed">Seed</Label>
            <Input
              id="seed"
              type="number"
              value={globalParams.seed ?? ''}
              onChange={(e) =>
                setGlobalParam('seed', e.target.value ? parseInt(e.target.value) : null)
              }
              placeholder="Random"
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              Set for reproducible outputs (leave empty for random)
            </p>
          </div>

          {/* Reset Button */}
          <Button
            variant="outline"
            onClick={resetGlobalParams}
            className="w-full"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
