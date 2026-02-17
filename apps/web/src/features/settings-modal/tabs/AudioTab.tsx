import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Volume2 } from 'lucide-react';
import { useAudioStore } from '@/stores/audioStore';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

export function AudioTab() {
  const {
    ttsEnabled,
    ttsAutoPlay,
    ttsVoice,
    setTtsEnabled,
    setTtsAutoPlay,
    setTtsVoice,
  } = useAudioStore();

  const { voices } = useSpeechSynthesis();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Audio Settings</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure text-to-speech
        </p>
      </div>

      {/* Text-to-Speech Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          <h4 className="text-sm font-medium">Text-to-Speech</h4>
        </div>

        <div className="space-y-4 pl-7">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="tts-enabled" className="font-normal">
                Enable TTS
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">Read responses aloud</p>
            </div>
            <Switch
              id="tts-enabled"
              checked={ttsEnabled}
              onCheckedChange={setTtsEnabled}
            />
          </div>

          <div className={ttsEnabled ? "space-y-4" : "space-y-4 opacity-50 pointer-events-none"}>
            <div className="space-y-2">
              <Label>Voice</Label>
              <Select
                value={ttsVoice || "default"}
                onValueChange={(v) => setTtsVoice(v === "default" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default System Voice</SelectItem>
                  {voices.map((voice) => (
                    <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} ({voice.lang})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-play" className="font-normal">
                  Auto-play Responses
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Automatically read new responses
                </p>
              </div>
              <Switch
                id="auto-play"
                checked={ttsAutoPlay}
                onCheckedChange={setTtsAutoPlay}
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
