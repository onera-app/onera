<script lang="ts">
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { Toaster } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import '../app.css';

	import { initializeSodium } from '$lib/crypto/sodium/init';
	import { e2eeReady } from '$lib/stores';

	let { children } = $props();

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
				retry: 1
			}
		}
	});

	onMount(async () => {
		try {
			await initializeSodium();
			e2eeReady.set(true);
		} catch (error) {
			console.error('Failed to initialize sodium:', error);
		}
	});
</script>

<QueryClientProvider client={queryClient}>
	<Toaster position="top-right" richColors />
	{@render children()}
</QueryClientProvider>
