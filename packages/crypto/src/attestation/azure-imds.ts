/**
 * Azure IMDS Attestation Verification
 *
 * Verifies PKCS7-signed attestation documents from Azure Instance Metadata Service.
 * The attestation proves the code is running on an Azure Confidential VM.
 */

import * as pkijs from 'pkijs';
import * as asn1js from 'asn1js';
import { fromBase64 } from '../sodium/utils';

// Microsoft Azure Attestation root certificate (DigiCert Global Root G2)
// This is the trust anchor for Azure attestation documents
// Certificate valid until: 2038-01-15
const MICROSOFT_ROOT_CERT_PEM = `-----BEGIN CERTIFICATE-----
MIIDjjCCAnagAwIBAgIQAzrx5qcRqaC7KGSxHQn65TANBgkqhkiG9w0BAQsFADBh
MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3
d3cuZGlnaWNlcnQuY29tMSAwHgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBH
MjAeFw0xMzA4MDExMjAwMDBaFw0zODAxMTUxMjAwMDBaMGExCzAJBgNVBAYTAlVT
MRUwEwYDVQQKEwxEaWdpQ2VydCBJbmMxGTAXBgNVBAsTEHd3dy5kaWdpY2VydC5j
b20xIDAeBgNVBAMTF0RpZ2lDZXJ0IEdsb2JhbCBSb290IEcyMIIBIjANBgkqhkiG
9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuzfNNNx7a8myaJCtSnX/RrohCgiN9RlUyfuI
2/Ou8jqJkTx65qsGGmvPrC3oXgkkRLpimn7Wo6h+4FR1IAWsULecYxpsMNzaHxmx
1x7e/dfgy5SDN67sH0NO3Xss0r0upS/kqbitOtSZpLYl6ZtrAGCSYP9PIUkY92eQ
q2EGnI/yuum06ZIya7XzV+hdG82MHauVBJVJ8zUtluNJbd134/tJS7SsVQepj5Wz
tCO7TG1F8PapspUwtP1MVYwnSlcUfIKdzXOS0xZKBgyMUNGPHgm+F6HmIcr9g+UQ
vIOlCsRnKPZzFBQ9RnbDhxSJITRNrw9FDKZJobq7nMWxM4MphQIDAQABo0IwQDAP
BgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBhjAdBgNVHQ4EFgQUTiJUIBiV
5uNu5g/6+rkS7QYXjzkwDQYJKoZIhvcNAQELBQADggEBAGBnKJRvDkhj6zHd6mcY
1Yl9PMCcit6E7qHvvKMWtoqdObzeyMhVQGBn1UE+oN0rK9K25yt7rQ0SHFrWTRMF
NRIJjKmFGCfP8OOWZ0VZvAn0vjx6OTl4F+Cj1d7oLZQ4S/d3Vb4j8Ue5dfZzQ3P
Pf3hgRKgQo+3lL/FZMhP2v7lYDfNTmFmNwzwMF85cVaT8NhVmQbcMbDHfNSomCAY
QvZAMbQr5lQpzMqY6G4GYPspJ0xCB/kV4QCbQT2VKWDhYmNvNmTz0Aruk4G2K4Qc
p1yTk8BbGZqT+G9fBHhIHbJGREHj31nlyL8C0IBe/9fMNJXHOA5MT+nxG0LH0pFX
bfE=
-----END CERTIFICATE-----`;

/**
 * Parse PEM certificate to pkijs Certificate
 */
function parsePemCertificate(pem: string): pkijs.Certificate {
  const b64 = pem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s/g, '');
  const der = fromBase64(b64);
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
  // Remove any whitespace/line breaks that Azure may include
  let cleaned = input.replace(/\s/g, '');

  // Convert URL-safe base64 to standard base64 if needed
  cleaned = cleaned.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if missing
  while (cleaned.length % 4 !== 0) {
    cleaned += '=';
  }

  // Use native base64 decoding (more lenient than libsodium)
  // Works in both browser (atob) and Node.js (Buffer)
  if (typeof atob === 'function') {
    // Browser environment
    const binaryString = atob(cleaned);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } else {
    // Node.js environment
    return new Uint8Array(Buffer.from(cleaned, 'base64'));
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
    console.log('[Azure IMDS] Starting PKCS7 verification');
    console.log('[Azure IMDS] Input length:', rawQuoteBase64?.length);
    console.log('[Azure IMDS] Input preview:', rawQuoteBase64?.substring(0, 100));

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
      console.log('[Azure IMDS] Decoding base64 with native atob...');
      pkcs7Der = decodeAzureBase64(rawQuoteBase64);
      console.log('[Azure IMDS] Base64 decode success, bytes:', pkcs7Der.length);
    } catch (e) {
      console.error('[Azure IMDS] Base64 decode failed:', e);
      return { valid: false, error: `Failed to decode base64: ${e instanceof Error ? e.message : 'unknown error'}` };
    }
    const asn1 = asn1js.fromBER(new Uint8Array(pkcs7Der).buffer);
    if (asn1.offset === -1) {
      return { valid: false, error: 'Failed to parse PKCS7 ASN.1 structure' };
    }
    console.log('[Azure IMDS] ASN.1 parse success');

    // Parse as ContentInfo (PKCS7 wrapper)
    const contentInfo = new pkijs.ContentInfo({ schema: asn1.result });
    console.log('[Azure IMDS] ContentInfo parsed, type:', contentInfo.contentType);

    // Verify it's signed data
    if (contentInfo.contentType !== '1.2.840.113549.1.7.2') {
      return { valid: false, error: 'PKCS7 content is not SignedData' };
    }

    // Parse the SignedData
    const signedData = new pkijs.SignedData({ schema: contentInfo.content });
    console.log('[Azure IMDS] SignedData parsed, certs:', signedData.certificates?.length);

    // Get the embedded certificates
    if (!signedData.certificates || signedData.certificates.length === 0) {
      return { valid: false, error: 'No certificates found in PKCS7' };
    }

    // Parse the trusted root certificate
    console.log('[Azure IMDS] Parsing trusted root certificate...');
    const trustedRoot = parsePemCertificate(MICROSOFT_ROOT_CERT_PEM);
    console.log('[Azure IMDS] Trusted root parsed successfully');

    // Build certificate chain and find signer
    const certificates = signedData.certificates.filter(
      (cert): cert is pkijs.Certificate => cert instanceof pkijs.Certificate
    );
    console.log('[Azure IMDS] Filtered certificates:', certificates.length);

    // Verify the signature
    console.log('[Azure IMDS] Starting signature verification...');
    const verificationResult = await signedData.verify({
      signer: 0, // Verify first signer
      trustedCerts: [trustedRoot],
      checkChain: true,
      checkDate: new Date(),
    });
    console.log('[Azure IMDS] Signature verification result:', verificationResult);

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
    console.error('[Azure IMDS] Verification error:', error);
    if (error instanceof Error) {
      console.error('[Azure IMDS] Error stack:', error.stack);
    }
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
