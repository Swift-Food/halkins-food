"use client";

import { useState, useMemo } from "react";
import { CateringBundleResponse } from "@/types/api/catering.api.types";
import { MenuItem } from "@/types/restaurant.types";
import { Package, Minus, Plus } from "lucide-react";

interface BundleDetailModalProps {
  bundle: CateringBundleResponse;
  defaultQuantity: number;
  isAdding: boolean;
  onAdd: (bundle: CateringBundleResponse, quantity: number) => void;
  onClose: () => void;
  allMenuItems?: MenuItem[] | null;
}

export default function BundleDetailModal({
  bundle,
  defaultQuantity,
  isAdding,
  onAdd,
  onClose,
  allMenuItems,
}: BundleDetailModalProps) {
  const [quantity, setQuantity] = useState(Math.max(1, defaultQuantity));
  const [showDescriptions, setShowDescriptions] = useState(false);

  const sortedItems = [...bundle.items].sort((a, b) => a.sortOrder - b.sortOrder);

  // Build lookup maps for item details (descriptions + prices)
  const menuItemLookup = useMemo(() => {
    if (!allMenuItems) return new Map<string, MenuItem>();
    const map = new Map<string, MenuItem>();
    for (const mi of allMenuItems) {
      map.set(mi.id, mi);
    }
    return map;
  }, [allMenuItems]);

  // Calculate real total from actual menu item prices
  const estimatedTotal = useMemo(() => {
    let total = 0;
    for (const item of bundle.items) {
      const mi = menuItemLookup.get(item.menuItemId);
      if (!mi) continue;
      const price = mi.isDiscount && mi.discountPrice
        ? parseFloat(mi.discountPrice.toString())
        : parseFloat(mi.price?.toString() || "0");
      const addonTotal = (item.selectedAddons || []).reduce(
        (sum, a) => sum + (a.price || 0) * (a.quantity || 0),
        0
      );
      const scaledQty = item.quantity * quantity;
      total += price * scaledQty + addonTotal * quantity;
    }
    return total;
  }, [bundle.items, menuItemLookup, quantity]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60]">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-base-200 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-lg text-gray-900">{bundle.name}</h3>
            {bundle.description && (
              <p className="text-sm text-gray-500 mt-1">{bundle.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-base-200 transition-colors flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Show descriptions toggle */}
        <div className="px-4 py-2 border-b border-base-200">
          <button
            onClick={() => setShowDescriptions((v) => !v)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showDescriptions
                ? "border-primary bg-primary/10 text-primary"
                : "border-base-300 text-gray-600 hover:bg-base-100"
            }`}
          >
            {showDescriptions ? "Hide" : "Show"} item descriptions
          </button>
        </div>

        {/* Quantity selector */}
        <div className="px-4 py-3 border-b border-base-200 bg-base-100/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Number of guests</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-base-300 hover:bg-base-200 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1) setQuantity(val);
                }}
                className="w-14 text-center font-bold text-lg border border-base-300 rounded-lg py-1"
                min={1}
              />
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-base-300 hover:bg-base-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Items list */}
        <div className="overflow-y-auto flex-1 divide-y divide-base-200">
          {sortedItems.map((item) => {
            const scaledQty = item.quantity * quantity;
            const mi = menuItemLookup.get(item.menuItemId);
            const unitPrice = mi
              ? (mi.isDiscount && mi.discountPrice
                  ? parseFloat(mi.discountPrice.toString())
                  : parseFloat(mi.price?.toString() || "0"))
              : 0;
            const addonTotal = (item.selectedAddons || []).reduce(
              (sum, a) => sum + (a.price || 0) * (a.quantity || 0),
              0
            );
            const lineTotal = unitPrice * scaledQty + addonTotal * quantity;
            return (
              <div key={item.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                    ×{scaledQty}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{item.menuItemName}</p>
                    {showDescriptions && menuItemLookup.get(item.menuItemId)?.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {menuItemLookup.get(item.menuItemId)!.description}
                      </p>
                    )}
                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {item.selectedAddons.map((addon, i) => (
                          <p key={i} className="text-xs text-gray-500">
                            • {addon.groupTitle}: {addon.name}
                            {addon.quantity > 1 && ` (×${addon.quantity})`}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  {mi && (
                    <span className="text-sm font-bold text-gray-800 flex-shrink-0">
                      £{lineTotal.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-base-200 space-y-3">
          {/* Note */}
          <p className="text-xs text-gray-500 text-center">
            You can change individual item amounts after adding to your session.
          </p>

          {/* Estimated total */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">Estimated total</p>
              <p className="text-xs text-gray-500">
                {bundle.items.length} items × {quantity} guests
              </p>
            </div>
            <p className="text-xl font-bold text-primary">£{estimatedTotal.toFixed(2)}</p>
          </div>

          {/* Add button */}
          <button
            onClick={() => onAdd(bundle, quantity)}
            disabled={isAdding}
            className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAdding ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                Adding...
              </>
            ) : (
              <>
                <Package className="w-4 h-4" />
                Add Bundle to Session
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
