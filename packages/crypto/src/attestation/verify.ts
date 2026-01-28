import type { AttestationQuote } from '@onera/types';
import { parseSevSnpQuote, verifyPublicKeyBinding } from './sevsnp';

export interface VerificationResult {
  valid: boolean;
  quote: AttestationQuote | null;
  error?: string;
}

export interface KnownMeasurements {
  launch_digest: string;
}

/**
 * Verifies a TEE attestation quote.
 */
export async function verifyAttestation(
  rawQuoteBase64: string,
  publicKeyBase64: string,
  knownMeasurements?: KnownMeasurements
): Promise<VerificationResult> {
  try {
    const quote = parseSevSnpQuote(rawQuoteBase64);

    const keyBindingValid = verifyPublicKeyBinding(quote, publicKeyBase64);
    if (!keyBindingValid) {
      return {
        valid: false,
        quote: null,
        error: 'Public key does not match attestation report',
      };
    }

    quote.public_key = publicKeyBase64;

    if (knownMeasurements) {
      if (quote.measurements.launch_digest !== knownMeasurements.launch_digest) {
        return {
          valid: false,
          quote,
          error: `Launch digest mismatch. Expected: ${knownMeasurements.launch_digest}, Got: ${quote.measurements.launch_digest}`,
        };
      }
    }

    // TODO Phase 2: Verify signature against AMD root of trust
    // TODO Phase 2: Query transparency log for measurement verification

    return { valid: true, quote };
  } catch (error) {
    return {
      valid: false,
      quote: null,
      error: error instanceof Error ? error.message : 'Unknown verification error',
    };
  }
}

/**
 * Fetches and verifies attestation from a TEE endpoint.
 */
export async function fetchAndVerifyAttestation(
  attestationEndpoint: string,
  knownMeasurements?: KnownMeasurements
): Promise<VerificationResult> {
  try {
    const response = await fetch(attestationEndpoint);
    if (!response.ok) {
      return {
        valid: false,
        quote: null,
        error: `Failed to fetch attestation: ${response.status}`,
      };
    }

    const { quote: rawQuote, publicKey } = await response.json();
    return verifyAttestation(rawQuote, publicKey, knownMeasurements);
  } catch (error) {
    return {
      valid: false,
      quote: null,
      error: error instanceof Error ? error.message : 'Failed to fetch attestation',
    };
  }
}
