"use client";

import { Calendar } from "lucide-react";
import { AddDayModalProps } from "../types";
import { getMinDate, getMaxDate } from "../catering-order-helpers";

export default function AddDayModal({
  isOpen,
  newDayDate,
  onDateChange,
  onConfirm,
  onClose,
}: AddDayModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Add New Day</h3>
            <p className="text-sm text-gray-500">
              Select a date for your event
            </p>
          </div>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date
          </label>
          <input
            type="date"
            value={newDayDate}
            onChange={(e) => onDateChange(e.target.value)}
            min={getMinDate()}
            max={getMaxDate()}
            className="w-full px-4 py-3 border border-base-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none bg-white min-w-0 box-border"
            style={{ WebkitAppearance: "none" }}
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-base-300 text-gray-600 rounded-xl hover:bg-base-100 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium"
          >
            Add Day
          </button>
        </div>
      </div>
    </div>
  );
}
