<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { user, token } from '$lib/stores';
	import { useLoginMutation, useSignupMutation } from '$lib/api/auth';

	let mode = $state<'login' | 'signup'>('login');
	let email = $state('');
	let password = $state('');
	let name = $state('');
	let loading = $state(false);

	const loginMutation = useLoginMutation();
	const signupMutation = useSignupMutation();

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		loading = true;

		try {
			if (mode === 'login') {
				const result = await $loginMutation.mutateAsync({ email, password });
				user.set(result.user);
				token.set(result.token);
				toast.success('Logged in successfully');
				goto('/');
			} else {
				const result = await $signupMutation.mutateAsync({ email, password, name });
				user.set(result.user);
				token.set(result.token);
				toast.success('Account created successfully');
				goto('/');
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Authentication failed');
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>{mode === 'login' ? 'Login' : 'Sign Up'} - Cortex</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-slate-900 px-4">
	<div class="w-full max-w-md">
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold text-white mb-2">Cortex</h1>
			<p class="text-slate-400">End-to-End Encrypted AI Chat</p>
		</div>

		<div class="card">
			<div class="flex mb-6 border-b border-slate-700">
				<button
					class="flex-1 py-3 text-center font-medium transition-colors {mode === 'login' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white'}"
					onclick={() => mode = 'login'}
				>
					Login
				</button>
				<button
					class="flex-1 py-3 text-center font-medium transition-colors {mode === 'signup' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white'}"
					onclick={() => mode = 'signup'}
				>
					Sign Up
				</button>
			</div>

			<form onsubmit={handleSubmit} class="space-y-4">
				{#if mode === 'signup'}
					<div>
						<label for="name" class="block text-sm font-medium text-slate-300 mb-1">Name</label>
						<input
							type="text"
							id="name"
							bind:value={name}
							class="input"
							placeholder="Your name"
							required
						/>
					</div>
				{/if}

				<div>
					<label for="email" class="block text-sm font-medium text-slate-300 mb-1">Email</label>
					<input
						type="email"
						id="email"
						bind:value={email}
						class="input"
						placeholder="you@example.com"
						required
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-slate-300 mb-1">Password</label>
					<input
						type="password"
						id="password"
						bind:value={password}
						class="input"
						placeholder="••••••••"
						required
						minlength="8"
					/>
				</div>

				<button type="submit" class="btn btn-primary w-full" disabled={loading}>
					{#if loading}
						<svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
						</svg>
					{/if}
					{mode === 'login' ? 'Login' : 'Create Account'}
				</button>
			</form>
		</div>

		<p class="text-center text-slate-500 text-sm mt-6">
			Your data is encrypted end-to-end. We can never read your chats.
		</p>
	</div>
</div>
