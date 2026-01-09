/**
 * Credentials API Hooks with E2EE Support
 */

import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { apiGet, apiPost, apiDelete } from './client';
import {
	encryptCredential,
	decryptCredentials,
	isUnlocked,
	type LLMCredential,
	type EncryptedCredentialData
} from '$lib/crypto/sodium';

export interface StoredCredential {
	id: string;
	provider: string;
	name: string;
	encrypted_data: string;
	iv: string;
	created_at: string;
	updated_at: string;
}

export interface DecryptedCredential extends LLMCredential {
	id: string;
	provider: string;
	name: string;
}

/**
 * Get credentials list (encrypted)
 */
export function useCredentialsQuery() {
	return createQuery({
		queryKey: ['credentials'],
		queryFn: async (): Promise<DecryptedCredential[]> => {
			const credentials = await apiGet<StoredCredential[]>('/api/v1/credentials');
			
			if (!isUnlocked() || credentials.length === 0) {
				return [];
			}

			try {
				return decryptCredentials(credentials) as unknown as DecryptedCredential[];
			} catch (error) {
				console.error('Failed to decrypt credentials:', error);
				return [];
			}
		},
		staleTime: 60_000
	});
}

/**
 * Create credential mutation
 */
export function useCreateCredentialMutation() {
	const queryClient = useQueryClient();

	return createMutation({
		mutationFn: async (credential: {
			provider: string;
			name: string;
			apiKey: string;
			baseUrl?: string;
			orgId?: string;
		}): Promise<StoredCredential> => {
			if (!isUnlocked()) {
				throw new Error('E2EE must be unlocked to save credentials');
			}

			const encrypted = encryptCredential({
				api_key: credential.apiKey,
				base_url: credential.baseUrl,
				org_id: credential.orgId
			});

			return apiPost<StoredCredential>('/api/v1/credentials', {
				provider: credential.provider,
				name: credential.name,
				encrypted_data: encrypted.encrypted_data,
				iv: encrypted.iv
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['credentials'] });
		}
	});
}

/**
 * Update credential mutation
 */
export function useUpdateCredentialMutation() {
	const queryClient = useQueryClient();

	return createMutation({
		mutationFn: async ({
			id,
			credential
		}: {
			id: string;
			credential: {
				provider?: string;
				name?: string;
				apiKey?: string;
				baseUrl?: string;
				orgId?: string;
			};
		}): Promise<StoredCredential> => {
			if (!isUnlocked()) {
				throw new Error('E2EE must be unlocked to update credentials');
			}

			const encrypted = encryptCredential({
				api_key: credential.apiKey || '',
				base_url: credential.baseUrl,
				org_id: credential.orgId
			});

			return apiPost<StoredCredential>(`/api/v1/credentials/${id}`, {
				provider: credential.provider,
				name: credential.name,
				encrypted_data: encrypted.encrypted_data,
				iv: encrypted.iv
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['credentials'] });
		}
	});
}

/**
 * Delete credential mutation
 */
export function useDeleteCredentialMutation() {
	const queryClient = useQueryClient();

	return createMutation({
		mutationFn: async (id: string): Promise<void> => {
			await apiDelete(`/api/v1/credentials/${id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['credentials'] });
		}
	});
}
