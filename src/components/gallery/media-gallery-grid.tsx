"use client";

import type { UserMediaRow } from "@/types/database";
import type { MediaKind } from "@/types/media";
import { cn } from "@/lib/utils";
import { GalleryMediaCard } from "@/components/gallery/gallery-media-card";

interface MediaGalleryGridProps {
  items: UserMediaRow[];
  allowedKinds: readonly MediaKind[];
  selectedId?: string | null;
  onSelect: (row: UserMediaRow) => void;
  className?: string;
}

/**
 * Selectable grid of gallery items (same card as the main Gallery page),
 * filtered by image vs video.
 */
export function MediaGalleryGrid({
  items,
  allowedKinds,
  selectedId,
  onSelect,
  className,
}: MediaGalleryGridProps) {
  const filtered = items.filter((i) =>
    allowedKinds.includes(i.kind as MediaKind)
  );

  if (filtered.length === 0) {
    return (
      <p className="text-xs text-text-muted py-4 text-center rounded-lg border border-dashed border-border">
        No matching items in your gallery. Upload a file or open the Gallery
        page to sync from storage.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[min(70vh,36rem)] overflow-y-auto pr-1",
        className
      )}
    >
      {filtered.map((row) => (
        <GalleryMediaCard
          key={row.id}
          row={row}
          variant="selectable"
          selected={selectedId === row.id}
          onSelect={() => onSelect(row)}
        />
      ))}
    </div>
  );
}
