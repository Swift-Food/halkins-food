"use client";

import { X } from "lucide-react";
import { RemoveSessionConfirmModalProps } from "../types";

export default function RemoveSessionConfirmModal({
  sessionName,
  onConfirm,
  onCancel,
}: RemoveSessionConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <X className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Remove Session</h3>
            <p className="text-sm text-gray-500">{sessionName}</p>
          </div>
        </div>
        <p className="text-gray-600 mb-6">
          Are you sure you want to remove this session? This will delete all
          items in the session.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 border border-base-300 text-gray-600 rounded-xl hover:bg-base-100 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
