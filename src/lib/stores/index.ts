import { writable, type Writable } from 'svelte/store';
import type { LLMCredential, EncryptedCredential } from '$lib/llm/types';

// App name
export const APP_NAME = 'Cortex';

// User session
export interface SessionUser {
	id: string;
	email: string;
	name: string;
	profile_image_url?: string;
}

export const user: Writable<SessionUser | undefined> = writable(undefined);
export const token: Writable<string> = writable('');

// UI State
export const theme = writable<'light' | 'dark' | 'system'>('dark');
export const showSidebar = writable(true);
export const mobile = writable(false);

// Chat state
export const chatId = writable('');
export const chatTitle = writable('');
export const chats: Writable<any[] | null> = writable(null);

// Model selection
export interface Model {
	id: string;
	name: string;
	provider: string;
}

export const models: Writable<Model[]> = writable([]);
export const selectedModel: Writable<string> = writable('');

// E2EE State
export const e2eeReady = writable(false);
export const e2eeUnlocked = writable(false);
export const e2eeError: Writable<string | null> = writable(null);
export const e2eeStatus = writable<'initializing' | 'ready' | 'unlocked' | 'locked' | 'error'>('initializing');

// Stored user keys (from server)
export interface StoredUserKeys {
	public_key: string;
	encrypted_private_key: string;
	private_key_nonce: string;
	encrypted_master_key: string;
	master_key_nonce: string;
	key_derivation_salt: string;
	recovery_key_encrypted_master_key?: string;
	recovery_key_nonce?: string;
}

export const storedUserKeys: Writable<StoredUserKeys | null> = writable(null);

// Credentials
export const encryptedCredentials: Writable<EncryptedCredential[]> = writable([]);
export const decryptedCredentials: Writable<LLMCredential[] | null> = writable(null);

// Settings
export interface Settings {
	autoTags?: boolean;
	autoFollowUps?: boolean;
	notificationSound?: boolean;
}

export const settings: Writable<Settings> = writable({});

// Initialize from localStorage on client
if (typeof window !== 'undefined') {
	const savedToken = localStorage.getItem('cortex_token');
	const savedUser = localStorage.getItem('cortex_user');
	
	if (savedToken) {
		token.set(savedToken);
	}
	if (savedUser) {
		try {
			user.set(JSON.parse(savedUser));
		} catch {
			// Invalid stored user
		}
	}

	// Persist token and user changes
	token.subscribe((value) => {
		if (value) {
			localStorage.setItem('cortex_token', value);
		} else {
			localStorage.removeItem('cortex_token');
		}
	});

	user.subscribe((value) => {
		if (value) {
			localStorage.setItem('cortex_user', JSON.stringify(value));
		} else {
			localStorage.removeItem('cortex_user');
		}
	});
}
