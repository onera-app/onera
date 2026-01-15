import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Volume2, Mic, Construction } from 'lucide-react';

export function AudioTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Audio Settings</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure text-to-speech and speech-to-text
        </p>
      </div>

      <Alert>
        <Construction className="h-4 w-4" />
        <AlertDescription>
          Audio features are coming soon. Stay tuned for text-to-speech and voice input support.
        </AlertDescription>
      </Alert>

      {/* Text-to-Speech Section */}
      <div className="space-y-4 opacity-50 pointer-events-none">
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
              <p className="text-xs text-muted-foreground">Read responses aloud</p>
            </div>
            <Switch id="tts-enabled" disabled />
          </div>

          <div className="space-y-2">
            <Label>TTS Engine</Label>
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder="Select engine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="browser">Browser (Web Speech API)</SelectItem>
                <SelectItem value="openai">OpenAI TTS</SelectItem>
                <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Voice</Label>
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder="Select voice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-play" className="font-normal">
                Auto-play Responses
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically read new responses
              </p>
            </div>
            <Switch id="auto-play" disabled />
          </div>
        </div>
      </div>

      {/* Speech-to-Text Section */}
      <div className="space-y-4 opacity-50 pointer-events-none">
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          <h4 className="text-sm font-medium">Speech-to-Text</h4>
        </div>

        <div className="space-y-4 pl-7">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="stt-enabled" className="font-normal">
                Enable STT
              </Label>
              <p className="text-xs text-muted-foreground">Use voice to type messages</p>
            </div>
            <Switch id="stt-enabled" disabled />
          </div>

          <div className="space-y-2">
            <Label>STT Engine</Label>
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder="Select engine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="browser">Browser (Web Speech API)</SelectItem>
                <SelectItem value="whisper">OpenAI Whisper</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Language</Label>
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-send" className="font-normal">
                Auto-send on Speech
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically send after speaking
              </p>
            </div>
            <Switch id="auto-send" disabled />
          </div>
        </div>
      </div>
    </div>
  );
}
