<script lang="ts">
	import { goto } from '$app/navigation';
	import { e2eeUnlocked, user } from '$lib/stores';
	import Chat from '$lib/components/chat/Chat.svelte';

	$effect(() => {
		if (!$user) {
			goto('/auth');
		} else if (!$e2eeUnlocked) {
			goto('/');
		}
	});
</script>

<svelte:head>
	<title>New Chat - Cortex</title>
</svelte:head>

{#if $user && $e2eeUnlocked}
	<Chat />
{/if}
