import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useFolders, useCreateFolder, useUpdateFolder, useDeleteFolder } from '@/hooks/queries/useFolders';
import type { Folder } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Folder as FolderIcon, FolderOpen, ChevronRight, Plus, Edit, Trash, Check, X, Archive } from 'lucide-react';

interface FolderTreeProps {
  selectedFolderId?: string;
  onSelectFolder: (id: string | undefined) => void;
  showAllOption?: boolean;
}

interface FolderNode extends Folder {
  children: FolderNode[];
}

export function FolderTree({ selectedFolderId, onSelectFolder, showAllOption = true }: FolderTreeProps) {
  const { data: folders = [], isLoading } = useFolders();
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string | undefined>();
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);

  // Build folder tree
  const folderTree = useMemo(() => {
    const nodeMap = new Map<string, FolderNode>();
    const rootNodes: FolderNode[] = [];

    // Create nodes
    folders.forEach((folder) => {
      nodeMap.set(folder.id, { ...folder, children: [] });
    });

    // Build tree
    folders.forEach((folder) => {
      const node = nodeMap.get(folder.id)!;
      if (folder.parentId && nodeMap.has(folder.parentId)) {
        nodeMap.get(folder.parentId)!.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    // Sort children
    const sortNodes = (nodes: FolderNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach((node) => sortNodes(node.children));
    };
    sortNodes(rootNodes);

    return rootNodes;
  }, [folders]);

  const toggleExpanded = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleStartEdit = (folder: Folder, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFolderId(folder.id);
    setEditingName(folder.name);
  };

  const handleSaveEdit = async () => {
    if (editingFolderId && editingName.trim()) {
      await updateFolder.mutateAsync({
        id: editingFolderId,
        data: { name: editingName.trim() },
      });
    }
    setEditingFolderId(null);
    setEditingName('');
  };

  const handleDelete = async (id: string) => {
    await deleteFolder.mutateAsync(id);
    if (selectedFolderId === id) {
      onSelectFolder(undefined);
    }
    setDeletingFolderId(null);
  };

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await createFolder.mutateAsync({
        name: newFolderName.trim(),
        parentId: newFolderParentId,
      });
      setNewFolderName('');
      setIsCreating(false);
      setNewFolderParentId(undefined);
    }
  };

  const handleStartCreate = (parentId?: string) => {
    setIsCreating(true);
    setNewFolderParentId(parentId);
    setNewFolderName('');
  };

  const renderFolder = (node: FolderNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const isEditing = editingFolderId === node.id;
    const hasChildren = node.children.length > 0;
    const isSelected = selectedFolderId === node.id;

    return (
      <div key={node.id}>
        <div
          className={cn(
            'flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer group',
            isSelected
              ? 'bg-primary/10 text-primary'
              : 'hover:bg-accent'
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => onSelectFolder(node.id)}
        >
          {/* Expand toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(node.id);
            }}
            className={cn(
              'h-5 w-5 p-0',
              !hasChildren && 'invisible'
            )}
          >
            <ChevronRight className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-90')} />
          </Button>

          {/* Folder icon */}
          {isExpanded ? (
            <FolderOpen className={cn('h-4 w-4 flex-shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')} />
          ) : (
            <FolderIcon className={cn('h-4 w-4 flex-shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')} />
          )}

          {/* Name */}
          {isEditing ? (
            <Input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') setEditingFolderId(null);
              }}
              autoFocus
              className="flex-1 h-6 text-sm px-1"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 text-sm truncate">{node.name}</span>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartCreate(node.id);
                }}
                className="h-6 w-6"
                title="Add subfolder"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleStartEdit(node, e)}
                className="h-6 w-6"
                title="Rename"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingFolderId(node.id);
                }}
                className="h-6 w-6 text-destructive hover:text-destructive"
                title="Delete"
              >
                <Trash className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div>
            {node.children.map((child) => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-4 text-muted-foreground text-sm">Loading folders...</div>;
  }

  return (
    <div className="py-2">
      {/* All option */}
      {showAllOption && (
        <div
          className={cn(
            'flex items-center gap-2 py-1.5 px-2 mx-2 rounded-md cursor-pointer',
            !selectedFolderId
              ? 'bg-primary/10 text-primary'
              : 'hover:bg-accent'
          )}
          onClick={() => onSelectFolder(undefined)}
        >
          <Archive className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">All items</span>
        </div>
      )}

      {/* Folder tree */}
      <div className="px-2 mt-1">
        {folderTree.map((node) => renderFolder(node))}
      </div>

      {/* Create new folder */}
      {isCreating ? (
        <div className="flex items-center gap-2 px-4 py-2 mt-2">
          <Input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder();
              if (e.key === 'Escape') setIsCreating(false);
            }}
            placeholder="Folder name"
            autoFocus
            className="flex-1 h-8"
          />
          <Button
            size="icon"
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim()}
            className="h-8 w-8"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCreating(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          onClick={() => handleStartCreate()}
          className="w-full justify-start px-4 mt-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          New folder
        </Button>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deletingFolderId} onOpenChange={() => setDeletingFolderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Items in this folder will be moved to the root level.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingFolderId && handleDelete(deletingFolderId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
