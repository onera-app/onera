/**
 * API Module - Main Entry Point
 */

export { queryClient, apiFetch, apiGet, apiPost, apiPut, apiDelete } from './client';

export {
	useLoginMutation,
	useSignupMutation,
	useCurrentUserQuery,
	useUserKeysQuery,
	useCreateUserKeysMutation,
	useUpdateUserKeysMutation
} from './auth';

export {
	useChatListQuery,
	useChatQuery,
	useCreateChatMutation,
	useUpdateChatMutation,
	useDeleteChatMutation,
	type ChatListItem,
	type Chat,
	type ChatHistoryMessage
} from './chats';

export {
	useCredentialsQuery,
	useCreateCredentialMutation,
	useUpdateCredentialMutation,
	useDeleteCredentialMutation,
	type StoredCredential,
	type DecryptedCredential
} from './credentials';
