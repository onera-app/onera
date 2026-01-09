<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { user, e2eeUnlocked, token } from '$lib/stores';
	import { lockE2EE } from '$lib/crypto/sodium/keyManager';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import CredentialsManager from '$lib/components/settings/CredentialsManager.svelte';

	$effect(() => {
		if (!$user) {
			goto('/auth');
		}
	});

	function handleLock() {
		lockE2EE();
		toast.success('E2EE locked');
		goto('/');
	}

	function handleLogout() {
		lockE2EE();
		user.set(undefined);
		token.set('');
		toast.success('Logged out');
		goto('/auth');
	}
</script>

<svelte:head>
	<title>Settings - Cortex</title>
</svelte:head>

<div class="flex h-screen bg-slate-900">
	<Sidebar />
	
	<main class="flex-1 overflow-y-auto p-6">
		<div class="max-w-2xl mx-auto">
			<h1 class="text-2xl font-bold text-white mb-6">Settings</h1>

			{#if $e2eeUnlocked}
				<!-- Credentials Section -->
				<section class="card mb-6">
					<h2 class="text-lg font-semibold text-white mb-4">LLM Credentials</h2>
					<p class="text-slate-400 text-sm mb-4">
						Add your API keys for direct connections to LLM providers. 
						All credentials are encrypted with your master key.
					</p>
					<CredentialsManager />
				</section>

				<!-- Security Section -->
				<section class="card mb-6">
					<h2 class="text-lg font-semibold text-white mb-4">Security</h2>
					
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-white font-medium">Lock E2EE</p>
								<p class="text-slate-400 text-sm">Lock your vault without logging out</p>
							</div>
							<button class="btn btn-secondary" onclick={handleLock}>
								Lock
							</button>
						</div>
					</div>
				</section>
			{:else}
				<div class="card mb-6">
					<p class="text-slate-400">Unlock E2EE to access settings</p>
				</div>
			{/if}

			<!-- Account Section -->
			<section class="card">
				<h2 class="text-lg font-semibold text-white mb-4">Account</h2>
				
				{#if $user}
					<div class="space-y-4">
						<div>
							<p class="text-slate-400 text-sm">Email</p>
							<p class="text-white">{$user.email}</p>
						</div>
						<div>
							<p class="text-slate-400 text-sm">Name</p>
							<p class="text-white">{$user.name}</p>
						</div>
						<div class="pt-4 border-t border-slate-700">
							<button class="btn btn-danger" onclick={handleLogout}>
								Logout
							</button>
						</div>
					</div>
				{/if}
			</section>
		</div>
	</main>
</div>
