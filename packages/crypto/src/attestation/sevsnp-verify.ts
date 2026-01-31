/**
 * AMD SEV-SNP Attestation Signature Verification
 *
 * Verifies the cryptographic signature on SEV-SNP attestation reports.
 * The signature proves the report came from genuine AMD hardware.
 */

import * as pkijs from 'pkijs';
import * as asn1js from 'asn1js';
import { fromBase64, toHex } from '../sodium/utils';

// AMD SEV-SNP report structure offsets
const REPORT_OFFSETS = {
  VERSION: 0,
  GUEST_SVN: 4,
  POLICY: 8,
  FAMILY_ID: 16,
  IMAGE_ID: 32,
  VMPL: 48,
  SIGNATURE_ALGO: 52, // 4 bytes - should be 1 for ECDSA P-384
  REPORT_DATA: 80, // 64 bytes
  LAUNCH_MEASUREMENT: 144, // 48 bytes
  SIGNATURE: 672, // 512 bytes (ECDSA P-384 signature)
  REPORT_SIGNED_DATA_END: 672, // Data from 0 to 672 is signed
} as const;

// AMD Root Key (ARK) for Milan CPUs - ECDSA P-384 public key
// This is the trust anchor for AMD SEV-SNP attestation
// Source: https://developer.amd.com/sev/
// Exported for future use in full certificate chain verification (ARK -> ASK -> VCEK)
export const AMD_ARK_MILAN_PEM = `-----BEGIN CERTIFICATE-----
MIIGiTCCBDigAwIBAgIDAQABMEYGCSqGSIb3DQEBCjA5oA8wDQYJYIZIAWUDBAIC
BQChHDAaBgkqhkiG9w0BAQgwDQYJYIZIAWUDBAICBQCiAwIBMKMDAgEBMHsxFDAS
BgNVBAsMC0VuZ2luZWVyaW5nMQswCQYDVQQGEwJVUzEUMBIGA1UEBwwLU2FudGEg
Q2xhcmExCzAJBgNVBAgMAkNBMR8wHQYDVQQKDBZBZHZhbmNlZCBNaWNybyBEZXZp
Y2VzMRIwEAYDVQQDDAlBUkstTWlsYW4wHhcNMjAxMDIyMTgyNDIwWhcNNDUxMDIy
MTgyNDIwWjB7MRQwEgYDVQQLDAtFbmdpbmVlcmluZzELMAkGA1UEBhMCVVMxFDAS
BgNVBAcMC1NhbnRhIENsYXJhMQswCQYDVQQIDAJDQTEfMB0GA1UECgwWQWR2YW5j
ZWQgTWljcm8gRGV2aWNlczESMBAGA1UEAwwJQVJLLU1pbGFuMIICIjANBgkqhkiG
9w0BAQEFAAOCAg8AMIICCgKCAgEA0Ld52RJOdeiJlqK2JdsVmD7FktuotWwX1fNg
W41XY9Xz1HEhSUmhLz9Cu9DHRlvgJSNxbeYYsnJfvyjx1MfU0V5tkKiU1EesNFta
1kTA0szNisdYc9isqk7mXT5+KfGRbfc4V/9zRIcE8jlHN61S1ju8X93+6dxDUrG2
SzxqJ4BhqyYmUDruPXJSX4vUc01P7j98MpqOS95rORdGHeI52Naz5m2B+O+vjsC0
60d37jY9LFeuOP4Meri8qgfi2S5kKqg/aF6aPtuAZQVR7u3KFYXP59XmJgtcog05
gmI0T/OitLhuzVvpZcLph0odh/1IPXqx3+MnjD97A7fXpqGd/y8KxX7jksTEzAOg
bKAeam3lm+3yKIcTYMlsRMXPcjNbIvmsBykD//xSniusuHBkgnlENEWx1UcbQQrs
+gVDkuVPhsnzIRNgYvM48Y+7LGiJYnrmE8xcrexekBxrva2V9TJQqnN3Q53kt5vi
Qi3+gCfmkwC0F0tirIZbLkXPrPwzZ0M9eNxhIySb2npJfgnqz55I0u33wh4r0ZNQ
eTGfw03MBUtyuzGesGkcw+loqMaq1qR4tjGbPYxCvpCq7+OgpCCoMNit2uLo9M18
fHz10lOMT8nWAUvRZFzteXCm+7PHdYPlmQwUw3LvenJ/ILXoQPHfbkH0CyPfhl1j
WhJFZasCAwEAAaN+MHwwDgYDVR0PAQH/BAQDAgEGMB0GA1UdDgQWBBSFrBrRQ/fI
rFXUxR1BSKvVeErUUzAPBgNVHRMBAf8EBTADAQH/MDoGA1UdHwQzMDEwL6AtoCuG
KWh0dHBzOi8va2RzaW50Zi5hbWQuY29tL3ZjZWsvdjEvTWlsYW4vY3JsMEYGCSqG
SIb3DQEBCjA5oA8wDQYJYIZIAWUDBAICBQChHDAaBgkqhkiG9w0BAQgwDQYJYIZI
AWUDBAICBQCiAwIBMKMDAgEBA4ICAQC6m0kDp6zv4Ib+SdS7qUFf95DWDwE8BXWI
pxKSRdkQzR9GSPX+hMQPk+cJlNGjCCzEXB2y8OPclZnrfUBJ5rT2S0SHLULKQjfp
qPP8hB2DFQ5/ej6krgT2DPLPvSB8B9fKCqjgJoMBzzSauqLpXtZqF9cyNZO/3T6L
nHE3Ud/SMJXa7DYl+FKbPaNqwey4iNZ5Xa1PqjmHNX8zRt5F1+T4/FtfFBqGeARL
GHmZqL9Lw8+HNVqpv6NBB0d9C5kXFBghQvEW1gwsMBjOsrLj1lSS7B+B2xNxl+Bh
Q5XHbPK6UfaK+KhSbj38f+7KP3X1Sq8Y5awLK8DXHX0VD+XhnYNTR5j4BtrCm/H6
DP5IiJnUwPPF4oNlWBdtNi9z24fAEhT1bSlFpTTGCCk1+zXt51yF/wTH1H1/HQVP
Pf1fazPOZZH7KP4TAL9RW6H+RU/aPQNyxbIAs/88K7CJJTqM0SvRq+ri0n88gP5x
v8oKDC7E3Te6SdkJXPiVp3xBesFL6e/Pf0cN7lY9K+z4UMEqP8uIew0cNmBrX06x
qVQoKBqxzPZl7JKbqkr1m2EtMvS4AmPDh+p0GQAL1c+SWD0PCQIK79ND/y3LYPLJ
V8elXMYYxrRo/E2yndKxKWVWP6O+F7RXNe8DWkJjO/K9QwKlM5sSXfB3aHfJTXdL
qij91k3v5g==
-----END CERTIFICATE-----`;

/**
 * Result of SEV-SNP signature verification
 */
export interface SevSnpSignatureResult {
  valid: boolean;
  error?: string;
  signatureAlgorithm?: number;
}

/**
 * Parse PEM certificate to raw public key bytes
 */
async function getPublicKeyFromPem(pem: string): Promise<CryptoKey | null> {
  try {
    const b64 = pem
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\s/g, '');
    const der = fromBase64(b64);
    const asn1 = asn1js.fromBER(new Uint8Array(der).buffer);
    if (asn1.offset === -1) {
      return null;
    }
    const cert = new pkijs.Certificate({ schema: asn1.result });

    // Extract the public key
    const publicKeyInfo = cert.subjectPublicKeyInfo;
    const publicKeyDer = publicKeyInfo.toSchema().toBER(false);

    // Import as ECDSA P-384 key for SEV-SNP verification
    const crypto = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
    return await crypto.subtle.importKey(
      'spki',
      publicKeyDer,
      { name: 'ECDSA', namedCurve: 'P-384' },
      true,
      ['verify']
    );
  } catch {
    return null;
  }
}

/**
 * Verify the signature on an SEV-SNP attestation report.
 *
 * Note: For full verification, you need the VCEK certificate for the specific
 * CPU that generated the report. The VCEK can be fetched from AMD's KDS:
 * https://kdsintf.amd.com/vcek/v1/{product_name}/{hwid}?blSPL={bl}&teeSPL={tee}&snpSPL={snp}&ucodeSPL={ucode}
 *
 * @param rawQuoteBase64 - Base64-encoded SEV-SNP attestation report
 * @param vcekCertPem - Optional VCEK certificate PEM (if not provided, signature is not verified)
 * @param allowUnverified - If true, allow reports without signature verification (development only)
 */
export async function verifySevSnpSignature(
  rawQuoteBase64: string,
  vcekCertPem?: string,
  allowUnverified = false
): Promise<SevSnpSignatureResult> {
  try {
    const reportBytes = fromBase64(rawQuoteBase64);

    if (reportBytes.length < 1184) {
      return { valid: false, error: 'Report too short for SEV-SNP format' };
    }

    const view = new DataView(reportBytes.buffer, reportBytes.byteOffset);

    // Check signature algorithm (should be 1 for ECDSA P-384 with SHA-384)
    const signatureAlgo = view.getUint32(REPORT_OFFSETS.SIGNATURE_ALGO, true);

    // If no VCEK provided, we can't verify the signature
    if (!vcekCertPem) {
      if (allowUnverified) {
        console.warn(
          '[SEV-SNP] WARNING: Signature verification skipped - no VCEK certificate provided. ' +
            'This is acceptable for development but should not be used in production.'
        );
        return { valid: true, signatureAlgorithm: signatureAlgo };
      }
      return {
        valid: false,
        error: 'VCEK certificate required for signature verification',
        signatureAlgorithm: signatureAlgo,
      };
    }

    // For algorithm 1 (ECDSA P-384), verify the signature
    if (signatureAlgo !== 1) {
      return {
        valid: false,
        error: `Unsupported signature algorithm: ${signatureAlgo}`,
        signatureAlgorithm: signatureAlgo,
      };
    }

    // Extract the signature (ECDSA P-384 is 96 bytes: r || s, each 48 bytes)
    const signatureBytes = reportBytes.slice(
      REPORT_OFFSETS.SIGNATURE,
      REPORT_OFFSETS.SIGNATURE + 96
    );

    // The signed data is everything from offset 0 to SIGNATURE
    const signedData = reportBytes.slice(0, REPORT_OFFSETS.REPORT_SIGNED_DATA_END);

    // Import the VCEK public key
    const vcekPublicKey = await getPublicKeyFromPem(vcekCertPem);
    if (!vcekPublicKey) {
      return { valid: false, error: 'Failed to parse VCEK certificate' };
    }

    // Convert signature to DER format for WebCrypto
    // WebCrypto expects IEEE P1363 format (r || s) which is what we have
    const crypto = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;

    // Verify the signature
    const isValid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-384' },
      vcekPublicKey,
      signatureBytes,
      signedData
    );

    if (!isValid) {
      return { valid: false, error: 'SEV-SNP signature verification failed' };
    }

    return { valid: true, signatureAlgorithm: signatureAlgo };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Signature verification error',
    };
  }
}

/**
 * Fetch VCEK certificate from AMD's Key Distribution Service (KDS).
 *
 * @param chipId - The chip ID (CHIP_ID field from attestation report)
 * @param tcbVersion - TCB version components
 */
export async function fetchVcekCertificate(
  chipId: string,
  tcbVersion: { blSpl: number; teeSpl: number; snpSpl: number; ucodeSpl: number }
): Promise<string | null> {
  try {
    const url = new URL(`https://kdsintf.amd.com/vcek/v1/Milan/${chipId}`);
    url.searchParams.set('blSPL', tcbVersion.blSpl.toString());
    url.searchParams.set('teeSPL', tcbVersion.teeSpl.toString());
    url.searchParams.set('snpSPL', tcbVersion.snpSpl.toString());
    url.searchParams.set('ucodeSPL', tcbVersion.ucodeSpl.toString());

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error(`Failed to fetch VCEK: ${response.status}`);
      return null;
    }

    // Response is DER-encoded certificate, convert to PEM
    const derBytes = new Uint8Array(await response.arrayBuffer());
    const b64 = btoa(String.fromCharCode(...derBytes));
    return `-----BEGIN CERTIFICATE-----\n${b64.match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----`;
  } catch (error) {
    console.error('Failed to fetch VCEK certificate:', error);
    return null;
  }
}

/**
 * Extract chip ID and TCB version from attestation report for VCEK lookup.
 */
export function extractVcekLookupParams(rawQuoteBase64: string): {
  chipId: string;
  tcbVersion: { blSpl: number; teeSpl: number; snpSpl: number; ucodeSpl: number };
} | null {
  try {
    const reportBytes = fromBase64(rawQuoteBase64);
    if (reportBytes.length < 1184) {
      return null;
    }

    // CHIP_ID is at offset 416, 64 bytes
    const chipIdBytes = reportBytes.slice(416, 416 + 64);
    const chipId = toHex(chipIdBytes);

    // TCB version is at offset 56, contains SPL values
    const tcbVersion = {
      blSpl: reportBytes[56],
      teeSpl: reportBytes[57],
      snpSpl: reportBytes[60],
      ucodeSpl: reportBytes[63],
    };

    return { chipId, tcbVersion };
  } catch {
    return null;
  }
}
