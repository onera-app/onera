/**
 * Enhanced Model Selector with fuzzy search, pinning, and filtering
 *
 * Re-exports the feature-based implementation for backward compatibility
 */
import { ModelSelectorDropdown } from '@/features/model-selector/components/ModelSelectorDropdown';

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return <ModelSelectorDropdown value={value} onChange={onChange} />;
}
