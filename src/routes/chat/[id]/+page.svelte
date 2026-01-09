<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { e2eeUnlocked, user } from '$lib/stores';
	import Chat from '$lib/components/chat/Chat.svelte';

	let chatId = $derived($page.params.id);

	$effect(() => {
		if (!$user) {
			goto('/auth');
		} else if (!$e2eeUnlocked) {
			goto('/');
		}
	});
</script>

<svelte:head>
	<title>Chat - Cortex</title>
</svelte:head>

{#if $user && $e2eeUnlocked}
	<Chat {chatId} />
{/if}
