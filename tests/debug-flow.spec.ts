import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5175';
const API_URL = 'http://localhost:8000';

test.describe('Debug User Flow', () => {
	test('complete signup and login flow with console monitoring', async ({ page }) => {
		// Collect console messages
		const consoleLogs: string[] = [];
		const networkErrors: string[] = [];
		
		page.on('console', msg => {
			consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
		});
		
		page.on('requestfailed', request => {
			networkErrors.push(`FAILED: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
		});
		
		page.on('response', response => {
			if (!response.ok()) {
				consoleLogs.push(`HTTP ${response.status()}: ${response.url()}`);
			}
		});

		// Navigate to auth page
		console.log('Navigating to auth page...');
		await page.goto(`${BASE_URL}/auth`);
		await page.waitForLoadState('networkidle');
		
		// Take screenshot
		await page.screenshot({ path: 'test-results/debug-1-auth-page.png' });
		
		// Check if page loaded
		const heading = page.getByRole('heading', { name: 'Cortex' });
		await expect(heading).toBeVisible({ timeout: 10000 });
		console.log('Auth page loaded successfully');
		
		// Switch to signup
		await page.locator('button').filter({ hasText: /^Sign Up$/ }).click();
		await page.waitForTimeout(500);
		
		// Fill signup form
		const testEmail = `debug-${Date.now()}@example.com`;
		const testPassword = 'TestPassword123!';
		
		await page.getByLabel('Name').fill('Debug User');
		await page.getByLabel('Email').fill(testEmail);
		await page.getByLabel('Password').fill(testPassword);
		
		await page.screenshot({ path: 'test-results/debug-2-signup-form.png' });
		
		// Submit signup
		console.log('Submitting signup form...');
		await page.locator('form').getByRole('button', { name: 'Create Account' }).click();
		
		// Wait for response
		await page.waitForTimeout(3000);
		await page.screenshot({ path: 'test-results/debug-3-after-signup.png' });
		
		// Log network errors
		if (networkErrors.length > 0) {
			console.log('Network errors:', networkErrors);
		}
		
		// Log console messages with errors
		const errorLogs = consoleLogs.filter(log => 
			log.includes('error') || log.includes('Error') || log.includes('failed') || log.includes('Failed')
		);
		if (errorLogs.length > 0) {
			console.log('Error logs:', errorLogs);
		}
		
		// Check current URL
		console.log('Current URL:', page.url());
		
		// Check if we're on home page or still on auth
		const currentUrl = page.url();
		if (currentUrl.includes('/auth')) {
			console.log('Still on auth page - checking for error messages');
			const pageContent = await page.content();
			if (pageContent.includes('failed') || pageContent.includes('error')) {
				console.log('Found error in page content');
			}
		} else {
			console.log('Successfully navigated away from auth page');
		}
		
		// Print all collected info
		console.log('\n=== Debug Summary ===');
		console.log('Network Errors:', networkErrors);
		console.log('Console Logs:', consoleLogs.slice(-20)); // Last 20 logs
	});

	test('test API connectivity from browser context', async ({ page }) => {
		await page.goto(`${BASE_URL}/auth`);
		
		// Test API directly from browser
		const apiResult = await page.evaluate(async () => {
			try {
				const response = await fetch('http://localhost:8000/health');
				const data = await response.json();
				return { success: true, data };
			} catch (error: any) {
				return { success: false, error: error.message };
			}
		});
		
		console.log('API Health Check from browser:', apiResult);
		expect(apiResult.success).toBe(true);
		
		// Test signup endpoint
		const signupResult = await page.evaluate(async () => {
			try {
				const response = await fetch('http://localhost:8000/api/v1/auth/signup', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: `browser-test-${Date.now()}@example.com`,
						password: 'Test123456',
						name: 'Browser Test'
					})
				});
				const data = await response.json();
				return { success: response.ok, status: response.status, data };
			} catch (error: any) {
				return { success: false, error: error.message };
			}
		});
		
		console.log('Signup from browser:', signupResult);
		expect(signupResult.success).toBe(true);
	});
});
