"use client";

import { useState, useMemo, useEffect, useRef, RefObject } from "react";
import {
  Search,
  X,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { MenuItem, Restaurant } from "@/types/restaurant.types";
import { DietaryFilter } from "@/types/menuItem";
import { CategoryWithSubcategories } from "@/types/catering.types";
import { categoryService } from "@/services/api/category.api";
import MenuItemCard from "./MenuItemCard";

interface RestaurantMenuBrowserProps {
  restaurants: Restaurant[];
  restaurantsLoading: boolean;
  allMenuItems: MenuItem[] | null;
  fetchAllMenuItems: () => void;
  onAddItem: (item: MenuItem) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onAddOrderPress: (item: MenuItem) => void;
  getItemQuantity: (itemId: string) => number;
  expandedItemId: string | null;
  setExpandedItemId: (id: string | null) => void;
  selectedDietaryFilters: DietaryFilter[];
  toggleDietaryFilter: (filter: DietaryFilter) => void;
  categoriesRowRef: RefObject<HTMLDivElement | null>;
  restaurantListRef: RefObject<HTMLDivElement | null>;
  firstMenuItemRef: RefObject<HTMLDivElement | null>;
  sessionIndex: number;
  expandedSessionIndex: number | null;
  autoOpenFirstRestaurant?: boolean;
  tutorialResetKey?: number;
}

export default function RestaurantMenuBrowser({
  restaurants,
  restaurantsLoading,
  allMenuItems,
  fetchAllMenuItems,
  onAddItem,
  onUpdateQuantity,
  onAddOrderPress,
  getItemQuantity,
  expandedItemId,
  setExpandedItemId,
  selectedDietaryFilters,
  toggleDietaryFilter,
  categoriesRowRef,
  restaurantListRef,
  firstMenuItemRef,
  sessionIndex,
  expandedSessionIndex,
  autoOpenFirstRestaurant = false,
  tutorialResetKey = 0,
}: RestaurantMenuBrowserProps) {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [restaurantSearchQuery, setRestaurantSearchQuery] = useState("");
  const [categories, setCategories] = useState<CategoryWithSubcategories[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );
  const [activeGroupName, setActiveGroupName] = useState<string | null>(null);
  const [stickyTopOffset, setStickyTopOffset] = useState(72);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const groupButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const isProgrammaticScroll = useRef(false);

  useEffect(() => {
    fetchAllMenuItems();
  }, [fetchAllMenuItems]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const data = await categoryService.getCategories();
        setCategories(data);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    setSelectedRestaurantId(null);
    setSearchQuery("");
    setRestaurantSearchQuery("");
    setSelectedCategoryId(null);
    setCollapsedGroups(new Set());
  }, [tutorialResetKey]);

  const isSearchActive = searchQuery.trim().length > 0;
  const isRestaurantSearchActive = restaurantSearchQuery.trim().length > 0;

  const availableRestaurants = useMemo(
    () => restaurants.filter((r) => r.status !== "coming_soon"),
    [restaurants]
  );

  const dietaryFilteredItems = useMemo(() => {
    if (!allMenuItems) return [];
    if (selectedDietaryFilters.length === 0) return allMenuItems;
    return allMenuItems.filter((item) => {
      if (!item.dietaryFilters || item.dietaryFilters.length === 0) {
        return false;
      }
      return selectedDietaryFilters.every((filter) =>
        item.dietaryFilters!.includes(filter)
      );
    });
  }, [allMenuItems, selectedDietaryFilters]);

  const searchResults = useMemo(() => {
    if (!isSearchActive) return null;
    const query = searchQuery.toLowerCase();
    const matchingItems = dietaryFilteredItems.filter(
      (item) =>
        item.menuItemName.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.groupTitle?.toLowerCase().includes(query)
    );

    const grouped = new Map<
      string,
      { restaurant: Restaurant; items: MenuItem[] }
    >();

    matchingItems.forEach((item) => {
      const restaurant = availableRestaurants.find(
        (r) => r.id === item.restaurantId
      );
      if (!restaurant) return;

      const existing = grouped.get(restaurant.id);
      if (existing) {
        existing.items.push(item);
        return;
      }

      grouped.set(restaurant.id, {
        restaurant,
        items: [item],
      });
    });

    return Array.from(grouped.values()).sort((a, b) =>
      a.restaurant.restaurant_name.localeCompare(b.restaurant.restaurant_name)
    );
  }, [isSearchActive, searchQuery, dietaryFilteredItems, availableRestaurants]);

  const filteredRestaurants = useMemo(() => {
    return availableRestaurants.filter((restaurant) => {
      const matchesCategory =
        !selectedCategoryId ||
        (restaurant.categories ?? []).some(
          (category) => category.id === selectedCategoryId
        );

      const matchesDiet =
        selectedDietaryFilters.length === 0 ||
        selectedDietaryFilters.every((filter) =>
          (restaurant.dietaryFilters ?? []).includes(filter)
        );

      return matchesCategory && matchesDiet;
    });
  }, [availableRestaurants, selectedCategoryId, selectedDietaryFilters]);

  const selectedRestaurant = useMemo(
    () =>
      availableRestaurants.find((r) => r.id === selectedRestaurantId) || null,
    [availableRestaurants, selectedRestaurantId]
  );

  const restaurantItems = useMemo(() => {
    if (!selectedRestaurantId) return [];
    return dietaryFilteredItems.filter(
      (item) => item.restaurantId === selectedRestaurantId
    );
  }, [selectedRestaurantId, dietaryFilteredItems]);

  const filteredRestaurantItems = useMemo(() => {
    if (!isRestaurantSearchActive) return restaurantItems;
    const query = restaurantSearchQuery.toLowerCase();

    return restaurantItems.filter(
      (item) =>
        item.menuItemName.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.groupTitle?.toLowerCase().includes(query)
    );
  }, [restaurantItems, isRestaurantSearchActive, restaurantSearchQuery]);

  const groupedItems = useMemo(() => {
    if (filteredRestaurantItems.length === 0) return [];

    const restaurant = restaurants.find((r) => r.id === selectedRestaurantId);
    const menuGroupSettings =
      restaurant?.menuGroupSettings ||
      filteredRestaurantItems[0]?.restaurant?.menuGroupSettings;
    const hasSettings =
      menuGroupSettings && Object.keys(menuGroupSettings).length > 0;

    let groupNames: string[];
    if (hasSettings) {
      groupNames = Object.keys(menuGroupSettings!).sort((a, b) => {
        const orderA = menuGroupSettings![a]?.displayOrder ?? 999;
        const orderB = menuGroupSettings![b]?.displayOrder ?? 999;
        return orderA - orderB;
      });
    } else {
      groupNames = Array.from(
        new Set(filteredRestaurantItems.map((i) => i.groupTitle || "Other"))
      ).sort((a, b) => a.localeCompare(b));
    }

    const buckets: Record<string, MenuItem[]> = {};
    groupNames.forEach((g) => {
      buckets[g] = [];
    });

    filteredRestaurantItems.forEach((item) => {
      const group = item.groupTitle || "Other";
      if (!buckets[group]) buckets[group] = [];
      buckets[group].push(item);
    });

    const getDisplayPrice = (item: MenuItem) => {
      const price = parseFloat(item.price?.toString() || "0");
      const discountPrice = parseFloat(item.discountPrice?.toString() || "0");
      return (
        (item.cateringQuantityUnit ?? 1) *
        (item.isDiscount && discountPrice > 0 ? discountPrice : price)
      );
    };

    return groupNames
      .filter((name) => buckets[name] && buckets[name].length > 0)
      .map((name) => {
        const items = buckets[name];
        items.sort((a, b) => {
          const orderA = a.itemDisplayOrder ?? 999;
          const orderB = b.itemDisplayOrder ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          const aHasImage = a.image && a.image.trim() !== "" ? 0 : 1;
          const bHasImage = b.image && b.image.trim() !== "" ? 0 : 1;
          if (aHasImage !== bHasImage) return aHasImage - bHasImage;
          return getDisplayPrice(a) - getDisplayPrice(b);
        });

        const information = menuGroupSettings?.[name]?.information || null;

        return {
          name,
          items,
          information,
        };
      });
  }, [filteredRestaurantItems, restaurants, selectedRestaurantId]);

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const handleSelectRestaurant = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId);
    setRestaurantSearchQuery("");
    setSelectedCategoryId(null);
    setCollapsedGroups(new Set());
    setActiveGroupName(null);
  };

  const handleBackToRestaurants = () => {
    setSelectedRestaurantId(null);
    setRestaurantSearchQuery("");
    setCollapsedGroups(new Set());
    setActiveGroupName(null);
  };

  useEffect(() => {
    if (!autoOpenFirstRestaurant || selectedRestaurantId || isSearchActive) return;

    const firstRestaurant = filteredRestaurants[0];
    if (!firstRestaurant) return;

    handleSelectRestaurant(firstRestaurant.id);
  }, [
    autoOpenFirstRestaurant,
    filteredRestaurants,
    isSearchActive,
    selectedRestaurantId,
  ]);

  useEffect(() => {
    const navElement = document.querySelector<HTMLElement>(
      "[data-catering-session-nav='true']"
    );
    if (!navElement) return;

    const updateOffset = () => {
      setStickyTopOffset(navElement.getBoundingClientRect().height);
    };

    updateOffset();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateOffset);
    observer.observe(navElement);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    sectionRefs.current.clear();
    groupButtonRefs.current.clear();
    setActiveGroupName(groupedItems[0]?.name || null);
  }, [groupedItems, selectedRestaurantId]);

  useEffect(() => {
    if (!activeGroupName) return;

    const activeButton = groupButtonRefs.current.get(activeGroupName);
    activeButton?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeGroupName]);

  useEffect(() => {
    if (!selectedRestaurantId || groupedItems.length === 0) return;

    const updateActiveGroup = () => {
      if (isProgrammaticScroll.current) return;

      const activationLine = stickyTopOffset + 96;
      let nextActiveGroup = groupedItems[0]?.name || null;

      for (const group of groupedItems) {
        const section = sectionRefs.current.get(group.name);
        if (!section) continue;

        const { top } = section.getBoundingClientRect();
        if (top <= activationLine) {
          nextActiveGroup = group.name;
        } else {
          break;
        }
      }

      setActiveGroupName((prev) =>
        prev === nextActiveGroup ? prev : nextActiveGroup
      );
    };

    updateActiveGroup();
    window.addEventListener("scroll", updateActiveGroup, { passive: true });
    window.addEventListener("resize", updateActiveGroup);

    return () => {
      window.removeEventListener("scroll", updateActiveGroup);
      window.removeEventListener("resize", updateActiveGroup);
    };
  }, [groupedItems, selectedRestaurantId, stickyTopOffset]);

  const handleGroupTabClick = (groupName: string) => {
    setCollapsedGroups((prev) => {
      if (!prev.has(groupName)) return prev;
      const next = new Set(prev);
      next.delete(groupName);
      return next;
    });

    setActiveGroupName(groupName);

    const section = sectionRefs.current.get(groupName);
    if (!section) return;

    isProgrammaticScroll.current = true;
    const topOffset = stickyTopOffset + 80;
    const nextTop = section.getBoundingClientRect().top + window.scrollY - topOffset;

    window.scrollTo({
      top: Math.max(nextTop, 0),
      behavior: "smooth",
    });

    window.setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 450);
  };

  const renderRestaurantCard = (
    restaurant: Restaurant,
    onClick?: () => void
  ) => {
    const cardContent = (
      <>
        {restaurant.images && restaurant.images.length > 0 ? (
          <div className="relative w-full aspect-video bg-gray-100">
            <img
              src={restaurant.images[0]}
              alt={restaurant.restaurant_name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full aspect-video bg-base-200 flex items-center justify-center">
            <span className="text-3xl font-bold text-gray-300">
              {restaurant.restaurant_name.charAt(0)}
            </span>
          </div>
        )}
        <div className="p-2">
          <p className="text-sm font-semibold text-gray-900 line-clamp-1">
            {restaurant.restaurant_name}
          </p>
          {restaurant.minCateringOrderQuantity &&
            restaurant.minCateringOrderQuantity > 0 && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                Min {restaurant.minCateringOrderQuantity} items
              </span>
            )}
        </div>
      </>
    );

    if (!onClick) {
      return (
        <div className="w-full bg-white rounded-xl border border-base-300 overflow-hidden">
          {cardContent}
        </div>
      );
    }

    return (
      <button
        onClick={onClick}
        className="block w-full bg-white rounded-xl border border-base-300 overflow-hidden text-left hover:shadow-md transition-shadow"
      >
        {cardContent}
      </button>
    );
  };

  const renderDietaryFilters = () => (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-hide">
      <span className="flex-shrink-0 text-xs text-gray-500 mr-1">Diet:</span>
      {(
        [
          { value: DietaryFilter.HALAL, label: "Halal" },
          { value: DietaryFilter.VEGETARIAN, label: "Vegetarian" },
          { value: DietaryFilter.VEGAN, label: "Vegan" },
          { value: DietaryFilter.PESCATERIAN, label: "Pescatarian" },
        ] as const
      ).map((option) => (
        <button
          key={option.value}
          onClick={() => toggleDietaryFilter(option.value)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
            selectedDietaryFilters.includes(option.value)
              ? "bg-green-600 text-white border-green-600"
              : "bg-white text-gray-600 border-gray-300 hover:border-green-500 hover:text-green-600"
          }`}
        >
          {option.label}
          {selectedDietaryFilters.includes(option.value) && (
            <span className="ml-1.5 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white/20">
              x
            </span>
          )}
        </button>
      ))}
    </div>
  );

  const renderCategoryFilters = () => (
    <div style={{ contain: "inline-size" }}>
      <div
        ref={categoriesRowRef}
        className="overflow-x-auto pb-2 pt-1 scrollbar-hide"
      >
        <div className="flex items-center gap-2 md:gap-3">
          {categoriesLoading
            ? [...Array(6)].map((_, index) => (
              <div
                key={index}
                className="h-10 w-20 md:w-24 flex-shrink-0 rounded-xl bg-base-200 animate-pulse"
              />
            ))
            : categories.map((category) => (
              <button
                key={category.id}
                onClick={() =>
                  setSelectedCategoryId(
                    selectedCategoryId === category.id ? null : category.id
                  )
                }
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border flex flex-col items-center justify-center gap-0.5 leading-none ${
                  category.icon ? "min-h-16" : ""
                } ${
                  selectedCategoryId === category.id
                    ? "bg-base-200/30 border-primary text-primary"
                    : "bg-base-200/30 border-transparent text-gray-700 hover:text-primary"
                }`}
              >
                {category.icon && (
                  <span className="flex h-6 md:h-7 items-center justify-center text-xl md:text-2xl leading-none">
                    {category.icon}
                  </span>
                )}
                <span className="text-center text-xs md:text-sm">
                  {category.name}
                </span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );

  if (selectedRestaurantId && selectedRestaurant) {
    return (
      <div style={{ contain: "inline-size" }}>
        <button
          onClick={handleBackToRestaurants}
          className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Restaurants
        </button>

        <div className="flex items-center gap-3 mb-3">
          {selectedRestaurant.images && selectedRestaurant.images.length > 0 ? (
            <img
              src={selectedRestaurant.images[0]}
              alt={selectedRestaurant.restaurant_name}
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-base-200 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-gray-400">
                {selectedRestaurant.restaurant_name.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {selectedRestaurant.restaurant_name}
            </h2>
            {selectedRestaurant.minCateringOrderQuantity &&
              selectedRestaurant.minCateringOrderQuantity > 0 && (
                <p className="text-xs text-gray-500">
                  Min order: {selectedRestaurant.minCateringOrderQuantity} items
                </p>
              )}
          </div>
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={restaurantSearchQuery}
            onChange={(e) => setRestaurantSearchQuery(e.target.value)}
            placeholder={`Search ${selectedRestaurant.restaurant_name} items...`}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-base-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
          {restaurantSearchQuery && (
            <button
              onClick={() => setRestaurantSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="mt-2">{renderDietaryFilters()}</div>

        <div className="mt-3">
          {groupedItems.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 text-sm">
                No items match the current filters.
              </p>
            </div>
          ) : (
            <>
              <div
                className="sticky z-30 mt-2 mb-3 w-full overflow-x-auto scrollbar-hide rounded-full border border-base-300 bg-white/50 px-2 py-1.5 md:px-4 md:py-2 shadow-sm backdrop-blur-md"
                style={{ top: stickyTopOffset + 8 }}
              >
                <div className="flex gap-2 md:gap-5">
                  {groupedItems.map((group) => {
                    const isActive = activeGroupName === group.name;
                    return (
                      <button
                        key={group.name}
                        ref={(el) => {
                          if (el) groupButtonRefs.current.set(group.name, el);
                          else groupButtonRefs.current.delete(group.name);
                        }}
                        onClick={() => handleGroupTabClick(group.name)}
                        className={`flex-shrink-0 whitespace-nowrap rounded-full px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm font-semibold transition-colors ${
                          isActive
                            ? "bg-primary text-white"
                            : "text-gray-500 hover:bg-black/5 hover:text-gray-700"
                        }`}
                      >
                        {group.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {groupedItems.map((group) => {
                const isCollapsed = collapsedGroups.has(group.name);
                return (
                  <div
                    key={group.name}
                    ref={(el) => {
                      if (el) sectionRefs.current.set(group.name, el);
                      else sectionRefs.current.delete(group.name);
                    }}
                    data-group-name={group.name}
                    style={{ scrollMarginTop: stickyTopOffset + 80 }}
                    className="mb-4"
                  >
                    <button
                      onClick={() => toggleGroupCollapse(group.name)}
                      className="w-full flex items-center justify-between py-2 px-1 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-primary">
                          {group.name}
                        </h3>
                        <span className="text-xs text-gray-400 font-normal">
                          ({group.items.length})
                        </span>
                      </div>
                      {isCollapsed ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      )}
                    </button>

                    {group.information && !isCollapsed && (
                      <div className="flex items-start gap-1.5 px-1 pb-2">
                        <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-500 whitespace-pre-line">
                          {group.information}
                        </p>
                      </div>
                    )}

                    {!isCollapsed && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                        {group.items.map((item, itemIdx) => (
                          <div
                            key={item.id}
                            ref={
                              expandedSessionIndex === sessionIndex &&
                              itemIdx === 0 &&
                              group === groupedItems[0]
                                ? firstMenuItemRef
                                : undefined
                            }
                          >
                            <MenuItemCard
                              item={item}
                              quantity={getItemQuantity(item.id)}
                              isExpanded={expandedItemId === item.id}
                              onToggleExpand={() =>
                                setExpandedItemId(
                                  expandedItemId === item.id ? null : item.id
                                )
                              }
                              onAddItem={onAddItem}
                              onUpdateQuantity={onUpdateQuantity}
                              onAddOrderPress={onAddOrderPress}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ contain: "inline-size" }}>
      <div className="relative mt-2 mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search across all restaurants..."
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-base-300 bg-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div>
        {!isSearchActive && renderCategoryFilters()}
        {renderDietaryFilters()}
      </div>

      {isSearchActive ? (
        !allMenuItems ? (
          <div className="text-center py-6">
            <div className="inline-block w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-sm text-gray-500">Loading menu items...</p>
          </div>
        ) : searchResults && searchResults.length === 0 ? (
          <div className="text-center py-6">
            <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              No items found for &ldquo;{searchQuery}&rdquo;
            </p>
          </div>
        ) : searchResults ? (
          <div className="mt-3">
            {searchResults.map((result) => (
              <div key={result.restaurant.id} className="mb-6">
                <div className="mb-3 max-w-sm">
                  {renderRestaurantCard(result.restaurant, () =>
                    handleSelectRestaurant(result.restaurant.id)
                  )}
                </div>

                {result.items.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-primary mb-2">
                      Matching items{" "}
                      <span className="text-gray-400 font-normal">
                        ({result.items.length})
                      </span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {result.items.map((item) => (
                        <div key={item.id}>
                          <MenuItemCard
                            item={item}
                            quantity={getItemQuantity(item.id)}
                            isExpanded={expandedItemId === item.id}
                            onToggleExpand={() =>
                              setExpandedItemId(
                                expandedItemId === item.id ? null : item.id
                              )
                            }
                            onAddItem={onAddItem}
                            onUpdateQuantity={onUpdateQuantity}
                            onAddOrderPress={onAddOrderPress}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null
      ) : (
        <div
          ref={restaurantListRef}
          className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3"
        >
          {restaurantsLoading ? (
            <div className="col-span-full py-8">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="inline-block w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="mt-2 text-sm text-gray-500">
                  Loading restaurants...
                </p>
              </div>
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="col-span-full text-center py-6">
              <p className="text-gray-500 text-sm">No restaurants found.</p>
            </div>
          ) : (
            filteredRestaurants.map((restaurant) => (
              <div key={restaurant.id}>
                {renderRestaurantCard(restaurant, () =>
                  handleSelectRestaurant(restaurant.id)
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
