import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5175';
const API_URL = 'http://localhost:8000';

const testPassword = 'TestPassword123!';
const testName = 'Test User';

test.describe('Cortex E2EE Chat Application', () => {
	test.beforeAll(async ({ request }) => {
		// Verify backend is running
		const health = await request.get(`${API_URL}/health`);
		expect(health.ok()).toBeTruthy();
	});

	test('should load auth page and show branding', async ({ page }) => {
		await page.goto(`${BASE_URL}/auth`);
		
		// Check for Cortex heading
		await expect(page.getByRole('heading', { name: 'Cortex' })).toBeVisible();
		await expect(page.getByText('End-to-End Encrypted AI Chat')).toBeVisible();
	});

	test('should show login and signup tabs', async ({ page }) => {
		await page.goto(`${BASE_URL}/auth`);
		
		// Login tab should be visible
		await expect(page.locator('button').filter({ hasText: /^Login$/ })).toBeVisible();
		// Sign Up tab should be visible
		await expect(page.locator('button').filter({ hasText: /^Sign Up$/ })).toBeVisible();
	});

	test('should switch to signup form when Sign Up tab is clicked', async ({ page }) => {
		await page.goto(`${BASE_URL}/auth`);
		
		// Click Sign Up tab
		await page.locator('button').filter({ hasText: /^Sign Up$/ }).click();
		
		// Name field should be visible (only in signup mode)
		await expect(page.getByLabel('Name')).toBeVisible();
	});

	test('API: health check works', async ({ request }) => {
		const response = await request.get(`${API_URL}/health`);
		expect(response.ok()).toBeTruthy();
		const data = await response.json();
		expect(data.status).toBe('healthy');
	});

	test('API: can sign up a new user', async ({ request }) => {
		const email = `api-signup-${Date.now()}@example.com`;
		
		const response = await request.post(`${API_URL}/api/v1/auth/signup`, {
			data: {
				email,
				password: testPassword,
				name: testName
			}
		});
		
		expect(response.ok()).toBeTruthy();
		const data = await response.json();
		expect(data.token).toBeDefined();
		expect(data.user.email).toBe(email);
		expect(data.user.name).toBe(testName);
	});

	test('API: can login with existing user', async ({ request }) => {
		const email = `api-login-${Date.now()}@example.com`;
		
		// First create the user
		await request.post(`${API_URL}/api/v1/auth/signup`, {
			data: {
				email,
				password: testPassword,
				name: testName
			}
		});
		
		// Now login
		const response = await request.post(`${API_URL}/api/v1/auth/login`, {
			data: {
				email,
				password: testPassword
			}
		});
		
		expect(response.ok()).toBeTruthy();
		const data = await response.json();
		expect(data.token).toBeDefined();
		expect(data.user.email).toBe(email);
	});

	test('API: can create and list encrypted chats', async ({ request }) => {
		const email = `api-chat-${Date.now()}@example.com`;
		
		// Create user
		const authResponse = await request.post(`${API_URL}/api/v1/auth/signup`, {
			data: {
				email,
				password: testPassword,
				name: testName
			}
		});
		const { token } = await authResponse.json();
		
		// Create encrypted chat
		const chatId = `chat-${Date.now()}`;
		const createResponse = await request.post(`${API_URL}/api/v1/chats/new`, {
			headers: { 'Authorization': `Bearer ${token}` },
			data: {
				chat: {
					id: chatId,
					is_encrypted: true,
					encrypted_chat_key: 'test-encrypted-key',
					chat_key_nonce: 'test-nonce',
					encrypted_title: 'encrypted-title',
					title_nonce: 'title-nonce',
					encrypted_chat: 'encrypted-content',
					chat_nonce: 'chat-nonce',
					title_preview: 'Test Chat'
				}
			}
		});
		
		expect(createResponse.ok()).toBeTruthy();
		const chat = await createResponse.json();
		expect(chat.id).toBe(chatId);
		expect(chat.chat.is_encrypted).toBe(true);
		
		// List chats
		const listResponse = await request.get(`${API_URL}/api/v1/chats`, {
			headers: { 'Authorization': `Bearer ${token}` }
		});
		
		expect(listResponse.ok()).toBeTruthy();
		const chats = await listResponse.json();
		expect(chats.length).toBeGreaterThan(0);
		expect(chats.find((c: any) => c.id === chatId)).toBeDefined();
	});

	test('API: can create and list encrypted credentials', async ({ request }) => {
		const email = `api-creds-${Date.now()}@example.com`;
		
		// Create user
		const authResponse = await request.post(`${API_URL}/api/v1/auth/signup`, {
			data: {
				email,
				password: testPassword,
				name: testName
			}
		});
		const { token } = await authResponse.json();
		
		// Create credential
		const createResponse = await request.post(`${API_URL}/api/v1/credentials`, {
			headers: { 'Authorization': `Bearer ${token}` },
			data: {
				provider: 'openai',
				name: 'Test OpenAI Key',
				encrypted_data: 'encrypted-api-key-data',
				iv: 'test-iv'
			}
		});
		
		expect(createResponse.ok()).toBeTruthy();
		const credential = await createResponse.json();
		expect(credential.id).toBeDefined();
		expect(credential.provider).toBe('openai');
		expect(credential.name).toBe('Test OpenAI Key');
		
		// List credentials
		const listResponse = await request.get(`${API_URL}/api/v1/credentials`, {
			headers: { 'Authorization': `Bearer ${token}` }
		});
		
		expect(listResponse.ok()).toBeTruthy();
		const credentials = await listResponse.json();
		expect(credentials.length).toBeGreaterThan(0);
	});

	test('API: can store and retrieve user encryption keys', async ({ request }) => {
		const email = `api-keys-${Date.now()}@example.com`;
		
		// Create user
		const authResponse = await request.post(`${API_URL}/api/v1/auth/signup`, {
			data: {
				email,
				password: testPassword,
				name: testName
			}
		});
		const { token } = await authResponse.json();
		
		// Create user keys (E2EE setup)
		const userKeys = {
			kek_salt: 'test-salt-base64',
			kek_ops_limit: 2,
			kek_mem_limit: 67108864,
			encrypted_master_key: 'encrypted-master-key-base64',
			master_key_nonce: 'master-nonce-base64',
			public_key: 'public-key-base64',
			encrypted_private_key: 'encrypted-private-key-base64',
			private_key_nonce: 'private-nonce-base64',
			encrypted_recovery_key: 'encrypted-recovery-base64',
			recovery_key_nonce: 'recovery-nonce-base64',
			master_key_recovery: 'recovery-encrypted-master-base64',
			master_key_recovery_nonce: 'recovery-master-nonce-base64'
		};
		
		const createResponse = await request.post(`${API_URL}/api/v1/user-keys`, {
			headers: { 'Authorization': `Bearer ${token}` },
			data: userKeys
		});
		
		expect(createResponse.ok()).toBeTruthy();
		
		// Get user keys
		const getResponse = await request.get(`${API_URL}/api/v1/user-keys`, {
			headers: { 'Authorization': `Bearer ${token}` }
		});
		
		expect(getResponse.ok()).toBeTruthy();
		const keys = await getResponse.json();
		expect(keys.public_key).toBe('public-key-base64');
		expect(keys.kek_salt).toBe('test-salt-base64');
		expect(keys.kek_ops_limit).toBe(2);
		expect(keys.kek_mem_limit).toBe(67108864);
	});

	test('API: can delete a chat', async ({ request }) => {
		const email = `api-delete-${Date.now()}@example.com`;
		
		// Create user
		const authResponse = await request.post(`${API_URL}/api/v1/auth/signup`, {
			data: {
				email,
				password: testPassword,
				name: testName
			}
		});
		const { token } = await authResponse.json();
		
		// Create chat
		const chatId = `chat-delete-${Date.now()}`;
		await request.post(`${API_URL}/api/v1/chats/new`, {
			headers: { 'Authorization': `Bearer ${token}` },
			data: {
				chat: {
					id: chatId,
					is_encrypted: true,
					encrypted_chat_key: 'key',
					chat_key_nonce: 'nonce',
					encrypted_title: 'title',
					title_nonce: 'tnonce',
					encrypted_chat: 'chat',
					chat_nonce: 'cnonce',
					title_preview: 'Delete Test'
				}
			}
		});
		
		// Delete chat
		const deleteResponse = await request.delete(`${API_URL}/api/v1/chats/${chatId}`, {
			headers: { 'Authorization': `Bearer ${token}` }
		});
		
		expect(deleteResponse.ok()).toBeTruthy();
		
		// Verify deleted
		const listResponse = await request.get(`${API_URL}/api/v1/chats`, {
			headers: { 'Authorization': `Bearer ${token}` }
		});
		const chats = await listResponse.json();
		expect(chats.find((c: any) => c.id === chatId)).toBeUndefined();
	});
});
