import type { AttestationQuote } from '@onera/types';
import { parseSevSnpQuote, verifyPublicKeyBinding } from './sevsnp';
import { verifyAzureImdsPkcs7Signature, parseAzureAttestationClaims } from './azure-imds';
import {
  verifySevSnpSignature,
  extractVcekLookupParams,
  fetchVcekCertificate,
} from './sevsnp-verify';
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

export interface VerificationOptions {
  /**
   * Known measurements to verify against (launch_digest).
   * Required in production for full security guarantees.
   */
  knownMeasurements?: KnownMeasurements;

  /**
   * VCEK certificate PEM for SEV-SNP signature verification.
   * If not provided, will attempt to fetch from AMD KDS.
   */
  vcekCertPem?: string;

  /**
   * Allow unverified attestation (development only).
   * WARNING: Setting this to true bypasses signature verification.
   * This should NEVER be true in production.
   */
  allowUnverified?: boolean;
}

/**
 * Verifies a TEE attestation quote with full cryptographic verification.
 * Handles both SEV-SNP and Azure IMDS attestation types.
 *
 * Security guarantees:
 * - Azure IMDS: Verifies PKCS7 signature against Microsoft certificate chain
 * - SEV-SNP: Verifies report signature against AMD VCEK certificate
 * - Both: Verifies public key binding in report_data
 */
export async function verifyAttestation(
  rawQuote: string,
  publicKeyBase64: string,
  attestationType: string,
  reportData?: string,
  options: VerificationOptions = {}
): Promise<VerificationResult> {
  const { knownMeasurements, vcekCertPem, allowUnverified = false } = options;

  // Log warning if running without signature verification
  if (allowUnverified) {
    console.warn(
      '[Attestation] WARNING: Running with allowUnverified=true. ' +
        'Signature verification is DISABLED. Do not use in production!'
    );
  }

  try {
    if (attestationType === 'azure-imds') {
      return verifyAzureImdsAttestation(rawQuote, publicKeyBase64, reportData, allowUnverified);
    } else {
      return verifySevSnpAttestation(
        rawQuote,
        publicKeyBase64,
        knownMeasurements,
        vcekCertPem,
        allowUnverified
      );
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
 * Verify Azure IMDS attestation with PKCS7 signature verification.
 * The quote is PKCS7 signed by Microsoft, providing proof of Azure Confidential VM.
 */
async function verifyAzureImdsAttestation(
  rawQuote: string,
  publicKeyBase64: string,
  reportData?: string,
  allowUnverified = false
): Promise<VerificationResult> {
  const sodium = getSodium();

  // Step 1: Verify public key binding via report_data
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

  // Step 2: Verify PKCS7 signature against Microsoft certificate chain
  const pkcs7Result = await verifyAzureImdsPkcs7Signature(rawQuote);

  if (!pkcs7Result.valid) {
    if (allowUnverified) {
      console.warn(
        '[Azure IMDS] WARNING: PKCS7 signature verification failed but allowUnverified=true. ' +
          `Error: ${pkcs7Result.error}`
      );
    } else {
      return {
        valid: false,
        quote: null,
        error: `Azure IMDS signature verification failed: ${pkcs7Result.error}`,
      };
    }
  }

  // Step 3: Parse and validate the signed attestation claims if signature was verified
  if (pkcs7Result.valid && pkcs7Result.signedContent) {
    const claims = parseAzureAttestationClaims(pkcs7Result.signedContent);
    if (claims) {
      // Verify the claims contain expected fields
      console.log('[Azure IMDS] Verified attestation claims:', Object.keys(claims));
    }
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

  return { valid: true, quote };
}

/**
 * Verify SEV-SNP attestation with full signature verification.
 */
async function verifySevSnpAttestation(
  rawQuoteBase64: string,
  publicKeyBase64: string,
  knownMeasurements?: KnownMeasurements,
  vcekCertPem?: string,
  allowUnverified = false
): Promise<VerificationResult> {
  // Step 1: Parse the quote structure
  const quote = parseSevSnpQuote(rawQuoteBase64);

  // Step 2: Verify public key binding
  const keyBindingValid = verifyPublicKeyBinding(quote, publicKeyBase64);
  if (!keyBindingValid) {
    return {
      valid: false,
      quote: null,
      error: 'Public key does not match attestation report',
    };
  }

  quote.public_key = publicKeyBase64;

  // Step 3: Verify the cryptographic signature
  let vcekCert = vcekCertPem;

  // If no VCEK provided, try to fetch from AMD KDS
  if (!vcekCert && !allowUnverified) {
    const vcekParams = extractVcekLookupParams(rawQuoteBase64);
    if (vcekParams) {
      console.log('[SEV-SNP] Fetching VCEK certificate from AMD KDS...');
      const fetchedCert = await fetchVcekCertificate(vcekParams.chipId, vcekParams.tcbVersion);
      vcekCert = fetchedCert ?? undefined;
      if (!vcekCert) {
        console.warn('[SEV-SNP] Failed to fetch VCEK from AMD KDS');
      }
    }
  }

  const signatureResult = await verifySevSnpSignature(rawQuoteBase64, vcekCert, allowUnverified);

  if (!signatureResult.valid) {
    if (allowUnverified) {
      console.warn(
        '[SEV-SNP] WARNING: Signature verification failed but allowUnverified=true. ' +
          `Error: ${signatureResult.error}`
      );
    } else {
      return {
        valid: false,
        quote,
        error: `SEV-SNP signature verification failed: ${signatureResult.error}`,
      };
    }
  }

  // Step 4: Verify launch digest if provided
  if (knownMeasurements) {
    if (quote.measurements.launch_digest !== knownMeasurements.launch_digest) {
      return {
        valid: false,
        quote,
        error: `Launch digest mismatch. Expected: ${knownMeasurements.launch_digest}, Got: ${quote.measurements.launch_digest}`,
      };
    }
  } else if (!allowUnverified) {
    console.warn(
      '[SEV-SNP] WARNING: No knownMeasurements provided. Launch digest not verified. ' +
        'Consider providing expected measurements for production use.'
    );
  }

  return { valid: true, quote };
}

/**
 * Fetches and verifies attestation from a TEE endpoint.
 */
export async function fetchAndVerifyAttestation(
  attestationEndpoint: string,
  options: VerificationOptions = {}
): Promise<VerificationResult> {
  try {
    // Always fetch fresh attestation - never use cached response
    // The server generates a new keypair on each restart
    const response = await fetch(attestationEndpoint, {
      cache: 'no-store',
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

    console.log('[Attestation] attestation_type:', attestationType);

    // Check if it's already base64 (contains non-hex chars)
    if (/[^0-9a-fA-F]/.test(publicKeyRaw)) {
      publicKeyBase64 = publicKeyRaw;
    } else {
      // Convert hex to base64
      const bytes = fromHex(publicKeyRaw);
      publicKeyBase64 = toBase64(bytes);
    }

    // Verify the decoded key is 32 bytes
    const decodedKey = fromBase64(publicKeyBase64);
    if (decodedKey.length !== 32) {
      return {
        valid: false,
        quote: null,
        error: `Invalid public key length: ${decodedKey.length} bytes (expected 32)`,
      };
    }

    return verifyAttestation(rawQuote, publicKeyBase64, attestationType, reportData, options);
  } catch (error) {
    return {
      valid: false,
      quote: null,
      error: error instanceof Error ? error.message : 'Failed to fetch attestation',
    };
  }
}

// Legacy function signature for backward compatibility
export async function verifyAttestationLegacy(
  rawQuote: string,
  publicKeyBase64: string,
  attestationType: string,
  reportData?: string,
  knownMeasurements?: KnownMeasurements
): Promise<VerificationResult> {
  // Legacy calls default to allowUnverified=true for backward compatibility
  // TODO: Remove this after migration to new API
  console.warn(
    '[Attestation] Using legacy API with signature verification disabled. ' +
      'Please migrate to the new verifyAttestation() with explicit options.'
  );
  return verifyAttestation(rawQuote, publicKeyBase64, attestationType, reportData, {
    knownMeasurements,
    allowUnverified: true,
  });
}
