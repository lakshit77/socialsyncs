import { createAdminClient } from "@/lib/supabase/admin";
import { generateOpenRouterJsonResponse } from "@/lib/openrouter";
import type { YouTubeAIDecision } from "@/services/platforms/youtube/youtube.types";
import { YouTubeService } from "@/services/platforms/youtube/youtube.service";
import {
  DEFAULT_YOUTUBE_REPLY_SIGNATURE,
  DEFAULT_YOUTUBE_SYSTEM_PROMPT,
  YOUTUBE_AI_JSON_CONTRACT,
} from "@/services/platforms/youtube/youtube.constants";
import {
  OAuthConnectionService,
  OAuthTokenExpiredError,
} from "@/services/oauth/oauth-connection.service";

export interface AutomationSummary {
  runId: string;
  processed: number;
  queued: number;
  posted: number;
}

export interface RunAutomationOptions {
  /** When set, overrides the per-video auto_post config for this run. */
  autoPostOverride?: boolean;
}

interface YouTubeConfigRow {
  auto_post: boolean;
  system_prompt: string;
  signature_suffix: string;
}

interface YouTubeVideoRow {
  transcript: string | null;
}

interface PlatformCredentialsRow {
  credentials: {
    api_key?: string;
  };
}

interface YouTubeOAuthConnectionRow {
  account_id: string;
}

/**
 * Runs end-to-end comment analysis and reply orchestration for a specific video.
 */
export class CommentAutomationService {
  /**
   * Executes one automation run for a user and video combination.
   */
  async runAutomation(
    userId: string,
    videoId: string,
    options: RunAutomationOptions = {}
  ): Promise<AutomationSummary> {
    const supabase = createAdminClient();

    // Create the run tracking row before starting work so we have a runId.
    const { data: runRow, error: runInsertError } = await supabase
      .from("youtube_automation_runs")
      .insert({
        user_id: userId,
        video_id: videoId,
        status: "started",
        automation_started_at: new Date().toISOString(),
      })
      .select("id")
      .single<{ id: string }>();

    if (runInsertError || !runRow) {
      throw new Error(`Failed to create automation run record: ${runInsertError?.message ?? "unknown error"}`);
    }

    const runId = runRow.id;
    const summary: AutomationSummary = {
      runId,
      processed: 0,
      queued: 0,
      posted: 0,
    };

    try {
      const credentials = await this.getCredentials(userId);
      const youtube = new YouTubeService({
        access_token: credentials.accessToken,
        channel_id: credentials.channelId,
      });
      const config = await this.getConfig(userId, videoId);
      const transcript = await this.getTranscript(userId, videoId);
      const openRouterApiKey = await this.getOpenRouterApiKey(userId);

      // autoPostOverride lets callers (e.g. the /automate/latest endpoint) force
      // or suppress auto-posting regardless of the per-video config.
      const shouldAutoPost =
        options.autoPostOverride !== undefined ? options.autoPostOverride : config.auto_post;

      const existingReplyIds = await this.getExistingReplyIds(videoId);
      const oauthService = new OAuthConnectionService();
      const commentsPage = await oauthService.withTokenAutoRefresh(
        userId,
        "youtube",
        (token) => {
          youtube.updateAccessToken(token);
          return youtube.fetchComments(videoId);
        }
      );

      for (const comment of commentsPage.comments) {
        if (existingReplyIds.has(comment.id)) {
          continue;
        }

        summary.processed += 1;
        const decision = await this.getAIDecision(
          config.system_prompt || DEFAULT_YOUTUBE_SYSTEM_PROMPT,
          transcript ?? "",
          comment.text,
          config.signature_suffix,
          openRouterApiKey
        );

        const shouldReply = decision.should_reply && Boolean(decision.reply?.trim());

        let replyStatus: "pending_review" | "posted" | "skipped" = "skipped";
        let postedAt: string | null = null;

        if (shouldReply) {
          if (shouldAutoPost) {
            try {
              await oauthService.withTokenAutoRefresh(userId, "youtube", (token) => {
                youtube.updateAccessToken(token);
                return youtube.postReply(comment.id, decision.reply!.trim());
              });
              summary.posted += 1;
              replyStatus = "posted";
              postedAt = new Date().toISOString();
            } catch (error) {
              // If posting fails, fall back to manual review instead of losing the reply.
              console.error("Failed to auto-post YouTube reply; falling back to review", {
                userId,
                videoId,
                commentId: comment.id,
                error,
              });
              summary.queued += 1;
              replyStatus = "pending_review";
            }
          } else {
            summary.queued += 1;
            replyStatus = "pending_review";
          }
        }

        const { error: insertError } = await supabase.from("youtube_comment_replies").insert({
          user_id: userId,
          video_id: videoId,
          comment_id: comment.id,
          comment_text: comment.text,
          author_name: comment.author_name,
          ai_reply: shouldReply ? decision.reply : null,
          timestamp_reference: decision.timestamp_reference,
          should_like: false,
          status: replyStatus,
          posted_at: postedAt,
        });

        if (insertError) {
          throw new Error(`Failed to persist comment decision: ${insertError.message}`);
        }
      }

      // Mark run as completed with final counters.
      await supabase
        .from("youtube_automation_runs")
        .update({
          status: "completed",
          automation_completed_at: new Date().toISOString(),
          processed: summary.processed,
          queued: summary.queued,
          posted: summary.posted,
        })
        .eq("id", runId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      await supabase
        .from("youtube_automation_runs")
        .update({ status: "failed", error_message: errorMessage })
        .eq("id", runId);
      throw err;
    }

    return summary;
  }

  /**
   * Resolves a valid YouTube access token and channel ID for the given user.
   *
   * Uses OAuthConnectionService.getValidAccessToken() which transparently
   * refreshes an expired token using the same client credentials that were
   * originally used to authorize the connection (system or custom).
   *
   * On invalid_grant (revoked refresh token), the connection is marked expired
   * and an error is thrown prompting the user to reconnect.
   */
  private async getCredentials(userId: string): Promise<{
    accessToken: string;
    channelId: string;
  }> {
    const supabase = createAdminClient();

    // Fetch the channel ID from the OAuth connection row.
    const { data: connectionData, error: connectionError } = await supabase
      .from("platform_oauth_connections")
      .select("account_id")
      .eq("user_id", userId)
      .eq("platform", "youtube")
      .eq("status", "active")
      .single<YouTubeOAuthConnectionRow>();

    if (connectionError || !connectionData?.account_id) {
      throw new Error(
        "No active YouTube connection found. Please connect your YouTube account from the Settings page."
      );
    }

    // Get a valid (auto-refreshed if needed) access token.
    const oauthService = new OAuthConnectionService();
    const accessToken = await oauthService.getValidAccessToken(userId, "youtube");

    return {
      accessToken,
      channelId: connectionData.account_id,
    };
  }

  private async getConfig(userId: string, videoId: string): Promise<YouTubeConfigRow> {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("youtube_automation_configs")
      .select("auto_post, system_prompt, signature_suffix")
      .eq("user_id", userId)
      .eq("video_id", videoId)
      .maybeSingle<YouTubeConfigRow>();

    // If no config saved yet, fall back to safe defaults so the user can run
    // automation immediately without having to save settings first.
    return data ?? {
      auto_post: false,
      system_prompt: DEFAULT_YOUTUBE_SYSTEM_PROMPT,
      signature_suffix: DEFAULT_YOUTUBE_REPLY_SIGNATURE,
    };
  }

  private async getTranscript(userId: string, videoId: string): Promise<string | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("youtube_videos")
      .select("transcript")
      .eq("user_id", userId)
      .eq("video_id", videoId)
      .single<YouTubeVideoRow>();

    if (error) {
      throw new Error("Video transcript record not found for this user");
    }

    return data?.transcript ?? null;
  }

  private async getExistingReplyIds(videoId: string): Promise<Set<string>> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("youtube_comment_replies")
      .select("comment_id")
      .eq("video_id", videoId);

    if (error) {
      throw new Error("Failed to load existing YouTube reply IDs");
    }

    return new Set((data ?? []).map((row) => row.comment_id as string));
  }

  private async getOpenRouterApiKey(userId: string): Promise<string | undefined> {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("platform_credentials")
      .select("credentials")
      .eq("user_id", userId)
      .eq("platform", "openrouter")
      .maybeSingle<PlatformCredentialsRow>();

    return data?.credentials?.api_key;
  }

  private async getAIDecision(
    systemPrompt: string,
    transcript: string,
    comment: string,
    signatureSuffix: string,
    apiKey?: string
  ): Promise<YouTubeAIDecision> {
    const model = process.env.OPENROUTER_CLAUDE_MODEL ?? "minimax/minimax-m2.7";

    // Always append the JSON contract so the output format is guaranteed
    // regardless of what the user writes in their custom system prompt.
    const fullSystemPrompt = systemPrompt.trimEnd() + YOUTUBE_AI_JSON_CONTRACT;

    const decision = await generateOpenRouterJsonResponse<YouTubeAIDecision>({
      model,
      systemPrompt: fullSystemPrompt,
      apiKey,
      userMessage: JSON.stringify({
        transcript,
        comment,
      }),
    });

    const normalizedTimestamp = normalizeYouTubeTimestamp(decision.timestamp_reference ?? null);
    const timestampedReply = ensureTimestampIsClickableInReply(
      decision.reply ?? null,
      normalizedTimestamp
    );
    const normalizedReply = appendDeterministicAgentSignature(timestampedReply, signatureSuffix);

    return {
      should_reply: Boolean(decision.should_reply),
      reply: normalizedReply,
      timestamp_reference: normalizedTimestamp,
    };
  }
}

function normalizeYouTubeTimestamp(value: string | null): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  // Allow "m:ss" (e.g. 7:00) or "h:mm:ss" (e.g. 1:02:05).
  if (/^\d{1,2}:\d{2}$/.test(raw)) return raw;
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(raw)) return raw;

  // If the model returns a bare minute count (e.g. "7"), make it clickable.
  if (/^\d{1,3}$/.test(raw)) return `${raw}:00`;

  return null;
}

function ensureTimestampIsClickableInReply(
  reply: string | null,
  timestamp: string | null
): string | null {
  if (!reply?.trim()) return null;
  if (!timestamp) return reply;

  // If it's already present, keep as-is.
  if (reply.includes(timestamp)) return reply;

  // Insert the clickable token right before the signature if present,
  // otherwise append it at the end.
  return `${reply.trimEnd()} (${timestamp})`;
}

function appendDeterministicAgentSignature(
  reply: string | null,
  signatureSuffix: string
): string | null {
  if (!reply?.trim()) return null;
  const sanitizedSignature = signatureSuffix.trim() || DEFAULT_YOUTUBE_REPLY_SIGNATURE;
  const escapedSignature = escapeRegExp(sanitizedSignature);

  // Remove any existing canonical/custom signature variants and append one canonical signature.
  const withoutSignature = reply
    .replace(new RegExp(`\\n?\\s*${escapedSignature}\\s*$`, "i"), "")
    .replace(/\n?\s*[—-]\s*Lakshit'?s AI Agent\s*🤖?\s*$/i, "")
    .trimEnd();

  return `${withoutSignature}\n${sanitizedSignature}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
