"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, CheckCircle, AlertCircle, Key, Hash } from "lucide-react";

interface PlatformCredential {
  platform: string;
  credentials: {
    access_token: string;
    account_id: string;
  };
  is_active: boolean;
}

interface PlatformCredentialsFormProps {
  initialCredentials: PlatformCredential[];
}

const PLATFORMS = [
  {
    id: "instagram",
    name: "Instagram",
    icon: Camera,
    description: "Post images, stories, reels, and carousels",
    fields: [
      {
        key: "account_id",
        label: "Instagram Account ID",
        placeholder: "e.g. 17841456545908024",
        type: "text",
        icon: Hash,
        helpText: "Your numeric Instagram Business/Creator Account ID",
      },
      {
        key: "access_token",
        label: "Access Token",
        placeholder: "Your long-lived Facebook access token",
        type: "password",
        icon: Key,
        helpText:
          "Requires: instagram_basic, instagram_content_publish, pages_show_list, pages_read_engagement",
      },
    ],
  },
  // Future platforms can be added here
];

export function PlatformCredentialsForm({
  initialCredentials,
}: PlatformCredentialsFormProps) {
  const [credentials, setCredentials] = useState<
    Record<string, Record<string, string>>
  >(() => {
    const initial: Record<string, Record<string, string>> = {};
    for (const cred of initialCredentials) {
      initial[cred.platform] = {
        access_token: cred.credentials.access_token,
        account_id: cred.credentials.account_id,
      };
    }
    return initial;
  });

  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<
    Record<string, { type: "success" | "error"; message: string }>
  >({});

  /** False until cookie-backed session is read into the client (avoids first-click RLS failures). */
  const [authReady, setAuthReady] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await supabase.auth.getSession();
        await supabase.auth.getUser();
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  function updateField(platform: string, field: string, value: string) {
    setCredentials((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: value },
    }));
  }

  async function handleSave(platformId: string) {
    const creds = credentials[platformId];
    if (!creds?.access_token || !creds?.account_id) {
      setStatus((prev) => ({
        ...prev,
        [platformId]: {
          type: "error",
          message: "Both Account ID and Access Token are required",
        },
      }));
      return;
    }

    setSaving((prev) => ({ ...prev, [platformId]: true }));
    setStatus((prev) => {
      const next = { ...prev };
      delete next[platformId];
      return next;
    });

    await supabase.auth.getSession();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setSaving((prev) => ({ ...prev, [platformId]: false }));
      setStatus((prev) => ({
        ...prev,
        [platformId]: {
          type: "error",
          message:
            "Your session could not be verified. Refresh the page and sign in again, then retry.",
        },
      }));
      return;
    }

    const existing = initialCredentials.find(
      (c) => c.platform === platformId
    );

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("platform_credentials")
        .update({
          credentials: {
            access_token: creds.access_token,
            account_id: creds.account_id,
          },
        })
        .eq("platform", platformId)
        .eq("user_id", user.id));
    } else {
      ({ error } = await supabase.from("platform_credentials").insert({
        user_id: user.id,
        platform: platformId,
        credentials: {
          access_token: creds.access_token,
          account_id: creds.account_id,
        },
      }));
    }

    setSaving((prev) => ({ ...prev, [platformId]: false }));

    if (error) {
      setStatus((prev) => ({
        ...prev,
        [platformId]: { type: "error", message: error.message },
      }));
    } else {
      setStatus((prev) => ({
        ...prev,
        [platformId]: {
          type: "success",
          message: "Credentials saved successfully",
        },
      }));
    }
  }

  function isConnected(platformId: string) {
    return initialCredentials.some(
      (c) => c.platform === platformId && c.is_active
    );
  }

  return (
    <div className="space-y-6">
      {PLATFORMS.map((platform) => (
        <Card key={platform.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center">
                  <platform.icon
                    size={20}
                    strokeWidth={1.8}
                    className="text-foreground"
                  />
                </div>
                <div>
                  <CardTitle>{platform.name}</CardTitle>
                  <CardDescription>{platform.description}</CardDescription>
                </div>
              </div>
              {isConnected(platform.id) ? (
                <Badge variant="success">Connected</Badge>
              ) : (
                <Badge variant="default">Not connected</Badge>
              )}
            </div>
          </CardHeader>

          <div className="space-y-4">
            {platform.fields.map((field) => (
              <div key={field.key}>
                <Input
                  id={`${platform.id}-${field.key}`}
                  label={field.label}
                  type={field.type}
                  placeholder={field.placeholder}
                  icon={field.icon}
                  value={credentials[platform.id]?.[field.key] ?? ""}
                  onChange={(e) =>
                    updateField(platform.id, field.key, e.target.value)
                  }
                />
                <p className="mt-1 text-xs text-text-muted">{field.helpText}</p>
              </div>
            ))}

            {status[platform.id] && (
              <div
                className={`flex items-center gap-2 text-sm ${
                  status[platform.id].type === "success"
                    ? "text-success"
                    : "text-error"
                }`}
              >
                {status[platform.id].type === "success" ? (
                  <CheckCircle size={14} strokeWidth={1.8} />
                ) : (
                  <AlertCircle size={14} strokeWidth={1.8} />
                )}
                {status[platform.id].message}
              </div>
            )}

            <Button
              onClick={() => handleSave(platform.id)}
              loading={saving[platform.id] || !authReady}
            >
              {isConnected(platform.id)
                ? "Update Credentials"
                : "Save Credentials"}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
