/**
 * Authentication API Hooks
 */

import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { apiPost, apiGet } from './client';
import type { SessionUser } from '$lib/stores';

interface LoginRequest {
	email: string;
	password: string;
}

interface SignupRequest {
	email: string;
	password: string;
	name: string;
}

interface AuthResponse {
	token: string;
	user: SessionUser;
}

interface UserKeysResponse {
	kek_salt: string;
	kek_ops_limit: number;
	kek_mem_limit: number;
	encrypted_master_key: string;
	master_key_nonce: string;
	public_key: string;
	encrypted_private_key: string;
	private_key_nonce: string;
	encrypted_recovery_key: string;
	recovery_key_nonce: string;
	master_key_recovery: string;
	master_key_recovery_nonce: string;
}

/**
 * Login mutation
 */
export function useLoginMutation() {
	return createMutation({
		mutationFn: async (data: LoginRequest): Promise<AuthResponse> => {
			return apiPost<AuthResponse>('/api/v1/auth/login', data);
		}
	});
}

/**
 * Signup mutation
 */
export function useSignupMutation() {
	return createMutation({
		mutationFn: async (data: SignupRequest): Promise<AuthResponse> => {
			return apiPost<AuthResponse>('/api/v1/auth/signup', data);
		}
	});
}

/**
 * Get current user query
 */
export function useCurrentUserQuery(enabled: boolean = true) {
	return createQuery({
		queryKey: ['currentUser'],
		queryFn: async (): Promise<SessionUser> => {
			return apiGet<SessionUser>('/api/v1/users/me');
		},
		enabled
	});
}

/**
 * Get user keys query
 */
export function useUserKeysQuery(enabled: boolean = true) {
	return createQuery({
		queryKey: ['userKeys'],
		queryFn: async (): Promise<UserKeysResponse | null> => {
			try {
				return await apiGet<UserKeysResponse>('/api/v1/user-keys');
			} catch {
				return null;
			}
		},
		enabled
	});
}

/**
 * Create user keys mutation
 */
export function useCreateUserKeysMutation() {
	const queryClient = useQueryClient();
	
	return createMutation({
		mutationFn: async (keys: UserKeysResponse): Promise<UserKeysResponse> => {
			return apiPost<UserKeysResponse>('/api/v1/user-keys', keys);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['userKeys'] });
		}
	});
}

/**
 * Update user keys mutation
 */
export function useUpdateUserKeysMutation() {
	const queryClient = useQueryClient();
	
	return createMutation({
		mutationFn: async (keys: Partial<UserKeysResponse>): Promise<UserKeysResponse> => {
			return apiPost<UserKeysResponse>('/api/v1/user-keys/update', keys);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['userKeys'] });
		}
	});
}
