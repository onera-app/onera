import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useCredentials, useDeleteCredential } from '@/hooks/queries/useCredentials';
import { useE2EE } from '@/providers/E2EEProvider';
import { LLM_PROVIDERS } from '@/lib/api';
import { Button } from '@/components/common/Button';
import dayjs from 'dayjs';

interface ConnectionsListProps {
  onAddConnection: (providerId: string) => void;
  onEditConnection: (credentialId: string) => void;
}

export function ConnectionsList({ onAddConnection, onEditConnection }: ConnectionsListProps) {
  const { data: credentials = [], isLoading } = useCredentials();
  const deleteCredential = useDeleteCredential();
  const { isUnlocked } = useE2EE();

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this connection?')) {
      await deleteCredential.mutateAsync(id);
    }
  };

  const getProviderInfo = (providerId: string) => {
    return LLM_PROVIDERS.find((p) => p.id === providerId);
  };

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-gray-500 dark:text-gray-400">
          Unlock E2EE to manage your connections
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Add Connection Buttons */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Add New Connection
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {LLM_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() => onAddConnection(provider.id)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 dark:border-gray-700',
                'hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors'
              )}
            >
              <ProviderIcon provider={provider.id} className="w-8 h-8" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {provider.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Existing Connections */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Your Connections ({credentials.length})
        </h3>

        {credentials.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No connections yet. Add one above to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {credentials.map((credential) => {
              const provider = getProviderInfo(credential.provider);
              return (
                <div
                  key={credential.id}
                  onClick={() => onEditConnection(credential.id)}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700',
                    'bg-white dark:bg-gray-900 cursor-pointer',
                    'hover:border-blue-500 hover:shadow-sm transition-all group'
                  )}
                >
                  <ProviderIcon provider={credential.provider} className="w-10 h-10" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {credential.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {provider?.name || credential.provider}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Added {dayjs(credential.created_at).format('MMM D, YYYY')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" title="Connected" />
                    <button
                      onClick={(e) => handleDelete(credential.id, e)}
                      className="p-2 rounded-lg opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                      title="Delete connection"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ProviderIcon({ provider, className }: { provider: string; className?: string }) {
  // Simple placeholder icons - in production, would use actual provider logos
  const iconClass = cn('rounded-lg p-1.5', className);

  switch (provider) {
    case 'openai':
      return (
        <div className={cn(iconClass, 'bg-green-100 dark:bg-green-900/30 text-green-600')}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
          </svg>
        </div>
      );
    case 'anthropic':
      return (
        <div className={cn(iconClass, 'bg-orange-100 dark:bg-orange-900/30 text-orange-600')}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.827 3.52l5.51 16.96H24L18.165 3.52h-4.338zm-9.164 0L0 20.48h4.663l.856-2.752h5.636l.856 2.752h4.663L11.99 3.52H4.663zm2.37 11.456l1.852-5.952 1.852 5.952H6.033z"/>
          </svg>
        </div>
      );
    case 'ollama':
      return (
        <div className={cn(iconClass, 'bg-purple-100 dark:bg-purple-900/30 text-purple-600')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
          </svg>
        </div>
      );
    case 'openrouter':
      return (
        <div className={cn(iconClass, 'bg-blue-100 dark:bg-blue-900/30 text-blue-600')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
        </div>
      );
    case 'google':
      return (
        <div className={cn(iconClass, 'bg-red-100 dark:bg-red-900/30 text-red-600')}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
          </svg>
        </div>
      );
    default:
      return (
        <div className={cn(iconClass, 'bg-gray-100 dark:bg-gray-800 text-gray-500')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      );
  }
}
