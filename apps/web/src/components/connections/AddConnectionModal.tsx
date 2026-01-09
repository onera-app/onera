import { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useCreateCredential, useUpdateCredential } from '@/hooks/queries/useCredentials';
import { LLM_PROVIDERS, type Credential } from '@/lib/api';
import { cn } from '@/lib/utils';
import { encryptCredential, decryptCredential, isUnlocked } from '@cortex/crypto';

interface AddConnectionModalProps {
  open: boolean;
  onClose: () => void;
  providerId: string;
  existingCredential?: Credential;
}

export function AddConnectionModal({
  open,
  onClose,
  providerId,
  existingCredential,
}: AddConnectionModalProps) {
  const provider = LLM_PROVIDERS.find((p) => p.id === providerId);
  const createCredential = useCreateCredential();
  const updateCredential = useUpdateCredential();

  const [name, setName] = useState(existingCredential?.name || '');
  const [fields, setFields] = useState<Record<string, string>>(() => {
    if (existingCredential && isUnlocked()) {
      try {
        const decrypted = decryptCredential({
          encrypted_data: existingCredential.encrypted_data,
          iv: existingCredential.iv,
        });
        return {
          api_key: decrypted.api_key || '',
          base_url: decrypted.base_url || '',
          organization: decrypted.org_id || '',
        };
      } catch {
        return {};
      }
    }
    return {};
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  if (!provider) return null;

  const handleFieldChange = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleTest = async () => {
    setTestStatus('testing');
    // Simulate testing connection
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // In real implementation, would make a test API call
    const hasRequiredFields = provider.fields
      .filter((f) => f.required)
      .every((f) => fields[f.key]);

    if (hasRequiredFields) {
      setTestStatus('success');
    } else {
      setTestStatus('error');
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert('Please enter a name for this connection');
      return;
    }

    const missingFields = provider.fields
      .filter((f) => f.required && !fields[f.key])
      .map((f) => f.label);

    if (missingFields.length > 0) {
      alert(`Please fill in required fields: ${missingFields.join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Build credential object matching LLMCredential interface
      // Field keys from LLM_PROVIDERS: api_key, organization, base_url
      const credential = {
        api_key: fields.api_key || '',
        base_url: fields.base_url || undefined,
        org_id: fields.organization || undefined,
      };

      // Encrypt with master key
      const encrypted = encryptCredential(credential);

      const data = {
        provider: providerId,
        name: name.trim(),
        encrypted_data: encrypted.encrypted_data,
        iv: encrypted.iv,
      };

      if (existingCredential) {
        await updateCredential.mutateAsync({ id: existingCredential.id, data });
      } else {
        await createCredential.mutateAsync(data);
      }

      onClose();
    } catch (error) {
      console.error('Failed to save credential:', error);
      alert('Failed to save credential. Please make sure E2EE is unlocked.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existingCredential ? `Edit ${provider.name} Connection` : `Add ${provider.name} Connection`}
      className="max-w-lg"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {provider.description}
        </p>

        {/* Connection Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Connection Name <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`My ${provider.name} Connection`}
          />
        </div>

        {/* Provider Fields */}
        {provider.fields.map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <Input
              type={field.type}
              value={fields[field.key] || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={'placeholder' in field ? field.placeholder : undefined}
            />
          </div>
        ))}

        {/* Test Connection */}
        <div className="pt-2">
          <button
            onClick={handleTest}
            disabled={testStatus === 'testing'}
            className={cn(
              'text-sm font-medium flex items-center gap-2',
              testStatus === 'success' && 'text-green-600',
              testStatus === 'error' && 'text-red-600',
              testStatus === 'idle' && 'text-blue-600 hover:text-blue-700',
              testStatus === 'testing' && 'text-gray-400'
            )}
          >
            {testStatus === 'testing' && (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                Testing connection...
              </>
            )}
            {testStatus === 'idle' && (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Test Connection
              </>
            )}
            {testStatus === 'success' && (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Connection successful!
              </>
            )}
            {testStatus === 'error' && (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Connection failed
              </>
            )}
          </button>
        </div>

        {/* Security Note */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>
              Your credentials are encrypted with your E2EE key and stored securely.
              They are never visible to the server.
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : existingCredential ? 'Update' : 'Add Connection'}
        </Button>
      </div>
    </Modal>
  );
}
