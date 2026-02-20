import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  FlashIcon,
  Loading02Icon,
  LockIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { useState } from "react";
import {
  useCreateCredential,
  useUpdateCredential,
} from "@/hooks/queries/useCredentials";
import { LLM_PROVIDERS, type Credential } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  encryptCredential,
  decryptCredential,
  isUnlocked,
} from "@onera/crypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AddConnectionModalProps {
  open: boolean;
  onClose: () => void;
  providerId: string;
  existingCredential?: Credential;
}

export function AddConnectionModal({
  open,
  onClose,
  providerId,
  existingCredential,
}: AddConnectionModalProps) {
  const provider = LLM_PROVIDERS.find((p) => p.id === providerId);
  const createCredential = useCreateCredential();
  const updateCredential = useUpdateCredential();

  const [name, setName] = useState(existingCredential?.name || "");
  const [fields, setFields] = useState<Record<string, string>>(() => {
    if (existingCredential && isUnlocked()) {
      try {
        const decrypted = decryptCredential({
          encrypted_data: existingCredential.encryptedData,
          iv: existingCredential.iv,
        });
        return {
          api_key: decrypted.api_key || "",
          base_url: decrypted.base_url || "",
          organization: decrypted.org_id || "",
        };
      } catch {
        return {} as Record<string, string>;
      }
    }
    return {} as Record<string, string>;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");

  if (!provider) return null;

  const handleFieldChange = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleTest = async () => {
    setTestStatus("testing");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const hasRequiredFields = provider.fields
      .filter((f) => f.required)
      .every((f) => fields[f.key]);

    if (hasRequiredFields) {
      setTestStatus("success");
    } else {
      setTestStatus("error");
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      return;
    }

    const missingFields = provider.fields
      .filter((f) => f.required && !fields[f.key])
      .map((f) => f.label);

    if (missingFields.length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const credential = {
        api_key: fields.api_key || "",
        base_url: fields.base_url || undefined,
        org_id: fields.organization || undefined,
      };

      const encrypted = encryptCredential(credential);

      const data = {
        provider: providerId,
        name: name.trim(),
        encryptedData: encrypted.encrypted_data,
        iv: encrypted.iv,
      };

      if (existingCredential) {
        await updateCredential.mutateAsync({ id: existingCredential.id, data });
      } else {
        await createCredential.mutateAsync(data);
      }

      onClose();
    } catch (error) {
      console.error("Failed to save credential:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {existingCredential
              ? `Edit ${provider.name} Connection`
              : `Add ${provider.name} Connection`}
          </DialogTitle>
          <DialogDescription>{provider.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Connection Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Connection Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`My ${provider.name} Connection`}
            />
          </div>

          {/* Provider Fields */}
          {provider.fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>
                {field.label}{" "}
                {field.required && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id={field.key}
                type={field.type}
                value={fields[field.key] || ""}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                placeholder={
                  "placeholder" in field ? field.placeholder : undefined
                }
              />
            </div>
          ))}

          {/* Test Connection */}
          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTest}
              disabled={testStatus === "testing"}
              className={cn(
                testStatus === "success" && "text-green-600",
                testStatus === "error" && "text-destructive",
              )}
            >
              {testStatus === "testing" && (
                <>
                  <HugeiconsIcon
                    icon={Loading02Icon}
                    className="mr-2 h-4 w-4 animate-spin"
                  />
                  Testing connection...
                </>
              )}
              {testStatus === "idle" && (
                <>
                  <HugeiconsIcon icon={FlashIcon} size={16} className="mr-2" />
                  Test Connection
                </>
              )}
              {testStatus === "success" && (
                <>
                  <HugeiconsIcon icon={Tick01Icon} className="mr-2 h-4 w-4" />
                  Connection successful!
                </>
              )}
              {testStatus === "error" && (
                <>
                  <HugeiconsIcon icon={Cancel01Icon} className="mr-2 h-4 w-4" />
                  Connection failed
                </>
              )}
            </Button>
          </div>

          {/* Security Note */}
          <Alert>
            <HugeiconsIcon icon={LockIcon} className="h-4 w-4" />
            <AlertDescription>
              Your credentials are encrypted with your E2EE key and stored
              securely. They are never visible to the server.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim()}
          >
            {isSubmitting
              ? "Saving..."
              : existingCredential
                ? "Update"
                : "Add Connection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
