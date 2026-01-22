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
import {
  fromBase64,
  encryptWebauthnCredentialName,
  decryptWebauthnCredentialName,
  isUnlocked,
} from "@onera/crypto";

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
 * Decrypt a passkey name from server response
 * Returns decrypted name if encrypted, otherwise returns plaintext name
 */
export function decryptPasskeyName(passkey: {
  name: string | null;
  encryptedName: string | null;
  nameNonce: string | null;
}): string {
  // Try encrypted name first
  if (passkey.encryptedName && passkey.nameNonce && isUnlocked()) {
    return decryptWebauthnCredentialName(passkey.encryptedName, passkey.nameNonce);
  }
  // Fall back to plaintext name
  return passkey.name || "Unnamed Passkey";
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
   * Register a passkey with PRF extension for master key encryption
   *
   * This registers a passkey and uses the PRF extension during registration
   * to get the PRF output needed for encrypting the master key.
   *
   * Note: PRF output during registration requires browser support (Chrome 116+, Safari 18+).
   * The prf.eval extension input is included in registration to get PRF output in one step.
   *
   * @param masterKey - The master key to encrypt
   * @param name - Optional name for the passkey
   */
  async function registerPasskeyWithEncryption(
    masterKey: Uint8Array,
    name?: string
  ): Promise<{ success: boolean }> {
    // Step 1: Get registration options and PRF salt from server
    const { options, prfSalt } = await generateOptions.mutateAsync({ name });

    // Step 2: Create PRF extension inputs for registration
    // Modern browsers (Chrome 116+, Safari 18+) support PRF evaluation during registration
    const prfInputs = createPRFExtensionInputs(prfSalt);

    // Add PRF extension to registration options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const optionsWithPRF: PublicKeyCredentialCreationOptionsJSON = {
      ...options,
      extensions: {
        ...options.extensions,
        ...prfInputs,
      } as any,
    };

    // Step 3: Register the passkey with PRF extension enabled
    const registrationResponse = await startRegistration({
      optionsJSON: optionsWithPRF,
      useAutoRegister: false,
    });

    // Step 4: Extract PRF output from registration response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extResults = registrationResponse.clientExtensionResults as any;
    const prfResults = extResults?.prf?.results;

    // Validate PRF results - if not available during registration, the authenticator
    // or browser may not support PRF evaluation during registration
    if (!validatePRFResults(prfResults)) {
      throw new Error(
        "Failed to get PRF output during passkey registration. " +
        "Your browser or authenticator may not support PRF evaluation during registration. " +
        "Please try using Chrome 116+ or Safari 18+, or use an alternative unlock method."
      );
    }

    const prfOutput = extractPRFOutput(prfResults);

    // Step 5: Encrypt master key with PRF-derived KEK
    const encrypted = await encryptMasterKeyWithPRF(masterKey, prfOutput, prfSalt);

    // Step 6: Encrypt the passkey name if E2EE is unlocked
    let encryptedNameData: { encryptedName: string; nameNonce: string } | undefined;
    if (name && isUnlocked()) {
      encryptedNameData = encryptWebauthnCredentialName(name);
    }

    // Step 7: Complete registration with encrypted master key and encrypted name
    // Note: Type assertion needed because @simplewebauthn types don't have index signature
    // that matches the Zod schema inference for clientExtensionResults
    await verifyRegistration.mutateAsync({
      response: registrationResponse as unknown as Parameters<typeof verifyRegistration.mutateAsync>[0]['response'],
      prfSalt,
      encryptedMasterKey: encrypted.ciphertext,
      masterKeyNonce: encrypted.nonce,
      // Use encrypted name if available, otherwise fall back to plaintext
      name: encryptedNameData ? undefined : name,
      encryptedName: encryptedNameData?.encryptedName,
      nameNonce: encryptedNameData?.nameNonce,
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
 * Automatically encrypts the name if E2EE is unlocked
 */
export function useRenamePasskey() {
  const utils = trpc.useUtils();
  const mutation = trpc.webauthn.rename.useMutation({
    onSuccess: () => {
      utils.webauthn.list.invalidate();
    },
  });

  /**
   * Rename a passkey with automatic encryption if E2EE is unlocked
   */
  async function renameWithEncryption(credentialId: string, name: string) {
    if (isUnlocked()) {
      // Encrypt the name
      const encryptedNameData = encryptWebauthnCredentialName(name);
      return mutation.mutateAsync({
        credentialId,
        encryptedName: encryptedNameData.encryptedName,
        nameNonce: encryptedNameData.nameNonce,
      });
    } else {
      // Fall back to plaintext
      return mutation.mutateAsync({
        credentialId,
        name,
      });
    }
  }

  return {
    ...mutation,
    renameWithEncryption,
  };
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
