"use client";

import { useRef, useState, useCallback } from "react";
import { LayoutGrid, GalleryHorizontalEnd } from "lucide-react";
import { CoworkingVenue } from "@/types/api";
import VenueCard from "./VenueCard";
import VenueDetailsModal from "./VenueDetailsModal";

interface VenuePickerProps {
  venues: CoworkingVenue[];
  selectedVenue: CoworkingVenue | null;
  imageLoading?: "eager" | "lazy";
  onVenueChange: (venue: CoworkingVenue) => void;
}

export default function VenuePicker({
  venues,
  selectedVenue,
  imageLoading = "lazy",
  onVenueChange,
}: VenuePickerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [detailVenue, setDetailVenue] = useState<CoworkingVenue | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const progress = max > 0 ? el.scrollLeft / max : 1;
    setActiveIndex(Math.round(progress * (venues.length - 1)));
    setAtEnd(progress >= 0.98);
  }, [venues.length]);

  if (venues.length === 0) return null;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">
            Pick the space that fits your event
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Select your preferred venue before continuing to the menu.
          </p>
        </div>

        {venues.length > 2 && (
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 ml-4"
          >
            {isExpanded ? (
              <>
                <GalleryHorizontalEnd className="h-3.5 w-3.5" />
                Carousel
              </>
            ) : (
              <>
                <LayoutGrid className="h-3.5 w-3.5" />
                Grid view
              </>
            )}
          </button>
        )}
      </div>

      {isExpanded ? (
        /* Responsive grid — max 3 cols */
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {venues.map((venue) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              isSelected={selectedVenue?.id === venue.id}
              imageLoading={imageLoading}
              onSelect={onVenueChange}
              onViewDetails={setDetailVenue}
            />
          ))}
        </div>
      ) : (
        /* Horizontal carousel */
        <div className="space-y-3">
          <div className="relative">
            {/* Right-edge fade — hidden once scrolled to end */}
            <div
              className={`pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white/90 to-transparent z-10 transition-opacity duration-300 ${
                atEnd ? "opacity-0" : "opacity-100"
              }`}
            />
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="-mx-1 overflow-x-auto pb-2 scrollbar-hide"
            >
              <div className="flex gap-4 px-1 min-w-0">
                {venues.map((venue) => (
                  <div key={venue.id} className="w-[260px] shrink-0 sm:w-[280px]">
                    <VenueCard
                      venue={venue}
                      isSelected={selectedVenue?.id === venue.id}
                      imageLoading={imageLoading}
                      onSelect={onVenueChange}
                      onViewDetails={setDetailVenue}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dot indicators */}
          {venues.length > 1 && (
            <div className="flex justify-center gap-1.5 pt-1" aria-hidden="true">
              {venues.map((_, i) => (
                <span
                  key={i}
                  className={`block rounded-full transition-all duration-300 ${
                    i === activeIndex
                      ? "w-4 h-1.5 bg-primary"
                      : "w-1.5 h-1.5 bg-slate-300"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {detailVenue && (
        <VenueDetailsModal
          venue={detailVenue}
          onClose={() => setDetailVenue(null)}
          onSelect={(venue) => {
            onVenueChange(venue);
            setDetailVenue(null);
          }}
        />
      )}
    </>
  );
}
