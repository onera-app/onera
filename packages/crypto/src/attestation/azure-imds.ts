/**
 * Azure IMDS Attestation Verification
 *
 * Verifies PKCS7-signed attestation documents from Azure Instance Metadata Service.
 * The attestation proves the code is running on an Azure Confidential VM.
 */

import * as pkijs from 'pkijs';
import * as asn1js from 'asn1js';

// Microsoft Azure Attestation root certificate (DigiCert Global Root G2)
// This is the trust anchor for Azure attestation documents
// Certificate valid until: 2038-01-15
// Pre-processed base64 (no PEM headers, no whitespace) to avoid bundling issues
const MICROSOFT_ROOT_CERT_BASE64 = 'MIIDjjCCAnagAwIBAgIQAzrx5qcRqaC7KGSxHQn65TANBgkqhkiG9w0BAQsFADBhMQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3d3cuZGlnaWNlcnQuY29tMSAwHgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBHMjAeFw0xMzA4MDExMjAwMDBaFw0zODAxMTUxMjAwMDBaMGExCzAJBgNVBAYTAlVTMRUwEwYDVQQKEwxEaWdpQ2VydCBJbmMxGTAXBgNVBAsTEHd3dy5kaWdpY2VydC5jb20xIDAeBgNVBAMTF0RpZ2lDZXJ0IEdsb2JhbCBSb290IEcyMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuzfNNNx7a8myaJCtSnX/RrohCgiN9RlUyfuI2/Ou8jqJkTx65qsGGmvPrC3oXgkkRLpimn7Wo6h+4FR1IAWsULecYxpsMNzaHxmx1x7e/dfgy5SDN67sH0NO3Xss0r0upS/kqbitOtSZpLYl6ZtrAGCSYP9PIUkY92eQq2EGnI/yuum06ZIya7XzV+hdG82MHauVBJVJ8zUtluNJbd134/tJS7SsVQepj5WztCO7TG1F8PapspUwtP1MVYwnSlcUfIKdzXOS0xZKBgyMUNGPHgm+F6HmIcr9g+UQvIOlCsRnKPZzFBQ9RnbDhxSJITRNrw9FDKZJobq7nMWxM4MphQIDAQABo0IwQDAPBgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBhjAdBgNVHQ4EFgQUTiJUIBiV5uNu5g/6+rkS7QYXjzkwDQYJKoZIhvcNAQELBQADggEBAGBnKJRvDkhj6zHd6mcY1Yl9PMCcit6E7qHvvKMWtoqdObzeyMhVQGBn1UE+oN0rK9K25yt7rQ0SHFrWTRMFNRIJjKmFGCfP8OOWZ0VZvAn0vjx6OTl4F+Cj1d7oLZQ4S/d3Vb4j8Ue5dfZzQ3PPf3hgRKgQo+3lL/FZMhP2v7lYDfNTmFmNwzwMF85cVaT8NhVmQbcMbDHfNSomCAYQvZAMbQr5lQpzMqY6G4GYPspJ0xCB/kV4QCbQT2VKWDhYmNvNmTz0Aruk4G2K4Qcp1yTk8BbGZqT+G9fBHhIHbJGREHj31nlyL8C0IBe/9fMNJXHOA5MT+nxG0LH0pFXbfE=';

/**
 * Decode base64 to Uint8Array.
 * Uses a simple, reliable implementation that works in all environments.
 */
function base64ToBytes(base64: string): Uint8Array {
  // Remove whitespace and normalize
  let str = base64.replace(/\s/g, '');

  // Add padding if needed
  while (str.length % 4 !== 0) {
    str += '=';
  }

  // Use built-in decoding where available
  if (typeof globalThis.Buffer !== 'undefined') {
    // Node.js
    return new Uint8Array(globalThis.Buffer.from(str, 'base64'));
  }

  // Browser - use atob with proper binary conversion
  const binaryStr = atob(str);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

/**
 * Parse base64-encoded DER certificate to pkijs Certificate
 */
function parseBase64Certificate(base64: string): pkijs.Certificate {
  const der = base64ToBytes(base64);
  const asn1 = asn1js.fromBER(new Uint8Array(der).buffer);
  if (asn1.offset === -1) {
    throw new Error('Failed to parse certificate ASN.1');
  }
  return new pkijs.Certificate({ schema: asn1.result });
}

/**
 * Result of Azure IMDS attestation verification
 */
export interface AzureImdsVerificationResult {
  valid: boolean;
  error?: string;
  signedContent?: Uint8Array;
  signerCertificate?: pkijs.Certificate;
}

/**
 * Decode base64 with support for various formats Azure IMDS may return.
 * Azure IMDS may return standard base64, URL-safe base64, or base64 with line breaks.
 * Uses native browser/Node.js base64 decoding which is more lenient than libsodium.
 */
function decodeAzureBase64(input: string): Uint8Array {
  // Log first 100 chars for debugging
  console.log('[Azure IMDS] Base64 input preview:', input.substring(0, 100));
  console.log('[Azure IMDS] Base64 input length:', input.length);

  // Remove any whitespace/line breaks that Azure may include
  let cleaned = input.replace(/\s/g, '');

  // Convert URL-safe base64 to standard base64 if needed
  cleaned = cleaned.replace(/-/g, '+').replace(/_/g, '/');

  // Remove any characters that aren't valid base64
  // Valid base64 chars: A-Z, a-z, 0-9, +, /, =
  const invalidChars = cleaned.match(/[^A-Za-z0-9+/=]/g);
  if (invalidChars) {
    console.warn('[Azure IMDS] Found invalid base64 characters:', [...new Set(invalidChars)].join(''));
    cleaned = cleaned.replace(/[^A-Za-z0-9+/=]/g, '');
  }

  // Add padding if missing
  while (cleaned.length % 4 !== 0) {
    cleaned += '=';
  }

  console.log('[Azure IMDS] Cleaned base64 length:', cleaned.length);

  try {
    return base64ToBytes(cleaned);
  } catch (e) {
    // Log more details on failure
    console.error('[Azure IMDS] Base64 decode failed. First 200 chars of cleaned input:', cleaned.substring(0, 200));
    throw e;
  }
}

/**
 * Verify Azure IMDS PKCS7 attestation signature.
 *
 * @param rawQuoteBase64 - Base64-encoded PKCS7 signed data from Azure IMDS
 * @returns Verification result with signed content if valid
 */
export async function verifyAzureImdsPkcs7Signature(
  rawQuoteBase64: string
): Promise<AzureImdsVerificationResult> {
  try {
    // Set up crypto engine for pkijs
    const crypto = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
    const cryptoEngine = new pkijs.CryptoEngine({
      name: 'WebCrypto',
      crypto: crypto as Crypto,
    });
    pkijs.setEngine('WebCrypto', crypto as Crypto, cryptoEngine);

    // Parse the PKCS7 signed data (handle various Azure base64 formats)
    let pkcs7Der: Uint8Array;
    try {
      pkcs7Der = decodeAzureBase64(rawQuoteBase64);
    } catch (e) {
      return { valid: false, error: `Failed to decode base64: ${e instanceof Error ? e.message : 'unknown error'}` };
    }
    const asn1 = asn1js.fromBER(new Uint8Array(pkcs7Der).buffer);
    if (asn1.offset === -1) {
      return { valid: false, error: 'Failed to parse PKCS7 ASN.1 structure' };
    }

    // Parse as ContentInfo (PKCS7 wrapper)
    const contentInfo = new pkijs.ContentInfo({ schema: asn1.result });

    // Verify it's signed data
    if (contentInfo.contentType !== '1.2.840.113549.1.7.2') {
      return { valid: false, error: 'PKCS7 content is not SignedData' };
    }

    // Parse the SignedData
    const signedData = new pkijs.SignedData({ schema: contentInfo.content });

    // Get the embedded certificates
    if (!signedData.certificates || signedData.certificates.length === 0) {
      return { valid: false, error: 'No certificates found in PKCS7' };
    }

    // Parse the trusted root certificate
    const trustedRoot = parseBase64Certificate(MICROSOFT_ROOT_CERT_BASE64);

    // Build certificate chain and find signer
    const certificates = signedData.certificates.filter(
      (cert): cert is pkijs.Certificate => cert instanceof pkijs.Certificate
    );

    // Verify the signature
    const verificationResult = await signedData.verify({
      signer: 0, // Verify first signer
      trustedCerts: [trustedRoot],
      checkChain: true,
      checkDate: new Date(),
    });

    if (!verificationResult) {
      return { valid: false, error: 'PKCS7 signature verification failed' };
    }

    // Extract the signed content
    let signedContent: Uint8Array | undefined;
    if (signedData.encapContentInfo?.eContent) {
      const contentAsn1 = signedData.encapContentInfo.eContent;
      if (contentAsn1 instanceof asn1js.OctetString) {
        signedContent = new Uint8Array(contentAsn1.valueBlock.valueHexView);
      }
    }

    return {
      valid: true,
      signedContent,
      signerCertificate: certificates[0],
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'PKCS7 verification error',
    };
  }
}

/**
 * Extract attestation claims from verified PKCS7 content.
 * The content is JSON with the attestation report.
 */
export function parseAzureAttestationClaims(signedContent: Uint8Array): Record<string, unknown> | null {
  try {
    const decoder = new TextDecoder();
    const json = decoder.decode(signedContent);
    return JSON.parse(json);
  } catch {
    return null;
  }
}
