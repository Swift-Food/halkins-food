"use client";

import { RestaurantMinOrderStatus } from "@/lib/utils/catering-min-order-validation";

interface MinOrderModalProps {
  sessionName: string;
  validationStatus: RestaurantMinOrderStatus[];
  onClose: () => void;
  onNavigateToSection?: (restaurantId: string, section: string) => void;
}

export default function MinOrderModal({
  sessionName,
  validationStatus,
  onClose,
  onNavigateToSection,
}: MinOrderModalProps) {
  const unmetRequirements = validationStatus
    .filter((status) => !status.isValid)
    .flatMap((status) =>
      status.sections
        .filter((section) => !section.isMet)
        .map((section) => ({
          restaurantId: status.restaurantId,
          restaurantName: status.restaurantName,
          section: section.section,
          current: section.currentQuantity,
          required: section.minQuantity,
          needed: section.minQuantity - section.currentQuantity,
        }))
    );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-amber-600"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Minimum Order Not Met
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {sessionName} needs a few more items
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-4">
          <p className="text-sm text-gray-600 mb-4">
            Please add the following to continue:
          </p>
          <div className="space-y-3">
            {unmetRequirements.map((req, idx) => (
              <button
                key={idx}
                onClick={() => onNavigateToSection?.(req.restaurantId, req.section)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {req.section}
                    </p>
                    <p className="text-xs text-gray-500">
                      {req.restaurantName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-amber-600">
                      +{req.needed} more
                    </p>
                    <p className="text-xs text-gray-400">
                      {req.current}/{req.required} added
                    </p>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors"
          >
            Add More Items
          </button>
        </div>
      </div>
    </div>
  );
}
