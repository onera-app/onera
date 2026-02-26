import { memo, useCallback, useEffect, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SecurityCheckIcon, Alert01Icon, Key01Icon, Copy01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { useE2EEStore } from "@/stores/e2eeStore";
import { useAttestationStore } from "@/stores/attestationStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TrustDetailPanelProps {
  onClose: () => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

function CopyableHash({ label, value }: { label: string; value: string }) {
  const truncated = value.length > 24 ? `${value.slice(0, 12)}...${value.slice(-12)}` : value;

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard');
  }, [value]);

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide shrink-0">
        {label}
      </span>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 text-[11px] font-mono text-gray-300 dark:text-gray-500 hover:text-gray-100 dark:hover:text-gray-300 transition-colors"
        title="Copy to clipboard"
      >
        <span>{truncated}</span>
        <HugeiconsIcon icon={Copy01Icon} className="h-2.5 w-2.5 shrink-0" />
      </button>
    </div>
  );
}

export const TrustDetailPanel = memo(function TrustDetailPanel({
  onClose,
  containerRef,
}: TrustDetailPanelProps) {
  const e2eeStatus = useE2EEStore((s) => s.status);
  const enclaveStatus = useAttestationStore((s) => s.enclaveStatus);
  const attestation = useAttestationStore((s) => s.attestation);
  const transparencyLog = useAttestationStore((s) => s.transparencyLog);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      // Check if click is inside the panel or the parent container (includes toggle button)
      if (panelRef.current?.contains(target)) return;
      if (containerRef?.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, containerRef]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const isVerified = enclaveStatus === 'verified';
  const isUnverified = enclaveStatus === 'unverified';
  const hasEnclave = isVerified || isUnverified;

  return (
    <div
      ref={panelRef}
      className={cn(
        "absolute top-full left-0 mt-2 z-50 w-72 sm:w-80",
        "bg-gray-900/95 dark:bg-gray-950/95 backdrop-blur-xl",
        "border border-gray-700/50 dark:border-gray-800/50 rounded-xl shadow-2xl",
        "animate-in fade-in slide-in-from-top-2 duration-200",
        "p-4 space-y-3",
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-200 dark:text-gray-300 uppercase tracking-wide">
          Security Details
        </h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          <HugeiconsIcon icon={Cancel01Icon} className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={SecurityCheckIcon}
            className={cn("h-3.5 w-3.5", e2eeStatus === 'unlocked' ? "text-green-400" : "text-gray-500")}
          />
          <span className="text-[11px] font-medium text-gray-200 dark:text-gray-300">
            End-to-End Encryption
          </span>
          <span className={cn(
            "text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full",
            e2eeStatus === 'unlocked'
              ? "bg-green-500/15 text-green-400"
              : "bg-gray-500/15 text-gray-500"
          )}>
            {e2eeStatus === 'unlocked' ? 'Active' : 'Locked'}
          </span>
        </div>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 pl-[22px]">
          XChaCha20-Poly1305 · All data encrypted client-side
        </p>
      </div>

      <div className="border-t border-gray-700/30 dark:border-gray-800/30" />

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={hasEnclave ? (isVerified ? SecurityCheckIcon : Alert01Icon) : Key01Icon}
            className={cn(
              "h-3.5 w-3.5",
              isVerified ? "text-green-400" : isUnverified ? "text-amber-400" : "text-gray-500"
            )}
          />
          <span className="text-[11px] font-medium text-gray-200 dark:text-gray-300">
            Server Attestation
          </span>
          <span className={cn(
            "text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full",
            isVerified ? "bg-green-500/15 text-green-400"
              : isUnverified ? "bg-amber-500/15 text-amber-400"
              : "bg-gray-500/15 text-gray-500"
          )}>
            {isVerified ? 'Verified' : isUnverified ? 'Unverified' : 'N/A'}
          </span>
        </div>

        {hasEnclave && (
          <p className="text-[10px] text-gray-500 dark:text-gray-400 pl-[22px]">
            {isVerified
              ? 'AMD SEV-SNP · Noise NK (ChaCha20-Poly1305)'
              : 'Attestation could not be verified'}
          </p>
        )}

        {!hasEnclave && (
          <p className="text-[10px] text-gray-500 dark:text-gray-400 pl-[22px]">
            No enclave session active · Using standard API
          </p>
        )}
      </div>

      {isVerified && attestation && (
        <>
          <div className="border-t border-gray-700/30 dark:border-gray-800/30" />
          <details className="group">
            <summary className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-300 transition-colors select-none list-none flex items-center gap-1">
              <span className="group-open:rotate-90 transition-transform duration-200">▸</span>
              Attestation Proof
            </summary>
            <div className="mt-2 space-y-1.5 pl-2.5">
              <CopyableHash label="Launch Digest" value={attestation.launchDigest} />
              <CopyableHash label="Report Data" value={attestation.reportDataHash} />
              <CopyableHash label="Key Fingerprint" value={attestation.publicKeyFingerprint} />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  VMPL
                </span>
                <span className="text-[11px] font-mono text-gray-300 dark:text-gray-500">
                  {attestation.vmpl}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Verified At
                </span>
                <span className="text-[11px] font-mono text-gray-300 dark:text-gray-500">
                  {new Date(attestation.verifiedAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </details>
        </>
      )}

      {transparencyLog && (
        <>
          <div className="border-t border-gray-700/30 dark:border-gray-800/30" />
          <details className="group">
            <summary className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-300 transition-colors select-none list-none flex items-center gap-1">
              <span className="group-open:rotate-90 transition-transform duration-200">▸</span>
              Transparency Log
            </summary>
            <div className="mt-2 space-y-1.5 pl-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Log Index
                </span>
                <span className="text-[11px] font-mono text-gray-300 dark:text-gray-500">
                  #{transparencyLog.logIndex}
                </span>
              </div>
              <CopyableHash label="Build Manifest" value={transparencyLog.buildManifestHash} />
            </div>
          </details>
        </>
      )}
    </div>
  );
});
