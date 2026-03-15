"use client";

import { CateringBundleResponse } from "@/types/api/catering.api.types";
import { Package } from "lucide-react";

interface BundleCardProps {
  bundle: CateringBundleResponse;
  onClick: (bundle: CateringBundleResponse) => void;
}

export default function BundleCard({ bundle, onClick }: BundleCardProps) {
  return (
    <button
      onClick={() => onClick(bundle)}
      className="w-full cursor-pointer flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition-shadow"
    >
      {/* Image or fallback */}
      {bundle.imageUrl ? (
        <img
          src={bundle.imageUrl}
          alt={bundle.name}
          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0">
          <Package className="w-8 h-8 text-primary/40" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-gray-900 text-sm sm:text-base">{bundle.name}</h3>
          <div className="flex-shrink-0 text-right">
            <p className="text-sm sm:text-base font-bold text-primary">
              £{Number(bundle.pricePerPerson || 0).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">per person</p>
          </div>
        </div>

        {bundle.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{bundle.description}</p>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1.5">
          <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
            {bundle.items.length} items
          </span>
          <span>Serves {bundle.baseGuestCount || 0}+</span>
        </div>
      </div>
    </button>
  );
}
