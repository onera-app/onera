<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { useCredentialsQuery, useCreateCredentialMutation, useDeleteCredentialMutation } from '$lib/api/credentials';

	const credentialsQuery = useCredentialsQuery();
	const createMutation = useCreateCredentialMutation();
	const deleteMutation = useDeleteCredentialMutation();

	let showAddForm = $state(false);
	let newCredential = $state({
		provider: 'openai',
		name: '',
		apiKey: '',
		baseUrl: ''
	});

	const providers = [
		{ id: 'openai', name: 'OpenAI', defaultUrl: 'https://api.openai.com/v1' },
		{ id: 'anthropic', name: 'Anthropic', defaultUrl: 'https://api.anthropic.com' },
		{ id: 'ollama', name: 'Ollama', defaultUrl: 'http://localhost:11434' },
		{ id: 'custom', name: 'Custom (OpenAI-compatible)', defaultUrl: '' }
	];

	async function handleAdd() {
		if (!newCredential.name || !newCredential.apiKey) {
			toast.error('Name and API key are required');
			return;
		}

		try {
			await $createMutation.mutateAsync({
				provider: newCredential.provider,
				name: newCredential.name,
				apiKey: newCredential.apiKey,
				baseUrl: newCredential.baseUrl || providers.find(p => p.id === newCredential.provider)?.defaultUrl
			});
			toast.success('Credential added');
			showAddForm = false;
			newCredential = { provider: 'openai', name: '', apiKey: '', baseUrl: '' };
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to add credential');
		}
	}

	async function handleDelete(id: string) {
		if (confirm('Are you sure you want to delete this credential?')) {
			try {
				await $deleteMutation.mutateAsync(id);
				toast.success('Credential deleted');
			} catch (error) {
				toast.error('Failed to delete credential');
			}
		}
	}
</script>

<div class="space-y-4">
	{#if $credentialsQuery.isLoading}
		<div class="animate-pulse space-y-2">
			<div class="h-12 bg-slate-700 rounded"></div>
			<div class="h-12 bg-slate-700 rounded"></div>
		</div>
	{:else if $credentialsQuery.data && $credentialsQuery.data.length > 0}
		<div class="space-y-2">
			{#each $credentialsQuery.data as credential}
				<div class="flex items-center justify-between bg-slate-700 rounded-lg p-3">
					<div>
						<p class="text-white font-medium">{credential.name}</p>
						<p class="text-slate-400 text-sm">{credential.provider}</p>
					</div>
					<button
						class="text-slate-400 hover:text-red-400"
						onclick={() => handleDelete(credential.id)}
					>
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
						</svg>
					</button>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-slate-400 text-sm">No credentials configured</p>
	{/if}

	{#if showAddForm}
		<div class="bg-slate-700 rounded-lg p-4 space-y-4">
			<div>
				<label class="block text-sm font-medium text-slate-300 mb-1">Provider</label>
				<select bind:value={newCredential.provider} class="input">
					{#each providers as provider}
						<option value={provider.id}>{provider.name}</option>
					{/each}
				</select>
			</div>

			<div>
				<label class="block text-sm font-medium text-slate-300 mb-1">Name</label>
				<input
					type="text"
					bind:value={newCredential.name}
					class="input"
					placeholder="My OpenAI Key"
				/>
			</div>

			<div>
				<label class="block text-sm font-medium text-slate-300 mb-1">API Key</label>
				<input
					type="password"
					bind:value={newCredential.apiKey}
					class="input"
					placeholder="sk-..."
				/>
			</div>

			{#if newCredential.provider === 'custom' || newCredential.provider === 'ollama'}
				<div>
					<label class="block text-sm font-medium text-slate-300 mb-1">Base URL</label>
					<input
						type="url"
						bind:value={newCredential.baseUrl}
						class="input"
						placeholder={providers.find(p => p.id === newCredential.provider)?.defaultUrl}
					/>
				</div>
			{/if}

			<div class="flex gap-2">
				<button
					class="btn btn-secondary flex-1"
					onclick={() => showAddForm = false}
				>
					Cancel
				</button>
				<button
					class="btn btn-primary flex-1"
					onclick={handleAdd}
					disabled={$createMutation.isPending}
				>
					Add Credential
				</button>
			</div>
		</div>
	{:else}
		<button
			class="btn btn-secondary w-full"
			onclick={() => showAddForm = true}
		>
			<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Add Credential
		</button>
	{/if}
</div>
