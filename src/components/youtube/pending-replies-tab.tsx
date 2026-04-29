"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Clock, SkipForward, Send } from "lucide-react";

type ReplyStatus = "pending_review" | "approved" | "posted" | "skipped" | "liked_only";

interface PendingReply {
  id: string;
  comment_text: string;
  author_name: string | null;
  ai_reply: string | null;
  timestamp_reference: string | null;
  status: ReplyStatus;
}

interface PendingRepliesTabProps {
  videoId: string;
  initialReplies: PendingReply[];
  initialHistory?: PendingReply[];
}

type ActiveTab = "pending" | "history";

const STATUS_LABELS: Record<ReplyStatus, string> = {
  pending_review: "Pending",
  approved: "Approved",
  posted: "Posted",
  skipped: "Skipped",
  liked_only: "Liked only",
};

const STATUS_COLORS: Record<ReplyStatus, string> = {
  pending_review: "text-warning",
  approved: "text-primary",
  posted: "text-success",
  skipped: "text-text-muted",
  liked_only: "text-text-muted",
};

/**
 * Displays AI reply drafts for human review, allows approving (posting to YouTube),
 * editing, or skipping. Also shows a history tab of all processed replies.
 */
export function PendingRepliesTab({
  videoId,
  initialReplies,
  initialHistory = [],
}: PendingRepliesTabProps) {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<ActiveTab>("pending");
  const [pendingRows, setPendingRows] = useState<PendingReply[]>(initialReplies);
  const [historyRows, setHistoryRows] = useState<PendingReply[]>(initialHistory);
  const [historyLoaded, setHistoryLoaded] = useState<boolean>(initialHistory.length > 0);
  const [busyRowId, setBusyRowId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Poll pending replies every 15 s so new ones appear without a refresh.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchPending();
    }, 15000);
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Load history when the tab is first opened.
  useEffect(() => {
    if (activeTab === "history" && !historyLoaded) {
      void fetchHistory();
    }
  }, [activeTab, historyLoaded]);

  async function fetchPending(): Promise<void> {
    const { data, error } = await supabase
      .from("youtube_comment_replies")
      .select("id, comment_text, author_name, ai_reply, timestamp_reference, status")
      .eq("video_id", videoId)
      .eq("status", "pending_review")
      .order("created_at", { ascending: false });

    if (!error) {
      setPendingRows((data ?? []) as PendingReply[]);
    }
  }

  async function fetchHistory(): Promise<void> {
    const { data, error } = await supabase
      .from("youtube_comment_replies")
      .select("id, comment_text, author_name, ai_reply, timestamp_reference, status")
      .eq("video_id", videoId)
      .in("status", ["approved", "posted", "skipped", "liked_only"])
      .order("created_at", { ascending: false });

    if (!error) {
      setHistoryRows((data ?? []) as PendingReply[]);
      setHistoryLoaded(true);
    }
  }

  /** Approve: post the reply to YouTube via the API, then remove from pending list. */
  async function approveAndPost(row: PendingReply): Promise<void> {
    if (!row.ai_reply?.trim()) {
      setErrorMessage("Reply text cannot be empty.");
      return;
    }

    setBusyRowId(row.id);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/v1/youtube/replies/${row.id}/post`, {
        method: "POST",
      });

      const payload = (await response.json()) as {
        success: boolean;
        error?: { message?: string };
      };

      if (!response.ok || !payload.success) {
        setErrorMessage(payload.error?.message ?? "Failed to post reply to YouTube.");
        return;
      }

      // Remove from pending list; invalidate history cache so it reloads.
      setPendingRows((prev) => prev.filter((r) => r.id !== row.id));
      setHistoryLoaded(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Network error. Try again.");
    } finally {
      setBusyRowId("");
    }
  }

  /** Skip: mark as skipped in DB, remove from pending. */
  async function skipReply(rowId: string): Promise<void> {
    setBusyRowId(rowId);
    setErrorMessage("");

    const { error } = await supabase
      .from("youtube_comment_replies")
      .update({ status: "skipped" })
      .eq("id", rowId);

    setBusyRowId("");
    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setPendingRows((prev) => prev.filter((r) => r.id !== rowId));
    setHistoryLoaded(false);
  }

  /** Update the local draft textarea without persisting yet. */
  function updateLocalDraft(rowId: string, value: string): void {
    setPendingRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, ai_reply: value } : r))
    );
  }

  /** Save edited draft to DB without approving. */
  async function saveDraft(row: PendingReply): Promise<void> {
    setBusyRowId(row.id);
    setErrorMessage("");

    const { error } = await supabase
      .from("youtube_comment_replies")
      .update({ ai_reply: row.ai_reply })
      .eq("id", row.id);

    setBusyRowId("");
    if (error) setErrorMessage(error.message);
  }

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "pending"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-foreground"
          }`}
        >
          Pending Review
          {pendingRows.length > 0 && (
            <span className="ml-2 rounded-full bg-primary/15 text-primary text-xs px-1.5 py-0.5">
              {pendingRows.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "history"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-foreground"
          }`}
        >
          History
        </button>
      </div>

      {errorMessage ? (
        <p className="text-sm text-error">{errorMessage}</p>
      ) : null}

      {/* Pending tab */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {pendingRows.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-text-muted py-4">
              <CheckCircle size={16} strokeWidth={1.8} />
              No pending replies — all caught up.
            </div>
          ) : (
            pendingRows.map((row) => (
              <div
                key={row.id}
                className="rounded-lg border border-border bg-surface p-4 space-y-3"
              >
                {/* Original comment */}
                <div>
                  <p className="text-xs font-medium text-text-muted">
                    {row.author_name ? `@${row.author_name}` : "Unknown author"}
                  </p>
                  <p className="text-sm text-foreground mt-1">{row.comment_text}</p>
                </div>

                {row.timestamp_reference ? (
                  <p className="text-xs text-text-muted flex items-center gap-1">
                    <Clock size={11} strokeWidth={1.8} />
                    Suggested timestamp: {row.timestamp_reference}
                  </p>
                ) : null}

                {/* Editable AI reply */}
                <Textarea
                  value={row.ai_reply ?? ""}
                  onChange={(e) => updateLocalDraft(row.id, e.target.value)}
                  className="min-h-[110px]"
                />

                <div className="flex gap-2 flex-wrap">
                  <Button
                    loading={busyRowId === row.id}
                    onClick={() => void approveAndPost(row)}
                  >
                    <Send size={14} strokeWidth={1.8} className="mr-1.5" />
                    Approve & Post
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busyRowId === row.id}
                    onClick={() => void saveDraft(row)}
                  >
                    Save Edit
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busyRowId === row.id}
                    onClick={() => void skipReply(row.id)}
                  >
                    <SkipForward size={14} strokeWidth={1.8} className="mr-1.5" />
                    Skip
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* History tab */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {!historyLoaded ? (
            <p className="text-sm text-text-muted">Loading history…</p>
          ) : historyRows.length === 0 ? (
            <p className="text-sm text-text-muted">No history yet for this video.</p>
          ) : (
            historyRows.map((row) => (
              <div
                key={row.id}
                className="rounded-lg border border-border bg-surface p-4 space-y-2 opacity-80"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-text-muted">
                    {row.author_name ? `@${row.author_name}` : "Unknown author"}
                  </p>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full bg-surface-elevated ${STATUS_COLORS[row.status]}`}
                  >
                    {STATUS_LABELS[row.status]}
                  </span>
                </div>
                <p className="text-sm text-foreground">{row.comment_text}</p>
                {row.ai_reply ? (
                  <p className="text-sm text-text-muted border-l-2 border-border pl-3 italic">
                    {row.ai_reply}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
