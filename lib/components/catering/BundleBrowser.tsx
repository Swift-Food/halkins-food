"use client";

import { useState, useEffect, useCallback } from "react";
import { cateringService } from "@/services/api/catering.api";
import { CateringBundleResponse, CateringBundleItem } from "@/types/api/catering.api.types";
import { MenuItem } from "@/types/restaurant.types";
import { useCatering } from "@/context/CateringContext";
import BundleCard from "./BundleCard";
import BundleDetailModal from "./modals/BundleDetailModal";
import { mapToMenuItem } from "./catering-order-helpers";
import { ArrowLeft, Package } from "lucide-react";

interface BundleBrowserProps {
  sessionIndex: number;
  allMenuItems: MenuItem[] | null;
  fetchAllMenuItems: () => void;
  onBack: () => void;
  defaultGuestCount?: number;
}

function enrichBundleItemAddons(
  bundleItem: CateringBundleItem,
  menuItem: MenuItem
): MenuItem["selectedAddons"] {
  if (!bundleItem.selectedAddons || bundleItem.selectedAddons.length === 0) {
    return [];
  }

  return bundleItem.selectedAddons.map((bundleAddon) => {
    const matchedAddon = menuItem.addons?.find(
      (a) => a.name === bundleAddon.name
    );

    return {
      name: bundleAddon.name,
      price: Number(matchedAddon?.price ?? 0),
      quantity: bundleAddon.quantity,
      groupTitle: matchedAddon?.groupTitle ?? "Options",
    };
  });
}

export default function BundleBrowser({
  sessionIndex,
  allMenuItems,
  fetchAllMenuItems,
  onBack,
  defaultGuestCount = 1,
}: BundleBrowserProps) {
  const { addMenuItem } = useCatering();
  const [bundles, setBundles] = useState<CateringBundleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingBundleId, setAddingBundleId] = useState<string | null>(null);
  const [menuItemsCache, setMenuItemsCache] = useState<MenuItem[] | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<CateringBundleResponse | null>(null);

  useEffect(() => {
    const fetchBundles = async () => {
      try {
        setLoading(true);
        const cateringBundles = await cateringService.getCateringBundles();
        setBundles(cateringBundles);
      } catch (err) {
        console.error("Failed to fetch bundles:", err);
        setError("Failed to load bundles. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchBundles();
  }, []);

  useEffect(() => {
    if (allMenuItems) {
      setMenuItemsCache(allMenuItems);
    }
  }, [allMenuItems]);

  const ensureMenuItems = useCallback(async (): Promise<MenuItem[]> => {
    if (menuItemsCache) return menuItemsCache;
    if (allMenuItems) {
      setMenuItemsCache(allMenuItems);
      return allMenuItems;
    }

    fetchAllMenuItems();
    const response = await cateringService.getMenuItems();
    const items = (response || []).map(mapToMenuItem);
    setMenuItemsCache(items);
    return items;
  }, [menuItemsCache, allMenuItems, fetchAllMenuItems]);

  const handleAddBundle = async (bundle: CateringBundleResponse, guestQuantity: number) => {
    setAddingBundleId(bundle.id);
    try {
      const items = await ensureMenuItems();

      for (const bundleItem of bundle.items) {
        const menuItem = items.find((mi) => mi.id === bundleItem.menuItemId);
        if (!menuItem) {
          console.warn(
            `Menu item ${bundleItem.menuItemId} (${bundleItem.menuItemName}) not found, skipping`
          );
          continue;
        }

        const enrichedAddons = enrichBundleItemAddons(bundleItem, menuItem);
        const scaledQuantity = bundleItem.quantity * guestQuantity;

        addMenuItem(sessionIndex, {
          item: {
            ...menuItem,
            selectedAddons: enrichedAddons,
          },
          quantity: scaledQuantity,
          bundleId: bundle.id,
          bundleName: bundle.name,
        });
      }

      setSelectedBundle(null);
    } catch (err) {
      console.error("Failed to add bundle:", err);
      alert("Failed to add bundle. Please try again.");
    } finally {
      setAddingBundleId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  if (bundles.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No bundles available at the moment.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 text-primary font-medium hover:bg-primary/5 rounded-lg transition-colors"
        >
          Browse Menu Instead
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to restaurants
      </button>

      <div className="mb-4 rounded-2xl border border-primary/15 bg-primary/[0.05] px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Need some inspiration?
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Browse our curated bundles for quick event-ready combinations.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {bundles.map((bundle) => (
          <BundleCard
            key={bundle.id}
            bundle={bundle}
            onClick={setSelectedBundle}
          />
        ))}
      </div>

      {/* Bundle Detail Modal */}
      {selectedBundle && (
        <BundleDetailModal
          bundle={selectedBundle}
          defaultQuantity={defaultGuestCount}
          isAdding={addingBundleId === selectedBundle.id}
          onAdd={handleAddBundle}
          onClose={() => setSelectedBundle(null)}
          allMenuItems={menuItemsCache || allMenuItems}
        />
      )}
    </div>
  );
}
