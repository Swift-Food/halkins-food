import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { cateringService } from "@/services/api/catering.api";
import { promotionsServices } from "@/services/api/promotion.api";
import RestaurantCatalogue from "./RestaurantCatalogue";
import MenuCatalogue from "./MenuCatalogue";
import { useCateringFilters } from "@/context/CateringFilterContext";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/constants/api";
import { fetchWithAuth } from "@/lib/api-client/auth-client";

export interface Restaurant {
  id: string;
  restaurant_name: string;
  restaurantType: string;
  images: string[];
  eventImages?: string[];
  averageRating: string;
  minCateringOrderQuantity?: number;
  minimumDeliveryNoticeHours?: number;
  contactEmail?: string;
  contactNumber?: string;
  cateringMinOrderSettings: {
    required?: Array<{
      minQuantity: number;
      applicableSections: string[];
    }>;
    optional?: Array<{
      minQuantity: number;
      applicableSections: string[];
    }>;
  } | null;
  cateringOperatingHours?:
    | {
        day: string;
        open: string | null;
        close: string | null;
        enabled: boolean;
      }[]
    | null;
}

export interface Addon {
  name: string;
  price: string;
  allergens: string;
  dietaryRestrictions?: string[];
  groupTitle: string;
  isRequired: boolean;
  selectionType: "single" | "multiple";
}

export interface MenuItem {
  id: string;
  menuItemName: string;
  description?: string;
  price: string;
  discountPrice?: string;
  allergens?: string[];
  isDiscount: boolean;
  image?: string;
  averageRating?: string;
  cateringQuantityUnit?: number;
  feedsPerUnit?: number;
  restaurantId: string;
  restaurantName?: string;
  groupTitle?: string;
  status?: string;
  itemDisplayOrder: number;
  addons: Addon[];
  selectedAddons?: {
    name: string;
    price: number;
    quantity: number;
    groupTitle: string;
    allergens?: string | string[];
    dietaryRestrictions?: string[];
  }[];
  addonPrice?: number;
  portionQuantity?: number;
  restaurant?: {
    id: string;
    name: string;
    restaurantId: string;
    menuGroupSettings?: Record<string, any>;
  };
  dietaryFilters?: string[];
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
}

export default function Step2MenuItems() {
  const searchParams = useSearchParams();
  const { filters } = useCateringFilters();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [restaurantsLoading, setRestaurantsLoading] = useState(true);
  const [restaurantPromotions, setRestaurantPromotions] = useState<Record<string, any[]>>({});

  // Catalogue-level search (API-based)
  const [catalogueSearchQuery, setCatalogueSearchQuery] = useState("");
  const [catalogueSearchResults, setCatalogueSearchResults] = useState<MenuItem[] | null>(null);
  const [isCatalogueSearchActive, setIsCatalogueSearchActive] = useState(false);

  // Restaurant-level search (Frontend-based)
  const [restaurantSearchQuery, setRestaurantSearchQuery] = useState("");
  const [restaurantMenuItems, setRestaurantMenuItems] = useState<MenuItem[]>([]);

  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Date/Time/Budget state for filter row (read-only display for now)
  const deliveryDate = "Tomorrow";
  const deliveryTime = "12:00 PM - 2:00 PM";
  const eventBudget = "£500";

  // Helper: stable sort items by restaurant name (fallback to id)
  const sortByRestaurant = (items: MenuItem[] | null) => {
    if (!items || items.length === 0) return [];
    return [...items].sort((a, b) => {
      const nameA = a.restaurant?.name || a.restaurantId || "";
      const nameB = b.restaurant?.name || b.restaurantId || "";
      return nameA.localeCompare(nameB);
    });
  };

  // Fetch restaurants on mount
  useEffect(() => {
    const fetchRestaurants = async () => {
      setRestaurantsLoading(true);
      try {
        const response = await fetchWithAuth(
          `${API_BASE_URL}${API_ENDPOINTS.RESTAURANT_CATERING}`
        );
        const data = await response.json();
        const sortedRestaurants = data.sort((a: Restaurant, b: Restaurant) => {
          const aNotice = a.minimumDeliveryNoticeHours ?? 0;
          const bNotice = b.minimumDeliveryNoticeHours ?? 0;
          return aNotice - bNotice;
        });
        setRestaurants(sortedRestaurants);

        // Check if there's a restaurant parameter in the URL
        const restaurantId = searchParams.get("restaurant");
        if (restaurantId && sortedRestaurants.some((r: Restaurant) => r.id === restaurantId)) {
          updateSelectedRestaurant(restaurantId);
        }
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      } finally {
        setRestaurantsLoading(false);
      }
    };
    fetchRestaurants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch promotions for visible restaurants
  useEffect(() => {
    const fetchPromotions = async () => {
      const restaurantIds = restaurants.map((r) => r.id);
      if (restaurantIds.length === 0) return;

      try {
        const promotionsMap: Record<string, any[]> = {};
        await Promise.all(
          restaurantIds.map(async (id) => {
            const promos = await promotionsServices.getRestaurantPromotions(id);
            if (promos && promos.length > 0) {
              promotionsMap[id] = promos;
            }
          })
        );
        setRestaurantPromotions(promotionsMap);
      } catch (error) {
        console.error("Error fetching promotions:", error);
      }
    };

    if (restaurants.length > 0) {
      fetchPromotions();
    }
  }, [restaurants]);

  // Fetch all menu items on mount
  useEffect(() => {
    const fetchAllMenuItems = async () => {
      setLoading(true);
      try {
        const response = await cateringService.getMenuItems();
        const menuItemsOnly = (response || []).map((item: any) => ({
          id: item.id,
          menuItemName: item.name,
          description: item.description,
          price: item.price?.toString() || "0",
          discountPrice: item.discountPrice?.toString(),
          isDiscount: item.isDiscount || false,
          image: item.image,
          averageRating: item.averageRating?.toString(),
          restaurantId: item.restaurantId || "",
          cateringQuantityUnit: item.cateringQuantityUnit || 7,
          feedsPerUnit: item.feedsPerUnit || 10,
          groupTitle: item.groupTitle,
          status: item.status,
          itemDisplayOrder: item.itemDisplayOrder,
          addons: Array.isArray(item.addons) ? item.addons : [],
          allergens: Array.isArray(item.allergens) ? item.allergens : [],
          restaurant: {
            id: item.restaurantId,
            name: item.restaurant?.restaurant_name || "Unknown",
            restaurantId: item.restaurantId,
            menuGroupSettings: item.restaurant?.menuGroupSettings,
          },
          dietaryFilters: item.dietaryFilters,
        }));
        setMenuItems(menuItemsOnly);
      } catch (error) {
        console.error("Error fetching menu items:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllMenuItems();
  }, []);

  // Update selected restaurant
  const updateSelectedRestaurant = (restaurantId: string | null) => {
    setSelectedRestaurantId(restaurantId);

    if (restaurantId) {
      clearCatalogueSearch();
      // Filter menu items for this restaurant
      const filtered = menuItems.filter((item) => item.restaurantId === restaurantId);
      setRestaurantMenuItems(filtered);
    } else {
      clearRestaurantSearch();
      setRestaurantMenuItems([]);
    }
  };

  // CATALOGUE-LEVEL SEARCH
  const handleCatalogueSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const hasNoFilters =
      (!filters.dietaryRestrictions || filters.dietaryRestrictions.length === 0) &&
      (!filters.allergens || filters.allergens.length === 0);

    if (!catalogueSearchQuery.trim() && hasNoFilters) {
      clearCatalogueSearch();
      return;
    }

    setIsCatalogueSearchActive(true);
    setLoading(true);

    try {
      const response = await cateringService.searchMenuItems(
        catalogueSearchQuery,
        {
          page: 1,
          limit: 50,
          dietaryFilters: filters.dietaryRestrictions,
          allergens: filters.allergens,
        }
      );
      setCatalogueSearchResults(response.menuItems || []);
    } catch (error) {
      console.error("Catalogue search error:", error);
      setCatalogueSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const clearCatalogueSearch = () => {
    setCatalogueSearchQuery("");
    setCatalogueSearchResults(null);
    setIsCatalogueSearchActive(false);
  };

  // RESTAURANT-LEVEL SEARCH
  const handleRestaurantSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!restaurantSearchQuery.trim()) {
      // Filter menu items for current restaurant
      const filtered = menuItems.filter((item) => item.restaurantId === selectedRestaurantId);
      setRestaurantMenuItems(filtered);
      return;
    }
    const filtered = menuItems.filter(
      (item) =>
        item.restaurantId === selectedRestaurantId &&
        (item.menuItemName.toLowerCase().includes(restaurantSearchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(restaurantSearchQuery.toLowerCase()) ||
        item.groupTitle?.toLowerCase().includes(restaurantSearchQuery.toLowerCase()))
    );
    setRestaurantMenuItems(filtered);
  };

  const clearRestaurantSearch = () => {
    setRestaurantSearchQuery("");
    setRestaurantMenuItems(menuItems);
  };

  // Apply filters when they change
  useEffect(() => {
    if (filters.dietaryRestrictions.length > 0 || filters.allergens.length > 0) {
      if (selectedRestaurantId) {
        clearRestaurantSearch();
      } else {
        clearCatalogueSearch();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleOrderPress = (item: MenuItem) => {
    setExpandedItemId(expandedItemId === item.id ? null : item.id);
  };

  return (
    <div className="min-h-screen bg-base-100">
      {/* Main Content */}
      <div className="mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Menu Items Grid */}
          {catalogueSearchResults !== null ? (
            // CATALOGUE SEARCH VIEW (API-based search results)
            <MenuCatalogue
              displayItems={catalogueSearchResults}
              loading={loading}
              isSearching={isCatalogueSearchActive}
              restaurants={restaurants}
              sortByRestaurant={sortByRestaurant}
              restaurantPromotions={restaurantPromotions}
              filterModalOpen={filterModalOpen}
              setFilterModalOpen={setFilterModalOpen}
              expandedItemId={expandedItemId}
              setExpandedItemId={setExpandedItemId}
              getItemQuantity={() => 0}
              handleAddItem={() => {}}
              updateItemQuantity={() => {}}
              handleOrderPress={handleOrderPress}
              searchQuery={catalogueSearchQuery}
              onSearchChange={setCatalogueSearchQuery}
              onSearch={handleCatalogueSearch}
              onClearSearch={clearCatalogueSearch}
              deliveryDate={deliveryDate}
              deliveryTime={deliveryTime}
              eventBudget={eventBudget}
            />
          ) : selectedRestaurantId ? (
            // RESTAURANT MENU VIEW (Frontend-filtered menu)
            <MenuCatalogue
              displayItems={restaurantMenuItems}
              loading={loading}
              isSearching={false}
              restaurants={restaurants}
              sortByRestaurant={sortByRestaurant}
              restaurantPromotions={restaurantPromotions}
              filterModalOpen={filterModalOpen}
              setFilterModalOpen={setFilterModalOpen}
              expandedItemId={expandedItemId}
              setExpandedItemId={setExpandedItemId}
              getItemQuantity={() => 0}
              handleAddItem={() => {}}
              updateItemQuantity={() => {}}
              handleOrderPress={handleOrderPress}
              searchQuery={restaurantSearchQuery}
              onSearchChange={setRestaurantSearchQuery}
              onSearch={handleRestaurantSearch}
              onClearSearch={clearRestaurantSearch}
              deliveryDate={deliveryDate}
              deliveryTime={deliveryTime}
              eventBudget={eventBudget}
            />
          ) : (
            // RESTAURANT CATALOGUE VIEW
            <RestaurantCatalogue
              restaurants={restaurants}
              restaurantsLoading={restaurantsLoading}
              selectedRestaurantId={selectedRestaurantId}
              setSelectedRestaurantId={updateSelectedRestaurant}
              restaurantPromotions={restaurantPromotions}
              searchQuery={catalogueSearchQuery}
              onSearchChange={setCatalogueSearchQuery}
              onSearch={handleCatalogueSearch}
              onClearSearch={clearCatalogueSearch}
              deliveryDate={deliveryDate}
              deliveryTime={deliveryTime}
              eventBudget={eventBudget}
              hasActiveFilters={
                filters.dietaryRestrictions.length > 0 ||
                filters.allergens.length > 0
              }
              onFilterClick={() => setFilterModalOpen(!filterModalOpen)}
              filterModalOpen={filterModalOpen}
            />
          )}
        </div>
      </div>

      {/* Mobile Back Button - when viewing a restaurant */}
      {selectedRestaurantId && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 p-3 z-20">
          <button
            className="w-full bg-base-300 text-base-content px-3 py-3 rounded-lg font-medium hover:bg-base-content/10 transition-colors text-sm"
            onClick={() => {
              updateSelectedRestaurant(null);
              clearRestaurantSearch();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            ← Back to All Restaurants
          </button>
        </div>
      )}
    </div>
  );
}
