"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { CateringBundleResponse } from "@/types/api/catering.api.types";
import { Package, Minus, Plus } from "lucide-react";

const DIETARY_ICON_MAP: Record<string, { file: string; label: string }> = {
  vegetarian: { file: "vegetarian.png", label: "Vegetarian" },
  vegan: { file: "vegan.png", label: "Vegan" },
  halal: { file: "halal.png", label: "Halal" },
  pescatarian: { file: "pescatarian.png", label: "Pescatarian" },
  no_nut: { file: "no_nut.png", label: "Nut-Free" },
  no_dairy: { file: "no_dairy.png", label: "Dairy-Free" },
};

interface BundleDetailModalProps {
  bundle: CateringBundleResponse;
  defaultQuantity: number;
  isAdding: boolean;
  onAdd: (bundle: CateringBundleResponse, quantity: number) => void;
  onClose: () => void;
}

export default function BundleDetailModal({
  bundle,
  defaultQuantity,
  isAdding,
  onAdd,
  onClose,
}: BundleDetailModalProps) {
  const baseGuestCount = bundle.baseGuestCount ?? 1;
  const [guestCountInput, setGuestCountInput] = useState(String(Math.max(1, defaultQuantity) * baseGuestCount));
  const guestCount = Math.max(1, parseInt(guestCountInput, 10) || 1);
  const [roundUp, setRoundUp] = useState(true);
  const [showDescriptions, setShowDescriptions] = useState(false);

  const exactBundles = guestCount / baseGuestCount;
  const bundlesFloor = Math.max(1, Math.floor(exactBundles));
  const bundlesCeil = Math.ceil(exactBundles);
  const isExact = Number.isInteger(exactBundles);
  const quantity = isExact ? bundlesCeil : (roundUp ? bundlesCeil : bundlesFloor);
  const peopleServed = baseGuestCount * quantity;

  const sortedItems = [...bundle.items].sort((a, b) => a.sortOrder - b.sortOrder);
  const hasAnyDescription = bundle.items.some((item) => !!item.menuItemDescription);

  const estimatedTotal = useMemo(() => {
    let total = 0;
    for (const item of bundle.items) {
      const scaledQty = item.quantity * quantity;
      const addonTotal = (item.selectedAddons || []).reduce(
        (sum, a) => sum + Number(a.price ?? 0) * (a.quantity || 0),
        0
      );
      total += item.menuItemPrice * scaledQty + addonTotal * quantity;
    }
    return total;
  }, [bundle.items, quantity]);

  const estimatedPricePerPerson = peopleServed > 0 ? estimatedTotal / peopleServed : 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60] sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[85vh] sm:max-w-lg rounded-none sm:rounded-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-lg text-gray-900">{bundle.name}</h3>
            {bundle.description && (
              <div className="mt-1 max-h-[4.5rem] overflow-y-auto pr-1">
                <p className="text-sm leading-6 text-gray-500">
                  {bundle.description}
                </p>
              </div>
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
        {hasAnyDescription && <div className="px-4 py-2 border-b border-base-200">
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
        </div>}

        {/* Guest count selector */}
        <div className="px-4 py-3 border-b border-base-200 bg-base-100/50">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Number of guests</p>
                <p className="text-xs text-gray-500">
                  {quantity} bundle{quantity !== 1 ? "s" : ""} • Serves ~{peopleServed} people
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setGuestCountInput((v) => String(Math.max(1, (parseInt(v, 10) || 1) - 1)))}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-base-300 hover:bg-base-200 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={guestCountInput}
                  onChange={(e) => setGuestCountInput(e.target.value.replace(/\D/g, ""))}
                  onBlur={() => setGuestCountInput(String(Math.max(1, parseInt(guestCountInput, 10) || 1)))}
                  className="w-14 text-center font-bold text-lg border border-base-300 rounded-lg py-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  onClick={() => setGuestCountInput((v) => String((parseInt(v, 10) || 1) + 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-base-300 hover:bg-base-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            {!isExact && (
              <div className="flex gap-2">
                <button
                  onClick={() => setRoundUp(false)}
                  className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                    !roundUp
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-base-300 text-gray-600 hover:bg-base-100"
                  }`}
                >
                  ↓ {bundlesFloor} bundle{bundlesFloor !== 1 ? "s" : ""} (~{bundlesFloor * baseGuestCount} people)
                </button>
                <button
                  onClick={() => setRoundUp(true)}
                  className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                    roundUp
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-base-300 text-gray-600 hover:bg-base-100"
                  }`}
                >
                  ↑ {bundlesCeil} bundle{bundlesCeil !== 1 ? "s" : ""} (~{bundlesCeil * baseGuestCount} people)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Items list */}
        <div className="overflow-y-auto flex-1 divide-y divide-base-200">
          {sortedItems.map((item) => {
            const scaledQty = item.quantity * quantity;
            const addonTotal = (item.selectedAddons || []).reduce(
              (sum, a) => sum + Number(a.price ?? 0) * (a.quantity || 0),
              0
            );
            const lineTotal = item.menuItemPrice * scaledQty + addonTotal * quantity;
            const dietaryFilters = item.menuItemDietaryFilters || [];
            const servesCount = scaledQty * (item.menuItemFeedsPerUnit || 1);
            return (
              <div key={item.id} className="px-4 py-2">
                <div className="flex items-stretch gap-3">
                  {/* Quantity */}
                  <div className="flex-shrink-0 flex items-center justify-center">
                    <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      ×{scaledQty}
                    </span>
                  </div>
                  {/* Image */}
                  <div className="relative flex-shrink-0 w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-base-200">
                    {item.menuItemImageUrl ? (
                      <Image
                        src={item.menuItemImageUrl}
                        alt={item.menuItemName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{item.menuItemName}</p>
                    {(servesCount > 0 || dietaryFilters.length > 0) && (
                      <div className="mt-1 flex flex-wrap gap-1.5 items-center">
                        {servesCount > 0 && <span className="text-[11px] text-gray-500">Serves ~{servesCount}</span>}
                        {dietaryFilters.slice(0, 4).map((filter) => {
                          const icon = DIETARY_ICON_MAP[filter.toLowerCase()];
                          if (!icon) return null;
                          return (
                            <div key={`${item.id}-${filter}`} className="relative w-4 h-4" title={icon.label}>
                              <Image src={`/dietary-icons/unfilled/${icon.file}`} alt={icon.label} fill className="object-contain" />
                            </div>
                          );
                        })}
                        {dietaryFilters.length > 4 && (
                          <span className="text-[10px] text-gray-500">+{dietaryFilters.length - 4}</span>
                        )}
                      </div>
                    )}
                    {showDescriptions && item.menuItemDescription && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.menuItemDescription}</p>
                    )}
                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {item.selectedAddons.map((addon, i) => (
                          <p key={i} className="text-xs text-gray-500">
                            • {addon.groupTitle ?? "Options"}: {addon.name}
                            {addon.quantity > 1 && ` (×${addon.quantity})`}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-bold text-gray-800 flex-shrink-0 pt-1">
                    £{lineTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-base-200 space-y-3">
          <p className="text-xs text-gray-500 text-center">
            You can change individual item amounts after adding to your session.
          </p>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">Estimated total</p>
              <p className="text-xs text-gray-500">
                {bundle.items.length} items • Serves ~{peopleServed} people
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-primary">£{estimatedTotal.toFixed(2)}</p>
              <p className="text-xs text-gray-500">
                £{estimatedPricePerPerson.toFixed(2)}/person
              </p>
            </div>
          </div>

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
