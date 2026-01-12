import { AccountSettings, InterfaceSettings, E2EESettings } from '@/components/settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Layout, Lock } from 'lucide-react';

export function SettingsPage() {
  return (
    <div className="flex h-full bg-background">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8">
          <h1 className="text-2xl font-bold mb-6">Settings</h1>
          
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="account" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Account
              </TabsTrigger>
              <TabsTrigger value="interface" className="flex items-center gap-2">
                <Layout className="h-4 w-4" />
                Interface
              </TabsTrigger>
              <TabsTrigger value="e2ee" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Encryption
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="account">
              <AccountSettings />
            </TabsContent>
            
            <TabsContent value="interface">
              <InterfaceSettings />
            </TabsContent>
            
            <TabsContent value="e2ee">
              <E2EESettings />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
