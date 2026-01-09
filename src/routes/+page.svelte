<script lang="ts">
	import { goto } from '$app/navigation';
	import { e2eeUnlocked, user, token } from '$lib/stores';
	import { useUserKeysQuery } from '$lib/api/auth';
	import ChatList from '$lib/components/chat/ChatList.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import E2EEUnlockModal from '$lib/components/e2ee/E2EEUnlockModal.svelte';
	import E2EESetupModal from '$lib/components/e2ee/E2EESetupModal.svelte';

	let showUnlockModal = $state(false);
	let showSetupModal = $state(false);

	// Query user keys to determine if E2EE is set up
	const userKeysQuery = useUserKeysQuery(!!$token);
	
	// Derived state: does user have E2EE keys set up?
	const hasE2EEKeys = $derived($userKeysQuery.data !== null && $userKeysQuery.data !== undefined);
	const isLoadingKeys = $derived($userKeysQuery.isLoading);

	$effect(() => {
		if (!$user) {
			goto('/auth');
		}
	});
</script>

<svelte:head>
	<title>Cortex - E2EE Chat</title>
</svelte:head>

<div class="flex h-screen bg-slate-900">
	<Sidebar />
	
	<main class="flex-1 flex flex-col">
		{#if $user}
			{#if isLoadingKeys}
				<div class="flex-1 flex items-center justify-center">
					<div class="text-center p-8">
						<div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
						<p class="text-slate-400">Loading encryption status...</p>
					</div>
				</div>
			{:else if !hasE2EEKeys}
				<!-- New user: Show E2EE Setup -->
				<div class="flex-1 flex items-center justify-center">
					<div class="text-center p-8 max-w-md">
						<div class="mb-6">
							<svg class="w-16 h-16 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
							</svg>
						</div>
						<h2 class="text-2xl font-semibold text-white mb-2">Set Up End-to-End Encryption</h2>
						<p class="text-slate-400 mb-6">
							Create a passphrase to protect your chats. Your messages will be encrypted 
							before leaving your device, ensuring only you can read them.
						</p>
						<button
							class="btn btn-primary"
							onclick={() => showSetupModal = true}
						>
							Set Up E2EE
						</button>
					</div>
				</div>
			{:else if !$e2eeUnlocked}
				<!-- Existing user: Show Unlock -->
				<div class="flex-1 flex items-center justify-center">
					<div class="text-center p-8">
						<div class="mb-6">
							<svg class="w-16 h-16 mx-auto text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
							</svg>
						</div>
						<h2 class="text-2xl font-semibold text-white mb-2">Unlock Your Vault</h2>
						<p class="text-slate-400 mb-6">Enter your passphrase to access your encrypted chats</p>
						<button
							class="btn btn-primary"
							onclick={() => showUnlockModal = true}
						>
							Unlock E2EE
						</button>
					</div>
				</div>
			{:else}
				<ChatList />
			{/if}
		{/if}
	</main>
</div>

{#if showUnlockModal}
	<E2EEUnlockModal onclose={() => showUnlockModal = false} />
{/if}

{#if showSetupModal}
	<E2EESetupModal onclose={() => showSetupModal = false} />
{/if}
