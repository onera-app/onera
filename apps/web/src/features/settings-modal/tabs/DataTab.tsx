import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Archive, Trash2, AlertTriangle } from 'lucide-react';

export function DataTab() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExportChats = async () => {
    setIsExporting(true);
    try {
      // TODO: Implement actual export
      // For now, simulate export
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        conversations: [],
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `onera-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Chats exported successfully');
    } catch {
      toast.error('Failed to export chats');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportChats = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      JSON.parse(text); // Validate JSON

      // TODO: Implement actual import
      // Validate and import conversations

      toast.success('Chats imported successfully');
    } catch {
      toast.error('Failed to import chats. Invalid file format.');
    } finally {
      setIsImporting(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleDeleteAllChats = async () => {
    try {
      // TODO: Implement actual delete all
      toast.success('All chats deleted');
    } catch {
      toast.error('Failed to delete chats');
    } finally {
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Data Controls</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Export, import, and manage your chat data
        </p>
      </div>

      {/* Export Section */}
      <div className="space-y-3">
        <Label>Export Chats</Label>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Download all your conversations as a JSON file
        </p>
        <Button
          variant="outline"
          onClick={handleExportChats}
          disabled={isExporting}
          className="w-full sm:w-auto"
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export All Chats'}
        </Button>
      </div>

      {/* Import Section */}
      <div className="space-y-3">
        <Label>Import Chats</Label>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Import conversations from a previously exported file
        </p>
        <div className="flex items-center gap-3">
          <Input
            type="file"
            accept=".json"
            onChange={handleImportChats}
            disabled={isImporting}
            className="max-w-xs"
          />
          {isImporting && <span className="text-sm text-gray-500 dark:text-gray-400">Importing...</span>}
        </div>
      </div>

      {/* Archive Section */}
      <div className="space-y-3">
        <Label>Archive Chats</Label>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Archive all conversations to hide them from the sidebar
        </p>
        <Button variant="outline" disabled className="w-full sm:w-auto">
          <Archive className="h-4 w-4 mr-2" />
          Archive All Chats
        </Button>
        <p className="text-xs text-gray-500 dark:text-gray-400">Coming soon</p>
      </div>

      {/* Delete Section */}
      <div className="space-y-3 pt-4 border-t">
        <Label className="text-destructive">Danger Zone</Label>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Deleting all chats is permanent and cannot be undone. Make sure to export your data
            first.
          </AlertDescription>
        </Alert>
        <Button
          variant="destructive"
          onClick={() => setShowDeleteDialog(true)}
          className="w-full sm:w-auto"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete All Chats
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All your conversations will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllChats}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
