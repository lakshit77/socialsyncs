"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_YOUTUBE_REPLY_SIGNATURE,
  DEFAULT_YOUTUBE_SYSTEM_PROMPT,
} from "@/services/platforms/youtube/youtube.constants";

interface AutomationConfigFormProps {
  videoId: string;
  initialConfig: {
    auto_post: boolean;
    system_prompt: string;
    signature_suffix: string;
  } | null;
}

/**
 * Saves per-video YouTube automation behavior and system prompt.
 */
export function AutomationConfigForm({
  videoId,
  initialConfig,
}: AutomationConfigFormProps) {
  const supabase = createClient();
  const [autoPost, setAutoPost] = useState<boolean>(initialConfig?.auto_post ?? false);
  const [systemPrompt, setSystemPrompt] = useState<string>(
    initialConfig?.system_prompt ?? DEFAULT_YOUTUBE_SYSTEM_PROMPT
  );
  const [signatureSuffix, setSignatureSuffix] = useState<string>(
    initialConfig?.signature_suffix ?? DEFAULT_YOUTUBE_REPLY_SIGNATURE
  );
  const [saving, setSaving] = useState<boolean>(false);
  const [running, setRunning] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [reconnectUrl, setReconnectUrl] = useState<string | null>(null);

  async function handleSave(): Promise<void> {
    setSaving(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      setSaving(false);
      setMessage("Could not verify your session. Refresh and try again.");
      return;
    }

    const { error } = await supabase.from("youtube_automation_configs").upsert(
      {
        user_id: user.id,
        video_id: videoId,
        is_active: true,
        auto_post: autoPost,
        system_prompt: systemPrompt,
        signature_suffix: signatureSuffix.trim() || DEFAULT_YOUTUBE_REPLY_SIGNATURE,
      },
      {
        onConflict: "user_id,video_id",
      }
    );

    setSaving(false);
    setMessage(error ? error.message : "Automation settings saved.");
  }

  async function runAutomationNow(): Promise<void> {
    setRunning(true);
    setMessage("");
    setReconnectUrl(null);

    try {
      const response = await fetch("/api/v1/youtube/automate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });

      const payload = (await response.json()) as {
        success: boolean;
        data?: {
          processed: number;
          queued: number;
          posted?: number;
          reconnectUrl?: string;
        };
        error?: { code?: string; message?: string; details?: { reconnectUrl?: string } };
      };

      if (!response.ok || !payload.success) {
        if (payload.error?.code === "RECONNECT_REQUIRED") {
          setReconnectUrl(payload.error.details?.reconnectUrl ?? "/settings");
          setMessage(
            "Your YouTube connection has expired. Please reconnect to continue."
          );
        } else {
          setMessage(payload.error?.message ?? "Failed to run automation.");
        }
      } else if (payload.data) {
        setMessage(
          autoPost
            ? `Done — ${payload.data.processed} processed, ${payload.data.posted ?? 0} auto-posted.`
            : `Done — ${payload.data.processed} processed, ${payload.data.queued} queued for review.`
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to run automation.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={autoPost}
          onChange={(event) => setAutoPost(event.target.checked)}
        />
        Auto-post AI replies (no review)
      </label>

      <Textarea
        id="youtube-system-prompt"
        label="System Prompt"
        value={systemPrompt}
        onChange={(event) => setSystemPrompt(event.target.value)}
        className="min-h-[220px]"
      />

      <Textarea
        id="youtube-signature-suffix"
        label="Reply Signature (appended deterministically)"
        value={signatureSuffix}
        onChange={(event) => setSignatureSuffix(event.target.value)}
        className="min-h-[72px]"
      />

      {message ? (
        <div className="flex flex-col gap-2">
          <p className={`text-sm ${reconnectUrl ? "text-error" : "text-text-muted"}`}>
            {message}
          </p>
          {reconnectUrl ? (
            <a
              href={reconnectUrl}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover underline"
            >
              Reconnect YouTube →
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button onClick={handleSave} loading={saving}>
          Save Settings
        </Button>
        <Button variant="secondary" onClick={runAutomationNow} loading={running}>
          Run Automation Now
        </Button>
      </div>
    </div>
  );
}
