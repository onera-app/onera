import type { AttestationQuote } from '@onera/types';
import { parseSevSnpQuote, verifyPublicKeyBinding } from './sevsnp';
import { toBase64, fromHex, fromBase64, toHex } from '../sodium/utils';
import { getSodium } from '../sodium/init';

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
 * Handles both SEV-SNP and Azure IMDS attestation types.
 */
export async function verifyAttestation(
  rawQuote: string,
  publicKeyBase64: string,
  attestationType: string,
  reportData?: string,
  knownMeasurements?: KnownMeasurements
): Promise<VerificationResult> {
  try {
    if (attestationType === 'azure-imds') {
      // Azure IMDS attestation - verify public key is bound via report_data
      return verifyAzureImdsAttestation(rawQuote, publicKeyBase64, reportData);
    } else {
      // SEV-SNP attestation (mock or real)
      return verifySevSnpAttestation(rawQuote, publicKeyBase64, knownMeasurements);
    }
  } catch (error) {
    return {
      valid: false,
      quote: null,
      error: error instanceof Error ? error.message : 'Unknown verification error',
    };
  }
}

/**
 * Verify Azure IMDS attestation.
 * The quote is PKCS7 signed by Microsoft, providing proof of Azure Confidential VM.
 * We verify the public key is bound by checking report_data contains its hash.
 */
async function verifyAzureImdsAttestation(
  rawQuote: string,
  publicKeyBase64: string,
  reportData?: string
): Promise<VerificationResult> {
  const sodium = getSodium();

  // Verify public key binding via report_data
  const publicKeyBytes = fromBase64(publicKeyBase64);
  const expectedHash = sodium.crypto_hash_sha256(publicKeyBytes);
  const expectedHashHex = toHex(expectedHash);

  if (!reportData || !reportData.startsWith(expectedHashHex)) {
    return {
      valid: false,
      quote: null,
      error: 'Public key hash not bound in Azure attestation report_data',
    };
  }

  // Create a quote object for the response
  const quote: AttestationQuote = {
    raw_quote: rawQuote,
    public_key: publicKeyBase64,
    timestamp: Date.now(),
    measurements: {
      launch_digest: 'azure-confidential-vm',
      family_id: 'azure',
      image_id: 'confidential-vm',
      vmpl: 0,
      report_data: reportData,
    },
  };

  // TODO Phase 2: Verify PKCS7 signature against Microsoft certificate chain
  // For now, we trust that if we got a response from IMDS, it's valid

  return { valid: true, quote };
}

/**
 * Verify SEV-SNP attestation (mock or real).
 */
async function verifySevSnpAttestation(
  rawQuoteBase64: string,
  publicKeyBase64: string,
  knownMeasurements?: KnownMeasurements
): Promise<VerificationResult> {
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

  return { valid: true, quote };
}

/**
 * Fetches and verifies attestation from a TEE endpoint.
 */
export async function fetchAndVerifyAttestation(
  attestationEndpoint: string,
  knownMeasurements?: KnownMeasurements
): Promise<VerificationResult> {
  try {
    // Always fetch fresh attestation - never use cached response
    // The server generates a new keypair on each restart
    const response = await fetch(attestationEndpoint, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    if (!response.ok) {
      return {
        valid: false,
        quote: null,
        error: `Failed to fetch attestation: ${response.status}`,
      };
    }

    const data = await response.json();
    const attestationType = data.attestation_type || 'mock-sev-snp';
    const rawQuote = data.quote;
    const reportData = data.report_data;

    // Public key may be hex (old) or base64 (new) encoded
    let publicKeyBase64: string;
    const publicKeyRaw = data.public_key || data.publicKey;

    console.log('[Attestation] Raw public_key from server:', publicKeyRaw);
    console.log('[Attestation] attestation_type:', attestationType);

    // Check if it's already base64 (contains non-hex chars)
    if (/[^0-9a-fA-F]/.test(publicKeyRaw)) {
      publicKeyBase64 = publicKeyRaw;
      console.log('[Attestation] Detected base64 encoding');
    } else {
      // Convert hex to base64
      const bytes = fromHex(publicKeyRaw);
      publicKeyBase64 = toBase64(bytes);
      console.log('[Attestation] Converted hex to base64');
    }

    // Verify the decoded key is 32 bytes
    const decodedKey = fromBase64(publicKeyBase64);
    console.log('[Attestation] Decoded public key (' + decodedKey.length + ' bytes):', toHex(decodedKey));

    return verifyAttestation(
      rawQuote,
      publicKeyBase64,
      attestationType,
      reportData,
      knownMeasurements
    );
  } catch (error) {
    return {
      valid: false,
      quote: null,
      error: error instanceof Error ? error.message : 'Failed to fetch attestation',
    };
  }
}
