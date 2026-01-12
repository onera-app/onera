import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5175';
const API_URL = 'http://localhost:8000';

test.describe('E2EE Setup Flow', () => {
	test('should show E2EE setup after signup', async ({ page }) => {
		// Collect console messages
		const consoleLogs: string[] = [];
		
		page.on('console', msg => {
			consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
		});

		// Create new user via API
		const email = `e2ee-setup-${Date.now()}@example.com`;
		const password = 'TestPassword123!';
		
		const signupResponse = await page.request.post(`${API_URL}/api/v1/auth/signup`, {
			data: { email, password, name: 'E2EE Test User' }
		});
		const { token, user } = await signupResponse.json();
		console.log('Created user:', user.email);

		// Set auth in localStorage before navigating
		await page.goto(BASE_URL);
		await page.evaluate(({ token, user }) => {
			localStorage.setItem('onera_token', token);
			localStorage.setItem('onera_user', JSON.stringify(user));
		}, { token, user });

		// Navigate to home page
		await page.goto(BASE_URL);
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(2000);
		
		await page.screenshot({ path: 'test-results/e2ee-1-home-after-login.png' });
		
		// Check what's on the page
		const pageContent = await page.content();
		console.log('Page contains "E2EE":', pageContent.includes('E2EE'));
		console.log('Page contains "Unlock":', pageContent.includes('Unlock'));
		console.log('Page contains "Setup":', pageContent.includes('Setup'));
		console.log('Page contains "passphrase":', pageContent.toLowerCase().includes('passphrase'));
		
		// Log visible text
		const bodyText = await page.locator('body').innerText();
		console.log('Page text preview:', bodyText.substring(0, 500));
		
		// Check for E2EE-related elements
		const unlockButton = page.getByRole('button', { name: /unlock/i });
		const setupButton = page.getByRole('button', { name: /setup/i });
		const e2eeText = page.getByText(/e2ee/i);
		
		const hasUnlock = await unlockButton.count();
		const hasSetup = await setupButton.count();
		const hasE2EE = await e2eeText.count();
		
		console.log('Has Unlock button:', hasUnlock);
		console.log('Has Setup button:', hasSetup);
		console.log('Has E2EE text:', hasE2EE);
		
		// Print console logs
		console.log('\nConsole logs:', consoleLogs);
	});

	test('check home page component logic', async ({ page }) => {
		// Create and login user
		const email = `e2ee-check-${Date.now()}@example.com`;
		const password = 'TestPassword123!';
		
		const signupResponse = await page.request.post(`${API_URL}/api/v1/auth/signup`, {
			data: { email, password, name: 'E2EE Check User' }
		});
		const { token, user } = await signupResponse.json();

		await page.goto(BASE_URL);
		await page.evaluate(({ token, user }) => {
			localStorage.setItem('onera_token', token);
			localStorage.setItem('onera_user', JSON.stringify(user));
		}, { token, user });

		await page.goto(BASE_URL);
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(1000);

		// Check store values
		const storeValues = await page.evaluate(() => {
			return {
				token: localStorage.getItem('onera_token'),
				user: localStorage.getItem('onera_user'),
				// Check if stores are available via window
				windowKeys: Object.keys(window).filter(k => k.includes('svelte') || k.includes('store'))
			};
		});
		
		console.log('Store values:', storeValues);
		
		// Take screenshot
		await page.screenshot({ path: 'test-results/e2ee-2-store-check.png' });
		
		// Check current URL
		console.log('Current URL:', page.url());
	});
});
