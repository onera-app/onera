import { fromBase64, fromHex, toHex } from '../sodium/utils';
import { getSodium } from '../sodium/init';
import type { AttestationQuote, EnclaveMeasurements } from '@onera/types';

// AMD SEV-SNP attestation report structure offsets
// Aligned with mock enclave implementation (infra/enclave/src/attestation.rs)
const REPORT_OFFSETS = {
  VERSION: 0,
  GUEST_SVN: 4,
  POLICY: 8,
  FAMILY_ID: 16,
  IMAGE_ID: 32,
  VMPL: 48,
  REPORT_DATA: 80, // 64 bytes - contains public key hash
  LAUNCH_MEASUREMENT: 144, // 48 bytes (only 32 used in mock)
  SIGNATURE: 672,
} as const;

const MEASUREMENT_SIZE = 48;
const REPORT_DATA_SIZE = 64;

/**
 * Parses an AMD SEV-SNP attestation quote.
 */
export function parseSevSnpQuote(rawQuoteBase64: string): AttestationQuote {
  const reportBytes = fromBase64(rawQuoteBase64);

  if (reportBytes.length < 1184) {
    throw new Error('Invalid SEV-SNP report: too short');
  }

  const view = new DataView(reportBytes.buffer, reportBytes.byteOffset);

  const version = view.getUint32(REPORT_OFFSETS.VERSION, true);
  if (version !== 2) {
    throw new Error(`Unsupported SEV-SNP report version: ${version}`);
  }

  const measurements: EnclaveMeasurements = {
    launch_digest: toHex(
      reportBytes.slice(
        REPORT_OFFSETS.LAUNCH_MEASUREMENT,
        REPORT_OFFSETS.LAUNCH_MEASUREMENT + MEASUREMENT_SIZE
      )
    ),
    family_id: toHex(
      reportBytes.slice(REPORT_OFFSETS.FAMILY_ID, REPORT_OFFSETS.FAMILY_ID + 16)
    ),
    image_id: toHex(
      reportBytes.slice(REPORT_OFFSETS.IMAGE_ID, REPORT_OFFSETS.IMAGE_ID + 16)
    ),
    vmpl: view.getUint32(REPORT_OFFSETS.VMPL, true),
    report_data: toHex(
      reportBytes.slice(
        REPORT_OFFSETS.REPORT_DATA,
        REPORT_OFFSETS.REPORT_DATA + REPORT_DATA_SIZE
      )
    ),
  };

  return {
    raw_quote: rawQuoteBase64,
    public_key: '', // Will be set after verification
    timestamp: Date.now(),
    measurements,
  };
}

/**
 * Verifies that a public key matches the hash in the attestation report.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyPublicKeyBinding(
  quote: AttestationQuote,
  publicKeyBase64: string
): boolean {
  const sodium = getSodium();
  const publicKeyBytes = fromBase64(publicKeyBase64);

  // Hash the public key with SHA-256
  const hashBytes = sodium.crypto_hash_sha256(publicKeyBytes);

  // Extract first 32 bytes of report data as bytes
  const expectedHashHex = quote.measurements.report_data.slice(0, 64);
  const expectedHashBytes = fromHex(expectedHashHex);

  // Constant-time comparison to prevent timing attacks
  if (hashBytes.length !== expectedHashBytes.length) {
    return false;
  }
  return sodium.memcmp(hashBytes, expectedHashBytes);
}
