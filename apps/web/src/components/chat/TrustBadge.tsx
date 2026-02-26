import { memo, useState, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SecurityCheckIcon, Alert01Icon, Shield01Icon } from "@hugeicons/core-free-icons";
import { useE2EEStore } from "@/stores/e2eeStore";
import { useAttestationStore, type EnclaveStatus } from "@/stores/attestationStore";
import { cn } from "@/lib/utils";
import { TrustDetailPanel } from "./TrustDetailPanel";

function getBadgeConfig(e2eeStatus: string, enclaveStatus: EnclaveStatus) {
  if (e2eeStatus !== 'unlocked') return null;

  switch (enclaveStatus) {
    case 'verified':
      return {
        icon: SecurityCheckIcon,
        label: 'Private Enclave · Verified',
        color: 'text-green-500 dark:text-green-400',
        bgColor: 'bg-green-500/10 dark:bg-green-400/10 border-green-500/20 dark:border-green-400/20',
      };
    case 'unverified':
      return {
        icon: Alert01Icon,
        label: 'Enclave Unverified',
        color: 'text-amber-500 dark:text-amber-400',
        bgColor: 'bg-amber-500/10 dark:bg-amber-400/10 border-amber-500/20 dark:border-amber-400/20',
      };
    case 'connecting':
      return {
        icon: Shield01Icon,
        label: 'Connecting...',
        color: 'text-gray-400 dark:text-gray-500',
        bgColor: 'bg-gray-500/10 dark:bg-gray-400/10 border-gray-500/20 dark:border-gray-400/20',
      };
    default:
      return {
        icon: Shield01Icon,
        label: 'E2E Encrypted',
        color: 'text-green-500 dark:text-green-400',
        bgColor: 'bg-green-500/10 dark:bg-green-400/10 border-green-500/20 dark:border-green-400/20',
      };
  }
}

export const TrustBadge = memo(function TrustBadge() {
  const e2eeStatus = useE2EEStore((s) => s.status);
  const enclaveStatus = useAttestationStore((s) => s.enclaveStatus);
  const [isOpen, setIsOpen] = useState(false);

  const togglePanel = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const config = getBadgeConfig(e2eeStatus, enclaveStatus);
  if (!config) return null;

  return (
    <div className="relative">
      <button
        onClick={togglePanel}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border transition-all duration-200",
          "hover:opacity-80 active:scale-[0.97]",
          config.bgColor,
          config.color,
        )}
      >
        <HugeiconsIcon icon={config.icon} className="h-3 w-3" />
        <span className="hidden sm:inline">{config.label}</span>
      </button>

      {isOpen && (
        <TrustDetailPanel onClose={() => setIsOpen(false)} />
      )}
    </div>
  );
});
