# Catering Bundles in Order Builder — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to browse and add pre-configured bundles to meal sessions, with bundle items visually grouped and individually editable/swappable.

**Architecture:** A "Bundles" category entry in the existing category nav swaps the `RestaurantMenuBrowser` for a `BundleBrowser`. Adding a bundle enriches each bundle item with full `MenuItem` data (client-side join) and tags each item with `bundleId`/`bundleName` metadata. `SelectedItemsByCategory` renders bundle items grouped with a distinct visual outline. A "Swap" button on bundle items opens a modal showing alternative items from the same restaurant + groupTitle. At checkout/submission, bundle metadata is ignored — items are flattened to normal `orderItems`.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS + DaisyUI

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `lib/constants/api.ts` | Add `CATERING_BUNDLES_ACTIVE` endpoint |
| Modify | `services/api/catering.api.ts` | Add `getActiveBundles()` method |
| Modify | `types/catering.types.ts` | Add `bundleId?` and `bundleName?` to `SelectedMenuItem` |
| Create | `lib/components/catering/BundleBrowser.tsx` | Grid of bundle cards, handles adding bundle to session |
| Create | `lib/components/catering/BundleCard.tsx` | Individual bundle card with item preview list |
| Create | `lib/components/catering/modals/SwapItemModal.tsx` | Modal showing swappable items from same restaurant+groupTitle |
| Modify | `lib/components/catering/SelectedItemsByCategory.tsx` | Bundle group outline, "Swap" button for bundle items |
| Modify | `lib/components/catering/CateringOrderBuilder.tsx` | Bundle view toggle, swap item wiring, bundle data fetching |
| Modify | `lib/components/catering/hooks/useCateringData.ts` | Expose `allMenuItems` fetching so BundleBrowser can use it |

---

## Chunk 1: Data Layer

### Task 1: Add API endpoint constant and service method

**Files:**
- Modify: `lib/constants/api.ts:24-25`
- Modify: `services/api/catering.api.ts:89-99`

- [ ] **Step 1: Add the endpoint constant**

In `lib/constants/api.ts`, add after the existing `CATERING_BUNDLE` line:

```typescript
// Catering Bundles
CATERING_BUNDLE: (id: string) => `/catering-bundles/${id}`,
CATERING_BUNDLES_ACTIVE: '/catering-bundles/active',
```

- [ ] **Step 2: Add `getActiveBundles()` to the catering service**

In `services/api/catering.api.ts`, add after `getBundleById`:

```typescript
async getActiveBundles(): Promise<CateringBundleResponse[]> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}${API_ENDPOINTS.CATERING_BUNDLES_ACTIVE}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch active bundles");
  }

  return response.json();
}
```

Also add `CATERING_BUNDLES_ACTIVE` to the import of `API_ENDPOINTS` if not already destructured (it comes from the same `api.ts` file).

- [ ] **Step 3: Commit**

```bash
git add lib/constants/api.ts services/api/catering.api.ts
git commit -m "feat: add getActiveBundles API method"
```

---

### Task 2: Extend `SelectedMenuItem` type with bundle metadata

**Files:**
- Modify: `types/catering.types.ts:126-129`

- [ ] **Step 1: Add optional bundle fields**

Change the `SelectedMenuItem` interface:

```typescript
export interface SelectedMenuItem {
  item: SearchResult | MenuItem;
  quantity: number;
  bundleId?: string;
  bundleName?: string;
}
```

These fields are optional, so all existing code continues to work. They're only set when an item is added via a bundle. At order submission time, these fields are simply ignored by the backend (the `orderItems` array is serialized without them, or the backend drops unknown fields).

- [ ] **Step 2: Commit**

```bash
git add types/catering.types.ts
git commit -m "feat: add bundleId/bundleName to SelectedMenuItem type"
```

---

## Chunk 2: Bundle Browsing Components

### Task 3: Create `BundleCard` component

**Files:**
- Create: `lib/components/catering/BundleCard.tsx`

This component renders a single bundle as a card. Shows bundle name, description, image, price per person, base guest count, and a preview list of included items.

- [ ] **Step 1: Create the component**

```tsx
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
      {/* Image or fallback */}
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
        {/* Header */}
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

        {/* Bundle info */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            {bundle.items.length} items
          </span>
          <span>Serves {bundle.baseGuestCount}+</span>
        </div>

        {/* Item preview list */}
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

        {/* Add button */}
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/components/catering/BundleCard.tsx
git commit -m "feat: create BundleCard component"
```

---

### Task 4: Create `BundleBrowser` component

**Files:**
- Create: `lib/components/catering/BundleBrowser.tsx`

This component fetches active bundles, displays them in a grid, and handles the "add bundle to session" flow. When adding, it:
1. Ensures `allMenuItems` is loaded (via the passed-in `fetchAllMenuItems`)
2. For each bundle item, finds the matching full `MenuItem` by `menuItemId`
3. Enriches `selectedAddons` with prices from the `MenuItem.addons` definitions
4. Calls `addMenuItem` for each enriched item with `bundleId`/`bundleName` set

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { cateringService } from "@/services/api/catering.api";
import { CateringBundleResponse, CateringBundleItem } from "@/types/api/catering.api.types";
import { MenuItem } from "@/types/restaurant.types";
import { useCatering } from "@/context/CateringContext";
import BundleCard from "./BundleCard";
import { mapToMenuItem } from "./catering-order-helpers";
import { ArrowLeft, Package } from "lucide-react";

interface BundleBrowserProps {
  sessionIndex: number;
  allMenuItems: MenuItem[] | null;
  fetchAllMenuItems: () => void;
  onBack: () => void;
}

function enrichBundleItemAddons(
  bundleItem: CateringBundleItem,
  menuItem: MenuItem
): MenuItem["selectedAddons"] {
  if (!bundleItem.selectedAddons || bundleItem.selectedAddons.length === 0) {
    return [];
  }

  return bundleItem.selectedAddons.map((bundleAddon) => {
    // Try to find addon in the menu item's addon definitions to get full details
    const matchedAddon = menuItem.addons?.find(
      (a) => a.name === bundleAddon.name
    );

    return {
      name: bundleAddon.name,
      price: bundleAddon.price ?? matchedAddon?.price ?? 0,
      quantity: bundleAddon.quantity,
      groupTitle: bundleAddon.groupTitle ?? matchedAddon?.groupTitle ?? "Options",
    };
  });
}

export default function BundleBrowser({
  sessionIndex,
  allMenuItems,
  fetchAllMenuItems,
  onBack,
}: BundleBrowserProps) {
  const { addMenuItem } = useCatering();
  const [bundles, setBundles] = useState<CateringBundleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingBundleId, setAddingBundleId] = useState<string | null>(null);
  const [menuItemsCache, setMenuItemsCache] = useState<MenuItem[] | null>(null);

  // Fetch bundles on mount
  useEffect(() => {
    const fetchBundles = async () => {
      try {
        setLoading(true);
        const activeBundles = await cateringService.getActiveBundles();
        setBundles(activeBundles);
      } catch (err) {
        console.error("Failed to fetch bundles:", err);
        setError("Failed to load bundles. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchBundles();
  }, []);

  // Use allMenuItems from parent if available, otherwise fetch our own
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

    // Trigger parent fetch and also fetch our own as fallback
    fetchAllMenuItems();
    const response = await cateringService.getMenuItems();
    const items = (response || []).map(mapToMenuItem);
    setMenuItemsCache(items);
    return items;
  }, [menuItemsCache, allMenuItems, fetchAllMenuItems]);

  const handleAddBundle = async (bundle: CateringBundleResponse) => {
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

        addMenuItem(sessionIndex, {
          item: {
            ...menuItem,
            selectedAddons: enrichedAddons,
          },
          quantity: bundleItem.quantity,
          bundleId: bundle.id,
          bundleName: bundle.name,
        });
      }
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
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Menu
        </button>
        <div className="flex-1" />
        <span className="text-sm text-gray-500">
          {bundles.length} bundle{bundles.length !== 1 ? "s" : ""} available
        </span>
      </div>

      {/* Bundle grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bundles.map((bundle) => (
          <BundleCard
            key={bundle.id}
            bundle={bundle}
            onAdd={handleAddBundle}
            isAdding={addingBundleId === bundle.id}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/components/catering/BundleBrowser.tsx
git commit -m "feat: create BundleBrowser component with enrichment logic"
```

---

## Chunk 3: Swap Item Modal

### Task 5: Create `SwapItemModal`

**Files:**
- Create: `lib/components/catering/modals/SwapItemModal.tsx`

This modal is triggered from the "Swap" button on a bundle item in `SelectedItemsByCategory`. It receives the current item's `restaurantId` and `groupTitle`, filters `allMenuItems` to show alternatives, and lets the user pick a replacement. Clicking an alternative opens `MenuItemModal` for addon configuration.

- [ ] **Step 1: Create the component**

```tsx
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

  // If user has clicked an alternative, show the MenuItemModal for it
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
        {/* Header */}
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

        {/* Alternatives list */}
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

        {/* Footer */}
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/components/catering/modals/SwapItemModal.tsx
git commit -m "feat: create SwapItemModal for bundle item replacement"
```

---

## Chunk 4: Modify SelectedItemsByCategory for Bundle Grouping

### Task 6: Add bundle grouping and swap button to `SelectedItemsByCategory`

**Files:**
- Modify: `lib/components/catering/SelectedItemsByCategory.tsx`

Changes:
1. Accept new props: `onSwapItem?: (index: number) => void`
2. Before grouping by category, first group items by `bundleId` (if present)
3. Render bundle groups with a distinct visual wrapper (dashed border, bundle icon, bundle name)
4. Show a "Swap" button alongside "Edit" / "Remove" for items that have a `bundleId`

- [ ] **Step 1: Add `onSwapItem` prop**

Add to the `SelectedItemsByCategoryProps` interface:

```typescript
interface SelectedItemsByCategoryProps {
  sessionIndex?: number;
  onEdit?: (index: number) => void;
  onRemove?: (index: number) => void;
  onSwapItem?: (index: number) => void;  // NEW
  collapsedCategories?: Set<string>;
  onToggleCategory?: (categoryName: string) => void;
  showActions?: boolean;
  onViewMenu?: () => void;
}
```

Destructure it in the component params:

```typescript
export default function SelectedItemsByCategory({
  sessionIndex,
  onEdit,
  onRemove,
  onSwapItem,  // NEW
  collapsedCategories: externalCollapsedCategories,
  ...
```

- [ ] **Step 2: Add bundle grouping logic**

After the existing `grouped` useMemo, add a new useMemo that separates bundle items from regular items:

```typescript
const { bundleGroups, regularItems } = useMemo(() => {
  const bundles = new Map<string, { name: string; items: GroupedItem[] }>();
  const regular: typeof orderItems = [];

  orderItems.forEach((orderItem: SelectedMenuItem, index: number) => {
    if (orderItem.bundleId) {
      if (!bundles.has(orderItem.bundleId)) {
        bundles.set(orderItem.bundleId, {
          name: orderItem.bundleName || "Bundle",
          items: [],
        });
      }
      bundles.get(orderItem.bundleId)!.items.push({
        item: orderItem.item,
        quantity: orderItem.quantity,
        originalIndex: index,
      });
    } else {
      regular.push(orderItem);
    }
  });

  return { bundleGroups: bundles, regularItems: regular };
}, [orderItems]);
```

- [ ] **Step 3: Add swap button to `renderItemRow`**

In the actions section of `renderItemRow` (both mobile and desktop layouts), add the Swap button when the item has a `bundleId`. Check by looking up the `orderItem` at `originalIndex`:

In the mobile actions div (around line 296):
```tsx
{showActions && onEdit && onRemove && (
  <div className="flex items-center gap-2">
    {onSwapItem && orderItems[originalIndex]?.bundleId && (
      <button
        onClick={() => onSwapItem(originalIndex)}
        className="px-3 py-2 border border-amber-500 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors text-sm font-medium"
      >
        Swap
      </button>
    )}
    <button onClick={() => onEdit(originalIndex)} ...>Edit</button>
    <button onClick={() => onRemove(originalIndex)} ...>Remove</button>
  </div>
)}
```

Same pattern for the desktop actions div (around line 429).

- [ ] **Step 4: Render bundle groups before category groups**

In the component's return JSX, before the existing category rendering, add bundle group rendering:

```tsx
return (
  <div className="mb-6 overflow-hidden min-w-0">
    <div className="space-y-4">
      {/* Bundle Groups */}
      {Array.from(bundleGroups.entries()).map(([bundleId, { name, items }]) => (
        <div
          key={bundleId}
          className="border-2 border-dashed border-primary/30 rounded-2xl overflow-hidden bg-primary/[0.02]"
        >
          {/* Bundle Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-primary/10 border-b border-primary/20">
            <Package className="w-4 h-4 text-primary" />
            <span className="font-semibold text-primary text-sm">{name}</span>
            <span className="text-xs text-primary/60">
              ({items.length} item{items.length !== 1 ? "s" : ""})
            </span>
          </div>
          <div className="p-2 space-y-3">
            {items.map(renderItemRow)}
          </div>
        </div>
      ))}

      {/* Regular Category Groups (existing code) */}
      {Array.from(grouped.entries()).map(([categoryName, categoryGroup]) => {
        // ... existing category rendering
      })}
    </div>
  </div>
);
```

Import `Package` from lucide-react at the top of the file.

**Important:** The existing `grouped` useMemo should be updated to only process `regularItems` instead of all `orderItems`. Change line ~105 from:

```typescript
orderItems.forEach((orderItem: SelectedMenuItem, index: number) => {
```

to iterate only over items without a bundleId:

```typescript
orderItems.forEach((orderItem: SelectedMenuItem, index: number) => {
  if (orderItem.bundleId) return; // Skip bundle items, rendered separately
```

- [ ] **Step 5: Commit**

```bash
git add lib/components/catering/SelectedItemsByCategory.tsx
git commit -m "feat: add bundle grouping and swap button to SelectedItemsByCategory"
```

---

## Chunk 5: Wire Everything into CateringOrderBuilder

### Task 7: Add bundle browsing toggle and swap item flow to `CateringOrderBuilder`

**Files:**
- Modify: `lib/components/catering/CateringOrderBuilder.tsx`

Changes:
1. Add `showBundleBrowser` state per-session
2. Add a "Browse Bundles" / "Browse Menu" toggle button inside the session accordion (above or alongside the RestaurantMenuBrowser)
3. Conditionally render `BundleBrowser` instead of `RestaurantMenuBrowser`
4. Wire up swap item flow: `SwapItemModal` state, finding alternatives, handling the swap via `updateMenuItemByIndex`

- [ ] **Step 1: Add imports**

At the top of `CateringOrderBuilder.tsx`, add:

```typescript
import BundleBrowser from "./BundleBrowser";
import SwapItemModal from "./modals/SwapItemModal";
import { Package, ArrowLeftRight } from "lucide-react";
```

- [ ] **Step 2: Add state for bundle browsing and swap**

After the existing state declarations (around line 133), add:

```typescript
// Bundle browsing state
const [showBundleBrowser, setShowBundleBrowser] = useState(false);

// Swap item state
const [swapItemIndex, setSwapItemIndex] = useState<number | null>(null);
const [swapAlternatives, setSwapAlternatives] = useState<MenuItem[]>([]);
```

- [ ] **Step 3: Add swap item handler**

After the existing `handleSaveEditedItem` function (around line 639), add:

```typescript
// Handle swap item (for bundle items)
const handleSwapItem = (itemIndex: number) => {
  const session = mealSessions[activeSessionIndex];
  if (!session) return;
  const orderItem = session.orderItems[itemIndex];
  if (!orderItem) return;

  const item = orderItem.item as MenuItem;
  const restaurantId = item.restaurantId;
  const groupTitle = item.groupTitle;

  // Find alternatives: same restaurant + same groupTitle
  let alternatives: MenuItem[] = [];
  if (allMenuItems && restaurantId && groupTitle) {
    alternatives = allMenuItems.filter(
      (mi) => mi.restaurantId === restaurantId && mi.groupTitle === groupTitle
    );
  }

  setSwapAlternatives(alternatives);
  setSwapItemIndex(itemIndex);
};

const handleConfirmSwap = (newItem: MenuItem) => {
  if (swapItemIndex === null) return;
  const session = mealSessions[activeSessionIndex];
  if (!session) return;

  const oldOrderItem = session.orderItems[swapItemIndex];
  const BACKEND_QUANTITY_UNIT = newItem.cateringQuantityUnit || 7;
  const quantity = (newItem.portionQuantity || 1) * BACKEND_QUANTITY_UNIT;

  updateMenuItemByIndex(activeSessionIndex, swapItemIndex, {
    item: {
      ...newItem,
      categoryId: oldOrderItem.item.categoryId,
      categoryName: oldOrderItem.item.categoryName,
      subcategoryId: oldOrderItem.item.subcategoryId,
      subcategoryName: oldOrderItem.item.subcategoryName,
    },
    quantity,
    bundleId: oldOrderItem.bundleId,
    bundleName: oldOrderItem.bundleName,
  });

  setSwapItemIndex(null);
  setSwapAlternatives([]);
};
```

- [ ] **Step 4: Add toggle button and conditional rendering in `renderSessionContent`**

In the `renderSessionContent` function (around line 858-912), modify the JSX inside `<SessionAccordion>` children. Add a toggle button between `SelectedItemsByCategory` and `RestaurantMenuBrowser`, and conditionally render `BundleBrowser`:

```tsx
const renderSessionContent = (
  session: MealSessionState,
  index: number,
  isUnscheduled: boolean = false
) => (
  <SessionAccordion
    key={index}
    session={session}
    isExpanded={expandedSessionIndex === index}
    onToggle={() => toggleSessionExpand(index)}
    sessionTotal={getSessionTotal(index)}
    accordionRef={(el) => {
      if (el) sessionAccordionRefs.current.set(index, el);
      else sessionAccordionRefs.current.delete(index);
    }}
    onEditSession={() => setEditingSessionIndex(index)}
    onRemoveSession={(e) => handleRemoveSession(index, e)}
    canRemove={isUnscheduled ? mealSessions.length > 1 : true}
  >
    {renderValidationErrorBanner(index)}
    {session.orderItems.length > 0 && (
      <div className="mb-4 min-w-0 overflow-hidden">
        <SelectedItemsByCategory
          sessionIndex={index}
          onEdit={handleEditItem}
          onRemove={handleRemoveItem}
          onSwapItem={handleSwapItem}
          collapsedCategories={collapsedCategories}
          onToggleCategory={handleToggleCategory}
          onViewMenu={handleViewMenu}
        />
      </div>
    )}

    {/* Browse Mode Toggle */}
    <div className="flex items-center gap-2 mb-3">
      <button
        onClick={() => setShowBundleBrowser(false)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
          !showBundleBrowser
            ? "bg-primary text-white"
            : "bg-base-200 text-gray-600 hover:bg-base-300"
        }`}
      >
        Menu
      </button>
      <button
        onClick={() => {
          setShowBundleBrowser(true);
          // Ensure menu items are loaded for enrichment
          if (!allMenuItems) fetchAllMenuItems();
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
          showBundleBrowser
            ? "bg-primary text-white"
            : "bg-base-200 text-gray-600 hover:bg-base-300"
        }`}
      >
        <Package className="w-3.5 h-3.5" />
        Bundles
      </button>
    </div>

    {showBundleBrowser ? (
      <BundleBrowser
        sessionIndex={index}
        allMenuItems={allMenuItems}
        fetchAllMenuItems={fetchAllMenuItems}
        onBack={() => setShowBundleBrowser(false)}
      />
    ) : (
      <RestaurantMenuBrowser
        restaurants={restaurants}
        restaurantsLoading={restaurantsLoading}
        allMenuItems={allMenuItems}
        fetchAllMenuItems={fetchAllMenuItems}
        onAddItem={handleAddItem}
        onUpdateQuantity={handleUpdateQuantity}
        onAddOrderPress={handleAddOrderPress}
        getItemQuantity={getItemQuantity}
        expandedItemId={expandedItemId}
        setExpandedItemId={setExpandedItemId}
        selectedDietaryFilters={selectedDietaryFilters}
        toggleDietaryFilter={toggleDietaryFilter}
        categoriesRowRef={categoriesRowRef}
        restaurantListRef={restaurantListRef}
        firstMenuItemRef={firstMenuItemRef}
        sessionIndex={index}
        expandedSessionIndex={expandedSessionIndex}
        autoOpenFirstRestaurant={currentTutorialStep?.id === "menu-item"}
        tutorialResetKey={tutorialResetKey}
      />
    )}
  </SessionAccordion>
);
```

- [ ] **Step 5: Add SwapItemModal to the modal section**

After the existing "Edit Item Modal" section (around line 1101), add:

```tsx
{/* Swap Item Modal */}
{swapItemIndex !== null && activeSession && (
  <SwapItemModal
    currentItem={activeSession.orderItems[swapItemIndex].item as MenuItem}
    alternatives={swapAlternatives}
    isOpen={true}
    onClose={() => { setSwapItemIndex(null); setSwapAlternatives([]); }}
    onSwap={handleConfirmSwap}
  />
)}
```

- [ ] **Step 6: Commit**

```bash
git add lib/components/catering/CateringOrderBuilder.tsx
git commit -m "feat: wire bundle browsing and swap item into CateringOrderBuilder"
```

---

## Chunk 6: Context Persistence for Bundle Metadata

### Task 8: Ensure `bundleId`/`bundleName` survives localStorage round-trips

**Files:**
- Modify: `context/CateringContext.tsx`

The context serializes `mealSessions` to localStorage. Since `bundleId` and `bundleName` are added to `SelectedMenuItem`, they should already serialize/deserialize as plain JSON properties. However, we need to verify that `addMenuItem` (which merges identical items) preserves bundle metadata, and that `updateMenuItemByIndex` accepts the new fields.

- [ ] **Step 1: Verify `addMenuItem` preserves bundle fields**

In `CateringContext.tsx`, find the `addMenuItem` implementation. When merging a duplicate item (same ID + same addons), the merged item should keep the `bundleId`/`bundleName` from the incoming item. Currently the merge logic increments quantity on the existing item but doesn't update other fields. This is fine — the existing item in the array already has `bundleId`/`bundleName` set from when it was first added.

When no duplicate exists and a new item is pushed, the full `SelectedMenuItem` object (including `bundleId`/`bundleName`) is pushed to `orderItems`. This works because `SelectedMenuItem` now has those optional fields.

**No code changes needed here** — JSON serialization handles arbitrary properties. Just verify by reading the code and confirming the flow.

- [ ] **Step 2: Commit (if any changes were needed)**

If no changes are needed, skip this commit.

---

## Chunk 7: Build Verification

### Task 9: Verify the build compiles

- [ ] **Step 1: Run the build**

```bash
cd /Users/thadoos/Coding/AllRestaurantApps/halkins-food && npm run build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 2: Fix any type errors**

Common issues to watch for:
- `bundleId` / `bundleName` not recognized on `SelectedMenuItem` — ensure the type change in `catering.types.ts` is saved
- `Package` import from lucide-react — ensure it's installed (it should be, since `Plus` and `Clock` are already imported from it)
- `onSwapItem` prop not passed through — ensure `SelectedItemsByCategory` receives it from `CateringOrderBuilder`

- [ ] **Step 3: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: resolve build errors for bundle feature"
```
