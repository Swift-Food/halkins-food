"use client";

import { useState, useMemo, useEffect, useRef, RefObject, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  X,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock3,
  Info,
  Package,
  Tag,
} from "lucide-react";
import { MenuItem, Restaurant } from "@/types/restaurant.types";
import { DietaryFilter } from "@/types/menuItem";
import { CategoryWithSubcategories } from "@/types/catering.types";
import { CateringBundleItem, CateringBundleResponse } from "@/types/api/catering.api.types";
import { categoryService } from "@/services/api/category.api";
import { cateringService } from "@/services/api/catering.api";
import { getActivePromotions, Promotion } from "@/services/api/promotion.api";
import { useActiveCatering } from "@/context/useActiveCatering";
import MenuItemCard from "./MenuItemCard";
import BundleCard from "./BundleCard";
import BundleDetailModal from "./modals/BundleDetailModal";
import { mapToMenuItem } from "./catering-order-helpers";

interface RestaurantMenuBrowserProps {
  restaurants: Restaurant[];
  restaurantsLoading: boolean;
  onOpenBundles: () => void;
  sessionDate?: string;
  eventTime?: string;
  defaultBundleGuestCount?: number;
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

interface MenuItemGroup {
  type: "items";
  name: string;
  items: MenuItem[];
  information: string | null;
}

interface BundleGroup {
  type: "bundles";
  name: string;
  bundles: CateringBundleResponse[];
}

type RestaurantGroup = MenuItemGroup | BundleGroup;

function enrichBundleItemAddons(
  bundleItem: CateringBundleItem,
  menuItem: MenuItem
): MenuItem["selectedAddons"] {
  if (!bundleItem.selectedAddons || bundleItem.selectedAddons.length === 0) {
    return [];
  }

  return bundleItem.selectedAddons.map((bundleAddon) => {
    const matchedAddon = menuItem.addons?.find(
      (addon) => addon.name === bundleAddon.name
    );

    return {
      name: bundleAddon.name,
      price: Number(matchedAddon?.price ?? 0),
      quantity: bundleAddon.quantity,
      groupTitle: matchedAddon?.groupTitle ?? "Options",
    };
  });
}

function formatAdvanceNoticeTime(value: string): string {
  const [hours, minutes] = value.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getClosestSlotLabel(
  slots: Array<{ open?: string | null; close?: string | null }>,
  eventTime?: string
): string | null {
  const validSlots = slots.filter(
    (slot): slot is { open: string; close: string } =>
      Boolean(slot.open) && Boolean(slot.close)
  );

  if (validSlots.length === 0) {
    return null;
  }

  if (!eventTime) {
    const firstSlot = validSlots[0];
    return `${formatAdvanceNoticeTime(firstSlot.open)} - ${formatAdvanceNoticeTime(
      firstSlot.close
    )}`;
  }

  const eventMinutes = timeToMinutes(eventTime);
  const closestSlot = validSlots.reduce((closest, slot) => {
    const openTotal = timeToMinutes(slot.open);
    const closeTotal = timeToMinutes(slot.close);
    const distance =
      eventMinutes < openTotal
        ? openTotal - eventMinutes
        : eventMinutes > closeTotal
          ? eventMinutes - closeTotal
          : 0;

    if (!closest || distance < closest.distance) {
      return { slot, distance };
    }

    return closest;
  }, null as { slot: { open: string; close: string }; distance: number } | null);

  if (!closestSlot) {
    return null;
  }

  return `${formatAdvanceNoticeTime(closestSlot.slot.open)} - ${formatAdvanceNoticeTime(
    closestSlot.slot.close
  )}`;
}

function getWeeklyCateringHoursText(restaurant: Restaurant): string {
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  if (!restaurant.cateringOperatingHours?.length) {
    return "No catering hours set for this week";
  }

  return days
    .map((day) => {
      const daySlots = restaurant.cateringOperatingHours!.filter(
        (slot) => slot.day.toLowerCase() === day.toLowerCase() && slot.enabled
      ).filter((slot) => slot.open && slot.close);

      if (daySlots.length === 0) {
        return `${day}: No catering`;
      }

      const label = daySlots
        .map(
          (slot) =>
            `${formatAdvanceNoticeTime(slot.open!)} - ${formatAdvanceNoticeTime(
              slot.close!
            )}`
        )
        .join(" / ");

      return `${day}: ${label}`;
    })
    .join("\n");
}

function getRestaurantCateringWindowInfo(
  restaurant: Restaurant,
  sessionDate?: string,
  eventTime?: string
): {
  text: string;
  fullText: string;
  isAvailable: boolean;
} {
  if (!sessionDate) {
    return {
      text: "Set a session date to view catering times",
      fullText: getWeeklyCateringHoursText(restaurant),
      isAvailable: true,
    };
  }

  const cateringHours = restaurant.cateringOperatingHours;
  if (!cateringHours || cateringHours.length === 0) {
    return {
      text: "No catering on this day",
      fullText: getWeeklyCateringHoursText(restaurant),
      isAvailable: false,
    };
  }

  const dayOfWeek = new Date(`${sessionDate}T00:00:00`)
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();

  const daySlots = cateringHours.filter(
    (slot) => slot.day.toLowerCase() === dayOfWeek && slot.enabled
  );

  if (daySlots.length === 0) {
    return {
      text: "No catering on this day",
      fullText: getWeeklyCateringHoursText(restaurant),
      isAvailable: false,
    };
  }

  const closestSlotLabel = getClosestSlotLabel(daySlots, eventTime);

  if (!eventTime) {
    return {
      text: closestSlotLabel || "Catering times unavailable",
      fullText: getWeeklyCateringHoursText(restaurant),
      isAvailable: true,
    };
  }

  const eventMinutes = timeToMinutes(eventTime);
  const isAvailable = daySlots.some((slot) => {
    if (!slot.open || !slot.close) return false;
    const openTotal = timeToMinutes(slot.open);
    const closeTotal = timeToMinutes(slot.close);
    return eventMinutes >= openTotal && eventMinutes <= closeTotal;
  });

  return {
    text: closestSlotLabel || "Catering times unavailable",
    fullText: getWeeklyCateringHoursText(restaurant),
    isAvailable,
  };
}

function getRestaurantAdvanceNoticeDeadline(
  restaurant: Restaurant,
  sessionDate?: string,
  eventTime?: string
): Date | null {
  if (!sessionDate || !eventTime) {
    return null;
  }

  const advanceNotice = restaurant.advanceNoticeSettings;

  if (
    advanceNotice?.type === "hours" &&
    typeof advanceNotice.hours === "number" &&
    advanceNotice.hours > 0
  ) {
    const eventDateTime = new Date(`${sessionDate}T${eventTime}:00`);
    return new Date(eventDateTime.getTime() - advanceNotice.hours * 60 * 60 * 1000);
  }

  if (
    advanceNotice?.type === "days_before_time" &&
    typeof advanceNotice.days === "number" &&
    advanceNotice.days >= 0
  ) {
    const cutoffDate = new Date(`${sessionDate}T00:00:00`);
    const cutoffTime = advanceNotice.cutoffTime || eventTime;
    const [cutoffHours, cutoffMinutes] = cutoffTime.split(":").map(Number);

    if (Number.isNaN(cutoffHours) || Number.isNaN(cutoffMinutes)) {
      return null;
    }

    cutoffDate.setDate(cutoffDate.getDate() - advanceNotice.days);
    cutoffDate.setHours(cutoffHours, cutoffMinutes, 0, 0);

    return cutoffDate;
  }

  if (
    typeof restaurant.minimumDeliveryNoticeHours === "number" &&
    restaurant.minimumDeliveryNoticeHours > 0
  ) {
    const eventDateTime = new Date(`${sessionDate}T${eventTime}:00`);
    return new Date(
      eventDateTime.getTime() - restaurant.minimumDeliveryNoticeHours * 60 * 60 * 1000
    );
  }

  return null;
}

function getRestaurantAdvanceNoticeText(restaurant: Restaurant): string | null {
  const advanceNotice = restaurant.advanceNoticeSettings;

  if (
    advanceNotice?.type === "hours" &&
    typeof advanceNotice.hours === "number" &&
    advanceNotice.hours > 0
  ) {
    return `${advanceNotice.hours}h notice`;
  }

  if (
    advanceNotice?.type === "days_before_time" &&
    typeof advanceNotice.days === "number"
  ) {
    if (advanceNotice.cutoffTime) {
      if (advanceNotice.days === 0) {
        return `Order by ${formatAdvanceNoticeTime(advanceNotice.cutoffTime)}`;
      }

      const label = advanceNotice.days === 1 ? "day" : "days";
      return `${advanceNotice.days} ${label} notice by ${formatAdvanceNoticeTime(
        advanceNotice.cutoffTime
      )}`;
    }

    if (advanceNotice.days > 0) {
      const label = advanceNotice.days === 1 ? "day" : "days";
      return `${advanceNotice.days} ${label} notice`;
    }
  }

  if (
    typeof restaurant.minimumDeliveryNoticeHours === "number" &&
    restaurant.minimumDeliveryNoticeHours > 0
  ) {
    return `${restaurant.minimumDeliveryNoticeHours}h notice`;
  }

  return null;
}

function isRestaurantAdvanceNoticeMet(
  restaurant: Restaurant,
  sessionDate?: string,
  eventTime?: string
): boolean {
  const deadline = getRestaurantAdvanceNoticeDeadline(
    restaurant,
    sessionDate,
    eventTime
  );

  if (!deadline) {
    return true;
  }

  return new Date() <= deadline;
}

export default function RestaurantMenuBrowser({
  restaurants,
  restaurantsLoading,
  onOpenBundles,
  sessionDate,
  eventTime,
  defaultBundleGuestCount = 1,
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
  const { addMenuItem } = useActiveCatering();
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
  const [restaurantBundles, setRestaurantBundles] = useState<
    CateringBundleResponse[]
  >([]);
  const [bundlesLoading, setBundlesLoading] = useState(false);
  const [bundlesError, setBundlesError] = useState<string | null>(null);
  const [selectedBundle, setSelectedBundle] =
    useState<CateringBundleResponse | null>(null);
  const [addingBundleId, setAddingBundleId] = useState<string | null>(null);
  const [restaurantPromotions, setRestaurantPromotions] = useState<Promotion[]>([]);
  const [menuItemsCache, setMenuItemsCache] = useState<MenuItem[] | null>(null);
  const [openHoursInfoRestaurantId, setOpenHoursInfoRestaurantId] = useState<string | null>(null);
  const [hoveredHoursInfoRestaurantId, setHoveredHoursInfoRestaurantId] = useState<string | null>(null);
  const [hoursInfoPosition, setHoursInfoPosition] = useState<{ top: number; left: number } | null>(
    null
  );
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const groupButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const isProgrammaticScroll = useRef(false);
  const hoursInfoContainerRef = useRef<HTMLDivElement | null>(null);
  const hoursInfoButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    fetchAllMenuItems();
  }, [fetchAllMenuItems]);

  useEffect(() => {
    if (allMenuItems) {
      setMenuItemsCache(allMenuItems);
    }
  }, [allMenuItems]);

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
    setRestaurantBundles([]);
    setBundlesError(null);
    setSelectedBundle(null);
  }, [tutorialResetKey]);

  useEffect(() => {
    if (!openHoursInfoRestaurantId) {
      return;
    }

    if (isMobileViewport) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const button = hoursInfoButtonRefs.current.get(openHoursInfoRestaurantId);
      if (button?.contains(event.target as Node)) {
        return;
      }

      if (
        hoursInfoContainerRef.current &&
        !hoursInfoContainerRef.current.contains(event.target as Node)
      ) {
        setOpenHoursInfoRestaurantId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [openHoursInfoRestaurantId, isMobileViewport]);

  useEffect(() => {
    const updateViewport = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  const updateHoursInfoPosition = useCallback((restaurantId: string) => {
    const button = hoursInfoButtonRefs.current.get(restaurantId);

    if (!button) return;

    const rect = button.getBoundingClientRect();
    setHoursInfoPosition({
      top: rect.top - 8,
      left: rect.right,
    });
  }, []);

  const isSearchActive = searchQuery.trim().length > 0;
  const isRestaurantSearchActive = restaurantSearchQuery.trim().length > 0;

  const compareRestaurantsByAvailability = useCallback(
    (a: Restaurant, b: Restaurant) => {
      const aAvailableForTime = getRestaurantCateringWindowInfo(
        a,
        sessionDate,
        eventTime
      ).isAvailable;
      const bAvailableForTime = getRestaurantCateringWindowInfo(
        b,
        sessionDate,
        eventTime
      ).isAvailable;
      const aNoticeMet = isRestaurantAdvanceNoticeMet(a, sessionDate, eventTime);
      const bNoticeMet = isRestaurantAdvanceNoticeMet(b, sessionDate, eventTime);
      const aAvailable = aAvailableForTime && aNoticeMet;
      const bAvailable = bAvailableForTime && bNoticeMet;

      if (aAvailable !== bAvailable) {
        return aAvailable ? -1 : 1;
      }

      return a.restaurant_name.localeCompare(b.restaurant_name);
    },
    [sessionDate, eventTime]
  );

  const availableRestaurants = useMemo(
    () =>
      restaurants
        .filter((r) => r.status !== "coming_soon")
        .sort(compareRestaurantsByAvailability),
    [restaurants, compareRestaurantsByAvailability]
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

  const restaurantHoursTooltipTextById = useMemo(
    () =>
      new Map(
        restaurants.map((restaurant) => [
          restaurant.id,
          getWeeklyCateringHoursText(restaurant),
        ])
      ),
    [restaurants]
  );

  const activeHoursInfoRestaurantId =
    openHoursInfoRestaurantId || hoveredHoursInfoRestaurantId;

  useEffect(() => {
    if (!activeHoursInfoRestaurantId || isMobileViewport) {
      return;
    }

    const syncPosition = () => updateHoursInfoPosition(activeHoursInfoRestaurantId);

    syncPosition();
    window.addEventListener("resize", syncPosition);
    window.addEventListener("scroll", syncPosition, true);

    return () => {
      window.removeEventListener("resize", syncPosition);
      window.removeEventListener("scroll", syncPosition, true);
    };
  }, [activeHoursInfoRestaurantId, updateHoursInfoPosition, isMobileViewport]);

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
      compareRestaurantsByAvailability(a.restaurant, b.restaurant)
    );
  }, [
    isSearchActive,
    searchQuery,
    dietaryFilteredItems,
    availableRestaurants,
    compareRestaurantsByAvailability,
  ]);

  const filteredRestaurants = useMemo(() => {
    return availableRestaurants
      .filter((restaurant) => {
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
      })
      .sort(compareRestaurantsByAvailability);
  }, [
    availableRestaurants,
    selectedCategoryId,
    selectedDietaryFilters,
    compareRestaurantsByAvailability,
  ]);

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

  const groupedItems = useMemo<MenuItemGroup[]>(() => {
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
          type: "items",
          name,
          items,
          information,
        };
      });
  }, [filteredRestaurantItems, restaurants, selectedRestaurantId]);

  const filteredRestaurantBundles = useMemo(() => {
    if (!isRestaurantSearchActive) return restaurantBundles;

    const query = restaurantSearchQuery.toLowerCase();

    return restaurantBundles.filter((bundle) => {
      const matchesBundle =
        bundle.name.toLowerCase().includes(query) ||
        bundle.description?.toLowerCase().includes(query);
      const matchesItems = bundle.items.some((item) =>
        item.menuItemName.toLowerCase().includes(query)
      );

      return matchesBundle || matchesItems;
    });
  }, [restaurantBundles, isRestaurantSearchActive, restaurantSearchQuery]);

  const restaurantGroups = useMemo<RestaurantGroup[]>(() => {
    const groups: RestaurantGroup[] = [];
    const shouldShowBundlesSection =
      bundlesLoading ||
      bundlesError !== null ||
      filteredRestaurantBundles.length > 0;

    if (shouldShowBundlesSection) {
      groups.push({
        type: "bundles",
        name: "Bundles",
        bundles: filteredRestaurantBundles,
      });
    }

    groups.push(...groupedItems);

    return groups;
  }, [bundlesLoading, bundlesError, filteredRestaurantBundles, groupedItems]);

  const firstMenuGroupName = groupedItems[0]?.name ?? null;

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

  const handleAddBundle = useCallback(
    async (bundle: CateringBundleResponse, guestQuantity: number) => {
      setAddingBundleId(bundle.id);
      try {
        const items = await ensureMenuItems();

        for (const bundleItem of bundle.items) {
          const menuItem = items.find((item) => item.id === bundleItem.menuItemId);
          if (!menuItem) continue;

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
      } catch (error) {
        console.error("Failed to add bundle:", error);
        alert("Failed to add bundle. Please try again.");
      } finally {
        setAddingBundleId(null);
      }
    },
    [addMenuItem, ensureMenuItems, sessionIndex]
  );

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
    if (!selectedRestaurantId) return;
    if (availableRestaurants.some((restaurant) => restaurant.id === selectedRestaurantId)) {
      return;
    }

    setSelectedRestaurantId(null);
    setRestaurantSearchQuery("");
    setCollapsedGroups(new Set());
    setActiveGroupName(null);
  }, [availableRestaurants, selectedRestaurantId]);

  useEffect(() => {
    if (!selectedRestaurantId) {
      setRestaurantBundles([]);
      setBundlesLoading(false);
      setBundlesError(null);
      return;
    }

    let cancelled = false;

    const fetchRestaurantBundles = async () => {
      try {
        setBundlesLoading(true);
        setBundlesError(null);
        const bundles = await cateringService.getBundlesByRestaurant(
          selectedRestaurantId
        );
        if (!cancelled) {
          setRestaurantBundles(bundles);
        }
      } catch (error) {
        console.error("Failed to fetch restaurant bundles:", error);
        if (!cancelled) {
          setRestaurantBundles([]);
          setBundlesError("Failed to load bundles for this restaurant.");
        }
      } finally {
        if (!cancelled) {
          setBundlesLoading(false);
        }
      }
    };

    fetchRestaurantBundles();

    return () => {
      cancelled = true;
    };
  }, [selectedRestaurantId]);

  useEffect(() => {
    if (!selectedRestaurantId) {
      setRestaurantPromotions([]);
      return;
    }

    let cancelled = false;

    getActivePromotions(selectedRestaurantId, "CATERING").then((promos) => {
      if (!cancelled) setRestaurantPromotions(promos);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedRestaurantId]);

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
    setActiveGroupName(restaurantGroups[0]?.name || null);
  }, [restaurantGroups, selectedRestaurantId]);

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
    if (!selectedRestaurantId || restaurantGroups.length === 0) return;

    const updateActiveGroup = () => {
      if (isProgrammaticScroll.current) return;

      const activationLine = stickyTopOffset + 96;
      let nextActiveGroup = restaurantGroups[0]?.name || null;

      for (const group of restaurantGroups) {
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
  }, [restaurantGroups, selectedRestaurantId, stickyTopOffset]);

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
    const cateringWindowInfo = getRestaurantCateringWindowInfo(
      restaurant,
      sessionDate,
      eventTime
    );
    const advanceNoticeText = getRestaurantAdvanceNoticeText(restaurant);
    const isAdvanceNoticeMet = isRestaurantAdvanceNoticeMet(
      restaurant,
      sessionDate,
      eventTime
    );
    const isUnavailableForSession =
      !cateringWindowInfo.isAvailable || !isAdvanceNoticeMet;
    const hoursTooltipText = cateringWindowInfo.fullText;

    const cardContent = (
      <div className="overflow-hidden rounded-xl bg-white">
        <div className="flex md:block">
          {restaurant.images && restaurant.images.length > 0 ? (
            <div className="relative aspect-square w-28 flex-shrink-0 bg-gray-100 md:w-full md:aspect-video">
              <img
                src={restaurant.images[0]}
                alt={restaurant.restaurant_name}
                className={`w-full h-full object-cover ${
                  isUnavailableForSession ? "grayscale opacity-60" : ""
                }`}
              />
              {isUnavailableForSession ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/35 px-2 text-center">
                  <span
                    className="rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-primary shadow-sm md:px-3 md:text-[11px]"
                    title={hoursTooltipText}
                  >
                    Unavailable
                  </span>
                </div>
              ) : null}
            </div>
          ) : (
            <div
              className={`relative aspect-square w-28 flex-shrink-0 items-center justify-center ${
                isUnavailableForSession ? "bg-gray-200" : "bg-base-200"
              } flex md:w-full md:aspect-video`}
            >
              <span className="text-2xl font-bold text-gray-300 md:text-3xl">
                {restaurant.restaurant_name.charAt(0)}
              </span>
              {isUnavailableForSession ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/35 px-2 text-center">
                  <span
                    className="rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-primary shadow-sm md:px-3 md:text-[11px]"
                    title={hoursTooltipText}
                  >
                    Unavailable
                  </span>
                </div>
              ) : null}
            </div>
          )}
          <div className="min-w-0 flex-1 p-3">
          <p className="line-clamp-2 text-sm font-semibold leading-tight text-gray-900">
            {restaurant.restaurant_name}
          </p>
          {restaurant.minCateringOrderQuantity &&
          restaurant.minCateringOrderQuantity > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                Min {restaurant.minCateringOrderQuantity} items
              </span>
            </div>
          ) : null}
          <div className="mt-1.5 min-h-8 space-y-0.5">
            <div
              className={`flex items-center gap-1.5 text-[11px] leading-4 ${
                isAdvanceNoticeMet ? "text-gray-500" : "font-semibold text-primary"
              }`}
            >
              <Clock3
                className={`h-3.5 w-3.5 flex-shrink-0 ${
                  isAdvanceNoticeMet ? "text-gray-400" : "text-primary"
                }`}
              />
              <span className="line-clamp-1">
                {advanceNoticeText || "No advance notice"}
              </span>
            </div>
            <div className="relative flex items-center justify-between gap-2">
              <div
                className={`flex min-w-0 items-center gap-1.5 text-[11px] leading-4 ${
                  cateringWindowInfo.isAvailable
                    ? "text-gray-500"
                    : "font-semibold text-primary"
                }`}
              >
                <Clock3
                  className={`h-3.5 w-3.5 flex-shrink-0 ${
                    cateringWindowInfo.isAvailable
                      ? "text-gray-400"
                      : "text-primary"
                  }`}
                />
                <span className="line-clamp-1" title={hoursTooltipText}>
                  {cateringWindowInfo.text}
                </span>
              </div>
              <div className="relative flex-shrink-0">
                <button
                  ref={(element) => {
                    if (element) {
                      hoursInfoButtonRefs.current.set(restaurant.id, element);
                    } else {
                      hoursInfoButtonRefs.current.delete(restaurant.id);
                    }
                  }}
                  type="button"
                  aria-label={`View weekly catering hours for ${restaurant.restaurant_name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!isMobileViewport) {
                      updateHoursInfoPosition(restaurant.id);
                    }
                    setOpenHoursInfoRestaurantId((current) =>
                      current === restaurant.id ? null : restaurant.id
                    );
                  }}
                  onMouseEnter={() => {
                    if (!isMobileViewport) {
                      updateHoursInfoPosition(restaurant.id);
                      setHoveredHoursInfoRestaurantId(restaurant.id);
                    }
                  }}
                  onMouseLeave={() => {
                    if (!isMobileViewport) {
                      setHoveredHoursInfoRestaurantId((current) =>
                        current === restaurant.id ? null : current
                      );
                    }
                  }}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-base-300 bg-white text-gray-500 shadow-sm transition-colors hover:text-primary focus:outline-none"
                  title="View weekly catering hours"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    );

    if (!onClick) {
      return (
        <div className="relative w-full overflow-visible rounded-xl border border-base-300 bg-white shadow-sm">
          {cardContent}
        </div>
      );
    }

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        }}
        className="relative w-full overflow-visible rounded-xl border border-base-300 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      >
        {cardContent}
      </div>
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

  const hoursInfoTooltip =
    !isMobileViewport && activeHoursInfoRestaurantId && hoursInfoPosition
      ? createPortal(
          <div
            ref={hoursInfoContainerRef}
            className="fixed z-[1000] w-64 -translate-x-full -translate-y-full whitespace-pre-line rounded-lg border border-base-300 bg-white p-2 text-[11px] leading-4 text-gray-600 shadow-lg"
            style={{
              left: hoursInfoPosition.left,
              top: hoursInfoPosition.top,
            }}
            onMouseEnter={() => {
              if (!openHoursInfoRestaurantId) {
                setHoveredHoursInfoRestaurantId(activeHoursInfoRestaurantId);
              }
            }}
            onMouseLeave={() => {
              if (!openHoursInfoRestaurantId) {
                setHoveredHoursInfoRestaurantId(null);
              }
            }}
          >
            {restaurantHoursTooltipTextById.get(activeHoursInfoRestaurantId)}
          </div>,
          document.body
        )
      : null;

  const mobileHoursInfoSheet =
    isMobileViewport && openHoursInfoRestaurantId
      ? createPortal(
          <div className="fixed inset-0 z-[1000] flex items-end bg-black/30">
            <button
              type="button"
              aria-label="Close weekly catering hours"
              className="absolute inset-0 cursor-default"
              onClick={() => setOpenHoursInfoRestaurantId(null)}
            />
            <div className="relative z-10 w-full rounded-t-2xl bg-white p-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Weekly catering hours
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {restaurants.find((restaurant) => restaurant.id === openHoursInfoRestaurantId)
                      ?.restaurant_name || "Restaurant"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenHoursInfoRestaurantId(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-base-300 bg-white text-gray-500 shadow-sm"
                  aria-label="Close weekly catering hours"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 whitespace-pre-line rounded-xl bg-base-100 px-3 py-3 text-sm leading-5 text-gray-700">
                {restaurantHoursTooltipTextById.get(openHoursInfoRestaurantId)}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

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
                  category.images || category.icon ? "min-h-16" : ""
                } ${
                  selectedCategoryId === category.id
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-700 hover:text-primary"
                }`}
              >
                {category.images ? (
                  <img
                    src={category.images}
                    alt={category.name}
                    className="h-8 w-8 md:h-9 md:w-9 object-cover rounded-full border border-base-300"
                  />
                ) : category.icon ? (
                  <span className="flex h-6 md:h-7 items-center justify-center text-xl md:text-2xl leading-none">
                    {category.icon}
                  </span>
                ) : null}
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
    const selectedRestaurantAdvanceNoticeText =
      getRestaurantAdvanceNoticeText(selectedRestaurant);
    const selectedRestaurantNoticeDeadline = getRestaurantAdvanceNoticeDeadline(
      selectedRestaurant,
      sessionDate,
      eventTime
    );
    const isSelectedRestaurantWithinNoticeWindow =
      !!selectedRestaurantNoticeDeadline && new Date() > selectedRestaurantNoticeDeadline;

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
            <div className="mt-1 flex flex-wrap gap-2">
              {selectedRestaurant.minCateringOrderQuantity &&
              selectedRestaurant.minCateringOrderQuantity > 0 ? (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                  Min order: {selectedRestaurant.minCateringOrderQuantity} items
                </span>
              ) : null}
              {selectedRestaurantAdvanceNoticeText ? (
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                    isSelectedRestaurantWithinNoticeWindow
                      ? "text-primary"
                      : "text-gray-500"
                  }`}
                >
                  <Clock3
                    className={`h-3.5 w-3.5 ${
                      isSelectedRestaurantWithinNoticeWindow
                        ? "text-primary"
                        : "text-gray-400"
                    }`}
                  />
                  {selectedRestaurantAdvanceNoticeText}
                </span>
              ) : null}
            </div>
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
          {restaurantGroups.length === 0 ? (
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
                  {restaurantGroups.map((group) => {
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

              {restaurantPromotions.length > 0 && (
                <div className="mb-4 flex flex-col gap-2">
                  {restaurantPromotions.map((promo) => {
                    let label = "";
                    let detail = "";

                    if (promo.promotionType === "BUY_MORE_SAVE_MORE" && promo.discountTiers?.length) {
                      const sorted = [...promo.discountTiers].sort((a, b) => a.minQuantity - b.minQuantity);
                      label = "Buy More, Save More";
                      detail = sorted.map((t) => `${t.minQuantity}+ items: ${t.discountPercentage}% off`).join(" · ");
                    } else if (promo.promotionType === "BOGO") {
                      label = "Buy One Get One";
                      detail =
                        promo.buyQuantity && promo.getQuantity
                          ? `Buy ${promo.buyQuantity} get ${promo.getQuantity} free`
                          : "Buy one get one free";
                    } else if (promo.discountPercentage) {
                      label = promo.name;
                      detail = `${promo.discountPercentage}% off`;
                      if (promo.minOrderAmount) detail += ` on orders over £${promo.minOrderAmount}`;
                    } else {
                      label = promo.name;
                      detail = promo.description;
                    }

                    return (
                      <div
                        key={promo.id}
                        className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3"
                      >
                        <Tag className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-green-800">{label}</p>
                          {detail && (
                            <p className="text-xs text-green-700 mt-0.5">{detail}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {restaurantGroups.map((group) => {
                const isCollapsed = collapsedGroups.has(group.name);
                const groupCount =
                  group.type === "bundles" ? group.bundles.length : group.items.length;
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
                    <div className="w-full flex items-center gap-2 py-2 px-1">
                      <h3 className="text-base font-bold text-primary">
                        {group.name}
                      </h3>
                      <span className="text-xs text-gray-400 font-normal">
                        ({groupCount})
                      </span>
                    </div>

                    {group.type === "items" && group.information && (
                      <div className="flex items-start gap-1.5 px-1 pb-2">
                        <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-500 whitespace-pre-line">
                          {group.information}
                        </p>
                      </div>
                    )}

                    {group.type === "bundles" ? (
                        bundlesLoading ? (
                          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                            <span className="loading loading-spinner loading-sm text-primary" />
                            Loading bundles...
                          </div>
                        ) : bundlesError ? (
                          <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {bundlesError}
                          </div>
                        ) : group.bundles.length === 0 ? (
                          <div className="mt-2 rounded-xl border border-dashed border-base-300 bg-base-100/60 px-4 py-5 text-sm text-gray-500">
                            No bundles match the current filters.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                            {group.bundles.map((bundle) => (
                              <BundleCard
                                key={bundle.id}
                                bundle={bundle}
                                onClick={setSelectedBundle}
                              />
                            ))}
                          </div>
                        )
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                          {group.items.map((item, itemIdx) => (
                            <div
                              key={item.id}
                              ref={
                                expandedSessionIndex === sessionIndex &&
                                itemIdx === 0 &&
                                group.name === firstMenuGroupName
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

        {selectedBundle && (
          <BundleDetailModal
            bundle={selectedBundle}
            defaultQuantity={defaultBundleGuestCount}
            isAdding={addingBundleId === selectedBundle.id}
            onAdd={handleAddBundle}
            onClose={() => setSelectedBundle(null)}
            allMenuItems={menuItemsCache || allMenuItems}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ contain: "inline-size" }}>
      {hoursInfoTooltip}
      {mobileHoursInfoSheet}
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
        {!isSearchActive && (
          <button
            type="button"
            onClick={onOpenBundles}
            className="mb-3 flex w-full items-start justify-between rounded-2xl border border-primary/15 bg-primary/[0.05] px-4 py-4 text-left transition-colors hover:bg-primary/[0.08]"
          >
            <span className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                <Package className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-gray-900">
                  Don&apos;t know what to get?
                </span>
                <span className="mt-1 block text-sm text-gray-600">
                  Look at our bundles.
                </span>
              </span>
            </span>
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
              Browse
            </span>
          </button>
        )}
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
          className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 mt-3"
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
