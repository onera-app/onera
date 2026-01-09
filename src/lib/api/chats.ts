/**
 * Chat API Hooks with E2EE Support
 */

import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { apiGet, apiPost, apiDelete } from './client';
import {
	createEncryptedChat,
	decryptChat,
	updateEncryptedChat,
	decryptChatTitle,
	isUnlocked,
	type EncryptedChatData
} from '$lib/crypto/sodium';

// Types
export interface ChatListItem {
	id: string;
	title: string;
	updated_at: string;
	created_at: string;
	is_encrypted?: boolean;
	chat?: {
		is_encrypted?: boolean;
		encrypted_chat_key?: string;
		chat_key_nonce?: string;
		encrypted_title?: string;
		title_nonce?: string;
		title_preview?: string;
	};
}

export interface Chat {
	id: string;
	title: string;
	history: {
		messages: Record<string, ChatHistoryMessage>;
		currentId: string | null;
	};
	models?: string[];
	tags?: string[];
	created_at: string;
	updated_at: string;
}

export interface ChatHistoryMessage {
	id: string;
	parentId: string | null;
	childrenIds: string[];
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: number;
	model?: string;
	files?: Array<{ type: string; url: string; name?: string }>;
}

interface EncryptedChatResponse {
	id: string;
	chat: {
		is_encrypted: boolean;
		encrypted_chat_key: string;
		chat_key_nonce: string;
		encrypted_title: string;
		title_nonce: string;
		encrypted_chat: string;
		chat_nonce: string;
		title_preview?: string;
	};
	created_at: string;
	updated_at: string;
	_encryptionKeys?: {
		encryptedChatKey: string;
		chatKeyNonce: string;
	};
}

/**
 * Get chat list with decrypted titles
 */
export function useChatListQuery() {
	return createQuery({
		queryKey: ['chats'],
		queryFn: async (): Promise<ChatListItem[]> => {
			const chats = await apiGet<ChatListItem[]>('/api/v1/chats');
			
			if (!isUnlocked()) {
				return chats.map(chat => ({
					...chat,
					title: chat.chat?.title_preview || '[Encrypted - Unlock to view]'
				}));
			}

			return chats.map(chat => {
				if (chat.chat?.is_encrypted && chat.chat.encrypted_title && chat.chat.title_nonce) {
					try {
						const title = decryptChatTitle(
							chat.id,
							chat.chat.encrypted_chat_key!,
							chat.chat.chat_key_nonce!,
							chat.chat.encrypted_title,
							chat.chat.title_nonce
						);
						return { ...chat, title };
					} catch {
						return { ...chat, title: chat.chat.title_preview || '[Decryption Failed]' };
					}
				}
				return chat;
			});
		},
		staleTime: 30_000
	});
}

/**
 * Get single chat by ID
 */
export function useChatQuery(id: string | undefined) {
	return createQuery({
		queryKey: ['chat', id],
		queryFn: async (): Promise<Chat | null> => {
			if (!id) return null;
			
			const response = await apiGet<EncryptedChatResponse>(`/api/v1/chats/${id}`);
			
			if (response.chat?.is_encrypted) {
				if (!isUnlocked()) {
					return {
						id: response.id,
						title: response.chat.title_preview || '[Encrypted - Unlock to view]',
						history: { messages: {}, currentId: null },
						created_at: response.created_at,
						updated_at: response.updated_at
					};
				}

				try {
					const encryptedData: EncryptedChatData = {
						encryptedChatKey: response.chat.encrypted_chat_key,
						chatKeyNonce: response.chat.chat_key_nonce,
						encryptedTitle: response.chat.encrypted_title,
						titleNonce: response.chat.title_nonce,
						encryptedChat: response.chat.encrypted_chat,
						chatNonce: response.chat.chat_nonce
					};

					const decrypted = decryptChat(id, encryptedData);
					
					return {
						id: response.id,
						title: decrypted.title,
						history: decrypted.chat.history as Chat['history'],
						models: decrypted.chat.models as string[],
						tags: decrypted.chat.tags as string[],
						created_at: response.created_at,
						updated_at: response.updated_at
					};
				} catch (error) {
					console.error('Failed to decrypt chat:', error);
					return null;
				}
			}

			return response as unknown as Chat;
		},
		enabled: !!id
	});
}

/**
 * Create new chat mutation
 */
export function useCreateChatMutation() {
	const queryClient = useQueryClient();

	return createMutation({
		mutationFn: async (chat: Partial<Chat>): Promise<{ id: string }> => {
			const title = chat.title || 'New Chat';

			if (isUnlocked()) {
				const { chatId, data } = await createEncryptedChat(
					title,
					chat as Record<string, unknown>
				);

				const chatPayload = {
					id: chatId,
					is_encrypted: true,
					encrypted_chat_key: data.encryptedChatKey,
					chat_key_nonce: data.chatKeyNonce,
					encrypted_title: data.encryptedTitle,
					title_nonce: data.titleNonce,
					encrypted_chat: data.encryptedChat,
					chat_nonce: data.chatNonce,
					title: title.slice(0, 50),
					title_preview: title.slice(0, 50)
				};

				return apiPost<{ id: string }>('/api/v1/chats/new', { chat: chatPayload });
			}

			return apiPost<{ id: string }>('/api/v1/chats/new', { chat });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['chats'] });
		}
	});
}

/**
 * Update chat mutation
 */
export function useUpdateChatMutation() {
	const queryClient = useQueryClient();

	return createMutation({
		mutationFn: async ({
			id,
			chat,
			encryptionKeys
		}: {
			id: string;
			chat: Partial<Chat>;
			encryptionKeys?: { encryptedChatKey: string; chatKeyNonce: string };
		}): Promise<void> => {
			const title = chat.title || 'Chat';

			if (isUnlocked() && encryptionKeys) {
				const updates = updateEncryptedChat(
					id,
					encryptionKeys.encryptedChatKey,
					encryptionKeys.chatKeyNonce,
					title,
					chat as Record<string, unknown>
				);

				const chatPayload = {
					is_encrypted: true,
					encrypted_chat_key: encryptionKeys.encryptedChatKey,
					chat_key_nonce: encryptionKeys.chatKeyNonce,
					encrypted_title: updates.encryptedTitle,
					title_nonce: updates.titleNonce,
					encrypted_chat: updates.encryptedChat,
					chat_nonce: updates.chatNonce,
					title: title.slice(0, 50),
					title_preview: title.slice(0, 50)
				};

				await apiPost(`/api/v1/chats/${id}`, { chat: chatPayload });
			} else {
				await apiPost(`/api/v1/chats/${id}`, { chat });
			}
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['chat', id] });
			queryClient.invalidateQueries({ queryKey: ['chats'] });
		}
	});
}

/**
 * Delete chat mutation
 */
export function useDeleteChatMutation() {
	const queryClient = useQueryClient();

	return createMutation({
		mutationFn: async (id: string): Promise<void> => {
			await apiDelete(`/api/v1/chats/${id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['chats'] });
		}
	});
}
