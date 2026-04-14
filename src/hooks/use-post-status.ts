"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { PostStatus } from "@/types/database";
import type { PostStatusResponse } from "@/types/api";

interface UsePostStatusOptions {
  postId: string;
  initialStatus: PostStatus;
  enabled?: boolean;
}

interface UsePostStatusReturn {
  status: PostStatus;
  data: PostStatusResponse | null;
  isPolling: boolean;
  error: string | null;
  refetch: () => void;
}

const TERMINAL_STATUSES: PostStatus[] = ["published", "error"];
const BACKOFF_INTERVALS = [3000, 5000, 8000, 13000, 20000, 30000];

export function usePostStatus({
  postId,
  initialStatus,
  enabled = true,
}: UsePostStatusOptions): UsePostStatusReturn {
  const [status, setStatus] = useState<PostStatus>(initialStatus);
  const [data, setData] = useState<PostStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attemptRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/posts/${postId}`);
      const json = await res.json();

      if (!json.success) {
        setError(json.error.message);
        return;
      }

      const postData = json.data as PostStatusResponse;
      setData(postData);
      setStatus(postData.status);
      setError(null);

      if (TERMINAL_STATUSES.includes(postData.status)) {
        setIsPolling(false);
        return;
      }

      // Schedule next poll with backoff
      const delay =
        BACKOFF_INTERVALS[
          Math.min(attemptRef.current, BACKOFF_INTERVALS.length - 1)
        ];
      attemptRef.current += 1;
      timeoutRef.current = setTimeout(fetchStatus, delay);
    } catch {
      setError("Failed to check status");
      setIsPolling(false);
    }
  }, [postId]);

  const refetch = useCallback(() => {
    attemptRef.current = 0;
    setIsPolling(true);
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!enabled || TERMINAL_STATUSES.includes(initialStatus)) return;

    setIsPolling(true);
    // Initial delay before first poll
    timeoutRef.current = setTimeout(fetchStatus, 3000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled, initialStatus, fetchStatus]);

  return { status, data, isPolling, error, refetch };
}
