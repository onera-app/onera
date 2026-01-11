import { useState } from 'react';
import { ConnectionsList, AddConnectionModal } from '@/components/connections';
import { useCredentials } from '@/hooks/queries/useCredentials';

export function ConnectionsPage() {
  const credentials = useCredentials() ?? [];
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(null);

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

  const editingCredential = editingCredentialId
    ? credentials.find((c) => c.id === editingCredentialId)
    : undefined;

  return (
    <div className="h-full bg-white dark:bg-gray-950 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Connections
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Manage your LLM provider connections. Your API keys are encrypted and sent directly to providers.
          </p>
        </div>

        <ConnectionsList
          onAddConnection={handleAddConnection}
          onEditConnection={handleEditConnection}
        />

        {showAddModal && selectedProviderId && (
          <AddConnectionModal
            open={showAddModal}
            onClose={handleCloseModal}
            providerId={selectedProviderId}
            existingCredential={editingCredential}
          />
        )}
      </div>
    </div>
  );
}
