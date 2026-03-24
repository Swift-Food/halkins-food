"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Users, X } from "lucide-react";
import { CoworkingVenue } from "@/types/api";

function formatAttendanceTag(tag: string): string {
  return tag
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

interface VenueDetailsModalProps {
  venue: CoworkingVenue;
  onClose: () => void;
  onSelect: (venue: CoworkingVenue) => void;
}

export default function VenueDetailsModal({
  venue,
  onClose,
  onSelect,
}: VenueDetailsModalProps) {
  const photos = [
    venue.coverPhoto,
    ...(venue.galleryPhotos ?? []),
  ].filter((p): p is string => Boolean(p));

  const [activeIndex, setActiveIndex] = useState(0);

  const formattedTags = (venue.attendanceTags ?? [])
    .filter((tag): tag is string => Boolean(tag))
    .map(formatAttendanceTag);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function handlePrev() {
    setActiveIndex((i) => (i - 1 + photos.length) % photos.length);
  }

  function handleNext() {
    setActiveIndex((i) => (i + 1) % photos.length);
  }

  function handleSelect() {
    onSelect(venue);
    onClose();
  }

  const activePhoto = photos[activeIndex] ?? null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[92dvh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] bg-white shadow-2xl sm:max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero image */}
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-[2rem] bg-gray-200">
          {activePhoto ? (
            <Image
              src={activePhoto}
              alt={`${venue.name} photo ${activeIndex + 1}`}
              fill
              loading="eager"
              sizes="(min-width: 640px) 512px, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-gray-200 to-gray-300" />
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-opacity hover:opacity-75"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Arrow nav */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 shadow-md transition-opacity hover:opacity-75"
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-4 w-4 text-slate-700" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 shadow-md transition-opacity hover:opacity-75"
                aria-label="Next photo"
              >
                <ChevronRight className="h-4 w-4 text-slate-700" />
              </button>

              {/* Dot indicators */}
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                {photos.map((_, i) => (
                  <span
                    key={i}
                    className={`block h-1.5 w-1.5 rounded-full transition-colors ${
                      i === activeIndex ? "bg-white" : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-1 scrollbar-hide">
            {photos.map((photo, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                  i === activeIndex
                    ? "border-primary"
                    : "border-transparent opacity-60 hover:opacity-90"
                }`}
              >
                <Image
                  src={photo}
                  alt={`Thumbnail ${i + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="px-5 pt-4 pb-6 space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{venue.name}</h3>
            <span className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
              <Users className="h-4 w-4" />
              Up to {venue.capacity} guests
            </span>
          </div>

          {formattedTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formattedTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {venue.description && (
            <p className="text-sm leading-6 text-slate-600">{venue.description}</p>
          )}

          <button
            type="button"
            onClick={handleSelect}
            className="w-full rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:opacity-95 mt-2"
          >
            Select this venue
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
