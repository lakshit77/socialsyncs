import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OAuthConnectionService } from "@/services/oauth/oauth-connection.service";
import { YouTubeService } from "@/services/platforms/youtube/youtube.service";
import { AutomationConfigForm } from "@/components/youtube/automation-config-form";
import { PendingRepliesTab } from "@/components/youtube/pending-replies-tab";
import {
  DEFAULT_YOUTUBE_REPLY_SIGNATURE,
  DEFAULT_YOUTUBE_SYSTEM_PROMPT,
} from "@/services/platforms/youtube/youtube.constants";

interface YouTubeVideoRecord {
  transcript: string | null;
}

interface AutomationConfigRecord {
  auto_post: boolean;
  system_prompt: string;
  signature_suffix: string;
}

/**
 * Loads transcript and automation settings for a selected YouTube video.
 * Reads credentials via OAuthConnectionService (platform_oauth_connections table).
 */
export default async function YouTubeVideoDetailPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="text-sm text-text-muted">Sign in to configure this video.</p>;
  }

  const oauthService = new OAuthConnectionService();
  const connection = await oauthService.getConnection(user.id, "youtube");

  if (!connection || connection.status !== "active") {
    return (
      <p className="text-sm text-text-muted">
        {connection?.status === "expired" ? "Your YouTube connection has expired. " : "Connect YouTube from Settings first. "}
        <Link href="/settings" className="text-primary hover:text-primary-hover underline">
          Go to Settings
        </Link>
      </p>
    );
  }

  const accessToken = await oauthService.getValidAccessToken(user.id, "youtube");
  const youtubeService = new YouTubeService({
    access_token: accessToken,
    channel_id: connection.accountId,
  });

  const { data: existingVideoRow } = await supabase
    .from("youtube_videos")
    .select("transcript")
    .eq("user_id", user.id)
    .eq("video_id", videoId)
    .maybeSingle<YouTubeVideoRecord>();

  let transcript = existingVideoRow?.transcript ?? null;
  if (!transcript) {
    try {
      transcript = await youtubeService.fetchTranscript(videoId);
      const { error: upsertError } = await supabase.from("youtube_videos").upsert(
        {
          user_id: user.id,
          video_id: videoId,
          title: `YouTube Video ${videoId}`,
          transcript,
          transcript_fetched_at: new Date().toISOString(),
        },
        { onConflict: "user_id,video_id" }
      );

      if (upsertError) {
        console.error("Failed to upsert youtube_videos transcript", {
          userId: user.id,
          videoId,
          error: upsertError,
        });
      }
    } catch (error) {
      console.error("Failed to fetch transcript for YouTube video", {
        userId: user.id,
        videoId,
        error,
      });
    }
  }

  const { data: configRow } = await supabase
    .from("youtube_automation_configs")
    .select("auto_post, system_prompt, signature_suffix")
    .eq("user_id", user.id)
    .eq("video_id", videoId)
    .maybeSingle<AutomationConfigRecord>();

  const { data: pendingRows } = await supabase
    .from("youtube_comment_replies")
    .select("id, comment_text, author_name, ai_reply, timestamp_reference, status")
    .eq("user_id", user.id)
    .eq("video_id", videoId)
    .eq("status", "pending_review")
    .order("created_at", { ascending: false });

  const { data: historyRows } = await supabase
    .from("youtube_comment_replies")
    .select("id, comment_text, author_name, ai_reply, timestamp_reference, status")
    .eq("user_id", user.id)
    .eq("video_id", videoId)
    .in("status", ["approved", "posted", "skipped", "liked_only"])
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.8px] font-[family-name:var(--font-heading)] text-foreground">
          YouTube Automation Settings
        </h1>
        <p className="text-sm text-text-muted mt-1">Video ID: {videoId}</p>
      </div>

      <div className="rounded-xl border border-border bg-surface-elevated p-6">
        <h2 className="text-lg font-semibold text-foreground mb-2">Transcript</h2>
        {transcript ? (
          <>
            <p className="text-xs text-text-muted mb-3">
              Fetched from YouTube captions and stored in database. Used by the AI to generate
              contextual replies with timestamps.
            </p>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-background p-4">
              <pre className="text-xs text-text-muted whitespace-pre-wrap leading-relaxed font-[family-name:var(--font-mono)]">
                {transcript}
              </pre>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-text-muted">
            Transcript unavailable — no closed captions found for this video. The AI will reply
            without timestamp references.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface-elevated p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Automation Config</h2>
        <AutomationConfigForm
          videoId={videoId}
          initialConfig={
            configRow ?? {
              auto_post: false,
              system_prompt: DEFAULT_YOUTUBE_SYSTEM_PROMPT,
              signature_suffix: DEFAULT_YOUTUBE_REPLY_SIGNATURE,
            }
          }
        />
      </div>

      <div className="rounded-xl border border-border bg-surface-elevated p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Comment Replies</h2>
        <PendingRepliesTab
          videoId={videoId}
          initialReplies={
            (pendingRows ?? []) as Array<{
              id: string;
              comment_text: string;
              author_name: string | null;
              ai_reply: string | null;
              timestamp_reference: string | null;
              status: "pending_review" | "approved" | "posted" | "skipped" | "liked_only";
            }>
          }
          initialHistory={
            (historyRows ?? []) as Array<{
              id: string;
              comment_text: string;
              author_name: string | null;
              ai_reply: string | null;
              timestamp_reference: string | null;
              status: "pending_review" | "approved" | "posted" | "skipped" | "liked_only";
            }>
          }
        />
      </div>
    </div>
  );
}
