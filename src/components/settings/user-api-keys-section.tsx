"use client";

import { useState, useEffect, useCallback } from "react";
import {
  KeyRound,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
}

/**
 * Lets users create and revoke per-account API keys used for headless/n8n access.
 * New keys are shown in plaintext once immediately after creation.
 */
export function UserApiKeysSection() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [newKeyPlaintext, setNewKeyPlaintext] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/api-keys");
      const json = (await res.json()) as { success: boolean; data?: ApiKeyRow[] };
      if (json.success && json.data) setKeys(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchKeys();
  }, [fetchKeys]);

  async function handleCreate() {
    const name = newKeyName.trim();
    if (!name) {
      setError("Key name is required");
      return;
    }
    setCreating(true);
    setError(null);
    setNewKeyPlaintext(null);

    const res = await fetch("/api/v1/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = (await res.json()) as {
      success: boolean;
      data?: ApiKeyRow & { key: string };
      error?: { message: string };
    };

    setCreating(false);
    if (!json.success || !json.data) {
      setError(json.error?.message ?? "Failed to create key");
      return;
    }

    setNewKeyName("");
    setNewKeyPlaintext(json.data.key);
    setKeys((prev) => [json.data as ApiKeyRow, ...prev]);
  }

  async function handleRevoke(keyId: string) {
    setRevoking(keyId);
    await fetch(`/api/v1/api-keys/${keyId}`, { method: "DELETE" });
    setRevoking(null);
    setKeys((prev) => prev.filter((k) => k.id !== keyId));
  }

  async function handleCopy() {
    if (!newKeyPlaintext) return;
    await navigator.clipboard.writeText(newKeyPlaintext);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center">
            <KeyRound size={20} strokeWidth={1.8} className="text-foreground" />
          </div>
          <div>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Generate keys for headless access from n8n or other automation tools.{" "}
              <a
                href="/api/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:text-primary-hover transition-colors"
              >
                View API docs <ExternalLink size={11} strokeWidth={1.8} />
              </a>
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      {/* New key plaintext banner */}
      {newKeyPlaintext && (
        <div className="rounded-lg border border-success/30 bg-success/5 p-4 space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle size={14} strokeWidth={1.8} className="text-success mt-0.5 shrink-0" />
            <p className="text-sm text-success font-medium">
              Key created — copy it now. You won&apos;t see it again.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-[family-name:var(--font-code)] text-xs bg-surface border border-border rounded px-3 py-2 break-all text-foreground">
              {newKeyPlaintext}
            </code>
            <Button
              variant="secondary"
              onClick={() => void handleCopy()}
              className="shrink-0 px-3 py-1.5 text-sm"
            >
              {copied ? (
                <CheckCircle size={14} strokeWidth={1.8} className="text-success" />
              ) : (
                <Copy size={14} strokeWidth={1.8} />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}

      {/* Create form */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            id="new-api-key-name"
            label=""
            placeholder="Key name (e.g. n8n production)"
            icon={KeyRound}
            value={newKeyName}
            onChange={(e) => {
              setNewKeyName(e.target.value);
              setError(null);
            }}
            error={error ?? undefined}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreate();
            }}
          />
        </div>
        <Button onClick={() => void handleCreate()} loading={creating} className="self-start mt-0">
          <Plus size={14} strokeWidth={1.8} />
          Create
        </Button>
      </div>

      {/* Keys list */}
      {loading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-text-muted">No API keys yet.</p>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{key.name}</p>
                <p className="text-xs text-text-muted font-[family-name:var(--font-code)]">
                  {key.prefix}••••••••••••••••••••
                  {key.last_used_at && (
                    <span className="ml-3 font-sans">
                      Last used {new Date(key.last_used_at).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant="default">Active</Badge>
                <Button
                  variant="ghost"
                  onClick={() => void handleRevoke(key.id)}
                  loading={revoking === key.id}
                  className="text-text-muted hover:text-destructive px-2 py-1.5"
                >
                  <Trash2 size={14} strokeWidth={1.8} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 flex gap-3 items-start">
        <AlertCircle size={15} strokeWidth={1.8} className="text-warning mt-0.5 shrink-0" />
        <p className="text-sm text-text-muted leading-relaxed">
          API keys grant full access to your account. Treat them like passwords — store securely
          and revoke any key you no longer need.
        </p>
      </div>
    </Card>
  );
}
