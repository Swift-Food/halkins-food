"use client";

import { useState, useMemo, useEffect } from "react";
import { Package, ArrowLeftRight, Pencil, Trash2, Store } from "lucide-react";
import { useActiveCatering } from "@/context/useActiveCatering";
import { SelectedMenuItem } from "@/types/catering.types";
import { categoryService } from "@/services/api/category.api";
import { ALLERGENS } from "@/lib/constants/allergens";

interface GroupedItem {
  item: SelectedMenuItem["item"];
  quantity: number;
  originalIndex: number;
}

type SelectedAddon = {
  groupTitle: string;
  name: string;
  quantity: number;
  price?: number;
};

interface CategoryGroup {
  items: GroupedItem[];
  subcategories: Map<string, GroupedItem[]>;
}

interface SelectedItemsByCategoryProps {
  sessionIndex?: number;
  onEdit?: (index: number) => void;
  onRemove?: (index: number) => void;
  onSwapItem?: (index: number) => void;
  onRemoveBundle?: (bundleId: string) => void;
  collapsedCategories?: Set<string>;
  onToggleCategory?: (categoryName: string) => void;
  showActions?: boolean;
  onViewMenu?: () => void;
  compactLayout?: boolean;
  restaurants?: { id: string; restaurant_name: string; images: string[] }[];
}

export default function SelectedItemsByCategory({
  sessionIndex,
  onEdit,
  onRemove,
  onSwapItem,
  onRemoveBundle,
  collapsedCategories: externalCollapsedCategories,
  onToggleCategory: externalOnToggleCategory,
  showActions = true,
  compactLayout = false,
  restaurants,
}: SelectedItemsByCategoryProps) {
  const { mealSessions, activeSessionIndex } = useActiveCatering();
  const currentSessionIndex = sessionIndex ?? activeSessionIndex;
  const orderItems = useMemo(
    () => mealSessions[currentSessionIndex]?.orderItems || [],
    [mealSessions, currentSessionIndex]
  );

  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [internalCollapsedCategories, setInternalCollapsedCategories] =
    useState<Set<string>>(new Set());
  const [collapsedRestaurants, setCollapsedRestaurants] = useState<Set<string>>(new Set());
  const [expandedAllergens, setExpandedAllergens] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categories = await categoryService.getCategoriesWithSubcategories();
        setCategoryOrder(categories.map((c) => c.name));
      } catch (error) {
        console.error("Failed to fetch categories for ordering:", error);
      }
    };

    fetchCategories();
  }, []);

  const collapsedCategories = externalCollapsedCategories ?? internalCollapsedCategories;

  const toggleAllergen = (index: number) => {
    setExpandedAllergens((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleToggleCategory = (categoryName: string) => {
    if (externalOnToggleCategory) {
      externalOnToggleCategory(categoryName);
      return;
    }

    setInternalCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryName)) next.delete(categoryName);
      else next.add(categoryName);
      return next;
    });
  };

  const restaurantGrouped = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        image?: string;
        bundles: Map<string, { name: string; items: GroupedItem[] }>;
        categories: Map<string, CategoryGroup>;
      }
    >();

    orderItems.forEach((orderItem: SelectedMenuItem, index: number) => {
      const restaurantNameFromItem =
        "restaurantName" in orderItem.item ? orderItem.item.restaurantName : undefined;
      const restaurantName =
        restaurantNameFromItem ||
        orderItem.item.restaurant?.name ||
        "Unknown Restaurant";
      const restaurantId =
        orderItem.item.restaurantId || orderItem.item.restaurant?.restaurantId;
      const matchedRestaurant = restaurants?.find((restaurant) => restaurant.id === restaurantId);
      const restaurantImage = matchedRestaurant?.images?.[0];

      if (!map.has(restaurantName)) {
        map.set(restaurantName, {
          name: restaurantName,
          image: restaurantImage,
          bundles: new Map(),
          categories: new Map(),
        });
      }

      const restaurant = map.get(restaurantName)!;
      const groupedItem: GroupedItem = {
        item: orderItem.item,
        quantity: orderItem.quantity,
        originalIndex: index,
      };

      if (orderItem.bundleId) {
        if (!restaurant.bundles.has(orderItem.bundleId)) {
          restaurant.bundles.set(orderItem.bundleId, {
            name: orderItem.bundleName ?? "Bundle",
            items: [],
          });
        }
        restaurant.bundles.get(orderItem.bundleId)!.items.push(groupedItem);
        return;
      }

      const categoryName =
        orderItem.item.categoryName ||
        orderItem.item.groupTitle ||
        "Uncategorized";
      const subcategoryName = orderItem.item.subcategoryName || "";

      if (!restaurant.categories.has(categoryName)) {
        restaurant.categories.set(categoryName, { items: [], subcategories: new Map() });
      }

      const category = restaurant.categories.get(categoryName)!;
      if (subcategoryName) {
        if (!category.subcategories.has(subcategoryName)) {
          category.subcategories.set(subcategoryName, []);
        }
        category.subcategories.get(subcategoryName)!.push(groupedItem);
      } else {
        category.items.push(groupedItem);
      }
    });

    if (categoryOrder.length > 0) {
      map.forEach((restaurant) => {
        const entries = Array.from(restaurant.categories.entries());
        entries.sort((a, b) => {
          const orderA = categoryOrder.indexOf(a[0]);
          const orderB = categoryOrder.indexOf(b[0]);
          return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
        });
        restaurant.categories = new Map(entries);
      });
    }

    return map;
  }, [orderItems, categoryOrder, restaurants]);

  if (orderItems.length === 0) return null;

  const renderAddons = (selectedAddons: SelectedAddon[]) => {
    const addonsByGroup = selectedAddons.reduce(
      (
        acc: Record<string, { name: string; quantity: number }[]>,
        addon: { groupTitle: string; name: string; quantity: number }
      ) => {
        const group = addon.groupTitle || "Options";
        if (!acc[group]) acc[group] = [];
        acc[group].push({ name: addon.name, quantity: addon.quantity });
        return acc;
      },
      {}
    );

    return Object.entries(addonsByGroup).map(([groupTitle, addons]) => (
      <p key={groupTitle} className="text-gray-500">
        <span className="font-medium text-gray-700">{groupTitle}:</span>{" "}
        {addons.map((addon, index) => (
          <span key={`${groupTitle}-${addon.name}-${index}`}>
            {addon.name}
            {addon.quantity > 1 && ` (×${addon.quantity})`}
            {index < addons.length - 1 && ", "}
          </span>
        ))}
      </p>
    ));
  };

  const renderAllergens = (item: SelectedMenuItem["item"], originalIndex: number) => {
    if (!item.allergens || item.allergens.length === 0) return null;

    return (
      <div className="mt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleAllergen(originalIndex);
          }}
          className="flex items-center gap-1 text-xs font-medium text-orange-700 transition-colors hover:text-orange-800"
        >
          <span className={compactLayout ? "text-orange-600" : ""}>
            {compactLayout ? "⚠️" : null}
          </span>
          <span>Allergens ({item.allergens.length})</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-3 w-3 transition-transform ${
              expandedAllergens.has(originalIndex) ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {expandedAllergens.has(originalIndex) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {item.allergens.map((allergenValue: string) => {
              const allergen = ALLERGENS.find((entry) => entry.value === allergenValue);
              return (
                <span
                  key={allergenValue}
                  className="inline-flex items-center rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-800"
                >
                  {allergen?.label || allergenValue}
                </span>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderItemRow = (groupedItem: GroupedItem) => {
    const { item, quantity, originalIndex } = groupedItem;
    const price = parseFloat(item.price?.toString() || "0");
    const discountPrice = parseFloat(item.discountPrice?.toString() || "0");
    const itemPrice = item.isDiscount && discountPrice > 0 ? discountPrice : price;
    const backendQuantityUnit = item.cateringQuantityUnit || 7;
    const portions = quantity / backendQuantityUnit;
    const addonTotal = (item.selectedAddons || []).reduce(
      (sum: number, addon: { price: number; quantity: number }) =>
        sum + (addon.price || 0) * (addon.quantity || 0),
      0
    );
    const subtotal = itemPrice * quantity + addonTotal;

    const showMobile = compactLayout ? "" : " sm:hidden";
    const showDesktop = compactLayout ? " hidden" : " hidden sm:flex";
    const showDesktopBlock = compactLayout ? " hidden" : " hidden sm:block";
    const rootLayout = compactLayout
      ? "flex flex-col gap-1.5 rounded-xl bg-base-100 p-2 min-w-0 overflow-hidden"
      : "flex flex-col gap-3 rounded-xl bg-base-100 p-4 min-w-0 overflow-hidden sm:flex-row sm:items-center";

    return (
      <div key={originalIndex} className={rootLayout}>
        <div className={`flex gap-3${showMobile}`}>
          {item.image && (
            <img
              src={item.image}
              alt={item.menuItemName}
              className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold italic text-gray-800">{item.menuItemName}</p>
            {item.selectedAddons && item.selectedAddons.length > 0 && (
              <div className={`mt-1 ${compactLayout ? "text-xs" : "text-sm"} text-gray-600`}>{renderAddons(item.selectedAddons)}</div>
            )}
            {renderAllergens(item, originalIndex)}
          </div>
        </div>

        <div className={`items-center justify-between${showMobile} flex`}>
          <div>
            <p className={`font-bold text-primary ${compactLayout ? "text-sm" : "text-lg"}`}>£{subtotal.toFixed(2)}</p>
            <p className={`text-gray-600 ${compactLayout ? "text-xs" : "text-sm"}`}>
              {portions} portion{portions !== 1 ? "s" : ""}
            </p>
          </div>
          {showActions && onEdit && onRemove && (
            <div className={`flex items-center gap-2${showMobile}`}>
              {onSwapItem && orderItems[originalIndex]?.bundleId && (
                <button
                  onClick={() => onSwapItem(originalIndex)}
                  className={`rounded-lg border border-amber-500 p-2 text-amber-600 transition-colors hover:bg-amber-50${
                    compactLayout ? "" : " sm:px-3 sm:py-2"
                  }`}
                  title="Swap"
                >
                  <ArrowLeftRight className={`h-4 w-4${compactLayout ? "" : " sm:hidden"}`} />
                  <span className={compactLayout ? "hidden" : "hidden text-sm font-medium sm:inline"}>
                    Swap
                  </span>
                </button>
              )}
              <button
                onClick={() => onEdit(originalIndex)}
                className={`rounded-lg border border-primary p-2 text-primary transition-colors hover:bg-primary/5${
                  compactLayout ? "" : " sm:px-4 sm:py-2"
                }`}
                title="Edit"
              >
                <Pencil className={`h-4 w-4${compactLayout ? "" : " sm:hidden"}`} />
                <span className={compactLayout ? "hidden" : "hidden text-sm font-medium sm:inline"}>
                  Edit
                </span>
              </button>
              <button
                onClick={() => onRemove(originalIndex)}
                className={`rounded-lg border border-primary p-2 text-primary transition-colors hover:bg-primary/5${
                  compactLayout ? "" : " sm:px-4 sm:py-2"
                }`}
                title="Remove"
              >
                <Trash2 className={`h-4 w-4${compactLayout ? "" : " sm:hidden"}`} />
                <span className={compactLayout ? "hidden" : "hidden text-sm font-medium sm:inline"}>
                  Remove
                </span>
              </button>
            </div>
          )}
        </div>

        {item.image && (
          <img
            src={item.image}
            alt={item.menuItemName}
            className={`${showDesktopBlock} h-16 w-16 flex-shrink-0 rounded-lg object-cover`}
          />
        )}

        <div className={`${showDesktopBlock} min-w-0 flex-1`}>
          <p className="font-semibold text-gray-800">{item.menuItemName}</p>
          {item.selectedAddons && item.selectedAddons.length > 0 && (
            <div className="mt-1 text-sm text-gray-600">{renderAddons(item.selectedAddons)}</div>
          )}
          {renderAllergens(item, originalIndex)}
        </div>

        <div className={`${showDesktop} flex-shrink-0 items-center gap-4`}>
          <p className="text-lg font-bold text-primary">£{subtotal.toFixed(2)}</p>
          <p className="whitespace-nowrap text-sm text-gray-600">
            {portions} portion{portions !== 1 ? "s" : ""}
          </p>
        </div>

        {showActions && onEdit && onRemove && (
          <div className={`${showDesktop} flex-shrink-0 items-center gap-2`}>
            {onSwapItem && orderItems[originalIndex]?.bundleId && (
              <button
                onClick={() => onSwapItem(originalIndex)}
                className="rounded-lg border border-amber-500 px-3 py-2 text-sm font-medium text-amber-600 transition-colors hover:bg-amber-50"
              >
                Swap
              </button>
            )}
            <button
              onClick={() => onEdit(originalIndex)}
              className="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
            >
              Edit
            </button>
            <button
              onClick={() => onRemove(originalIndex)}
              className="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mb-6 min-w-0 overflow-hidden">
      <div className={compactLayout ? "space-y-3" : "space-y-5"}>
        {Array.from(restaurantGrouped.entries()).map(([restaurantName, restaurant]) => {
          const isRestaurantCollapsed = collapsedRestaurants.has(restaurantName);
          const totalRestaurantItems =
            Array.from(restaurant.bundles.values()).reduce(
              (sum, bundle) => sum + bundle.items.length,
              0
            ) +
            Array.from(restaurant.categories.values()).reduce(
              (sum, category) =>
                sum +
                category.items.length +
                Array.from(category.subcategories.values()).reduce(
                  (subcategorySum, items) => subcategorySum + items.length,
                  0
                ),
              0
            );

          return (
            <div key={restaurantName}>
              <button
                onClick={() =>
                  setCollapsedRestaurants((prev) => {
                    const next = new Set(prev);
                    if (next.has(restaurantName)) next.delete(restaurantName);
                    else next.add(restaurantName);
                    return next;
                  })
                }
                className="mb-2 flex w-full items-center gap-3 rounded-lg px-1 py-1 transition-colors hover:bg-base-100"
              >
                {restaurant.image ? (
                  <img
                    src={restaurant.image}
                    alt={restaurantName}
                    className={`${compactLayout ? "h-7 w-7" : "h-9 w-9"} flex-shrink-0 rounded-lg object-cover`}
                  />
                ) : (
                  <Store className={`${compactLayout ? "h-4 w-4" : "h-5 w-5"} flex-shrink-0 text-gray-500`} />
                )}
                <span className={`${compactLayout ? "text-sm" : "text-base"} font-bold text-gray-800`}>{restaurantName}</span>
                <span className={`${compactLayout ? "text-xs" : "text-sm"} text-gray-400`}>({totalRestaurantItems})</span>
                <div className="flex-1" />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 text-gray-400 transition-transform ${
                    isRestaurantCollapsed ? "" : "rotate-180"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {!isRestaurantCollapsed && (
                <div className={compactLayout ? "space-y-2" : "space-y-4"}>
                  {Array.from(restaurant.bundles.entries()).map(([bundleId, bundle]) => (
                    <div
                      key={bundleId}
                      className="overflow-hidden rounded-2xl border-2 border-dashed border-primary/30 bg-primary/[0.02]"
                    >
                      <div className={`flex items-center gap-2 border-b border-primary/20 bg-primary/10 ${compactLayout ? "px-3 py-2" : "px-4 py-3"}`}>
                        <Package className={`${compactLayout ? "h-3 w-3" : "h-4 w-4"} flex-shrink-0 text-primary`} />
                        <div className="min-w-0">
                          <span className={`${compactLayout ? "text-xs" : "text-sm"} font-semibold text-primary`}>
                            {bundle.name}
                          </span>
                          <span className="block text-xs text-primary/60 sm:ml-1 sm:inline">
                            ({bundle.items.length} item{bundle.items.length !== 1 ? "s" : ""})
                          </span>
                        </div>
                        <div className="flex-1" />
                        {onRemoveBundle && (
                          <>
                            <button
                              onClick={() => onRemoveBundle(bundleId)}
                              className={`${compactLayout ? "" : "sm:hidden"} flex h-7 w-7 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-50 hover:text-red-700`}
                            >
                              <XIcon />
                            </button>
                            <button
                              onClick={() => onRemoveBundle(bundleId)}
                              className={`${compactLayout ? "hidden" : "hidden sm:flex"} items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-700`}
                            >
                              <XIcon className="h-3.5 w-3.5" />
                              Remove Bundle
                            </button>
                          </>
                        )}
                      </div>
                      <div className={`${compactLayout ? "space-y-1.5 p-1.5" : "space-y-3 p-2"}`}>{bundle.items.map(renderItemRow)}</div>
                    </div>
                  ))}

                  {Array.from(restaurant.categories.entries()).map(([categoryName, categoryGroup]) => {
                    const isCollapsed = collapsedCategories.has(categoryName);
                    const totalItems =
                      categoryGroup.items.length +
                      Array.from(categoryGroup.subcategories.values()).reduce(
                        (sum, items) => sum + items.length,
                        0
                      );

                    return (
                      <div
                        key={categoryName}
                        className="overflow-hidden rounded-xl border-2 border-base-200"
                      >
                        <button
                          onClick={() => handleToggleCategory(categoryName)}
                          className={`flex w-full items-center justify-between bg-base-200 ${compactLayout ? "px-3 py-2" : "px-4 py-3"} transition-colors hover:bg-base-200`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`${compactLayout ? "text-xs" : ""} font-semibold text-gray-800`}>{categoryName}</span>
                            <span className={`${compactLayout ? "text-xs" : "text-sm"} text-gray-500`}>
                              ({totalItems} item{totalItems !== 1 ? "s" : ""})
                            </span>
                          </div>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-5 w-5 text-gray-500 transition-transform ${
                              isCollapsed ? "" : "rotate-180"
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>

                        {!isCollapsed && (
                          <div className={`min-w-0 overflow-hidden ${compactLayout ? "p-1.5 space-y-1.5" : "p-2 space-y-3"}`}>
                            {categoryGroup.items.map(renderItemRow)}
                            {Array.from(categoryGroup.subcategories.values()).map((items, index) => (
                              <div key={`${categoryName}-${index}`} className="space-y-3">
                                {items.map(renderItemRow)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function XIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}
