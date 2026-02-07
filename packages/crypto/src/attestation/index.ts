export { parseSevSnpQuote, verifyPublicKeyBinding } from './sevsnp';
export {
  verifyAttestation,
  fetchAndVerifyAttestation,
  verifyAttestationLegacy,
} from './verify';
export type { VerificationResult, KnownMeasurements, VerificationOptions } from './verify';

// Azure IMDS verification
export { verifyAzureImdsPkcs7Signature, parseAzureAttestationClaims } from './azure-imds';
export type { AzureImdsVerificationResult } from './azure-imds';

// SEV-SNP signature verification
export {
  verifySevSnpSignature,
  fetchVcekCertificate,
  extractVcekLookupParams,
  AMD_ARK_MILAN_PEM,
} from './sevsnp-verify';
export type { SevSnpSignatureResult } from './sevsnp-verify';

// Transparency log (Sigstore Rekor)
export { queryTransparencyLog, publishToTransparencyLog } from './transparency-log';
export type { TransparencyLogEntry, TransparencyLogVerification } from './transparency-log';
