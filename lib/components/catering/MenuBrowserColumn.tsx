"use client";

import { RefObject } from "react";
import { DietaryFilter } from "@/types/menuItem";
import { MenuItem, Restaurant } from "@/types/restaurant.types";
import RestaurantMenuBrowser from "./RestaurantMenuBrowser";
import BundleBrowser from "./BundleBrowser";

interface MenuBrowserColumnProps {
  showBundleBrowser: boolean;
  onToggleBundleBrowser: (show: boolean) => void;
  sessionIndex: number;
  sessionDate?: string;
  eventTime?: string;
  defaultGuestCount: number;
  restaurants: Restaurant[];
  restaurantsLoading: boolean;
  onAddItem: (item: MenuItem) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onAddOrderPress: (item: MenuItem) => void;
  getItemQuantity: (itemId: string) => number;
  expandedItemId: string | null;
  setExpandedItemId: (id: string | null) => void;
  selectedDietaryFilters: DietaryFilter[];
  toggleDietaryFilter: (filter: DietaryFilter) => void;
  categoriesRowRef?: RefObject<HTMLDivElement | null>;
  restaurantListRef: RefObject<HTMLDivElement | null>;
  firstMenuItemRef: RefObject<HTMLDivElement | null>;
  expandedSessionIndex: number | null;
  autoOpenFirstRestaurant?: boolean;
  tutorialResetKey?: number;
}

export default function MenuBrowserColumn({
  showBundleBrowser,
  onToggleBundleBrowser,
  sessionIndex,
  sessionDate,
  eventTime,
  defaultGuestCount,
  restaurants,
  restaurantsLoading,
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
  expandedSessionIndex,
  autoOpenFirstRestaurant = false,
  tutorialResetKey = 0,
}: MenuBrowserColumnProps) {
  if (showBundleBrowser) {
    return (
      <BundleBrowser
        sessionIndex={sessionIndex}
        onBack={() => onToggleBundleBrowser(false)}
        defaultGuestCount={defaultGuestCount}
      />
    );
  }

  return (
    <RestaurantMenuBrowser
      restaurants={restaurants}
      restaurantsLoading={restaurantsLoading}
      sessionDate={sessionDate}
      eventTime={eventTime}
      onOpenBundles={() => onToggleBundleBrowser(true)}
      defaultBundleGuestCount={defaultGuestCount}
      onAddItem={onAddItem}
      onUpdateQuantity={onUpdateQuantity}
      onAddOrderPress={onAddOrderPress}
      getItemQuantity={getItemQuantity}
      expandedItemId={expandedItemId}
      setExpandedItemId={setExpandedItemId}
      selectedDietaryFilters={selectedDietaryFilters}
      toggleDietaryFilter={toggleDietaryFilter}
      categoriesRowRef={categoriesRowRef ?? { current: null }}
      restaurantListRef={restaurantListRef}
      firstMenuItemRef={firstMenuItemRef}
      sessionIndex={sessionIndex}
      expandedSessionIndex={expandedSessionIndex}
      autoOpenFirstRestaurant={autoOpenFirstRestaurant}
      tutorialResetKey={tutorialResetKey}
    />
  );
}
