"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { SessionEditorProps } from "./types";
import {
  getMinDate,
  getMaxDate,
  formatTime,
} from "./catering-order-helpers";

const PRESET_TIMES = [
  { value: "11:00", label: "11:00 AM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "18:00", label: "6:00 PM" },
];

export default function SessionEditor({
  session,
  sessionIndex,
  onUpdate,
  onClose,
  restaurants,
  eventStartDate,
  eventStartTime,
  eventEndDate,
  eventEndTime,
  existingDates = [],
}: SessionEditorProps) {
  const [sessionName, setSessionName] = useState(session.sessionName);
  const [sessionDate, setSessionDate] = useState(session.sessionDate);
  const [selectedTime, setSelectedTime] = useState(session.eventTime || "");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleCancel = () => {
    onClose(true);
  };

  const handleSave = () => {
    setValidationError(null);

    if (!sessionDate) {
      setValidationError("Please select a date for this session.");
      return;
    }
    if (!selectedTime) {
      setValidationError("Please select a time for this session.");
      return;
    }

    if (eventStartDate && eventStartTime && eventEndDate && eventEndTime) {
      const selectedDateTime = new Date(`${sessionDate}T${selectedTime}:00`);
      const eventStartDateTime = new Date(
        `${eventStartDate}T${eventStartTime}:00`
      );
      const eventEndDateTime = new Date(`${eventEndDate}T${eventEndTime}:00`);

      if (
        selectedDateTime < eventStartDateTime ||
        selectedDateTime > eventEndDateTime
      ) {
        const formatDateTime = (value: Date) =>
          value.toLocaleString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });

        setValidationError(
          `This session must be within the event window: ${formatDateTime(eventStartDateTime)} to ${formatDateTime(eventEndDateTime)}.`
        );
        return;
      }
    }

    // Validate catering operation hours
    const restaurantIds = new Set(
      session.orderItems.map((oi) => oi.item.restaurantId)
    );

    for (const restaurantId of restaurantIds) {
      const restaurant = restaurants.find((r) => r.id === restaurantId);
      if (!restaurant) continue;

      const cateringHours = restaurant.cateringOperatingHours;
      if (!cateringHours || cateringHours.length === 0) continue;

      const selectedDateTime = new Date(sessionDate + "T00:00:00");
      const dayOfWeek = selectedDateTime
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();

      const daySchedule = cateringHours.find(
        (schedule: any) => schedule.day.toLowerCase() === dayOfWeek
      );

      if (!daySchedule || !daySchedule.enabled) {
        setValidationError(
          `${restaurant.restaurant_name} does not accept event orders on ${dayOfWeek}s. Please select a different date.`
        );
        return;
      }

      if (daySchedule.open && daySchedule.close) {
        const [eventHour, eventMinute] = selectedTime.split(":").map(Number);
        const [openHour, openMinute] = daySchedule.open.split(":").map(Number);
        const [closeHour, closeMinute] = daySchedule.close
          .split(":")
          .map(Number);

        const eventMinutes = eventHour * 60 + eventMinute;
        const openMinutes = openHour * 60 + openMinute;
        const closeMinutes = closeHour * 60 + closeMinute;

        if (eventMinutes < openMinutes || eventMinutes > closeMinutes) {
          setValidationError(
            `${restaurant.restaurant_name} accepts event orders on ${dayOfWeek}s between ${formatTime(openHour, openMinute)} and ${formatTime(closeHour, closeMinute)}. Please select a time within these hours.`
          );
          return;
        }
      }
    }

    onUpdate(sessionIndex, {
      sessionName: sessionName || "Untitled Session",
      sessionDate,
      eventTime: selectedTime,
    });
    onClose(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Edit Session</h3>
            <p className="text-sm text-gray-500">Update session details</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Session Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Name
            </label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="e.g., Breakfast, Lunch, Dinner"
              className="w-full px-4 py-3 border border-base-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            {existingDates.length > 0 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-2">
                {existingDates.map((d) => {
                  const isActive = sessionDate === d.date;
                  return (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => {
                        setSessionDate(d.date);
                        setValidationError(null);
                      }}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg border transition-colors ${
                        isActive
                          ? "bg-primary text-white border-primary"
                          : "bg-base-100 text-gray-700 border-base-300 hover:border-primary"
                      }`}
                    >
                      <div className="text-[10px] font-medium opacity-80 text-center">
                        {d.dayName}
                      </div>
                      <div className="text-sm font-bold whitespace-nowrap">
                        {d.displayDate}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => {
                setSessionDate(e.target.value);
                setValidationError(null);
              }}
              min={getMinDate()}
              max={getMaxDate()}
              className="w-full px-4 py-3 border border-base-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none bg-white min-w-0 box-border"
              style={{ WebkitAppearance: "none" }}
            />
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_TIMES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setSelectedTime(opt.value);
                    setValidationError(null);
                  }}
                  className={`px-3 py-3 rounded-xl border text-sm font-medium transition-colors ${
                    selectedTime === opt.value
                      ? "border-primary bg-primary text-white"
                      : "border-base-300 text-gray-700 hover:bg-base-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-red-700">{validationError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-3 border border-base-300 text-gray-600 rounded-xl hover:bg-base-100 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
