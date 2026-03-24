"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { CoworkingVenue } from "@/types/api";

function formatAttendanceTag(tag: string): string {
  return tag
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

interface VenueCardProps {
  venue: CoworkingVenue;
  isSelected: boolean;
  imageLoading?: "eager" | "lazy";
  horizontal?: boolean;
  onSelect: (venue: CoworkingVenue) => void;
  onViewDetails: (venue: CoworkingVenue) => void;
}

export default function VenueCard({
  venue,
  isSelected,
  imageLoading = "lazy",
  horizontal = false,
  onSelect,
  onViewDetails,
}: VenueCardProps) {
  const photos = [
    venue.coverPhoto,
    ...(venue.galleryPhotos ?? []),
  ].filter((p): p is string => Boolean(p));

  const [photoIndex, setPhotoIndex] = useState(0);

  const currentPhoto = photos[photoIndex] ?? null;
  const hasMultiplePhotos = photos.length > 1;

  const formattedTags = (venue.attendanceTags ?? [])
    .filter((tag): tag is string => Boolean(tag))
    .map(formatAttendanceTag);

  function handlePrev(e: React.MouseEvent) {
    e.stopPropagation();
    setPhotoIndex((i) => (i - 1 + photos.length) % photos.length);
  }

  function handleNext(e: React.MouseEvent) {
    e.stopPropagation();
    setPhotoIndex((i) => (i + 1) % photos.length);
  }

  function handleDetailsClick(e: React.MouseEvent) {
    e.stopPropagation();
    onViewDetails(venue);
  }

  function handleCardClick() {
    if (window.matchMedia("(max-width: 639px)").matches) {
      onViewDetails(venue);
    } else {
      onSelect(venue);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCardClick}
      className={`relative overflow-hidden rounded-[1.6rem] text-left transition-all group ${
        horizontal ? "flex flex-row sm:flex-col h-auto sm:h-full" : "flex flex-col h-full"
      } ${
        isSelected
          ? "ring-2 ring-primary/80 border-primary/30 bg-white"
          : "border border-slate-200/80 bg-white hover:border-primary/40"
      }`}
    >
      {/* Photo area */}
      <div
        className={`relative overflow-hidden bg-gray-200 flex-shrink-0 ${
          horizontal
            ? "w-[38%] sm:w-full sm:h-44 self-stretch sm:self-auto"
            : "h-44 w-full"
        }`}
      >
        {currentPhoto ? (
          <Image
            src={currentPhoto}
            alt={`${venue.name} photo ${photoIndex + 1}`}
            fill
            loading={imageLoading}
            sizes="(min-width: 640px) 33vw, 40vw"
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-gray-200 to-gray-300" />
        )}

        {/* Arrow buttons — desktop only */}
        {hasMultiplePhotos && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 items-center justify-center rounded-full bg-white/85 shadow-md transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-4 w-4 text-slate-700" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 items-center justify-center rounded-full bg-white/85 shadow-md transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Next photo"
            >
              <ChevronRight className="h-4 w-4 text-slate-700" />
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 pointer-events-none">
              {photos.map((_, i) => (
                <span
                  key={i}
                  className={`block h-1.5 w-1.5 rounded-full transition-colors ${
                    i === photoIndex ? "bg-white" : "bg-white/40"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Attendance tags */}
        {formattedTags.length > 0 && (
          <div className="absolute right-2 top-2 flex max-w-[90%] flex-wrap justify-end gap-1">
            {formattedTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-primary/25 bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white shadow-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="flex flex-1 flex-col bg-white p-3 sm:p-4 justify-center">
        <p className="text-sm font-semibold text-slate-900 leading-snug">{venue.name}</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
            <Users className="h-3.5 w-3.5 shrink-0" />
            {venue.capacity}
          </span>
          <button
            type="button"
            onClick={handleDetailsClick}
            className="shrink-0 rounded-lg bg-primary/8 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
          >
            Details →
          </button>
        </div>
      </div>
    </button>
  );
}
