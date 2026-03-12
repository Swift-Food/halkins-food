"use client";

import { useState } from "react";
import { MenuItem } from "@/types/restaurant.types";
import MenuItemModal from "../MenuItemModal";
import { ArrowLeftRight } from "lucide-react";

interface SwapItemModalProps {
  currentItem: MenuItem;
  alternatives: MenuItem[];
  isOpen: boolean;
  onClose: () => void;
  onSwap: (newItem: MenuItem) => void;
}

export default function SwapItemModal({
  currentItem,
  alternatives,
  isOpen,
  onClose,
  onSwap,
}: SwapItemModalProps) {
  const [selectedAlternative, setSelectedAlternative] = useState<MenuItem | null>(null);

  if (!isOpen) return null;

  if (selectedAlternative) {
    return (
      <MenuItemModal
        item={selectedAlternative}
        isOpen={true}
        onClose={() => setSelectedAlternative(null)}
        quantity={0}
        onAddItem={(configuredItem) => {
          onSwap(configuredItem);
          setSelectedAlternative(null);
        }}
      />
    );
  }

  const filteredAlternatives = alternatives.filter(
    (alt) => alt.id !== currentItem.id
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-base-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-gray-900">Swap Item</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Replace <span className="font-medium text-gray-700">{currentItem.menuItemName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-base-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {filteredAlternatives.length === 0 ? (
            <div className="text-center py-8">
              <ArrowLeftRight className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No alternatives available for this item.</p>
            </div>
          ) : (
            filteredAlternatives.map((alt) => {
              const price = parseFloat(alt.price?.toString() || "0");
              const discountPrice = parseFloat(alt.discountPrice?.toString() || "0");
              const displayPrice = alt.isDiscount && discountPrice > 0 ? discountPrice : price;

              return (
                <button
                  key={alt.id}
                  onClick={() => setSelectedAlternative(alt)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-base-200 hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                >
                  {alt.image ? (
                    <img
                      src={alt.image}
                      alt={alt.menuItemName}
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-base-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs text-gray-400">No img</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{alt.menuItemName}</p>
                    {alt.description && (
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{alt.description}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-primary">£{displayPrice.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">per unit</p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-base-200">
          <button
            onClick={onClose}
            className="w-full py-2.5 border border-base-300 text-gray-700 font-medium rounded-xl hover:bg-base-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
