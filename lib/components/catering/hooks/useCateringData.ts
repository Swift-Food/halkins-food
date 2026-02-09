"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CategoryWithSubcategories,
  Subcategory,
} from "@/types/catering.types";
import { categoryService } from "@/services/api/category.api";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/constants/api";
import { fetchWithAuth } from "@/lib/api-client/auth-client";
import { Restaurant, MenuItem } from "@/types/restaurant.types";
import { mapToMenuItem } from "../catering-order-helpers";

interface UseCateringDataOptions {
  expandedSessionIndex: number | null;
}

export function useCateringData({ expandedSessionIndex }: UseCateringDataOptions) {
  // Category state
  const [categories, setCategories] = useState<CategoryWithSubcategories[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryWithSubcategories | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] =
    useState<Subcategory | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  // Menu items state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuItemsLoading, setMenuItemsLoading] = useState(false);
  const [menuItemsError, setMenuItemsError] = useState<string | null>(null);

  // Restaurants state for validation
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  // Fetch restaurants on mount (for validation)
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const response = await fetchWithAuth(
          `${API_BASE_URL}${API_ENDPOINTS.RESTAURANT_CATERING}`
        );
        const data = await response.json();
        setRestaurants(data);
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      }
    };
    fetchRestaurants();
  }, []);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        setCategoriesError(null);
        const data = await categoryService.getCategoriesWithSubcategories();
        setCategories(data);
        // Auto-select "Mains" category by default
        const mainCategory = data.find(
          (cat) => cat.name.toLowerCase() === "mains"
        );
        if (mainCategory) {
          setSelectedCategory(mainCategory);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
        setCategoriesError("Failed to load categories");
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Auto-select "Mains" category when a session is expanded
  useEffect(() => {
    if (expandedSessionIndex !== null && categories.length > 0 && !selectedCategory) {
      const mainsCategory = categories.find(
        (cat) => cat.name.toLowerCase() === "mains"
      );
      if (mainsCategory) {
        setSelectedCategory(mainsCategory);
      }
    }
  }, [expandedSessionIndex, categories, selectedCategory]);

  // Fetch menu items when category or subcategory changes
  useEffect(() => {
    const fetchMenuItems = async () => {
      if (!selectedCategory) {
        setMenuItems([]);
        return;
      }

      try {
        setMenuItemsLoading(true);
        setMenuItemsError(null);

        let data;
        if (selectedSubcategory) {
          data = await categoryService.getMenuItemsBySubcategory(
            selectedSubcategory.id
          );
        } else {
          data = await categoryService.getMenuItemsByCategory(
            selectedCategory.id
          );
        }
        // Map to MenuItem format for MenuItemCard
        const mappedItems = data.map(mapToMenuItem);

        // Sort items: items with images first, then items without images
        const itemsWithImage = mappedItems.filter(
          (item) => item.image && item.image.trim() !== ""
        );
        const itemsWithoutImage = mappedItems.filter(
          (item) => !item.image || item.image.trim() === ""
        );
        const sortedItems = [...itemsWithImage, ...itemsWithoutImage];

        setMenuItems(sortedItems);
      } catch (error) {
        console.error("Failed to fetch menu items:", error);
        setMenuItemsError("Failed to load menu items");
        setMenuItems([]);
      } finally {
        setMenuItemsLoading(false);
      }
    };

    fetchMenuItems();
  }, [selectedCategory, selectedSubcategory]);

  // Handle category click
  const handleCategoryClick = useCallback(
    (category: CategoryWithSubcategories) => {
      if (selectedCategory?.id === category.id) {
        setSelectedCategory(null);
        setSelectedSubcategory(null);
      } else {
        setSelectedCategory(category);
        setSelectedSubcategory(null);
      }
    },
    [selectedCategory]
  );

  // Handle subcategory click
  const handleSubcategoryClick = useCallback(
    (subcategory: Subcategory) => {
      setSelectedSubcategory(
        selectedSubcategory?.id === subcategory.id ? null : subcategory
      );
    },
    [selectedSubcategory]
  );

  // Helper to select Mains category
  const selectMainsCategory = useCallback(() => {
    const mainsCategory = categories.find(
      (cat) => cat.name.toLowerCase() === "mains"
    );
    if (mainsCategory) {
      setSelectedCategory(mainsCategory);
      setSelectedSubcategory(null);
    }
  }, [categories]);

  return {
    // Categories
    categories,
    selectedCategory,
    selectedSubcategory,
    categoriesLoading,
    categoriesError,
    handleCategoryClick,
    handleSubcategoryClick,
    selectMainsCategory,

    // Menu items
    menuItems,
    menuItemsLoading,
    menuItemsError,

    // Restaurants
    restaurants,
  };
}
