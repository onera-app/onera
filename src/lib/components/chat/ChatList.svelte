<script lang="ts">
	import { goto } from '$app/navigation';
	import { useChatListQuery, useDeleteChatMutation } from '$lib/api/chats';
	import { toast } from 'svelte-sonner';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';

	dayjs.extend(relativeTime);

	const chatListQuery = useChatListQuery();
	const deleteMutation = useDeleteChatMutation();

	async function handleDelete(id: string, e: Event) {
		e.stopPropagation();
		if (confirm('Are you sure you want to delete this chat?')) {
			try {
				await $deleteMutation.mutateAsync(id);
				toast.success('Chat deleted');
			} catch (error) {
				toast.error('Failed to delete chat');
			}
		}
	}
</script>

<div class="flex-1 overflow-y-auto p-6">
	<div class="max-w-3xl mx-auto">
		<div class="flex items-center justify-between mb-6">
			<h1 class="text-2xl font-bold text-white">Your Chats</h1>
			<button
				class="btn btn-primary"
				onclick={() => goto('/chat')}
			>
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				New Chat
			</button>
		</div>

		{#if $chatListQuery.isLoading}
			<div class="space-y-3">
				{#each Array(5) as _}
					<div class="card animate-pulse">
						<div class="h-5 bg-slate-700 rounded w-3/4 mb-2"></div>
						<div class="h-4 bg-slate-700 rounded w-1/4"></div>
					</div>
				{/each}
			</div>
		{:else if $chatListQuery.data && $chatListQuery.data.length > 0}
			<div class="space-y-3">
				{#each $chatListQuery.data as chat}
					<div
						class="card w-full text-left hover:bg-slate-700/50 transition-colors group cursor-pointer"
						role="button"
						tabindex="0"
						onclick={() => goto(`/chat/${chat.id}`)}
						onkeydown={(e) => e.key === 'Enter' && goto(`/chat/${chat.id}`)}
					>
						<div class="flex items-start justify-between gap-4">
							<div class="flex-1 min-w-0">
								<h3 class="text-white font-medium truncate">{chat.title}</h3>
								<p class="text-slate-400 text-sm">
									{dayjs(chat.updated_at).fromNow()}
								</p>
							</div>
							<button
								class="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-400 hover:text-red-400"
								onclick={(e) => handleDelete(chat.id, e)}
								aria-label="Delete chat"
							>
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
							</button>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="card text-center py-12">
				<svg class="w-12 h-12 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
				</svg>
				<h3 class="text-lg font-medium text-white mb-2">No chats yet</h3>
				<p class="text-slate-400 mb-4">Start a new conversation with your AI assistant</p>
				<button
					class="btn btn-primary"
					onclick={() => goto('/chat')}
				>
					Start a New Chat
				</button>
			</div>
		{/if}
	</div>
</div>
