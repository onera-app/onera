import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Github, MessageCircle, BookOpen, Heart } from 'lucide-react';

// Version info - should be injected at build time in production
const APP_VERSION = '0.1.0';
const BUILD_DATE = new Date().toISOString().split('T')[0];

export function AboutTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">About Onera</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Version information and links
        </p>
      </div>

      {/* Version Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Onera</CardTitle>
          <CardDescription>AI Chat Interface</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Version</p>
              <p className="font-mono">{APP_VERSION}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Build Date</p>
              <p className="font-mono">{BUILD_DATE}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Onera is an open-source AI chat interface that puts privacy first. Your API keys and
              conversations are encrypted end-to-end.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Links */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Links</h4>
        <div className="grid gap-2">
          <Button variant="outline" className="justify-start" asChild>
            <a
              href="https://github.com/onera-app/onera"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-4 w-4 mr-2" />
              GitHub Repository
              <ExternalLink className="h-3 w-3 ml-auto" />
            </a>
          </Button>

          <Button variant="outline" className="justify-start" asChild>
            <a
              href="https://docs.onera.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Documentation
              <ExternalLink className="h-3 w-3 ml-auto" />
            </a>
          </Button>

          <Button variant="outline" className="justify-start" asChild>
            <a
              href="https://discord.gg/onera"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Community Discord
              <ExternalLink className="h-3 w-3 ml-auto" />
            </a>
          </Button>
        </div>
      </div>

      {/* Credits */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Credits</h4>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              Built with React, TanStack Router, tRPC, and Tailwind CSS. Inspired by open-webui
              and other excellent open-source AI interfaces.
            </p>
            <div className="flex items-center gap-1 mt-3 text-sm text-muted-foreground">
              <span>Made with</span>
              <Heart className="h-4 w-4 text-red-500 fill-red-500" />
              <span>by the Onera team</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* License */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">License</h4>
        <p className="text-sm text-muted-foreground">
          Onera is open-source software licensed under the GNU Affero General Public License v3.0.
        </p>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Keyboard Shortcuts</h4>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">New Chat</span>
            <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-850 rounded">⌘ N</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Toggle Sidebar</span>
            <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-850 rounded">⌘ B</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Settings</span>
            <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-850 rounded">⌘ ,</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Search Chats</span>
            <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-850 rounded">⌘ K</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
