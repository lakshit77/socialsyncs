"use client";

import type { ReactElement } from "react";
import type { UserMediaRow } from "@/types/database";
import { cn } from "@/lib/utils";
import {
  displayName,
  formatBytes,
  formatDate,
  mediaCategory,
} from "@/lib/gallery-display";
import { File, Play } from "lucide-react";

const shellClassName =
  "rounded-xl border bg-surface-elevated overflow-hidden transition-colors";

function GalleryMediaCardBody({ row }: { row: UserMediaRow }): ReactElement {
  const cat = mediaCategory(row);
  const name = displayName(row);

  return (
    <>
      {cat === "video" ? (
        <div className="relative w-full aspect-[4/3] bg-surface flex items-center justify-center overflow-hidden">
          <video
            src={row.public_url}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-charcoal/15"
            aria-hidden
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-charcoal/55 text-white shadow-lg ring-2 ring-white/30">
              <Play
                size={22}
                className="ml-0.5"
                fill="currentColor"
                strokeWidth={0}
              />
            </div>
          </div>
        </div>
      ) : cat === "image" ? (
        <div className="relative w-full aspect-[4/3]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={row.public_url}
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="relative w-full aspect-[4/3] bg-surface flex items-center justify-center">
          <File size={28} className="text-text-muted" strokeWidth={1.8} />
        </div>
      )}
      <div className="p-2.5">
        <p className="text-xs font-semibold text-foreground truncate">{name}</p>
        <div className="mt-1 flex items-center justify-between text-[11px] text-text-muted">
          <span>{formatBytes(row.file_size_bytes)}</span>
          <span>{formatDate(row.created_at)}</span>
        </div>
      </div>
    </>
  );
}

export type GalleryMediaCardProps =
  | {
      row: UserMediaRow;
      variant: "link";
      className?: string;
    }
  | {
      row: UserMediaRow;
      variant: "selectable";
      selected?: boolean;
      onSelect: () => void;
      className?: string;
    };

/**
 * Shared gallery tile: preview (video / image / other), filename, size, and date.
 * Use `link` on the Gallery page (opens media in a new tab) or `selectable` in pickers.
 */
export function GalleryMediaCard(props: GalleryMediaCardProps): ReactElement {
  if (props.variant === "link") {
    return (
      <a
        href={props.row.public_url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          shellClassName,
          "border-border hover:border-primary/40",
          props.className
        )}
      >
        <GalleryMediaCardBody row={props.row} />
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={props.onSelect}
      className={cn(
        shellClassName,
        "text-left w-full",
        props.selected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-primary/40",
        props.className
      )}
    >
      <GalleryMediaCardBody row={props.row} />
    </button>
  );
}
