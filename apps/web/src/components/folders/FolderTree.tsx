import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useFolders, useCreateFolder, useUpdateFolder, useDeleteFolder } from '@/hooks/queries/useFolders';
import type { Folder } from '@/lib/api';

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
      if (folder.parent_id && nodeMap.has(folder.parent_id)) {
        nodeMap.get(folder.parent_id)!.children.push(node);
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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this folder?')) {
      await deleteFolder.mutateAsync(id);
      if (selectedFolderId === id) {
        onSelectFolder(undefined);
      }
    }
  };

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await createFolder.mutateAsync({
        name: newFolderName.trim(),
        parent_id: newFolderParentId,
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
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => onSelectFolder(node.id)}
        >
          {/* Expand toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(node.id);
            }}
            className={cn(
              'p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700',
              !hasChildren && 'invisible'
            )}
          >
            <svg
              className={cn('w-3 h-3 transition-transform', isExpanded && 'rotate-90')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Folder icon */}
          <svg
            className={cn(
              'w-4 h-4 flex-shrink-0',
              isSelected ? 'text-blue-500' : 'text-gray-400'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isExpanded
                ? "M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
                : "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              }
            />
          </svg>

          {/* Name */}
          {isEditing ? (
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') setEditingFolderId(null);
              }}
              autoFocus
              className="flex-1 px-1 py-0.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 text-sm truncate">{node.name}</span>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartCreate(node.id);
                }}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Add subfolder"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={(e) => handleStartEdit(node, e)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Rename"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                onClick={(e) => handleDelete(node.id, e)}
                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
                title="Delete"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
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
    return <div className="p-4 text-gray-500 text-sm">Loading folders...</div>;
  }

  return (
    <div className="py-2">
      {/* All option */}
      {showAllOption && (
        <div
          className={cn(
            'flex items-center gap-2 py-1.5 px-2 mx-2 rounded-md cursor-pointer',
            !selectedFolderId
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
          onClick={() => onSelectFolder(undefined)}
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
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
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder();
              if (e.key === 'Escape') setIsCreating(false);
            }}
            placeholder="Folder name"
            autoFocus
            className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
          />
          <button
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim()}
            className="p-1 rounded bg-blue-500 text-white disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={() => setIsCreating(false)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          onClick={() => handleStartCreate()}
          className="flex items-center gap-2 w-full px-4 py-2 mt-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New folder
        </button>
      )}
    </div>
  );
}
