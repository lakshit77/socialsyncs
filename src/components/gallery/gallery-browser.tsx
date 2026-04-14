"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Search,
  Grid3X3,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import type { UserMediaRow } from "@/types/database";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { displayName, mediaCategory } from "@/lib/gallery-display";
import { GalleryMediaCard } from "@/components/gallery/gallery-media-card";

interface GalleryBrowserProps {
  initialItems: UserMediaRow[];
}

type MediaFilter = "all" | "image" | "video" | "other";

export function GalleryBrowser({ initialItems }: GalleryBrowserProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MediaFilter>("all");
  const { upload, isUploading, progress, error } = useMediaUpload();

  const items = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return initialItems.filter((row) => {
      const matchesQuery =
        trimmed.length === 0 ||
        displayName(row).toLowerCase().includes(trimmed);
      const category = mediaCategory(row);
      const matchesFilter = filter === "all" || category === filter;
      return matchesQuery && matchesFilter;
    });
  }, [initialItems, query, filter]);

  async function onSelectFile(file: File): Promise<void> {
    const result = await upload(file);
    if (result) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.8px] font-[family-name:var(--font-heading)] text-foreground">
            Gallery
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Manage and organize your media files
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void onSelectFile(file);
              }
              e.target.value = "";
            }}
          />
          <Button
            loading={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-4"
          >
            <Upload size={14} strokeWidth={1.8} />
            Upload Files
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files by name..."
          icon={Search}
        />
        <Button
          variant={filter === "all" ? "primary" : "secondary"}
          className="px-4"
          onClick={() => setFilter("all")}
        >
          <Grid3X3 size={14} strokeWidth={1.8} />
          All Files
        </Button>
        <Button
          variant={filter === "image" ? "primary" : "secondary"}
          className="px-4"
          onClick={() => setFilter("image")}
        >
          <ImageIcon size={14} strokeWidth={1.8} />
          Images
        </Button>
        <Button
          variant={filter === "video" ? "primary" : "secondary"}
          className="px-4"
          onClick={() => setFilter("video")}
        >
          <Video size={14} strokeWidth={1.8} />
          Videos
        </Button>
      </div>

      {error && <p className="text-xs text-error">{error}</p>}
      {isUploading && (
        <p className="text-xs text-text-muted">{progress}% uploaded</p>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-text-muted rounded-xl border border-dashed border-border p-8 text-center">
          No media found.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {items.map((row) => (
            <GalleryMediaCard key={row.id} row={row} variant="link" />
          ))}
        </div>
      )}
    </div>
  );
}
