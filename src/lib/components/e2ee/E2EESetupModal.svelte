<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { setupUserKeys, formatMnemonicForDisplay, type RecoveryKeyInfo } from '$lib/crypto/sodium';
	import { useCreateUserKeysMutation } from '$lib/api/auth';

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();

	let step = $state<'passphrase' | 'recovery' | 'confirm'>('passphrase');
	let passphrase = $state('');
	let confirmPassphrase = $state('');
	let loading = $state(false);
	let recoveryInfo = $state<RecoveryKeyInfo | null>(null);
	let copiedRecovery = $state(false);

	const createKeysMutation = useCreateUserKeysMutation();

	async function handleSetup() {
		if (passphrase !== confirmPassphrase) {
			toast.error('Passphrases do not match');
			return;
		}

		if (passphrase.length < 8) {
			toast.error('Passphrase must be at least 8 characters');
			return;
		}

		loading = true;

		try {
			const result = await setupUserKeys(passphrase);
			recoveryInfo = result.recoveryInfo;

			// Save keys to server
			await $createKeysMutation.mutateAsync({
				kek_salt: result.storableKeys.kekSalt,
				kek_ops_limit: result.storableKeys.kekOpsLimit,
				kek_mem_limit: result.storableKeys.kekMemLimit,
				encrypted_master_key: result.storableKeys.encryptedMasterKey,
				master_key_nonce: result.storableKeys.masterKeyNonce,
				public_key: result.storableKeys.publicKey,
				encrypted_private_key: result.storableKeys.encryptedPrivateKey,
				private_key_nonce: result.storableKeys.privateKeyNonce,
				encrypted_recovery_key: result.storableKeys.encryptedRecoveryKey,
				recovery_key_nonce: result.storableKeys.recoveryKeyNonce,
				master_key_recovery: result.storableKeys.masterKeyRecovery,
				master_key_recovery_nonce: result.storableKeys.masterKeyRecoveryNonce
			});

			step = 'recovery';
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to setup E2EE');
		} finally {
			loading = false;
		}
	}

	function copyRecoveryPhrase() {
		if (recoveryInfo) {
			navigator.clipboard.writeText(recoveryInfo.mnemonic);
			copiedRecovery = true;
			toast.success('Recovery phrase copied');
			setTimeout(() => copiedRecovery = false, 2000);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && step === 'passphrase') {
			onclose();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
	<div class="bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
		{#if step === 'passphrase'}
			<div class="mb-6">
				<h2 class="text-xl font-semibold text-white mb-2">Set Up E2EE</h2>
				<p class="text-slate-400 text-sm">
					Create a passphrase to encrypt your chats. This is separate from your account password.
				</p>
			</div>

			<form onsubmit={(e) => { e.preventDefault(); handleSetup(); }} class="space-y-4">
				<div>
					<label for="passphrase" class="block text-sm font-medium text-slate-300 mb-1">
						Encryption Passphrase
					</label>
					<input
						type="password"
						id="passphrase"
						bind:value={passphrase}
						class="input"
						placeholder="Choose a strong passphrase"
						minlength="8"
						autofocus
					/>
				</div>

				<div>
					<label for="confirm" class="block text-sm font-medium text-slate-300 mb-1">
						Confirm Passphrase
					</label>
					<input
						type="password"
						id="confirm"
						bind:value={confirmPassphrase}
						class="input"
						placeholder="Confirm your passphrase"
					/>
				</div>

				<div class="flex gap-3">
					<button
						type="button"
						class="btn btn-secondary flex-1"
						onclick={onclose}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="btn btn-primary flex-1"
						disabled={loading || !passphrase || !confirmPassphrase}
					>
						{#if loading}
							<svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
							</svg>
						{/if}
						Set Up E2EE
					</button>
				</div>
			</form>
		{:else if step === 'recovery' && recoveryInfo}
			<div class="mb-6">
				<h2 class="text-xl font-semibold text-white mb-2">Save Your Recovery Phrase</h2>
				<p class="text-slate-400 text-sm">
					Write down these 24 words and keep them safe. This is the only way to recover your encrypted data if you forget your passphrase.
				</p>
			</div>

			<div class="bg-slate-900 rounded-lg p-4 mb-4">
				<div class="grid grid-cols-4 gap-2 text-sm">
					{#each recoveryInfo.formattedGroups as group, groupIndex}
						{#each group as word, wordIndex}
							<div class="flex items-center gap-1">
								<span class="text-slate-500 w-5 text-right">{groupIndex * 4 + wordIndex + 1}.</span>
								<span class="text-white font-mono">{word}</span>
							</div>
						{/each}
					{/each}
				</div>
			</div>

			<button
				class="btn btn-secondary w-full mb-4"
				onclick={copyRecoveryPhrase}
			>
				{copiedRecovery ? 'Copied!' : 'Copy to Clipboard'}
			</button>

			<div class="bg-amber-900/30 border border-amber-700 rounded-lg p-3 mb-4">
				<p class="text-amber-200 text-sm">
					<strong>Warning:</strong> Never share this phrase. Anyone with it can access your encrypted data.
				</p>
			</div>

			<button
				class="btn btn-primary w-full"
				onclick={() => step = 'confirm'}
			>
				I've Saved My Recovery Phrase
			</button>
		{:else if step === 'confirm'}
			<div class="text-center">
				<div class="mb-4">
					<svg class="w-16 h-16 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<h2 class="text-xl font-semibold text-white mb-2">E2EE Set Up Successfully!</h2>
				<p class="text-slate-400 text-sm mb-6">
					Your encryption is now active. All your chats will be encrypted end-to-end.
				</p>
				<button
					class="btn btn-primary w-full"
					onclick={onclose}
				>
					Start Chatting
				</button>
			</div>
		{/if}
	</div>
</div>
