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
  onSelect: (venue: CoworkingVenue) => void;
  onViewDetails: (venue: CoworkingVenue) => void;
}

export default function VenueCard({
  venue,
  isSelected,
  imageLoading = "lazy",
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

  return (
    <button
      type="button"
      onClick={() => onSelect(venue)}
      className={`relative flex h-full flex-col overflow-hidden rounded-[1.6rem] text-left transition-all group ${
        isSelected
          ? "ring-2 ring-primary/80 border-primary/30 bg-white"
          : "border border-slate-200/80 bg-white hover:-translate-y-0.5 hover:border-primary/40"
      }`}
    >
      {/* Photo area */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-200">
        {currentPhoto ? (
          <Image
            src={currentPhoto}
            alt={`${venue.name} photo ${photoIndex + 1}`}
            fill
            loading={imageLoading}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 80vw"
            className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
              isSelected ? "scale-105" : ""
            }`}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-gray-200 to-gray-300" />
        )}

        {/* Arrow buttons */}
        {hasMultiplePhotos && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 shadow-md transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-4 w-4 text-slate-700" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 shadow-md transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100"
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
          <div className="absolute right-3 top-3 flex max-w-[75%] flex-wrap justify-end gap-2">
            {formattedTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-primary/25 bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="flex flex-1 flex-col bg-white p-4">
        <p className="text-base font-semibold text-slate-900">{venue.name}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
            <Users className="h-3.5 w-3.5" />
            Up to {venue.capacity} guests
          </span>
          <button
            type="button"
            onClick={handleDetailsClick}
            className="text-xs font-semibold text-primary hover:underline shrink-0"
          >
            Details →
          </button>
        </div>
      </div>
    </button>
  );
}
