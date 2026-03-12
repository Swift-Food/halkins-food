"use client";

import { CateringBundleResponse } from "@/types/api/catering.api.types";
import { Package } from "lucide-react";

interface BundleCardProps {
  bundle: CateringBundleResponse;
  onAdd: (bundle: CateringBundleResponse) => void;
  isAdding?: boolean;
}

export default function BundleCard({ bundle, onAdd, isAdding }: BundleCardProps) {
  return (
    <div className="border-2 border-primary/20 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md hover:border-primary/40 transition-all">
      {bundle.imageUrl ? (
        <img
          src={bundle.imageUrl}
          alt={bundle.name}
          className="w-full h-40 object-cover"
        />
      ) : (
        <div className="w-full h-32 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
          <Package className="w-12 h-12 text-primary/40" />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-gray-900 text-lg">{bundle.name}</h3>
          <div className="flex-shrink-0 text-right">
            <p className="text-lg font-bold text-primary">
              £{Number(bundle.pricePerPerson).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">per person</p>
          </div>
        </div>

        {bundle.description && (
          <p className="text-sm text-gray-600 mb-3">{bundle.description}</p>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            {bundle.items.length} items
          </span>
          <span>Serves {bundle.baseGuestCount}+</span>
        </div>

        <div className="space-y-1.5 mb-4">
          {bundle.items
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .slice(0, 5)
            .map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0" />
                <span className="text-gray-700 truncate">{item.menuItemName}</span>
                <span className="text-gray-400 flex-shrink-0">×{item.quantity}</span>
              </div>
            ))}
          {bundle.items.length > 5 && (
            <p className="text-xs text-gray-400 pl-3.5">
              +{bundle.items.length - 5} more items
            </p>
          )}
        </div>

        <button
          onClick={() => onAdd(bundle)}
          disabled={isAdding}
          className="w-full py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
  );
}
