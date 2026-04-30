"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Key,
  Hash,
  Link,
  Unlink,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import type { OAuthConnection } from "@/services/oauth/types";

export interface OAuthPlatformDefinition {
  /** Lowercase platform slug matching the registry key (e.g. "youtube"). */
  id: string;
  /** Display name shown in the UI (e.g. "YouTube"). */
  name: string;
  /** Short description shown under the platform name. */
  description: string;
  /** Lucide icon component for the platform. */
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  /** URL to the developer console for the platform (shown in the custom OAuth guide). */
  devConsoleUrl: string;
  /** Step-by-step guide shown inside the "How to create your own OAuth app" accordion. */
  setupGuide: Array<{ title: string; detail: string }>;
  /** If true, renders a disabled "Coming Soon" card instead of the connect flow. */
  comingSoon?: boolean;
}

interface OAuthConnectCardProps {
  platform: OAuthPlatformDefinition;
  /** Server-fetched connection state; null if no connection exists yet. */
  connection: OAuthConnection | null;
  /** Currently saved custom OAuth app credentials for this platform, if any. */
  customCredentials: { client_id?: string; client_secret?: string; has_client_secret?: boolean };
}

/**
 * Reusable card component for OAuth-based platform connections.
 *
 * Supports two modes:
 * - SaaS users: click "Connect" and use the system OAuth app with no configuration.
 * - Self-hosted users: expand "Use your own OAuth app", enter client_id + client_secret,
 *   save, then click "Connect" to use their own app credentials.
 */
export function OAuthConnectCard({
  platform,
  connection: initialConnection,
  customCredentials: initialCustomCredentials,
}: OAuthConnectCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [connection, setConnection] = useState<OAuthConnection | null>(initialConnection);
  const [customCredentials, setCustomCredentials] = useState({
    client_id: initialCustomCredentials.client_id ?? "",
    client_secret: initialCustomCredentials.client_secret ?? "",
  });
  // True when the server has a saved client secret (we never receive the value itself).
  const [serverHasClientSecret, setServerHasClientSecret] = useState(
    initialCustomCredentials.has_client_secret ?? false
  );
  const [showCustomSection, setShowCustomSection] = useState(
    Boolean(initialCustomCredentials.client_id)
  );
  const [savingCustom, setSavingCustom] = useState(false);
  const [customSaveStatus, setCustomSaveStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [disconnecting, startDisconnectTransition] = useTransition();
  const [connecting, setConnecting] = useState(false);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  // Show connection feedback from OAuth callback redirect params.
  const connectedPlatform = searchParams.get("connected");
  const errorPlatform = searchParams.get("platform");
  const errorCode = searchParams.get("error");

  const justConnected = connectedPlatform === platform.id;
  const hasOAuthError = errorCode && errorPlatform === platform.id;

  const isConnected = connection?.status === "active";
  const isExpired = connection?.status === "expired";

  const [redirectUri, setRedirectUri] = useState(`/api/v1/auth/${platform.id}/callback`);

  useEffect(() => {
    setRedirectUri(`${window.location.origin}/api/v1/auth/${platform.id}/callback`);
  }, [platform.id]);

  function handleCopyRedirectUri(): void {
    void navigator.clipboard.writeText(redirectUri).then(() => {
      setCopiedRedirectUri(true);
      setTimeout(() => setCopiedRedirectUri(false), 2000);
    });
  }

  // Coming-soon platforms render a locked placeholder card.
  if (platform.comingSoon) {
    return (
      <Card className="h-full opacity-70">
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
            <Badge variant="default" className="whitespace-nowrap">Coming Soon</Badge>
          </div>
        </CardHeader>
        <div className="rounded-lg border border-border bg-surface/50 px-4 py-3 text-sm text-text-muted text-center">
          {platform.name} integration is under development and will be available in a future release.
        </div>
      </Card>
    );
  }

  // ---------------------------------------------------------------------------
  // Custom credentials
  // ---------------------------------------------------------------------------

  async function handleSaveCustomCredentials(): Promise<void> {
    setSavingCustom(true);
    setCustomSaveStatus(null);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setSavingCustom(false);
      setCustomSaveStatus({ type: "error", message: "Session not found. Please sign in again." });
      return;
    }

    const credentialsToSave: Record<string, string> = {};
    if (customCredentials.client_id.trim()) {
      credentialsToSave.client_id = customCredentials.client_id.trim();
    }
    if (customCredentials.client_secret.trim()) {
      credentialsToSave.client_secret = customCredentials.client_secret.trim();
    }

    const { error } = await supabase.from("platform_credentials").upsert(
      {
        user_id: user.id,
        platform: `${platform.id}_oauth_app`,
        credentials: credentialsToSave,
        is_active: true,
      },
      { onConflict: "user_id,platform" }
    );

    setSavingCustom(false);

    if (error) {
      setCustomSaveStatus({ type: "error", message: error.message });
    } else {
      setCustomSaveStatus({
        type: "success",
        message: "Custom OAuth app credentials saved. Click Connect to authorize with your app.",
      });
      if (customCredentials.client_secret.trim()) {
        setServerHasClientSecret(true);
        // Clear the secret field — it is never shown again after saving.
        setCustomCredentials((prev) => ({ ...prev, client_secret: "" }));
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Disconnect
  // ---------------------------------------------------------------------------

  function handleDisconnect(): void {
    setDisconnectError(null);
    startDisconnectTransition(async () => {
      const response = await fetch(`/api/v1/auth/${platform.id}/disconnect`, {
        method: "POST",
      });
      if (!response.ok) {
        setDisconnectError("Failed to disconnect. Please try again.");
        return;
      }
      setConnection(null);
      router.refresh();
    });
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function renderConnectionStatus() {
    if (justConnected || isConnected) {
      return (
        <div className="rounded-lg border border-success/20 bg-success/5 px-4 py-3 flex items-start gap-3">
          <CheckCircle size={15} strokeWidth={1.8} className="text-success mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Connected as{" "}
              <span className="text-success">{connection?.accountTitle ?? "your account"}</span>
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              Long-lived connection — access token refreshes automatically
            </p>
            {connection?.oauthProvider === "custom" && (
              <p className="text-xs text-text-muted mt-0.5">
                Using your custom OAuth app
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            onClick={handleDisconnect}
            loading={disconnecting}
            className="shrink-0 text-error hover:text-error"
          >
            <Unlink size={14} strokeWidth={1.8} className="mr-1.5" />
            Disconnect
          </Button>
        </div>
      );
    }

    if (isExpired) {
      return (
        <div className="rounded-lg border border-warning/20 bg-warning/5 px-4 py-3 flex items-start gap-3">
          <AlertCircle size={15} strokeWidth={1.8} className="text-warning mt-0.5 shrink-0" />
          <p className="text-sm text-text-muted">
            <span className="font-medium text-foreground">Connection expired.</span>{" "}
            Your refresh token has been revoked. Click Connect below to re-authorize.
          </p>
        </div>
      );
    }

    if (hasOAuthError) {
      return (
        <div className="rounded-lg border border-error/20 bg-error/5 px-4 py-3 flex items-start gap-3">
          <AlertCircle size={15} strokeWidth={1.8} className="text-error mt-0.5 shrink-0" />
          <p className="text-sm text-text-muted">
            <span className="font-medium text-foreground">Authorization failed.</span>{" "}
            {getErrorMessage(errorCode ?? "")}
          </p>
        </div>
      );
    }

    return null;
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

          {isConnected || justConnected ? (
            <Badge variant="success" className="whitespace-nowrap">Connected</Badge>
          ) : isExpired ? (
            <Badge variant="warning" className="whitespace-nowrap">Expired</Badge>
          ) : (
            <Badge variant="default" className="whitespace-nowrap">Not connected</Badge>
          )}
        </div>
      </CardHeader>

      <div className="space-y-4">
        {/* Connection status / feedback banner */}
        {renderConnectionStatus()}
        {disconnectError && (
          <p className="flex items-center gap-2 text-sm text-error">
            <AlertCircle size={14} strokeWidth={1.8} />
            {disconnectError}
          </p>
        )}

        {/* Custom OAuth app section */}
        <div className="rounded-md border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setShowCustomSection((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-surface/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Key size={14} strokeWidth={1.8} />
              Use your own OAuth app
              <span className="text-xs font-normal text-text-muted">(optional)</span>
            </span>
            {showCustomSection ? (
              <ChevronUp size={14} strokeWidth={1.8} className="text-text-muted" />
            ) : (
              <ChevronDown size={14} strokeWidth={1.8} className="text-text-muted" />
            )}
          </button>

          {showCustomSection && (
            <div className="px-4 pb-4 space-y-4 border-t border-border">
              <p className="text-xs text-text-muted pt-3 leading-relaxed">
                If provided, your own OAuth app will be used for authorization and all token
                operations. Otherwise, the platform&apos;s system credentials will be used
                automatically.
              </p>

              {/* Setup guide accordion */}
              <details className="rounded-md border border-border px-3 py-2">
                <summary className="cursor-pointer text-xs font-medium text-foreground">
                  How to create your own {platform.name} OAuth app
                </summary>
                <ol className="mt-2 space-y-1.5 text-xs text-text-muted list-decimal list-inside">
                  {platform.setupGuide.map((step) => (
                    <li key={step.title}>
                      <span className="text-foreground font-medium">{step.title}:</span>{" "}
                      {step.detail}
                    </li>
                  ))}
                </ol>
                <a
                  href={platform.devConsoleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
                >
                  Open developer console <ExternalLink size={11} strokeWidth={1.8} />
                </a>
              </details>

              <div>
                <Input
                  id={`${platform.id}-client-id`}
                  label="Client ID"
                  type="text"
                  placeholder="Your OAuth app Client ID"
                  icon={Hash}
                  value={customCredentials.client_id}
                  onChange={(e) =>
                    setCustomCredentials((prev) => ({ ...prev, client_id: e.target.value }))
                  }
                />
              </div>

              <div>
                <Input
                  id={`${platform.id}-client-secret`}
                  label="Client Secret"
                  type="password"
                  placeholder={
                    serverHasClientSecret
                      ? "Saved — enter a new value to replace"
                      : "Your OAuth app Client Secret"
                  }
                  icon={Key}
                  value={customCredentials.client_secret}
                  onChange={(e) =>
                    setCustomCredentials((prev) => ({ ...prev, client_secret: e.target.value }))
                  }
                />
                {serverHasClientSecret && !customCredentials.client_secret && (
                  <p className="mt-1 text-xs text-success flex items-center gap-1">
                    <CheckCircle size={11} strokeWidth={1.8} />
                    Client secret is saved securely
                  </p>
                )}
              </div>

              {/* Read-only authorized redirect URI — must be added to the OAuth app */}
              <div>
                <p className="text-xs font-medium text-foreground mb-1.5">
                  Authorized Redirect URI
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
                  <code className="flex-1 text-xs text-text-muted font-[family-name:var(--font-code)] truncate">
                    {redirectUri}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyRedirectUri}
                    className="shrink-0 text-text-muted hover:text-foreground transition-colors"
                    title="Copy redirect URI"
                  >
                    {copiedRedirectUri ? (
                      <Check size={14} strokeWidth={1.8} className="text-success" />
                    ) : (
                      <Copy size={14} strokeWidth={1.8} />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  Add this URI to your OAuth app&apos;s authorized redirect URIs.
                </p>
              </div>

              {customSaveStatus && (
                <div
                  className={`flex items-center gap-2 text-sm ${
                    customSaveStatus.type === "success" ? "text-success" : "text-error"
                  }`}
                >
                  {customSaveStatus.type === "success" ? (
                    <CheckCircle size={14} strokeWidth={1.8} />
                  ) : (
                    <AlertCircle size={14} strokeWidth={1.8} />
                  )}
                  {customSaveStatus.message}
                </div>
              )}

              <Button
                variant="secondary"
                onClick={handleSaveCustomCredentials}
                loading={savingCustom}
              >
                Save OAuth App Credentials
              </Button>
            </div>
          )}
        </div>

        {/* Primary connect button */}
        {!isConnected && (
          <Button
            className="w-full"
            loading={connecting}
            onClick={() => {
              setConnecting(true);
              // Redirect to OAuth login — the page will navigate away, so no
              // need to reset the loading state; it naturally clears on return.
              window.location.href = `/api/v1/auth/${platform.id}/login`;
            }}
          >
            {!connecting && <Link size={15} strokeWidth={1.8} className="mr-2" />}
            {connecting
              ? `Redirecting to ${platform.name}…`
              : isExpired
              ? `Reconnect ${platform.name}`
              : `Connect ${platform.name}`}
          </Button>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "oauth_denied":
      return "You denied access to your account. Click Connect to try again.";
    case "oauth_invalid_state":
      return "The authorization state was invalid or expired. Please try again.";
    case "oauth_callback_failed":
      return "Something went wrong during authorization. Please try again.";
    case "oauth_missing_params":
      return "The authorization response was incomplete. Please try again.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
}
