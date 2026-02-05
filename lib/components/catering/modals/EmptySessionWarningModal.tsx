"use client";

import { EmptySessionWarningModalProps } from "../types";

export default function EmptySessionWarningModal({
  sessionName,
  onRemove,
  onAddItems,
}: EmptySessionWarningModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Empty Session</h3>
            <p className="text-sm text-gray-500">{sessionName} has no items</p>
          </div>
        </div>
        <p className="text-gray-600 mb-6">
          This session doesn&apos;t have any items. Would you like to add items
          or remove it?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onRemove}
            className="flex-1 px-4 py-3 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors font-medium"
          >
            Remove Session
          </button>
          <button
            onClick={onAddItems}
            className="flex-1 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium"
          >
            Add Items
          </button>
        </div>
      </div>
    </div>
  );
}
