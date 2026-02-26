/**
 * Enclave Session Hook
 * Manages enclave lifecycle (request/release/heartbeat) and eager attestation.
 * Runs at layout level so trust UI works on all pages.
 */

import { useEffect, useRef } from 'react';
import { useE2EE } from '@/providers/E2EEProvider';
import { useModelStore } from '@/stores/modelStore';
import {
  clearPrivateInferenceCache,
  isPrivateModel,
  parseModelId,
  setEnclaveConfigForTasks,
  type EnclaveConfig,
} from '@/lib/ai';
import { trpc } from '@/lib/trpc';
import { useAttestationStore } from '@/stores/attestationStore';
import {
  fetchAndVerifyAttestation,
  type VerificationOptions,
} from '@onera/crypto/attestation';

/**
 * Eagerly verify attestation and populate the attestation store.
 * This runs as soon as enclave config is available (before any messages are sent).
 */
async function verifyAttestationEagerly(config: EnclaveConfig): Promise<void> {
  try {
    const options: VerificationOptions = {
      knownMeasurements: config.expectedMeasurements,
      allowUnverified: config.allowUnverified ?? false,
    };

    const result = await fetchAndVerifyAttestation(
      config.attestationEndpoint,
      options,
    );

    if (result.valid && result.quote) {
      useAttestationStore.getState().setVerified(result.quote);
    } else if (config.allowUnverified) {
      useAttestationStore.getState().setUnverified();
    } else {
      useAttestationStore.getState().setError();
    }
  } catch (err) {
    console.error('Eager attestation verification failed:', err);
    useAttestationStore.getState().setError();
  }
}

/**
 * Hook that manages the enclave lifecycle at a layout level.
 * Watches the selected model and E2EE state, requests/releases enclaves,
 * and triggers eager attestation verification.
 */
export function useEnclaveSession(): void {
  const { isUnlocked } = useE2EE();
  const selectedModelId = useModelStore((s) => s.selectedModelId);

  // tRPC mutations for enclave lifecycle
  const requestEnclaveMutation = trpc.enclaves.requestEnclave.useMutation();
  const releaseEnclaveMutation = trpc.enclaves.releaseEnclave.useMutation();
  const heartbeatMutation = trpc.enclaves.heartbeat.useMutation();

  // Stable refs to avoid stale closures
  const requestMutationRef = useRef(requestEnclaveMutation);
  const releaseMutationRef = useRef(releaseEnclaveMutation);
  const heartbeatMutationRef = useRef(heartbeatMutation);
  useEffect(() => {
    requestMutationRef.current = requestEnclaveMutation;
    releaseMutationRef.current = releaseEnclaveMutation;
    heartbeatMutationRef.current = heartbeatMutation;
  });

  // Enclave lifecycle refs
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enclaveAssignmentIdRef = useRef<string | null>(null);
  const activeEnclaveModelIdRef = useRef<string | null>(null);
  const requestInFlightRef = useRef(false);
  const lastFailureRef = useRef<{ modelId: string; at: number } | null>(null);

  // Request enclave when a private model is selected
  useEffect(() => {
    const releaseCurrentEnclave = () => {
      const currentAssignmentId = enclaveAssignmentIdRef.current;
      if (currentAssignmentId) {
        releaseMutationRef.current.mutate({ assignmentId: currentAssignmentId });
      }
      enclaveAssignmentIdRef.current = null;
      activeEnclaveModelIdRef.current = null;
      setEnclaveConfigForTasks(null);
      useAttestationStore.getState().clear();
      clearPrivateInferenceCache();
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };

    if (!selectedModelId || !isUnlocked) {
      releaseCurrentEnclave();
      return;
    }

    const isPrivate = isPrivateModel(selectedModelId);

    if (!isPrivate) {
      releaseCurrentEnclave();
      return;
    }

    // Already connected for this model
    if (activeEnclaveModelIdRef.current === selectedModelId && enclaveAssignmentIdRef.current) {
      return;
    }

    // Switching private models: release old enclave first
    if (
      activeEnclaveModelIdRef.current &&
      activeEnclaveModelIdRef.current !== selectedModelId
    ) {
      releaseCurrentEnclave();
    }

    // Prevent duplicate in-flight requests and tight retry loops on 5xx
    if (requestInFlightRef.current) {
      return;
    }
    if (
      lastFailureRef.current &&
      lastFailureRef.current.modelId === selectedModelId &&
      Date.now() - lastFailureRef.current.at < 10_000
    ) {
      return;
    }

    const { modelName } = parseModelId(selectedModelId);
    const sessionId = crypto.randomUUID();
    requestInFlightRef.current = true;

    useAttestationStore.getState().setConnecting();

    requestMutationRef.current.mutate(
      { modelId: modelName, tier: 'shared', sessionId },
      {
        onSuccess: (data) => {
          const config: EnclaveConfig = {
            endpoint: data.endpoint,
            wsEndpoint: data.wsEndpoint,
            attestationEndpoint: data.attestationEndpoint,
            expectedMeasurements: data.expectedMeasurements,
            allowUnverified: data.allowUnverified,
          };
          activeEnclaveModelIdRef.current = selectedModelId;
          lastFailureRef.current = null;
          enclaveAssignmentIdRef.current = data.assignmentId;
          setEnclaveConfigForTasks(config);

          // Store config globally so useDirectChat and other consumers can access it
          useAttestationStore.getState().setEnclaveConfig(config);

          // Eagerly verify attestation — populates trust badge immediately
          verifyAttestationEagerly(config);

          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
          }
          heartbeatIntervalRef.current = setInterval(() => {
            const assignmentId = enclaveAssignmentIdRef.current;
            if (assignmentId) {
              heartbeatMutationRef.current.mutate({ assignmentId });
            }
          }, 30000);
        },
        onError: (error) => {
          lastFailureRef.current = { modelId: selectedModelId, at: Date.now() };
          console.error('Failed to request enclave:', error);
          useAttestationStore.getState().setError();
        },
        onSettled: () => {
          requestInFlightRef.current = false;
        },
      },
    );

    // Cleanup heartbeat on dependency change
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [isUnlocked, selectedModelId]);

  // Cleanup enclave on unmount
  useEffect(() => {
    return () => {
      const assignmentId = enclaveAssignmentIdRef.current;
      if (assignmentId) {
        releaseMutationRef.current.mutate({ assignmentId });
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      useAttestationStore.getState().clear();
    };
  }, []);
}
