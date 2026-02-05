// app/components/catering/dashboard/OrderItemsByCategory.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { CateringOrderResponse, MealSessionResponse } from "@/types/api";
import {
  PricingMenuItem,
  PricingOrderItem,
} from "@/types/api/pricing.api.types";
import {
  ChefHat,
  Package,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  FileText,
  Loader2,
} from "lucide-react";
import { categoryService } from "@/services/api/category.api";

interface OrderItemsByCategoryProps {
  order: CateringOrderResponse;
  onViewMenu?: () => void;
  isGeneratingPdf?: boolean;
}

// Extended PricingMenuItem with category/subcategory info from backend
interface PricingMenuItemWithCategories extends PricingMenuItem {
  categoryName?: string;
  category?: {
    id: string;
    name: string;
    displayOrder: number;
  };
}

interface GroupedItem {
  item: PricingMenuItemWithCategories;
  restaurantName: string;
  originalRestaurantIdx: number;
  originalItemIdx: number;
}

interface SubcategoryGroup {
  items: GroupedItem[];
}

interface CategoryGroup {
  items: GroupedItem[]; // Items without subcategory
  subcategories: Map<string, SubcategoryGroup>;
}

export default function OrderItemsByCategory({
  order,
  onViewMenu,
  isGeneratingPdf,
}: OrderItemsByCategoryProps) {
  const hasMealSessions = order.mealSessions && order.mealSessions.length > 0;

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

  // Sort meal sessions by date and time
  const sortedMealSessions = useMemo(() => {
    if (!order.mealSessions) return [];
    return [...order.mealSessions].sort((a, b) => {
      const dateA = new Date(a.sessionDate);
      const dateB = new Date(b.sessionDate);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      // Same date, sort by time
      return a.eventTime.localeCompare(b.eventTime);
    });
  }, [order.mealSessions]);

  // Legacy support: restaurants array for orders without meal sessions
  const restaurantsData = order.restaurants || order.orderItems || [];

  // Track expanded state for sessions and categories
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(
    new Set(sortedMealSessions.map((s) => s.id))
  );
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  );

  const toggleSession = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const toggleCategory = (categoryKey: string) => {
    setCollapsedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryKey)) {
        newSet.delete(categoryKey);
      } else {
        newSet.add(categoryKey);
      }
      return newSet;
    });
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Group items by category and subcategory from all restaurants
  const groupItemsByCategory = (
    restaurants: PricingOrderItem[]
  ): Map<string, CategoryGroup> => {
    const map = new Map<string, CategoryGroup>();

    restaurants.forEach((restaurant, restIdx) => {
      restaurant.menuItems.forEach((menuItem, itemIdx) => {
        const item = menuItem as PricingMenuItemWithCategories;

        // Get category name - use category.name first, then categoryName, fallback to groupTitle, then "Other Items"
        // Capitalize first letter for display
        const rawCategoryName =
          item.category?.name ||
          item.categoryName ||
          item.groupTitle ||
          "Other Items";
        const categoryName =
          rawCategoryName.charAt(0).toUpperCase() + rawCategoryName.slice(1);

        // Get subcategory name from subcategory object if available
        const subcategoryName = item.subcategory?.name || "";

        if (!map.has(categoryName)) {
          map.set(categoryName, { items: [], subcategories: new Map() });
        }

        const category = map.get(categoryName)!;
        const groupedItem: GroupedItem = {
          item,
          restaurantName: restaurant.restaurantName,
          originalRestaurantIdx: restIdx,
          originalItemIdx: itemIdx,
        };

        if (subcategoryName) {
          // Add to subcategory
          if (!category.subcategories.has(subcategoryName)) {
            category.subcategories.set(subcategoryName, { items: [] });
          }
          category.subcategories.get(subcategoryName)!.items.push(groupedItem);
        } else {
          // Add directly to category (no subcategory)
          category.items.push(groupedItem);
        }
      });
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
  };

  // Render a single menu item
  const renderItemRow = (groupedItem: GroupedItem, keyPrefix: string) => {
    const { item, restaurantName } = groupedItem;

    const cateringUnit = item.cateringQuantityUnit || 1;
    const feedsPerUnit = item.feedsPerUnit || 1;
    const numUnits = item.quantity / cateringUnit;
    const totalFeeds = numUnits * feedsPerUnit;

    // Support both 'addons' and 'selectedAddons' property names
    const itemAddons = item.selectedAddons || [];

    return (
      <div
        key={keyPrefix}
        className="bg-gray-50 rounded-lg p-3 sm:p-4 hover:bg-gray-100 transition-colors"
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
          <div className="flex-1 sm:pr-4">
            <p className="font-semibold text-sm sm:text-base text-gray-900 mb-1 break-words">
              {item.menuItemName || item.name}
            </p>
            <p className="text-xs sm:text-sm text-gray-600">
              {Math.round(numUnits)} portion
              {Math.round(numUnits) !== 1 ? "s" : ""} &bull; Serves ~
              {Math.round(totalFeeds)} people
            </p>
            <p className="text-xs text-gray-500 mt-1">From: {restaurantName}</p>
          </div>
          <p className="font-bold text-pink-600 text-sm sm:text-base whitespace-nowrap self-end sm:self-auto">
            £{Number(item.customerTotalPrice || 0).toFixed(2)}
          </p>
        </div>

        {/* Addons */}
        {itemAddons.length > 0 && (
          <div className="mt-2 sm:mt-3 pl-3 sm:pl-4 border-l-2 sm:border-l-3 border-pink-300 bg-white rounded-r-lg p-2 sm:p-3">
            <p className="text-xs font-semibold text-gray-700 mb-1 sm:mb-2 uppercase tracking-wide">
              Add-ons:
            </p>
            <div className="space-y-1">
              {itemAddons.map((addon, addonIdx) => (
                <div
                  key={addonIdx}
                  className="flex justify-between items-center text-xs sm:text-sm gap-2"
                >
                  <span className="text-gray-700 flex-1 break-words">
                    &bull; {addon.name}{" "}
                    <span className="text-gray-500">x {addon.quantity}</span>
                  </span>
                  <span className="text-pink-600 font-semibold whitespace-nowrap">
                    +£
                    {((addon.customerUnitPrice || 0) * addon.quantity).toFixed(
                      2
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render a category group with subcategories
  const renderCategoryGroup = (
    categoryName: string,
    categoryGroup: CategoryGroup,
    keyPrefix: string
  ) => {
    const categoryKey = `${keyPrefix}-${categoryName}`;
    const isCollapsed = collapsedCategories.has(categoryKey);

    // Count total items including those in subcategories
    const totalItems =
      categoryGroup.items.length +
      Array.from(categoryGroup.subcategories.values()).reduce(
        (sum, subGroup) => sum + subGroup.items.length,
        0
      );

    return (
      <div
        key={categoryKey}
        className="border border-gray-200 rounded-lg overflow-hidden"
      >
        <button
          onClick={() => toggleCategory(categoryKey)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ChefHat className="h-4 w-4 text-pink-500" />
            <span className="font-semibold text-gray-800">{categoryName}</span>
            <span className="text-sm text-gray-500">
              ({totalItems} item{totalItems !== 1 ? "s" : ""})
            </span>
          </div>
          {isCollapsed ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {!isCollapsed && (
          <div className="p-3 space-y-2">
            {/* Items without subcategory */}
            {categoryGroup.items.map((groupedItem, idx) =>
              renderItemRow(groupedItem, `${categoryKey}-item-${idx}`)
            )}

            {/* Subcategories and their items */}
            {Array.from(categoryGroup.subcategories.entries()).map(
              ([subcategoryName, subGroup]) => (
                <div
                  key={`${categoryKey}-sub-${subcategoryName}`}
                  className="mt-3"
                >
                  <p className="text-xs font-medium text-gray-600 mb-2 pl-2 uppercase tracking-wide">
                    {subcategoryName}
                  </p>
                  <div className="space-y-2">
                    {subGroup.items.map((groupedItem, idx) =>
                      renderItemRow(
                        groupedItem,
                        `${categoryKey}-sub-${subcategoryName}-${idx}`
                      )
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    );
  };

  // Render a meal session
  const renderMealSession = (session: MealSessionResponse) => {
    const isExpanded = expandedSessions.has(session.id);
    const groupedItems = groupItemsByCategory(session.orderItems);

    return (
      <div
        key={session.id}
        className="border-2 border-pink-200 rounded-xl overflow-hidden bg-white"
      >
        {/* Session Header */}
        <button
          onClick={() => toggleSession(session.id)}
          className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 bg-secondary/50 transition-colors"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-left">
            <h3 className="text-lg sm:text-xl font-bold text-pink-700">
              {session.sessionName}
            </h3>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-pink-500" />
                {formatDate(session.sessionDate)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-pink-500" />
                {formatTime(session.eventTime)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm sm:text-base font-bold text-pink-600">
              £{Number(session.sessionTotal || 0).toFixed(2)}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-pink-400 flex-shrink-0" />
            ) : (
              <ChevronDown className="h-5 w-5 text-pink-400 flex-shrink-0" />
            )}
          </div>
        </button>

        {/* Session Content */}
        {isExpanded && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Guest count and special requirements */}
            {(session.guestCount || session.specialRequirements) && (
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-2">
                {session.guestCount && (
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Guests:</span>{" "}
                    {session.guestCount} people
                  </p>
                )}
                {session.specialRequirements && (
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                      Special Requirements:
                    </p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {session.specialRequirements}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Categories and items */}
            <div className="space-y-3">
              {Array.from(groupedItems.entries()).map(
                ([categoryName, categoryGroup]) =>
                  renderCategoryGroup(categoryName, categoryGroup, session.id)
              )}
            </div>

            {/* Session Pricing Summary */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-700">
                  <span>Subtotal:</span>
                  <span>£{Number(session.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-700">
                  <span>Delivery Fee:</span>
                  <span>£{Number(session.deliveryFee || 0).toFixed(2)}</span>
                </div>
                {session.promoDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Promo Discount:</span>
                    <span>-£{Number(session.promoDiscount || 0).toFixed(2)}</span>
                  </div>
                )}
                {session.promotionDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Restaurant Promotion:</span>
                    <span>-£{Number(session.promotionDiscount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-900 font-bold border-t border-gray-300 pt-2 mt-2">
                  <span>Session Total:</span>
                  <span className="text-pink-600">
                    £{Number(session.sessionTotal || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render legacy view (no meal sessions) grouped by category
  const renderLegacyItemsByCategory = () => {
    const groupedItems = groupItemsByCategory(restaurantsData);

    return (
      <div className="space-y-3">
        {Array.from(groupedItems.entries()).map(
          ([categoryName, categoryGroup]) =>
            renderCategoryGroup(categoryName, categoryGroup, "legacy")
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="h-5 w-5 sm:h-6 sm:w-6 text-pink-500" />
          Order Items
        </h2>
        {onViewMenu && (
          <button
            onClick={onViewMenu}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-pink-600 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {isGeneratingPdf ? "Generating..." : "Download Menu"}
            </span>
            <span className="sm:hidden">
              {isGeneratingPdf ? "..." : "Menu"}
            </span>
          </button>
        )}
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Meal Sessions View */}
        {hasMealSessions ? (
          <div className="space-y-4 sm:space-y-6">
            {sortedMealSessions.map((session) => renderMealSession(session))}
          </div>
        ) : (
          /* Legacy View - No Meal Sessions, grouped by category */
          renderLegacyItemsByCategory()
        )}
      </div>
    </div>
  );
}
