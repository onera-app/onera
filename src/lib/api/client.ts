/**
 * TanStack Query Client Setup
 */

import { QueryClient } from '@tanstack/svelte-query';
import { API_BASE_URL } from '$lib/constants';
import { get } from 'svelte/store';
import { token } from '$lib/stores';

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000,
			retry: 1,
			refetchOnWindowFocus: false
		}
	}
});

/**
 * Base fetch function with auth headers
 */
export async function apiFetch<T>(
	endpoint: string,
	options: RequestInit = {}
): Promise<T> {
	const authToken = get(token);
	
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...options.headers as Record<string, string>
	};

	if (authToken) {
		headers['Authorization'] = `Bearer ${authToken}`;
	}

	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		...options,
		headers
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ detail: response.statusText }));
		throw new Error(error.detail || error.message || 'API request failed');
	}

	return response.json();
}

/**
 * GET request helper
 */
export function apiGet<T>(endpoint: string): Promise<T> {
	return apiFetch<T>(endpoint, { method: 'GET' });
}

/**
 * POST request helper
 */
export function apiPost<T>(endpoint: string, data?: unknown): Promise<T> {
	return apiFetch<T>(endpoint, {
		method: 'POST',
		body: data ? JSON.stringify(data) : undefined
	});
}

/**
 * PUT request helper
 */
export function apiPut<T>(endpoint: string, data?: unknown): Promise<T> {
	return apiFetch<T>(endpoint, {
		method: 'PUT',
		body: data ? JSON.stringify(data) : undefined
	});
}

/**
 * DELETE request helper
 */
export function apiDelete<T>(endpoint: string): Promise<T> {
	return apiFetch<T>(endpoint, { method: 'DELETE' });
}
