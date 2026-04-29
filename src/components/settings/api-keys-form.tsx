"use client";

import { useState, useEffect } from "react";
import { ExternalLink, KeyRound, Cpu, CheckCircle, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

interface ApiKeyConfig {
  id: string;
  name: string;
  description: string;
  docsUrl: string;
  envKey: string;
  placeholder: string;
  helpText: string;
}

const API_KEY_CONFIGS: ApiKeyConfig[] = [
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Powers AI comment filtering and reply generation for YouTube automation",
    docsUrl: "https://openrouter.ai/keys",
    envKey: "OPENROUTER_API_KEY",
    placeholder: "sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    helpText: "Get your API key from openrouter.ai/keys — used for Claude-powered reply generation",
  },
];

interface ApiKeysFormProps {
  /** Whether the key is already configured for the authenticated user. */
  initialConfigured: Record<string, boolean>;
}

/**
 * Manages infrastructure API keys (OpenRouter etc.) stored in platform_credentials.
 */
export function ApiKeysForm({ initialConfigured }: ApiKeysFormProps) {
  const supabase = createClient();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const config of API_KEY_CONFIGS) {
      initial[config.id] = "";
    }
    return initial;
  });

  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [configured, setConfigured] = useState<Record<string, boolean>>(initialConfigured);
  const [status, setStatus] = useState<Record<string, string>>({});
  const [error, setError] = useState<Record<string, string>>({});

  useEffect(() => {
    setConfigured(initialConfigured);
  }, [initialConfigured]);

  function handleChange(id: string, value: string): void {
    setValues((prev) => ({
      ...prev,
      [id]: value,
    }));
    setError((prev) => ({ ...prev, [id]: "" }));
    setStatus((prev) => ({ ...prev, [id]: "" }));
  }

  async function handleSave(id: string): Promise<void> {
    const value = values[id];
    if (!value?.trim()) {
      setError((prev) => ({ ...prev, [id]: "API key cannot be empty" }));
      return;
    }

    setSaving((prev) => ({ ...prev, [id]: true }));
    setStatus((prev) => ({ ...prev, [id]: "" }));

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setSaving((prev) => ({ ...prev, [id]: false }));
      setError((prev) => ({ ...prev, [id]: "Session not found. Please sign in again." }));
      return;
    }

    const { error: saveError } = await supabase.from("platform_credentials").upsert(
      {
        user_id: user.id,
        platform: id,
        credentials: { api_key: value.trim() },
        is_active: true,
      },
      { onConflict: "user_id,platform" }
    );

    setSaving((prev) => ({ ...prev, [id]: false }));
    if (saveError) {
      setError((prev) => ({ ...prev, [id]: saveError.message }));
      return;
    }

    setConfigured((prev) => ({ ...prev, [id]: true }));
    setStatus((prev) => ({ ...prev, [id]: "Saved to platform credentials." }));
    setError((prev) => ({ ...prev, [id]: "" }));
    setValues((prev) => ({ ...prev, [id]: "" }));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 flex gap-3 items-start">
        <AlertCircle size={15} strokeWidth={1.8} className="text-warning mt-0.5 shrink-0" />
        <p className="text-sm text-text-muted leading-relaxed">
          Saved keys are attached to your account in platform credentials. If a key is not set
          here, automation automatically uses{" "}
          <code className="text-xs bg-surface px-1.5 py-0.5 rounded font-[family-name:var(--font-code)]">
            .env.local
          </code>{" "}
          via{" "}
          <code className="text-xs bg-surface px-1.5 py-0.5 rounded font-[family-name:var(--font-code)]">
            OPENROUTER_API_KEY
          </code>
          .
        </p>
      </div>

      {API_KEY_CONFIGS.map((config) => (
        <Card key={config.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center">
                  <Cpu size={20} strokeWidth={1.8} className="text-foreground" />
                </div>
                <div>
                  <CardTitle>{config.name}</CardTitle>
                  <CardDescription>{config.description}</CardDescription>
                </div>
              </div>

              <div className="shrink-0">
                {configured[config.id] ? (
                  <Badge variant="success">Configured</Badge>
                ) : (
                  <Badge variant="default">Not configured</Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <div className="space-y-3">
            <div>
              <Input
                id={`apikey-${config.id}`}
                label={config.envKey}
                type="password"
                icon={KeyRound}
                placeholder={config.placeholder}
                value={values[config.id] ?? ""}
                onChange={(e) => handleChange(config.id, e.target.value)}
                error={error[config.id]}
              />
              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="text-xs text-text-muted">{config.helpText}</p>
                <a
                  href={config.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition-colors whitespace-nowrap"
                >
                  Get API key <ExternalLink size={12} strokeWidth={1.8} />
                </a>
              </div>
            </div>

            {status[config.id] && (
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle size={14} strokeWidth={1.8} />
                {status[config.id]}
              </div>
            )}

            <Button onClick={() => handleSave(config.id)} loading={saving[config.id]}>
              Save Key
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
