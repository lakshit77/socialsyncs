"use client";

import { useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  POST_MEDIA_BUCKET,
  POST_MEDIA_MAX_BYTES,
  buildPostMediaObjectPath,
  isPostMediaTypeAllowed,
  resolveMediaContentType,
} from "@/lib/media-constants";

export interface MediaUploadResult {
  mediaId: string;
  publicUrl: string;
}

interface UseMediaUploadReturn {
  upload: (file: File) => Promise<MediaUploadResult | null>;
  isUploading: boolean;
  progress: number;
  url: string | null;
  error: string | null;
  reset: () => void;
}

/**
 * Uploads to Supabase Storage with the logged-in user's JWT (RLS: own folder),
 * then inserts `user_media` for gallery / post references.
 */
export function useMediaUpload(): UseMediaUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uploadInFlightRef = useRef(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current !== null) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const upload = useCallback(
    async (file: File): Promise<MediaUploadResult | null> => {
      if (!(file instanceof File) || file.size <= 0) {
        setError("Choose a non-empty file.");
        return null;
      }

      if (uploadInFlightRef.current) {
        return null;
      }

      uploadInFlightRef.current = true;
      setIsUploading(true);
      setProgress(0);
      setError(null);
      setUrl(null);

      try {
        if (!isPostMediaTypeAllowed(file)) {
          setError(
            "Unsupported file type. Use JPEG, PNG, WebP, MP4, or MOV (max 50MB)."
          );
          return null;
        }

        if (file.size > POST_MEDIA_MAX_BYTES) {
          setError(
            `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 50MB.`
          );
          return null;
        }

        const contentType = resolveMediaContentType(file)!;
        const supabase = createClient();

        await supabase.auth.getSession();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setError(
            "Your session could not be verified. Refresh the page and sign in again."
          );
          return null;
        }

        const path = buildPostMediaObjectPath(user.id, file);

        progressIntervalRef.current = setInterval(() => {
          setProgress((p) => (p >= 88 ? p : p + 6));
        }, 200);

        const { error: uploadError } = await supabase.storage
          .from(POST_MEDIA_BUCKET)
          .upload(path, file, {
            contentType,
            upsert: false,
          });

        clearProgressInterval();

        if (uploadError) {
          setError(uploadError.message);
          return null;
        }

        const { data: pub } = supabase.storage
          .from(POST_MEDIA_BUCKET)
          .getPublicUrl(path);
        const publicUrl = pub.publicUrl;

        const kind = contentType.startsWith("video/") ? "video" : "image";

        const { data: row, error: dbErr } = await supabase
          .from("user_media")
          .insert({
            user_id: user.id,
            file_name: file.name,
            storage_path: path,
            public_url: publicUrl,
            mime_type: contentType,
            file_size_bytes: file.size,
            kind,
          })
          .select("id")
          .single();

        if (dbErr || !row) {
          setError(dbErr?.message ?? "Saved file but could not add to gallery.");
          setProgress(100);
          setUrl(publicUrl);
          return null;
        }

        setProgress(100);
        setUrl(publicUrl);
        return { mediaId: row.id as string, publicUrl };
      } catch (err) {
        clearProgressInterval();
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        return null;
      } finally {
        clearProgressInterval();
        uploadInFlightRef.current = false;
        setIsUploading(false);
      }
    },
    [clearProgressInterval]
  );

  const reset = useCallback(() => {
    clearProgressInterval();
    uploadInFlightRef.current = false;
    setIsUploading(false);
    setProgress(0);
    setUrl(null);
    setError(null);
  }, [clearProgressInterval]);

  return { upload, isUploading, progress, url, error, reset };
}
