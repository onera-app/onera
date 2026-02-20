import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, CloudIcon, Delete02Icon, Loading02Icon, PencilIcon, SmartPhone01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  usePasskeyList,
  useDeletePasskey,
  useRenamePasskey,
  decryptPasskeyName,
} from "@/hooks/useWebAuthn";

interface PasskeyListProps {
  /** Callback when a passkey is deleted */
  onDelete?: () => void;
}

export function PasskeyList({ onDelete }: PasskeyListProps) {
  const { data: passkeys, isLoading, error } = usePasskeyList();
  const deletePasskey = useDeletePasskey();
  const renamePasskey = useRenamePasskey();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleStartEdit = (credentialId: string, passkey: typeof passkeys extends (infer T)[] | undefined ? T : never) => {
    setEditingId(credentialId);
    // Use decrypted name for editing
    setEditName(decryptPasskeyName(passkey));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleSaveEdit = async (credentialId: string) => {
    if (!editName.trim()) {
      toast.error("Please enter a name");
      return;
    }

    try {
      // Use renameWithEncryption for automatic encryption
      await renamePasskey.renameWithEncryption(credentialId, editName.trim());
      toast.success("Passkey renamed");
      setEditingId(null);
      setEditName("");
    } catch (err) {
      console.error("Failed to rename passkey:", err);
      toast.error("Failed to rename passkey");
    }
  };

  const handleDelete = async (credentialId: string) => {
    try {
      await deletePasskey.mutateAsync({ credentialId });
      toast.success("Passkey deleted");
      setDeleteConfirmId(null);
      onDelete?.();
    } catch (err) {
      console.error("Failed to delete passkey:", err);
      toast.error("Failed to delete passkey");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <HugeiconsIcon icon={Loading02Icon} className="h-5 w-5 animate-spin text-gray-500 dark:text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
        Failed to load passkeys
      </div>
    );
  }

  if (!passkeys || passkeys.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
        No passkeys registered yet
      </div>
    );
  }

  const passkeyToDelete = passkeys.find((p) => p.credentialId === deleteConfirmId);

  return (
    <>
      <div className="space-y-2">
        {passkeys.map((passkey) => (
          <div
            key={passkey.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-gray-850"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {passkey.credentialDeviceType === "multiDevice" ? (
                <HugeiconsIcon icon={CloudIcon} className="h-5 w-5 text-primary flex-shrink-0" />
              ) : (
                <HugeiconsIcon icon={SmartPhone01Icon} className="h-5 w-5 text-primary flex-shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                {editingId === passkey.credentialId ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSaveEdit(passkey.credentialId);
                        } else if (e.key === "Escape") {
                          handleCancelEdit();
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleSaveEdit(passkey.credentialId)}
                      disabled={renamePasskey.isPending}
                    >
                      {renamePasskey.isPending ? (
                        <HugeiconsIcon icon={Loading02Icon} className="h-4 w-4 animate-spin" />
                      ) : (
                        <HugeiconsIcon icon={Tick01Icon} className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={handleCancelEdit}
                    >
                      <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium truncate">
                      {decryptPasskeyName(passkey)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {passkey.deviceType}
                      {passkey.lastUsedAt && (
                        <>
                          {" "}
                          • Last used{" "}
                          {new Date(passkey.lastUsedAt).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  </>
                )}
              </div>
            </div>

            {editingId !== passkey.credentialId && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() =>
                    handleStartEdit(passkey.credentialId, passkey)
                  }
                  title="Rename passkey"
                >
                  <HugeiconsIcon icon={PencilIcon} className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setDeleteConfirmId(passkey.credentialId)}
                  title="Delete passkey"
                >
                  <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Passkey?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>"{passkeyToDelete ? decryptPasskeyName(passkeyToDelete) : "this passkey"}"</strong>?
              <br />
              <br />
              You can still unlock with your recovery phrase or other passkeys.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deletePasskey.isPending ? (
                <>
                  <HugeiconsIcon icon={Loading02Icon} className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
