/**
 * WebAuthn Hook
 *
 * Provides functions for passkey registration and authentication with PRF extension.
 * Integrates with @simplewebauthn/browser and the tRPC WebAuthn router.
 */

import { trpc } from "@/lib/trpc";
import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/types";
import {
  encryptMasterKeyWithPRF,
  decryptMasterKeyWithPRF,
  extractPRFOutput,
  createPRFExtensionInputs,
  validatePRFResults,
  type PRFEncryptedMasterKey,
} from "@onera/crypto/webauthn";
import { fromBase64 } from "@onera/crypto";

/**
 * Hook for checking if user has any passkeys
 */
export function useHasPasskeys(enabled = true) {
  const query = trpc.webauthn.hasPasskeys.useQuery(undefined, {
    enabled,
    retry: false,
  });
  return {
    hasPasskeys: query.data?.hasPasskeys ?? false,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Hook for listing user's passkeys
 */
export function usePasskeyList() {
  return trpc.webauthn.list.useQuery(undefined, {
    retry: false,
  });
}

/**
 * Hook for passkey registration
 */
export function usePasskeyRegistration() {
  const utils = trpc.useUtils();
  const generateOptions = trpc.webauthn.generateRegistrationOptions.useMutation();
  const verifyRegistration = trpc.webauthn.verifyRegistration.useMutation({
    onSuccess: () => {
      utils.webauthn.hasPasskeys.invalidate();
      utils.webauthn.list.invalidate();
    },
  });

  /**
   * Register a passkey with immediate PRF authentication
   *
   * This performs a two-step process:
   * 1. Register the passkey (without PRF output)
   * 2. Immediately authenticate to get PRF output and encrypt master key
   *
   * @param masterKey - The master key to encrypt
   * @param name - Optional name for the passkey
   */
  async function registerPasskeyWithEncryption(
    masterKey: Uint8Array,
    name?: string
  ): Promise<{ success: boolean }> {
    // Step 1: Get registration options
    const { options, prfSalt } = await generateOptions.mutateAsync({ name });

    // Step 2: Register the passkey with PRF extension enabled
    const registrationResponse = await startRegistration({
      optionsJSON: options as PublicKeyCredentialCreationOptionsJSON,
      useAutoRegister: false,
    });

    // Step 3: Now immediately authenticate to get PRF output
    // We need to create authentication options for this specific credential
    const prfInputs = createPRFExtensionInputs(prfSalt);

    // Create authentication options targeting the just-registered credential
    // PRF extension types are not in standard WebAuthn types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authOptions: PublicKeyCredentialRequestOptionsJSON = {
      challenge: options.challenge, // Reuse challenge (server should accept)
      rpId: options.rp.id,
      userVerification: "required",
      allowCredentials: [
        {
          id: registrationResponse.id,
          type: "public-key",
          transports: registrationResponse.response.transports,
        },
      ],
      timeout: 60000,
      extensions: prfInputs as any,
    };

    // Start authentication to get PRF output
    const authResponse = await startAuthentication({
      optionsJSON: authOptions,
    });

    // Extract PRF output from authentication
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authExtResults = authResponse.clientExtensionResults as any;
    const prfResults = authExtResults?.prf?.results;

    // Validate PRF results before extraction
    if (!validatePRFResults(prfResults)) {
      throw new Error(
        "Failed to get PRF output from authenticator. This passkey may not support the PRF extension. " +
        "Please try a different passkey or use an alternative unlock method."
      );
    }

    const prfOutput = extractPRFOutput(prfResults);

    // Step 4: Encrypt master key with PRF-derived KEK
    const encrypted = await encryptMasterKeyWithPRF(masterKey, prfOutput, prfSalt);

    // Step 5: Complete registration with encrypted master key
    // Note: Type assertion needed because @simplewebauthn types don't have index signature
    // that matches the Zod schema inference for clientExtensionResults
    await verifyRegistration.mutateAsync({
      response: registrationResponse as unknown as Parameters<typeof verifyRegistration.mutateAsync>[0]['response'],
      prfSalt,
      encryptedMasterKey: encrypted.ciphertext,
      masterKeyNonce: encrypted.nonce,
      name,
    });

    return { success: true };
  }

  return {
    registerPasskey: registerPasskeyWithEncryption,
    isRegistering: generateOptions.isPending || verifyRegistration.isPending,
    error: generateOptions.error || verifyRegistration.error,
  };
}

/**
 * Hook for passkey authentication (unlock)
 */
export function usePasskeyAuthentication() {
  const utils = trpc.useUtils();
  const generateOptions = trpc.webauthn.generateAuthenticationOptions.useMutation();
  const verifyAuth = trpc.webauthn.verifyAuthentication.useMutation({
    onSuccess: () => {
      utils.webauthn.list.invalidate();
    },
  });

  /**
   * Authenticate with a passkey and decrypt the master key
   *
   * @returns The decrypted master key
   * @throws Error if authentication fails or decryption fails
   */
  async function authenticateWithPasskey(): Promise<Uint8Array> {
    // Step 1: Get authentication options from server
    const { options, prfSalts } = await generateOptions.mutateAsync();

    // Step 2: Prepare PRF extension inputs
    // We need to provide the correct salt for whichever credential the user chooses
    // Since we don't know which credential will be used, we provide evalByCredential
    // with all possible salts mapped to their credential IDs

    // Convert prfSalts to evalByCredential format
    const evalByCredential: Record<string, { first: ArrayBuffer }> = {};
    for (const [credentialId, salt] of Object.entries(prfSalts)) {
      const saltBytes = fromBase64(salt);
      evalByCredential[credentialId] = {
        first: saltBytes.buffer.slice(
          saltBytes.byteOffset,
          saltBytes.byteOffset + saltBytes.byteLength
        ) as ArrayBuffer,
      };
    }

    // Add PRF extension to options
    // PRF extension types are not in standard WebAuthn types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const optionsWithPRF: PublicKeyCredentialRequestOptionsJSON = {
      ...options,
      extensions: {
        ...options.extensions,
        prf: {
          evalByCredential,
        },
      } as any,
    };

    // Step 3: Start WebAuthn authentication
    const authResponse = await startAuthentication({
      optionsJSON: optionsWithPRF,
    });

    // Step 4: Extract PRF output
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extensionResults = authResponse.clientExtensionResults as any;
    const prfResults = extensionResults?.prf?.results;

    // Validate PRF results before extraction
    if (!validatePRFResults(prfResults)) {
      throw new Error(
        "Failed to get PRF output from passkey. The passkey may not support the PRF extension, " +
        "or there was an error during authentication. Please try again or use an alternative unlock method."
      );
    }

    const prfOutput = extractPRFOutput(prfResults);

    // Step 5: Verify authentication and get encrypted master key
    // Note: Type assertion needed because @simplewebauthn types don't have index signature
    // that matches the Zod schema inference for clientExtensionResults
    const result = await verifyAuth.mutateAsync({
      response: authResponse as unknown as Parameters<typeof verifyAuth.mutateAsync>[0]['response'],
    });

    // Step 6: Decrypt master key using PRF output
    const encryptedData: PRFEncryptedMasterKey = {
      ciphertext: result.encryptedMasterKey,
      nonce: result.masterKeyNonce,
      prfSalt: result.prfSalt,
    };

    const masterKey = await decryptMasterKeyWithPRF(encryptedData, prfOutput);

    return masterKey;
  }

  return {
    authenticateWithPasskey,
    isAuthenticating: generateOptions.isPending || verifyAuth.isPending,
    error: generateOptions.error || verifyAuth.error,
  };
}

/**
 * Hook for renaming a passkey
 */
export function useRenamePasskey() {
  const utils = trpc.useUtils();
  const mutation = trpc.webauthn.rename.useMutation({
    onSuccess: () => {
      utils.webauthn.list.invalidate();
    },
  });

  return mutation;
}

/**
 * Hook for deleting a passkey
 */
export function useDeletePasskey() {
  const utils = trpc.useUtils();
  const mutation = trpc.webauthn.delete.useMutation({
    onSuccess: () => {
      utils.webauthn.hasPasskeys.invalidate();
      utils.webauthn.list.invalidate();
    },
  });

  return mutation;
}
