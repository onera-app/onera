import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useCredentials, useDeleteCredential } from '@/hooks/queries/useCredentials';
import { useE2EE } from '@/providers/E2EEProvider';
import { LLM_PROVIDERS, PROVIDER_CATEGORIES, type ProviderCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { AddConnectionModal } from '@/components/connections/AddConnectionModal';
import { Lock, Trash2, Plus, ExternalLink, CheckCircle2 } from 'lucide-react';
import dayjs from 'dayjs';

export function ConnectionsTab() {
  const credentialsData = useCredentials();
  const credentials = useMemo(() => credentialsData ?? [], [credentialsData]);
  const isLoading = credentialsData === undefined;
  const deleteCredential = useDeleteCredential();
  const { isUnlocked } = useE2EE();

  const [deleteCredentialId, setDeleteCredentialId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<ProviderCategory>('popular');

  // Group providers by category
  const providersByCategory = useMemo(() => {
    const grouped = new Map<ProviderCategory, typeof LLM_PROVIDERS>();
    for (const category of PROVIDER_CATEGORIES) {
      grouped.set(
        category.id,
        LLM_PROVIDERS.filter((p) => p.category === category.id)
      );
    }
    return grouped;
  }, []);

  // Get connected provider IDs
  const connectedProviderIds = useMemo(() => {
    return new Set(credentials.map((c) => c.provider));
  }, [credentials]);

  const handleAddConnection = (providerId: string) => {
    setSelectedProviderId(providerId);
    setEditingCredentialId(null);
    setShowAddModal(true);
  };

  const handleEditConnection = (credentialId: string) => {
    const credential = credentials.find((c) => c.id === credentialId);
    if (credential) {
      setSelectedProviderId(credential.provider);
      setEditingCredentialId(credentialId);
      setShowAddModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setSelectedProviderId('');
    setEditingCredentialId(null);
  };

  const handleDelete = async () => {
    if (!deleteCredentialId) return;
    await deleteCredential.mutateAsync(deleteCredentialId);
    setDeleteCredentialId(null);
  };

  const getProviderInfo = (providerId: string) => {
    return LLM_PROVIDERS.find((p) => p.id === providerId);
  };

  const editingCredential = editingCredentialId
    ? credentials.find((c) => c.id === editingCredentialId)
    : undefined;

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-850 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-gray-500 dark:text-gray-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">Encryption locked</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Unlock E2EE to manage your connections
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-40 mb-3" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Connections</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Connect your AI provider accounts. API keys are encrypted end-to-end.
        </p>
      </div>

      {/* Your Connections */}
      {credentials.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-status-success-text" />
            Connected ({credentials.length})
          </h4>
          <div className="grid gap-2">
            {credentials.map((credential) => {
              const provider = getProviderInfo(credential.provider);
              return (
                <Card
                  key={credential.id}
                  className="cursor-pointer hover:border-primary/50 transition-all group"
                  onClick={() => handleEditConnection(credential.id)}
                >
                  <CardContent className="flex items-center gap-3 p-3">
                    <ProviderIcon provider={credential.provider} className="w-10 h-10" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate text-sm">{credential.name}</h4>
                        <Badge variant="success" className="text-micro px-1.5 py-0">
                          Connected
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {provider?.name || credential.provider} &middot; Added{' '}
                        {dayjs(credential.createdAt).format('MMM D')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteCredentialId(credential.id);
                      }}
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 text-gray-500 dark:text-gray-400 hover:text-destructive transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Add New Connection */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Add Connection</h4>

        {/* Category Tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-gray-50 dark:bg-gray-850">
          {PROVIDER_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                'flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                activeCategory === category.id
                  ? 'bg-white dark:bg-gray-900 text-foreground shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-foreground'
              )}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Provider Grid */}
        <ScrollArea className="h-[280px] -mx-1 px-1">
          <div className="grid grid-cols-2 gap-2">
            {providersByCategory.get(activeCategory)?.map((provider) => {
              const isConnected = connectedProviderIds.has(provider.id);
              return (
                <Card
                  key={provider.id}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    isConnected
                      ? 'border-status-success/30 bg-status-success/5'
                      : 'hover:border-primary/50'
                  )}
                  onClick={() => handleAddConnection(provider.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <ProviderIcon provider={provider.id} className="w-10 h-10 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm truncate">{provider.name}</span>
                          {isConnected && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-status-success-text flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                          {provider.description}
                        </p>
                        {provider.website && (
                          <a
                            href={provider.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400 hover:text-primary hover:underline mt-1"
                          >
                            Get API Key <ExternalLink className="w-2 h-2" />
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Empty State */}
      {credentials.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6 text-center border-2 border-dashed rounded-xl bg-gray-50 dark:bg-gray-900">
          <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-850 flex items-center justify-center mb-3">
            <Plus className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No connections yet</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Select a provider above to get started
          </p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCredentialId} onOpenChange={() => setDeleteCredentialId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete connection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this connection. You'll need to re-enter your API key to
              use this provider again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Modal */}
      {showAddModal && selectedProviderId && (
        <AddConnectionModal
          open={showAddModal}
          onClose={handleCloseModal}
          providerId={selectedProviderId}
          existingCredential={editingCredential}
        />
      )}
    </div>
  );
}

function ProviderIcon({ provider, className }: { provider: string; className?: string }) {
  const iconClass = cn('rounded-xl flex items-center justify-center', className);

  switch (provider) {
    case 'openai':
      return (
        <div className={cn(iconClass, 'bg-emerald-500/10')}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-emerald-600 dark:text-emerald-400">
            <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
          </svg>
        </div>
      );
    case 'anthropic':
      return (
        <div className={cn(iconClass, 'bg-orange-500/10')}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-orange-600 dark:text-orange-400">
            <path d="M13.827 3.52l5.51 16.96H24L18.165 3.52h-4.338zm-9.164 0L0 20.48h4.663l.856-2.752h5.636l.856 2.752h4.663L11.99 3.52H4.663zm2.37 11.456l1.852-5.952 1.852 5.952H6.033z" />
          </svg>
        </div>
      );
    case 'google':
      return (
        <div className={cn(iconClass, 'bg-blue-500/10')}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-600 dark:text-blue-400">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        </div>
      );
    case 'xai':
      return (
        <div className={cn(iconClass, 'bg-neutral-500/10')}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-neutral-700 dark:text-neutral-300">
            <path d="M8 2L2 12l6 10h3l-6-10 6-10H8zm8 0l6 10-6 10h-3l6-10-6-10h3z" />
          </svg>
        </div>
      );
    case 'groq':
      return (
        <div className={cn(iconClass, 'bg-purple-500/10')}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-purple-600 dark:text-purple-400">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>
      );
    case 'mistral':
      return (
        <div className={cn(iconClass, 'bg-amber-500/10')}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-amber-600 dark:text-amber-400">
            <rect x="2" y="2" width="6" height="6" />
            <rect x="9" y="2" width="6" height="6" />
            <rect x="16" y="2" width="6" height="6" />
            <rect x="2" y="9" width="6" height="6" />
            <rect x="16" y="9" width="6" height="6" />
            <rect x="2" y="16" width="6" height="6" />
            <rect x="9" y="16" width="6" height="6" />
            <rect x="16" y="16" width="6" height="6" />
          </svg>
        </div>
      );
    case 'deepseek':
      return (
        <div className={cn(iconClass, 'bg-cyan-500/10')}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-cyan-600 dark:text-cyan-400">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
      );
    case 'openrouter':
      return (
        <div className={cn(iconClass, 'bg-rose-500/10')}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-rose-600 dark:text-rose-400">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
          </svg>
        </div>
      );
    case 'together':
      return (
        <div className={cn(iconClass, 'bg-indigo-500/10')}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-600 dark:text-indigo-400">
            <circle cx="8" cy="8" r="4" />
            <circle cx="16" cy="8" r="4" />
            <circle cx="8" cy="16" r="4" />
            <circle cx="16" cy="16" r="4" />
          </svg>
        </div>
      );
    case 'fireworks':
      return (
        <div className={cn(iconClass, 'bg-red-500/10')}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-600 dark:text-red-400">
            <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
          </svg>
        </div>
      );
    case 'ollama':
      return (
        <div className={cn(iconClass, 'bg-zinc-500/10')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-zinc-600 dark:text-zinc-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
          </svg>
        </div>
      );
    case 'lmstudio':
      return (
        <div className={cn(iconClass, 'bg-teal-500/10')}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-teal-600 dark:text-teal-400">
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8h16v10z" />
            <path d="M7 10h2v8H7zm4 0h2v8h-2zm4 0h2v8h-2z" />
          </svg>
        </div>
      );
    case 'custom':
      return (
        <div className={cn(iconClass, 'bg-slate-500/10')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-slate-600 dark:text-slate-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      );
    default:
      return (
        <div className={cn(iconClass, 'bg-gray-100 dark:bg-gray-850')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-gray-500 dark:text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      );
  }
}
