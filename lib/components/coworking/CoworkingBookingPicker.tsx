"use client";

import { useCoworking } from "@/context/CoworkingContext";
import { BookingInfo } from "@/types/api";
import { MapPin, Clock, Check } from "lucide-react";

interface CoworkingBookingPickerProps {
  selectedBooking: BookingInfo | null;
  onSelect: (booking: BookingInfo | null) => void;
}

export default function CoworkingBookingPicker({
  selectedBooking,
  onSelect,
}: CoworkingBookingPickerProps) {
  const { bookings } = useCoworking();

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pt-8">
      <div className="bg-base-200/30 rounded-2xl p-6 border border-base-300 mb-6">
        <h3 className="text-lg font-bold mb-2">Deliver to Your Room</h3>
        <p className="text-sm text-gray-500 mb-4">
          Select a booking to have your order delivered to your room, or skip to
          enter a delivery address manually.
        </p>

        <div className="space-y-2">
          {bookings.map((booking) => {
            const isSelected = selectedBooking?.id === booking.id;
            return (
              <button
                key={booking.id}
                type="button"
                className={`w-full text-left rounded-lg p-3 transition-colors border ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-base-300 hover:border-primary/50 hover:bg-base-200"
                }`}
                onClick={() => onSelect(isSelected ? null : booking)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="font-medium text-sm">
                        {booking.roomLocationDetails || booking.reference}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 ml-6">
                      <Clock className="w-3 h-3" />
                      <span>
                        {formatTime(booking.startTime)} &ndash;{" "}
                        {formatTime(booking.endTime)}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span>Ref: {booking.reference}</span>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {selectedBooking && (
          <button
            type="button"
            className="text-sm text-gray-500 hover:text-gray-700 mt-3 underline"
            onClick={() => onSelect(null)}
          >
            Clear selection &mdash; I&apos;ll enter an address instead
          </button>
        )}
      </div>
    </div>
  );
}
