<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { unlockWithPasswordFlow, type StorableUserKeys } from '$lib/crypto/sodium';
	import { useUserKeysQuery } from '$lib/api/auth';

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();

	let passphrase = $state('');
	let loading = $state(false);
	let showRecovery = $state(false);
	let recoveryPhrase = $state('');

	const userKeysQuery = useUserKeysQuery();

	async function handleUnlock() {
		if (!passphrase) {
			toast.error('Please enter your passphrase');
			return;
		}

		loading = true;

		try {
			const keys = $userKeysQuery.data;
			if (!keys) {
				toast.error('User keys not found. Please set up E2EE first.');
				return;
			}

			const storableKeys: StorableUserKeys = {
				kekSalt: keys.kek_salt,
				kekOpsLimit: keys.kek_ops_limit,
				kekMemLimit: keys.kek_mem_limit,
				encryptedMasterKey: keys.encrypted_master_key,
				masterKeyNonce: keys.master_key_nonce,
				publicKey: keys.public_key,
				encryptedPrivateKey: keys.encrypted_private_key,
				privateKeyNonce: keys.private_key_nonce,
				encryptedRecoveryKey: keys.encrypted_recovery_key,
				recoveryKeyNonce: keys.recovery_key_nonce,
				masterKeyRecovery: keys.master_key_recovery,
				masterKeyRecoveryNonce: keys.master_key_recovery_nonce
			};

			await unlockWithPasswordFlow(passphrase, storableKeys);
			toast.success('E2EE unlocked');
			onclose();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to unlock');
		} finally {
			loading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
	<div class="bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
		<div class="flex items-center justify-between mb-6">
			<h2 class="text-xl font-semibold text-white">Unlock E2EE</h2>
			<button
				class="text-slate-400 hover:text-white"
				onclick={onclose}
			>
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		{#if !showRecovery}
			<form onsubmit={(e) => { e.preventDefault(); handleUnlock(); }} class="space-y-4">
				<div>
					<label for="passphrase" class="block text-sm font-medium text-slate-300 mb-1">
						Passphrase
					</label>
					<input
						type="password"
						id="passphrase"
						bind:value={passphrase}
						class="input"
						placeholder="Enter your encryption passphrase"
						autofocus
					/>
				</div>

				<div class="flex gap-3">
					<button
						type="submit"
						class="btn btn-primary flex-1"
						disabled={loading || !passphrase}
					>
						{#if loading}
							<svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
							</svg>
						{/if}
						Unlock
					</button>
				</div>

				<button
					type="button"
					class="w-full text-sm text-slate-400 hover:text-white"
					onclick={() => showRecovery = true}
				>
					Use recovery phrase
				</button>
			</form>
		{:else}
			<div class="space-y-4">
				<div>
					<label for="recovery" class="block text-sm font-medium text-slate-300 mb-1">
						Recovery Phrase
					</label>
					<textarea
						id="recovery"
						bind:value={recoveryPhrase}
						class="input h-24 resize-none"
						placeholder="Enter your 24-word recovery phrase"
					></textarea>
				</div>

				<div class="flex gap-3">
					<button
						class="btn btn-secondary flex-1"
						onclick={() => showRecovery = false}
					>
						Back
					</button>
					<button
						class="btn btn-primary flex-1"
						disabled={!recoveryPhrase}
					>
						Recover
					</button>
				</div>
			</div>
		{/if}

		<p class="text-xs text-slate-500 mt-4 text-center">
			Your encryption keys never leave your device.
		</p>
	</div>
</div>
