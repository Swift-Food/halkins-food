"use client";

import { useState, useMemo, useEffect } from "react";
import { useCatering } from "@/context/CateringContext";
import { SelectedMenuItem } from "@/types/catering.types";
import { categoryService } from "@/services/api/category.api";
import { ALLERGENS } from "@/lib/constants/allergens";

interface GroupedItem {
  item: any;
  quantity: number;
  originalIndex: number;
  allergenExpanded?: boolean;
}

interface CategoryGroup {
  items: GroupedItem[];
  subcategories: Map<string, GroupedItem[]>;
}

interface SelectedItemsByCategoryProps {
  sessionIndex?: number;
  onEdit?: (index: number) => void;
  onRemove?: (index: number) => void;
  collapsedCategories?: Set<string>;
  onToggleCategory?: (categoryName: string) => void;
  showActions?: boolean;
  onViewMenu?: () => void;
}

export default function SelectedItemsByCategory({
  sessionIndex,
  onEdit,
  onRemove,
  collapsedCategories: externalCollapsedCategories,
  onToggleCategory: externalOnToggleCategory,
  showActions = true,
  // onViewMenu,
}: SelectedItemsByCategoryProps) {
  const { mealSessions, activeSessionIndex } = useCatering();

  // Use provided sessionIndex or fall back to activeSessionIndex
  const currentSessionIndex = sessionIndex ?? activeSessionIndex;
  const orderItems = mealSessions[currentSessionIndex]?.orderItems || [];

  // Fetch categories for ordering
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categories =
          await categoryService.getCategoriesWithSubcategories();
        setCategoryOrder(categories.map((c) => c.name));
      } catch (error) {
        console.error("Failed to fetch categories for ordering:", error);
      }
    };
    fetchCategories();
  }, []);

  // Internal collapsed state if not provided externally
  const [internalCollapsedCategories, setInternalCollapsedCategories] =
    useState<Set<string>>(new Set());

  // Track expanded allergen sections by item index
  const [expandedAllergens, setExpandedAllergens] = useState<Set<number>>(new Set());

  const collapsedCategories =
    externalCollapsedCategories ?? internalCollapsedCategories;

  const toggleAllergen = (index: number) => {
    setExpandedAllergens(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleToggleCategory = (categoryName: string) => {
    if (externalOnToggleCategory) {
      externalOnToggleCategory(categoryName);
    } else {
      // Use internal state
      setInternalCollapsedCategories((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(categoryName)) {
          newSet.delete(categoryName);
        } else {
          newSet.add(categoryName);
        }
        return newSet;
      });
    }
  };

  // Group items by category -> subcategory
  const grouped = useMemo(() => {
    const map = new Map<string, CategoryGroup>();

    orderItems.forEach((orderItem: SelectedMenuItem, index: number) => {
      const catName = orderItem.item.categoryName || "Uncategorized";
      const subName = orderItem.item.subcategoryName || "";

      if (!map.has(catName)) {
        map.set(catName, { items: [], subcategories: new Map() });
      }

      const category = map.get(catName)!;
      const groupedItem: GroupedItem = {
        item: orderItem.item,
        quantity: orderItem.quantity,
        originalIndex: index,
      };

      if (subName) {
        if (!category.subcategories.has(subName)) {
          category.subcategories.set(subName, []);
        }
        category.subcategories.get(subName)!.push(groupedItem);
      } else {
        category.items.push(groupedItem);
      }
    });

    // Sort categories by the order from the API
    if (categoryOrder.length > 0) {
      const sortedMap = new Map<string, CategoryGroup>();
      const entries = Array.from(map.entries());

      entries.sort((a, b) => {
        const indexA = categoryOrder.indexOf(a[0]);
        const indexB = categoryOrder.indexOf(b[0]);
        // Put unknown categories at the end
        const orderA = indexA === -1 ? 999 : indexA;
        const orderB = indexB === -1 ? 999 : indexB;
        return orderA - orderB;
      });

      entries.forEach(([key, value]) => sortedMap.set(key, value));
      return sortedMap;
    }

    return map;
  }, [orderItems, categoryOrder]);

  if (orderItems.length === 0) return null;

  const renderItemRow = (groupedItem: GroupedItem) => {
    const { item, quantity, originalIndex } = groupedItem;
    const price = parseFloat(item.price?.toString() || "0");
    const discountPrice = parseFloat(item.discountPrice?.toString() || "0");
    const itemPrice =
      item.isDiscount && discountPrice > 0 ? discountPrice : price;
    const BACKEND_QUANTITY_UNIT = item.cateringQuantityUnit || 7;
    const portions = quantity / BACKEND_QUANTITY_UNIT;

    // Calculate addon total
    const addonTotal = (item.selectedAddons || []).reduce(
      (sum: number, addon: { price: number; quantity: number }) =>
        sum + (addon.price || 0) * (addon.quantity || 0),
      0
    );
    const subtotal = itemPrice * quantity + addonTotal;
  
    return (
      <div
        key={originalIndex}
        className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-base-100 rounded-xl min-w-0 overflow-hidden"
      >
        {/* Mobile Layout */}
        <div className="flex gap-3 sm:hidden">
          {/* Image */}
          {item.image && (
            <img
              src={item.image}
              alt={item.menuItemName}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
          )}
          {/* Name + Addons */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 italic">
              {item.menuItemName}
            </p>
            {item.selectedAddons && item.selectedAddons.length > 0 && (
              <div className="text-sm text-gray-600 mt-1">
                {(() => {
                  // Group addons by groupTitle
                  const addonsByGroup = item.selectedAddons.reduce(
                    (
                      acc: Record<string, { name: string; quantity: number }[]>,
                      addon: {
                        groupTitle: string;
                        name: string;
                        quantity: number;
                      }
                    ) => {
                      const group = addon.groupTitle || "Options";
                      if (!acc[group]) acc[group] = [];
                      acc[group].push({
                        name: addon.name,
                        quantity: addon.quantity,
                      });
                      return acc;
                    },
                    {}
                  );
                  return Object.entries(addonsByGroup).map(
                    ([groupTitle, addons]) => (
                      <p key={groupTitle} className="text-gray-500">
                        <span className="font-medium text-gray-700">
                          {groupTitle}:
                        </span>{" "}
                        {(addons as { name: string; quantity: number }[]).map(
                          (a, i) => (
                            <span key={i}>
                              {a.name}
                              {a.quantity > 1 && ` (×${a.quantity})`}
                              {i <
                                (addons as { name: string; quantity: number }[])
                                  .length -
                                  1 && ", "}
                            </span>
                          )
                        )}
                      </p>
                    )
                  );
                })()}
              </div>
            )}
            {item.allergens && item.allergens.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAllergen(originalIndex);
                  }}
                  className="flex items-center gap-1 text-xs font-medium text-orange-700 hover:text-orange-800 transition-colors"
                >
                  <span className="text-orange-600">⚠️</span>
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
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.allergens.map((allergenValue: string) => {
                      const allergen = ALLERGENS.find((a) => a.value === allergenValue);
                      return (
                        <span
                          key={allergenValue}
                          className="inline-flex items-center bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs"
                        >
                          {allergen?.label || allergenValue}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Price & Portions + Actions */}
        <div className="flex items-center justify-between sm:hidden">
          <div>
            <p className="font-bold text-primary text-lg">
              £{subtotal.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">
              {portions} portion{portions !== 1 ? "s" : ""}
            </p>
          </div>
          {showActions && onEdit && onRemove && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(originalIndex)}
                className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors text-sm font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => onRemove(originalIndex)}
                className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors text-sm font-medium"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Desktop Layout */}
        {/* Image */}
        {item.image && (
          <img
            src={item.image}
            alt={item.menuItemName}
            className="hidden sm:block w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
        )}

        {/* Name + Addons */}
        <div className="hidden sm:block flex-1 min-w-0">
          <p className="font-semibold text-gray-800">{item.menuItemName}</p>
          {item.selectedAddons && item.selectedAddons.length > 0 && (
            <div className="text-sm text-gray-600 mt-1">
              {(() => {
                // Group addons by groupTitle
                const addonsByGroup = item.selectedAddons.reduce(
                  (
                    acc: Record<string, { name: string; quantity: number }[]>,
                    addon: {
                      groupTitle: string;
                      name: string;
                      quantity: number;
                    }
                  ) => {
                    const group = addon.groupTitle || "Options";
                    if (!acc[group]) acc[group] = [];
                    acc[group].push({
                      name: addon.name,
                      quantity: addon.quantity,
                    });
                    return acc;
                  },
                  {}
                );
                return Object.entries(addonsByGroup).map(
                  ([groupTitle, addons]) => (
                    <p key={groupTitle}>
                      <span className="font-medium">{groupTitle}:</span>{" "}
                      {(addons as { name: string; quantity: number }[]).map(
                        (a, i) => (
                          <span key={i}>
                            {a.name}
                            {a.quantity > 1 && ` (×${a.quantity})`}
                            {i <
                              (addons as { name: string; quantity: number }[])
                                .length -
                                1 && ", "}
                          </span>
                        )
                      )}
                    </p>
                  )
                );
              })()}
            </div>
          )}
          {item.allergens && item.allergens.length > 0 && (
            <div className="mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleAllergen(originalIndex);
                }}
                className="flex items-center gap-1 text-xs font-medium text-orange-700 hover:text-orange-800 transition-colors"
              >
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
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.allergens.map((allergenValue: string) => {
                    const allergen = ALLERGENS.find((a) => a.value === allergenValue);
                    return (
                      <span
                        key={allergenValue}
                        className="inline-flex items-center bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs"
                      >
                        {allergen?.label || allergenValue}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Price & Portions */}
        <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
          <p className="font-bold text-primary text-lg">
            £{subtotal.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 whitespace-nowrap">
            {portions} portion{portions !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Actions */}
        {showActions && onEdit && onRemove && (
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onEdit(originalIndex)}
              className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors text-sm font-medium"
            >
              Edit
            </button>
            <button
              onClick={() => onRemove(originalIndex)}
              className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors text-sm font-medium"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mb-6 overflow-hidden min-w-0">
      {/* Header */}
      {/* <div className="px-6 py-4 bg-base-100 border-b border-base-200 flex items-center justify-between">
        <h2 className="text-xl sm:text-3xl font-bold text-gray-800">Your List</h2>
        {onViewMenu && (
          <button
            onClick={onViewMenu}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="hidden sm:inline">View Downloadable Menu</span>
            <span className="sm:hidden">PDF</span>
          </button>
        )}
      </div> */}

      {/* Categories */}
      <div className="space-y-4">
        {Array.from(grouped.entries()).map(([categoryName, categoryGroup]) => {
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
              className="border-2 border-base-200 rounded-xl overflow-hidden"
            >
              {/* Category Header */}
              <button
                onClick={() => handleToggleCategory(categoryName)}
                className="w-full flex items-center justify-between px-4 py-3 bg-base-200 hover:bg-base-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">
                    {categoryName}
                  </span>
                  <span className="text-sm text-gray-500">
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

              {/* Category Content */}
              {!isCollapsed && (
                <div className="p-2 space-y-3 min-w-0 overflow-hidden">
                  {/* Items without subcategory */}
                  {categoryGroup.items.map(renderItemRow)}

                  {/* Subcategories */}
                  {Array.from(categoryGroup.subcategories.entries()).map(
                    ([subName, items]) => (
                      <div key={subName}>
                        <p className="text-sm font-medium text-gray-600 mb-2 pl-2">
                          {subName}
                        </p>
                        <div className="space-y-3">
                          {items.map(renderItemRow)}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
