<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { e2eeUnlocked, showSidebar } from '$lib/stores';
	import { useChatListQuery } from '$lib/api/chats';

	const chatListQuery = useChatListQuery();

	function navigateTo(path: string) {
		goto(path);
	}

	function isActive(path: string): boolean {
		return $page.url.pathname === path;
	}
</script>

{#if $showSidebar}
	<aside class="w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-full">
		<!-- Header -->
		<div class="p-4 border-b border-slate-700">
			<h1 class="text-xl font-bold text-white">Cortex</h1>
			<p class="text-xs text-slate-400">E2EE AI Chat</p>
		</div>

		<!-- New Chat Button -->
		<div class="p-3">
			<button
				class="btn btn-primary w-full"
				onclick={() => navigateTo('/chat')}
				disabled={!$e2eeUnlocked}
			>
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				New Chat
			</button>
		</div>

		<!-- Chat List -->
		<nav class="flex-1 overflow-y-auto p-3 space-y-1">
			{#if $chatListQuery.isLoading}
				<div class="text-center py-4">
					<div class="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
				</div>
			{:else if $chatListQuery.data && $chatListQuery.data.length > 0}
				{#each $chatListQuery.data as chat}
					<button
						class="w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors
							{isActive(`/chat/${chat.id}`) 
								? 'bg-slate-700 text-white' 
								: 'text-slate-300 hover:bg-slate-700/50 hover:text-white'}"
						onclick={() => navigateTo(`/chat/${chat.id}`)}
					>
						{chat.title}
					</button>
				{/each}
			{:else if $e2eeUnlocked}
				<p class="text-slate-500 text-sm text-center py-4">No chats yet</p>
			{:else}
				<p class="text-slate-500 text-sm text-center py-4">Unlock to view chats</p>
			{/if}
		</nav>

		<!-- Footer Nav -->
		<div class="p-3 border-t border-slate-700 space-y-1">
			<button
				class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
					{isActive('/settings') 
						? 'bg-slate-700 text-white' 
						: 'text-slate-300 hover:bg-slate-700/50 hover:text-white'}"
				onclick={() => navigateTo('/settings')}
			>
				<svg class="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
				Settings
			</button>
		</div>
	</aside>
{/if}
