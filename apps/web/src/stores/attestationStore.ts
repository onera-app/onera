import { create } from 'zustand';
import type { AttestationQuote } from '@onera/types';

export type EnclaveStatus = 'none' | 'connecting' | 'verified' | 'unverified' | 'error';

export interface AttestationDetails {
  verifiedAt: number;
  launchDigest: string;
  reportDataHash: string;
  vmpl: number;
  familyId: string;
  imageId: string;
  publicKeyFingerprint: string;
}

export interface TransparencyLogDetails {
  logIndex: number;
  buildManifestHash: string;
  verifiedAt: number;
}

interface AttestationState {
  enclaveStatus: EnclaveStatus;
  attestation: AttestationDetails | null;
  transparencyLog: TransparencyLogDetails | null;

  setVerified: (quote: AttestationQuote) => void;
  setUnverified: () => void;
  setConnecting: () => void;
  setError: () => void;
  clear: () => void;
}

function extractFingerprint(publicKeyBase64: string): string {
  return publicKeyBase64.slice(0, 16);
}

function extractDetails(quote: AttestationQuote): AttestationDetails {
  const m = quote.measurements;
  return {
    verifiedAt: quote.timestamp,
    launchDigest: m.launch_digest,
    reportDataHash: m.report_data,
    vmpl: m.vmpl,
    familyId: m.family_id,
    imageId: m.image_id,
    publicKeyFingerprint: extractFingerprint(quote.public_key),
  };
}

export const useAttestationStore = create<AttestationState>((set) => ({
  enclaveStatus: 'none',
  attestation: null,
  transparencyLog: null,

  setVerified: (quote) =>
    set({
      enclaveStatus: 'verified',
      attestation: extractDetails(quote),
    }),

  setUnverified: () =>
    set({
      enclaveStatus: 'unverified',
      attestation: null,
    }),

  setConnecting: () =>
    set({
      enclaveStatus: 'connecting',
    }),

  setError: () =>
    set({
      enclaveStatus: 'error',
      attestation: null,
    }),

  clear: () =>
    set({
      enclaveStatus: 'none',
      attestation: null,
      transparencyLog: null,
    }),
}));
