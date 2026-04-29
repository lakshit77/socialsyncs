"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, AlertCircle } from "lucide-react";

export interface ManualCredentialField {
  /** Object key used to store the value in the credentials JSONB. */
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "password";
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  helpText: string;
  /** If true, the field must be filled before saving. Defaults to true. */
  required?: boolean;
}

export interface ManualSetupStep {
  title: string;
  detail: string;
}

export interface ManualPlatformDefinition {
  /** Lowercase platform slug (e.g. "instagram"). */
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  fields: ManualCredentialField[];
  setupGuide: ManualSetupStep[];
}

interface ManualCredentialsCardProps {
  platform: ManualPlatformDefinition;
  /** Currently saved credentials for this platform (may be masked). */
  initialCredentials: Record<string, string>;
  /** Whether a credential row already exists in the DB for this platform. */
  isConnected: boolean;
}

/**
 * Settings card for platforms that use manual long-lived token entry rather
 * than a full OAuth redirect flow (currently Instagram).
 *
 * Extracts and generalizes the credential form logic that previously lived
 * inline inside PlatformCredentialsForm.
 */
export function ManualCredentialsCard({
  platform,
  initialCredentials,
  isConnected,
}: ManualCredentialsCardProps) {
  const [credentials, setCredentials] = useState<Record<string, string>>(
    () => ({ ...initialCredentials })
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const [authReady, setAuthReady] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await supabase.auth.getSession();
        await supabase.auth.getUser();
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  function updateField(key: string, value: string): void {
    setCredentials((prev) => ({ ...prev, [key]: value }));
    if (status) setStatus(null);
  }

  async function handleSave(): Promise<void> {
    const requiredFields = platform.fields.filter((f) => f.required !== false);
    const hasMissing = requiredFields.some((f) => !credentials[f.key]?.trim());

    if (hasMissing) {
      setStatus({ type: "error", message: "All required fields must be filled before saving." });
      return;
    }

    setSaving(true);
    setStatus(null);

    await supabase.auth.getSession();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setSaving(false);
      setStatus({
        type: "error",
        message: "Your session could not be verified. Refresh the page and sign in again.",
      });
      return;
    }

    const { error } = await supabase.from("platform_credentials").upsert(
      {
        user_id: user.id,
        platform: platform.id,
        credentials,
        is_active: true,
      },
      { onConflict: "user_id,platform" }
    );

    setSaving(false);

    if (error) {
      setStatus({ type: "error", message: error.message });
    } else {
      setStatus({ type: "success", message: "Credentials saved successfully." });
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center">
              <platform.icon size={20} strokeWidth={1.8} className="text-foreground" />
            </div>
            <div>
              <CardTitle>{platform.name}</CardTitle>
              <CardDescription>{platform.description}</CardDescription>
            </div>
          </div>
          {isConnected ? (
            <Badge variant="success" className="whitespace-nowrap">Connected</Badge>
          ) : (
            <Badge variant="default" className="whitespace-nowrap">Not connected</Badge>
          )}
        </div>
      </CardHeader>

      <div className="space-y-4">
        {/* Setup guide */}
        <details className="rounded-md border border-border px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            How to get these credentials
          </summary>
          <ol className="mt-2 space-y-2 text-sm text-text-muted list-decimal list-inside">
            {platform.setupGuide.map((step) => (
              <li key={step.title}>
                <span className="text-foreground font-medium">{step.title}:</span>{" "}
                {step.detail}
              </li>
            ))}
          </ol>
        </details>

        {/* Credential fields */}
        {platform.fields.map((field) => (
          <div key={field.key}>
            <Input
              id={`${platform.id}-${field.key}`}
              label={field.label}
              type={field.type}
              placeholder={field.placeholder}
              icon={field.icon}
              value={credentials[field.key] ?? ""}
              onChange={(e) => updateField(field.key, e.target.value)}
            />
            <p className="mt-1 text-xs text-text-muted">{field.helpText}</p>
          </div>
        ))}

        {/* Status feedback */}
        {status && (
          <div
            className={`flex items-center gap-2 text-sm ${
              status.type === "success" ? "text-success" : "text-error"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle size={14} strokeWidth={1.8} />
            ) : (
              <AlertCircle size={14} strokeWidth={1.8} />
            )}
            {status.message}
          </div>
        )}

        <Button onClick={handleSave} loading={saving || !authReady}>
          {isConnected ? "Update Credentials" : "Save Credentials"}
        </Button>
      </div>
    </Card>
  );
}
