"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { SessionEditorProps } from "./types";
import {
  HOUR_12_OPTIONS,
  MINUTE_OPTIONS,
  getMinDate,
  getMaxDate,
  formatTime,
  parseEventTime,
  formatTo24Hour,
} from "./catering-order-helpers";

export default function SessionEditor({
  session,
  sessionIndex,
  onUpdate,
  onClose,
  restaurants,
}: SessionEditorProps) {
  const [sessionName, setSessionName] = useState(session.sessionName);
  const [sessionDate, setSessionDate] = useState(session.sessionDate);
  const [selectedHour, setSelectedHour] = useState(() => {
    if (session.eventTime) {
      return parseEventTime(session.eventTime).hour;
    }
    return "";
  });
  const [selectedMinute, setSelectedMinute] = useState(() => {
    if (session.eventTime) {
      return parseEventTime(session.eventTime).minute;
    }
    return "00";
  });
  const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">(() => {
    if (session.eventTime) {
      return parseEventTime(session.eventTime).period;
    }
    return "AM";
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleCancel = () => {
    onClose(true);
  };

  const handleSave = () => {
    // Clear any previous errors
    setValidationError(null);

    // Calculate event time if hour and minute are set
    let eventTime = "";
    if (selectedHour && selectedMinute) {
      eventTime = formatTo24Hour(selectedHour, selectedMinute, selectedPeriod);
    }

    // Validate that date and time are set before saving
    if (!sessionDate) {
      setValidationError("Please select a date for this session.");
      return;
    }
    if (!eventTime) {
      setValidationError("Please select a time for this session.");
      return;
    }

    // Validate catering operation hours
    // Get unique restaurant IDs from session items
    const restaurantIds = new Set(
      session.orderItems.map((oi) => oi.item.restaurantId)
    );

    // Check each restaurant's catering hours
    for (const restaurantId of restaurantIds) {
      const restaurant = restaurants.find((r) => r.id === restaurantId);
      if (!restaurant) continue;

      const cateringHours = restaurant.cateringOperatingHours;
      if (!cateringHours || cateringHours.length === 0) continue;

      // Get day of week from selected date
      const selectedDateTime = new Date(sessionDate + "T00:00:00");
      const dayOfWeek = selectedDateTime
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();

      // Find the schedule for this day
      const daySchedule = cateringHours.find(
        (schedule) => schedule.day.toLowerCase() === dayOfWeek
      );

      if (!daySchedule || !daySchedule.enabled) {
        setValidationError(
          `${restaurant.restaurant_name} does not accept event orders on ${dayOfWeek}s. Please select a different date.`
        );
        return;
      }

      // Check if time is within operating hours
      if (daySchedule.open && daySchedule.close) {
        const [eventHour, eventMinute] = eventTime.split(":").map(Number);
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
      eventTime,
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
            <div className="flex items-center gap-2">
              <select
                value={selectedHour}
                onChange={(e) => {
                  setSelectedHour(e.target.value);
                  setValidationError(null);
                }}
                className="flex-1 px-4 py-3 border border-base-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">HH</option>
                {HOUR_12_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="text-gray-400">:</span>
              <select
                value={selectedMinute}
                onChange={(e) => {
                  setSelectedMinute(e.target.value);
                  setValidationError(null);
                }}
                className="flex-1 px-4 py-3 border border-base-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {MINUTE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={selectedPeriod}
                onChange={(e) => {
                  setSelectedPeriod(e.target.value as "AM" | "PM");
                  setValidationError(null);
                }}
                className="flex-1 px-4 py-3 border border-base-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
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
